/**
 * Therapist Agent
 *
 * Main hybrid orchestrator that combines:
 * - Rule-based pattern detection
 * - Rule-based risk assessment
 * - LLM-powered question phrasing (optional)
 * - Session tracking and metrics
 *
 * This agent assists therapists - it does NOT replace clinical judgment.
 */

import type { EmotionLabel, EmotionDetectionResult } from '../types/emotion';
import {
  SuggestionType,
  RiskLevel,
  DEFAULT_AGENT_CONFIG,
  ClinicalCondition
} from './types';
import type {
  TherapistSuggestion,
  AgentConfig,
  EmotionContextSnapshot,
  TherapistMetrics,
  PatternMatch,
  SessionReport,
  AgentEvent,
  AgentEventHandler
} from './types';

// Import tools
import { matchPatterns } from './tools/clinicalPatterns';

import {
  RiskDetector,
  containsCrisisKeywords,
  getRiskLevelColor,
  getRiskLevelText
} from './tools/riskDetector';

import { QuestionBank } from './tools/questionBank';

import {
  SessionTracker,
  STANDARD_TOPICS,
  formatDuration
} from './tools/sessionTracker';

// Import prompts
import {
  createQuestionRephrasingPrompt,
  getEmotionGuidance,
  getConditionApproach
} from './prompts/therapistPrompts';

// ============================================================================
// THERAPIST AGENT CLASS
// ============================================================================

export class TherapistAgent {
  private config: AgentConfig;
  private riskDetector: RiskDetector;
  private questionBank: QuestionBank;
  private sessionTracker: SessionTracker;

  private emotionHistory: EmotionDetectionResult[] = [];
  private activeSuggestions: TherapistSuggestion[] = [];
  private eventHandlers: AgentEventHandler[] = [];
  private lastProcessTime: number = 0;
  private suggestionIdCounter: number = 0;

  // LLM callback for optional rephrasing
  private llmCallback?: (prompt: string) => Promise<string>;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };

    this.riskDetector = new RiskDetector({
      sensitivity: this.config.riskSensitivity,
      customKeywords: this.config.customCrisisKeywords
    });

    this.questionBank = new QuestionBank({
      enableLLMRephrasing: this.config.enableLLMPhrasing
    });

    this.sessionTracker = new SessionTracker(
      `session_${Date.now()}`,
      { topics: STANDARD_TOPICS }
    );
  }

  // ============================================================================
  // MAIN PROCESSING METHODS
  // ============================================================================

  /**
   * Process an emotional snapshot and generate suggestions.
   * This is the main entry point called on each emotion update.
   */
  async processEmotionalSnapshot(
    snapshot: EmotionContextSnapshot
  ): Promise<TherapistSuggestion[]> {
    const now = Date.now();

    // Throttle processing based on config
    if (now - this.lastProcessTime < this.config.suggestionInterval) {
      return this.getActiveSuggestions();
    }
    this.lastProcessTime = now;

    const suggestions: TherapistSuggestion[] = [];

    // Extract emotion data
    const emotionResult: EmotionDetectionResult = {
      dominantEmotion: snapshot.emotionContext.state.current,
      confidence: snapshot.emotionContext.state.confidence,
      scores: {
        happy: 0,
        sad: 0,
        surprise: 0,
        neutral: 0,
        [snapshot.emotionContext.state.current]: snapshot.emotionContext.state.confidence
      },
      timestamp: snapshot.timestamp,
      inferenceTime: 0
    };

    // Add to history
    this.emotionHistory.push(emotionResult);
    if (this.emotionHistory.length > 100) {
      this.emotionHistory.shift();
    }

    // Update session tracker
    this.sessionTracker.processEmotionResult(emotionResult);

    // 1. Risk Assessment (always first)
    const riskSuggestions = await this.assessRisk(
      snapshot.recentTranscript
    );
    suggestions.push(...riskSuggestions);

    // 2. Pattern Detection
    const patternSuggestions = await this.detectPatterns();
    suggestions.push(...patternSuggestions);

    // 3. Question Suggestions
    const questionSuggestions = await this.generateQuestions(
      emotionResult.dominantEmotion,
      emotionResult.confidence
    );
    suggestions.push(...questionSuggestions);

    // 4. Topic Gap Analysis
    const topicSuggestions = this.suggestTopics();
    suggestions.push(...topicSuggestions);

    // Update active suggestions
    this.updateActiveSuggestions(suggestions);

    // Emit events
    for (const suggestion of suggestions) {
      this.emitEvent({
        type: 'suggestion_generated',
        payload: suggestion,
        timestamp: now
      });

      if (suggestion.type === SuggestionType.RISK_ALERT) {
        this.emitEvent({
          type: 'risk_alert',
          payload: suggestion,
          timestamp: now
        });
      }
    }

    return this.getActiveSuggestions();
  }

  /**
   * Process transcript text for topic detection and risk keywords.
   */
  processTranscript(text: string, speaker: 'patient' | 'therapist'): void {
    // Analyze for topics
    const currentEmotion = this.emotionHistory.length > 0
      ? this.emotionHistory[this.emotionHistory.length - 1].dominantEmotion
      : 'neutral';

    this.sessionTracker.analyzeTranscriptForTopics(text, currentEmotion);

    // Check for crisis keywords if from patient
    if (speaker === 'patient' && this.config.enableCrisisDetection) {
      if (containsCrisisKeywords(text)) {
        const riskAssessment = this.riskDetector.assessRisk(
          this.emotionHistory,
          text
        );

        // Add risk events to session tracker
        for (const indicator of riskAssessment.indicators) {
          this.sessionTracker.addRiskEvent(indicator);
        }

        // Generate immediate risk alert
        if (riskAssessment.level === RiskLevel.CRISIS ||
            riskAssessment.level === RiskLevel.HIGH) {
          const alert = this.createSuggestion({
            type: SuggestionType.RISK_ALERT,
            content: `RISK ALERT: ${riskAssessment.immediateActions[0] || 'Assess patient safety immediately'}`,
            priority: 5,
            reasoning: `Crisis keywords detected: ${riskAssessment.indicators.map(i => i.triggers).flat().join(', ')}`,
            emotionTrigger: currentEmotion
          });

          this.activeSuggestions.unshift(alert);

          this.emitEvent({
            type: 'risk_alert',
            payload: alert,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  // ============================================================================
  // RISK ASSESSMENT
  // ============================================================================

  private async assessRisk(
    transcriptContext?: string
  ): Promise<TherapistSuggestion[]> {
    const suggestions: TherapistSuggestion[] = [];

    const assessment = this.riskDetector.assessRisk(
      this.emotionHistory,
      transcriptContext
    );

    // Only create suggestions for moderate+ risk
    if (assessment.level === RiskLevel.CRISIS) {
      suggestions.push(this.createSuggestion({
        type: SuggestionType.RISK_ALERT,
        content: 'CRISIS: Conduct immediate safety assessment',
        priority: 5,
        reasoning: assessment.immediateActions.join('. '),
        confidence: assessment.score
      }));
    } else if (assessment.level === RiskLevel.HIGH) {
      suggestions.push(this.createSuggestion({
        type: SuggestionType.RISK_ALERT,
        content: 'High Risk: Consider safety check',
        priority: 4,
        reasoning: assessment.immediateActions[0] || 'Elevated risk indicators detected',
        confidence: assessment.score
      }));
    } else if (assessment.level === RiskLevel.MODERATE) {
      // Add a lower-priority insight
      suggestions.push(this.createSuggestion({
        type: SuggestionType.INSIGHT,
        content: `Emotional trajectory: ${assessment.emotionTrajectory}`,
        priority: 2,
        reasoning: 'Monitor for changes in risk level',
        confidence: assessment.score
      }));
    }

    return suggestions;
  }

  // ============================================================================
  // PATTERN DETECTION
  // ============================================================================

  private async detectPatterns(): Promise<TherapistSuggestion[]> {
    const suggestions: TherapistSuggestion[] = [];

    if (this.emotionHistory.length < 10) {
      return suggestions;
    }

    const patterns = matchPatterns(
      this.emotionHistory,
      this.config.patternMinConfidence
    );

    // Update session tracker
    this.sessionTracker.updateActivePatterns(patterns);

    // Create suggestions for top patterns
    for (const match of patterns.slice(0, 2)) {
      if (match.confidence >= this.config.patternMinConfidence) {
        const approach = getConditionApproach(match.pattern.condition);

        suggestions.push(this.createSuggestion({
          type: SuggestionType.PATTERN,
          content: `${match.pattern.displayName} indicators observed`,
          priority: match.pattern.riskWeight >= 0.7 ? 3 : 2,
          reasoning: `${approach} Consider: ${match.pattern.baseQuestionTopics.slice(0, 3).join(', ')}`,
          confidence: match.confidence,
          condition: match.pattern.condition
        }));

        this.emitEvent({
          type: 'pattern_detected',
          payload: match,
          timestamp: Date.now()
        });
      }
    }

    return suggestions;
  }

  // ============================================================================
  // QUESTION GENERATION
  // ============================================================================

  private async generateQuestions(
    emotion: EmotionLabel,
    confidence: number
  ): Promise<TherapistSuggestion[]> {
    const suggestions: TherapistSuggestion[] = [];
    const sessionDuration = this.sessionTracker.getDuration();
    const riskLevel = this.sessionTracker.getHighestRiskLevel();

    const sessionContext = {
      sessionTimeSeconds: sessionDuration,
      isInCrisis: riskLevel === RiskLevel.CRISIS || riskLevel === RiskLevel.HIGH,
      recentTopics: this.sessionTracker.getState().topicsCovered
        .filter(t => t.covered)
        .map(t => t.topic)
    };

    // Get emotion-appropriate questions
    let questions = this.questionBank.getQuestionsForEmotion(
      emotion,
      confidence,
      sessionContext
    );

    // Add pattern-based questions
    const patterns = this.sessionTracker.getActivePatterns();
    if (patterns.length > 0) {
      const patternQuestions = this.questionBank.getQuestionsForPatterns(
        patterns,
        sessionContext
      );
      questions = [...questions, ...patternQuestions];
    }

    // Take top 3 unique questions
    const selected = questions.slice(0, 3);

    for (const question of selected) {
      let questionText = question.text;

      // Optional LLM rephrasing
      if (this.config.enableLLMPhrasing && this.llmCallback) {
        try {
          const prompt = createQuestionRephrasingPrompt(
            question.text,
            emotion,
            `Session: ${Math.round(sessionDuration / 60)} min, Patient appears ${emotion}`,
            undefined
          );
          const rephrased = await this.llmCallback(prompt);
          if (rephrased && rephrased.length > 0) {
            questionText = rephrased.trim();
          }
        } catch (error) {
          // Fall back to original question
          console.warn('LLM rephrasing failed, using original question');
        }
      }

      suggestions.push(this.createSuggestion({
        type: SuggestionType.QUESTION,
        content: questionText,
        priority: question.category === 'safety' ? 4 : 2,
        reasoning: `${getEmotionGuidance(emotion).substring(0, 100)}...`,
        emotionTrigger: emotion,
        confidence
      }));
    }

    return suggestions;
  }

  // ============================================================================
  // TOPIC SUGGESTIONS
  // ============================================================================

  private suggestTopics(): TherapistSuggestion[] {
    const suggestions: TherapistSuggestion[] = [];
    const patterns = this.sessionTracker.getActivePatterns();

    // Only suggest topics after some session time
    if (this.sessionTracker.getDuration() < 300) { // 5 minutes
      return suggestions;
    }

    const nextTopic = this.sessionTracker.suggestNextTopic(patterns);

    if (nextTopic) {
      suggestions.push(this.createSuggestion({
        type: SuggestionType.TOPIC_GAP,
        content: `Consider exploring: ${nextTopic.displayName}`,
        priority: nextTopic.importance === 'high' ? 2 : 1,
        reasoning: `This topic hasn't been discussed yet. Category: ${nextTopic.category}`,
        confidence: 0.7
      }));
    }

    return suggestions;
  }

  // ============================================================================
  // SUGGESTION MANAGEMENT
  // ============================================================================

  private createSuggestion(params: {
    type: SuggestionType;
    content: string;
    priority: number;
    reasoning: string;
    emotionTrigger?: EmotionLabel;
    confidence?: number;
    condition?: ClinicalCondition;
  }): TherapistSuggestion {
    return {
      id: `sug_${++this.suggestionIdCounter}`,
      type: params.type,
      content: params.content,
      priority: params.priority,
      reasoning: params.reasoning,
      timestamp: Date.now(),
      emotionTrigger: params.emotionTrigger,
      confidence: params.confidence || 0.5,
      condition: params.condition,
      dismissed: false,
      used: false
    };
  }

  private updateActiveSuggestions(newSuggestions: TherapistSuggestion[]): void {
    // Remove dismissed or used suggestions
    this.activeSuggestions = this.activeSuggestions.filter(
      s => !s.dismissed && !s.used
    );

    // Add new suggestions
    for (const suggestion of newSuggestions) {
      // Avoid duplicates based on content similarity
      const isDuplicate = this.activeSuggestions.some(
        existing => existing.content === suggestion.content
      );
      if (!isDuplicate) {
        this.activeSuggestions.push(suggestion);
      }
    }

    // Sort by priority (descending)
    this.activeSuggestions.sort((a, b) => b.priority - a.priority);

    // Limit to max suggestions
    this.activeSuggestions = this.activeSuggestions.slice(
      0,
      this.config.maxActiveSuggestions
    );

    // Update session tracker
    for (const suggestion of newSuggestions) {
      this.sessionTracker.addSuggestion(suggestion);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get currently active suggestions.
   */
  getActiveSuggestions(): TherapistSuggestion[] {
    return this.activeSuggestions;
  }

  /**
   * Mark a suggestion as used.
   */
  useSuggestion(suggestionId: string): void {
    const suggestion = this.activeSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.used = true;
      this.sessionTracker.markSuggestionUsed(suggestionId);
    }
  }

  /**
   * Dismiss a suggestion.
   */
  dismissSuggestion(suggestionId: string): void {
    const suggestion = this.activeSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.dismissed = true;
      this.sessionTracker.dismissSuggestion(suggestionId);
    }
  }

  /**
   * Get current risk level.
   */
  getCurrentRiskLevel(): RiskLevel {
    const assessment = this.riskDetector.getLastAssessment();
    return assessment?.level || RiskLevel.LOW;
  }

  /**
   * Get current therapist metrics.
   */
  getMetrics(): TherapistMetrics {
    return this.sessionTracker.getTherapistMetrics();
  }

  /**
   * Get uncovered topics.
   */
  getUncoveredTopics(): string[] {
    return this.sessionTracker.getUncoveredTopics().map(t => t.displayName);
  }

  /**
   * Get session report.
   */
  getSessionReport(): SessionReport {
    return this.sessionTracker.getSessionReport();
  }

  /**
   * Get emotion history.
   */
  getEmotionHistory(): EmotionDetectionResult[] {
    return this.emotionHistory;
  }

  /**
   * Get session duration in seconds.
   */
  getSessionDuration(): number {
    return this.sessionTracker.getDuration();
  }

  /**
   * Get active patterns.
   */
  getActivePatterns(): PatternMatch[] {
    return this.sessionTracker.getActivePatterns();
  }

  /**
   * Set LLM callback for question rephrasing.
   */
  setLLMCallback(callback: (prompt: string) => Promise<string>): void {
    this.llmCallback = callback;
  }

  /**
   * Register event handler.
   */
  on(handler: AgentEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler.
   */
  off(handler: AgentEventHandler): void {
    this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
  }

  private emitEvent(event: AgentEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  /**
   * Start a new session.
   */
  startSession(sessionId?: string): void {
    this.sessionTracker.reset(sessionId);
    this.emotionHistory = [];
    this.activeSuggestions = [];
    this.questionBank.resetUsedQuestions();
    this.lastProcessTime = 0;

    this.emitEvent({
      type: 'session_started',
      payload: { sessionId: sessionId || `session_${Date.now()}` },
      timestamp: Date.now()
    });
  }

  /**
   * End the current session.
   */
  endSession(): SessionReport {
    const report = this.sessionTracker.endSession();

    this.emitEvent({
      type: 'session_ended',
      payload: report,
      timestamp: Date.now()
    });

    return report;
  }

  /**
   * Update agent configuration.
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };

    // Update dependent components
    this.riskDetector.setSensitivity(this.config.riskSensitivity);
    if (this.config.customCrisisKeywords.length > 0) {
      this.riskDetector.addCustomKeywords(this.config.customCrisisKeywords);
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new TherapistAgent instance.
 */
export function createTherapistAgent(
  config?: Partial<AgentConfig>
): TherapistAgent {
  return new TherapistAgent(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  getRiskLevelColor,
  getRiskLevelText,
  formatDuration
};
