/**
 * Session Tracker Tool
 *
 * Tracks session progress including:
 * - Topics covered and uncovered
 * - Emotional timeline
 * - Risk events
 * - Session metrics and reports
 */

import type { EmotionLabel, EmotionDetectionResult } from '../../types/emotion';
import { TopicDepth, RiskLevel } from '../types';
import type {
  SessionState,
  TopicCoverage,
  RiskIndicator,
  TherapistSuggestion,
  SessionReport,
  PatternMatch,
  TherapistMetrics
} from '../types';

// ============================================================================
// STANDARD TOPICS TO TRACK
// ============================================================================

export interface TopicDefinition {
  id: string;
  displayName: string;
  keywords: string[];
  importance: 'high' | 'medium' | 'low';
  category: string;
}

export const STANDARD_TOPICS: TopicDefinition[] = [
  {
    id: 'sleep_patterns',
    displayName: 'Sleep Patterns',
    keywords: ['sleep', 'sleeping', 'insomnia', 'tired', 'rest', 'nightmare', 'dream', 'wake', 'bed'],
    importance: 'high',
    category: 'physical'
  },
  {
    id: 'appetite_eating',
    displayName: 'Appetite & Eating',
    keywords: ['eat', 'eating', 'food', 'appetite', 'hungry', 'meal', 'weight', 'diet'],
    importance: 'high',
    category: 'physical'
  },
  {
    id: 'social_relationships',
    displayName: 'Social Relationships',
    keywords: ['friend', 'friends', 'social', 'relationship', 'people', 'lonely', 'alone', 'connection', 'isolated'],
    importance: 'high',
    category: 'social'
  },
  {
    id: 'work_school',
    displayName: 'Work/School',
    keywords: ['work', 'job', 'school', 'study', 'career', 'boss', 'colleague', 'class', 'grade', 'deadline'],
    importance: 'medium',
    category: 'functional'
  },
  {
    id: 'physical_health',
    displayName: 'Physical Health',
    keywords: ['health', 'pain', 'sick', 'doctor', 'medical', 'body', 'exercise', 'symptom'],
    importance: 'medium',
    category: 'physical'
  },
  {
    id: 'medication_compliance',
    displayName: 'Medication',
    keywords: ['medication', 'medicine', 'pill', 'prescription', 'dose', 'side effect', 'pharmacy'],
    importance: 'high',
    category: 'treatment'
  },
  {
    id: 'coping_strategies',
    displayName: 'Coping Strategies',
    keywords: ['cope', 'coping', 'manage', 'strategy', 'technique', 'skill', 'mindfulness', 'breathing', 'relax'],
    importance: 'medium',
    category: 'skills'
  },
  {
    id: 'safety_self_harm',
    displayName: 'Safety/Self-harm',
    keywords: ['safe', 'safety', 'harm', 'hurt', 'suicide', 'suicidal', 'die', 'kill', 'self-harm', 'cut'],
    importance: 'high',
    category: 'safety'
  },
  {
    id: 'family_dynamics',
    displayName: 'Family',
    keywords: ['family', 'parent', 'mother', 'father', 'sibling', 'brother', 'sister', 'child', 'kid', 'spouse', 'partner'],
    importance: 'medium',
    category: 'social'
  },
  {
    id: 'recent_stressors',
    displayName: 'Recent Stressors',
    keywords: ['stress', 'stressful', 'overwhelm', 'pressure', 'difficult', 'hard time', 'struggle', 'challenge'],
    importance: 'high',
    category: 'situational'
  },
  {
    id: 'mood_feelings',
    displayName: 'Mood & Feelings',
    keywords: ['feel', 'feeling', 'mood', 'emotion', 'happy', 'sad', 'anxious', 'angry', 'frustrated', 'depressed'],
    importance: 'high',
    category: 'emotional'
  },
  {
    id: 'trauma_history',
    displayName: 'Trauma History',
    keywords: ['trauma', 'abuse', 'accident', 'assault', 'violence', 'ptsd', 'flashback', 'trigger'],
    importance: 'medium',
    category: 'history'
  },
  {
    id: 'substance_use',
    displayName: 'Substance Use',
    keywords: ['drink', 'alcohol', 'drug', 'substance', 'smoke', 'marijuana', 'addiction', 'sober'],
    importance: 'high',
    category: 'behavioral'
  },
  {
    id: 'goals_progress',
    displayName: 'Goals & Progress',
    keywords: ['goal', 'progress', 'improve', 'better', 'achieve', 'success', 'growth', 'change'],
    importance: 'low',
    category: 'treatment'
  }
];

// ============================================================================
// SESSION TRACKER CLASS
// ============================================================================

export interface SessionTrackerConfig {
  /** Topics to track */
  topics: TopicDefinition[];
  /** Minimum keyword matches to consider topic discussed */
  minKeywordMatches: number;
  /** Time threshold for "deep" discussion (seconds) */
  deepDiscussionThreshold: number;
}

const DEFAULT_CONFIG: SessionTrackerConfig = {
  topics: STANDARD_TOPICS,
  minKeywordMatches: 2,
  deepDiscussionThreshold: 120 // 2 minutes
};

export class SessionTracker {
  private config: SessionTrackerConfig;
  private state: SessionState;

  constructor(
    sessionId: string = `session_${Date.now()}`,
    config: Partial<SessionTrackerConfig> = {},
    patientHistory?: { previousTopics?: string[] }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.initializeState(sessionId, patientHistory);
  }

  private initializeState(
    sessionId: string,
    _patientHistory?: { previousTopics?: string[] }
  ): SessionState {
    const topicsCovered: TopicCoverage[] = this.config.topics.map(topic => ({
      topic: topic.id,
      displayName: topic.displayName,
      covered: false,
      timeSpentSeconds: 0,
      emotionsDuring: [],
      depth: TopicDepth.SURFACE,
      discussedAt: []
    }));

    return {
      sessionId,
      startTime: Date.now(),
      topicsCovered,
      emotionalTimeline: [],
      riskEvents: [],
      suggestedQuestions: [],
      usedQuestions: [],
      uncoveredTopics: this.config.topics.map(t => t.id),
      activePatterns: [],
      duration: 0,
      isActive: true
    };
  }

  // ============================================================================
  // EMOTION TRACKING
  // ============================================================================

  /**
   * Add an emotion sample to the timeline.
   */
  addEmotionSample(
    emotion: EmotionLabel,
    confidence: number,
    timestamp: number = Date.now()
  ): void {
    this.state.emotionalTimeline.push({
      timestamp,
      emotion,
      confidence
    });

    // Update duration
    this.state.duration = (timestamp - this.state.startTime) / 1000;
  }

  /**
   * Process emotion detection result.
   */
  processEmotionResult(result: EmotionDetectionResult): void {
    this.addEmotionSample(
      result.dominantEmotion,
      result.confidence,
      result.timestamp
    );
  }

  // ============================================================================
  // TOPIC TRACKING
  // ============================================================================

  /**
   * Analyze text for topic mentions.
   */
  analyzeTranscriptForTopics(
    text: string,
    currentEmotion?: EmotionLabel
  ): string[] {
    const mentionedTopics: string[] = [];
    const lowerText = text.toLowerCase();
    const now = Date.now();

    for (const topic of this.config.topics) {
      let matches = 0;

      for (const keyword of topic.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matches++;
        }
      }

      if (matches >= this.config.minKeywordMatches) {
        mentionedTopics.push(topic.id);

        // Update topic coverage
        const coverage = this.state.topicsCovered.find(t => t.topic === topic.id);
        if (coverage) {
          if (!coverage.covered) {
            coverage.covered = true;
            this.state.uncoveredTopics = this.state.uncoveredTopics.filter(
              t => t !== topic.id
            );
          }

          coverage.discussedAt.push(now);
          coverage.timeSpentSeconds += 30; // Estimate 30s per mention

          if (currentEmotion && !coverage.emotionsDuring.includes(currentEmotion)) {
            coverage.emotionsDuring.push(currentEmotion);
          }

          // Update depth based on time spent
          if (coverage.timeSpentSeconds >= this.config.deepDiscussionThreshold) {
            coverage.depth = TopicDepth.DEEP;
          } else if (coverage.timeSpentSeconds >= 60) {
            coverage.depth = TopicDepth.MODERATE;
          }
        }
      }
    }

    return mentionedTopics;
  }

  /**
   * Manually mark a topic as covered.
   */
  markTopicCovered(
    topicId: string,
    depth: TopicDepth = TopicDepth.SURFACE
  ): void {
    const coverage = this.state.topicsCovered.find(t => t.topic === topicId);
    if (coverage) {
      coverage.covered = true;
      coverage.depth = depth;
      coverage.discussedAt.push(Date.now());

      this.state.uncoveredTopics = this.state.uncoveredTopics.filter(
        t => t !== topicId
      );
    }
  }

  /**
   * Get topics that haven't been covered yet.
   */
  getUncoveredTopics(): TopicDefinition[] {
    return this.config.topics.filter(topic =>
      this.state.uncoveredTopics.includes(topic.id)
    );
  }

  /**
   * Get high-importance uncovered topics.
   */
  getHighPriorityUncoveredTopics(): TopicDefinition[] {
    return this.getUncoveredTopics().filter(t => t.importance === 'high');
  }

  /**
   * Suggest the next topic to cover based on importance and patterns.
   */
  suggestNextTopic(activePatterns: PatternMatch[] = []): TopicDefinition | null {
    const uncovered = this.getUncoveredTopics();
    if (uncovered.length === 0) return null;

    // Prioritize based on detected patterns
    const patternTopics = new Set<string>();
    for (const match of activePatterns) {
      for (const topic of match.pattern.baseQuestionTopics) {
        // Map pattern topics to our topic IDs
        const mapped = this.mapPatternTopicToId(topic);
        if (mapped) patternTopics.add(mapped);
      }
    }

    // First, check if any pattern-relevant topics are uncovered
    for (const topic of uncovered) {
      if (patternTopics.has(topic.id)) {
        return topic;
      }
    }

    // Otherwise, return highest importance uncovered topic
    const sorted = uncovered.sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    });

    return sorted[0] || null;
  }

  /**
   * Map pattern question topics to our topic IDs.
   */
  private mapPatternTopicToId(patternTopic: string): string | null {
    const mapping: Record<string, string> = {
      sleep_quality: 'sleep_patterns',
      appetite_changes: 'appetite_eating',
      energy_levels: 'physical_health',
      hopelessness: 'safety_self_harm',
      worry_frequency: 'mood_feelings',
      physical_symptoms: 'physical_health',
      safety_check: 'safety_self_harm',
      support_system: 'social_relationships',
      sleep_patterns: 'sleep_patterns',
      mood_tracking: 'mood_feelings',
      triggers: 'trauma_history',
      intrusive_thoughts: 'trauma_history',
      coping: 'coping_strategies'
    };

    return mapping[patternTopic] || null;
  }

  // ============================================================================
  // RISK TRACKING
  // ============================================================================

  /**
   * Add a risk event to the session.
   */
  addRiskEvent(indicator: RiskIndicator): void {
    this.state.riskEvents.push(indicator);
  }

  /**
   * Get all risk events for the session.
   */
  getRiskEvents(): RiskIndicator[] {
    return this.state.riskEvents;
  }

  /**
   * Get the highest risk level encountered.
   */
  getHighestRiskLevel(): RiskLevel {
    if (this.state.riskEvents.length === 0) return RiskLevel.LOW;

    const levels = this.state.riskEvents.map(e => {
      if (e.type === 'suicidal_ideation') return RiskLevel.CRISIS;
      if (e.type === 'self_harm') return RiskLevel.HIGH;
      if (e.type === 'crisis') return RiskLevel.HIGH;
      if (e.type === 'severe_distress') return RiskLevel.MODERATE;
      return RiskLevel.LOW;
    });

    const priority: Record<RiskLevel, number> = {
      [RiskLevel.CRISIS]: 4,
      [RiskLevel.HIGH]: 3,
      [RiskLevel.MODERATE]: 2,
      [RiskLevel.LOW]: 1
    };

    return levels.reduce((highest, current) =>
      priority[current] > priority[highest] ? current : highest
    , RiskLevel.LOW);
  }

  // ============================================================================
  // SUGGESTIONS TRACKING
  // ============================================================================

  /**
   * Add a generated suggestion.
   */
  addSuggestion(suggestion: TherapistSuggestion): void {
    this.state.suggestedQuestions.push(suggestion);
  }

  /**
   * Mark a suggestion as used.
   */
  markSuggestionUsed(suggestionId: string): void {
    const suggestion = this.state.suggestedQuestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.used = true;
      this.state.usedQuestions.push(suggestionId);
    }
  }

  /**
   * Mark a suggestion as dismissed.
   */
  dismissSuggestion(suggestionId: string): void {
    const suggestion = this.state.suggestedQuestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.dismissed = true;
    }
  }

  // ============================================================================
  // PATTERNS TRACKING
  // ============================================================================

  /**
   * Update active clinical patterns.
   */
  updateActivePatterns(patterns: PatternMatch[]): void {
    this.state.activePatterns = patterns;
  }

  /**
   * Get current active patterns.
   */
  getActivePatterns(): PatternMatch[] {
    return this.state.activePatterns;
  }

  // ============================================================================
  // SESSION ANALYSIS
  // ============================================================================

  /**
   * Get the emotional summary of the session.
   */
  getEmotionalSummary(): {
    dominantEmotion: EmotionLabel;
    emotionDistribution: Record<EmotionLabel, number>;
    stability: number;
    trajectory: 'improving' | 'stable' | 'declining' | 'volatile';
  } {
    const timeline = this.state.emotionalTimeline;

    if (timeline.length === 0) {
      return {
        dominantEmotion: 'neutral',
        emotionDistribution: { happy: 0, sad: 0, surprise: 0, neutral: 1 },
        stability: 0.5,
        trajectory: 'stable'
      };
    }

    // Calculate distribution
    const distribution: Record<EmotionLabel, number> = {
      happy: 0,
      sad: 0,
      surprise: 0,
      neutral: 0
    };

    for (const entry of timeline) {
      distribution[entry.emotion]++;
    }

    // Normalize
    const total = timeline.length;
    for (const emotion of Object.keys(distribution) as EmotionLabel[]) {
      distribution[emotion] /= total;
    }

    // Find dominant
    let dominant: EmotionLabel = 'neutral';
    let maxCount = 0;
    for (const [emotion, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = emotion as EmotionLabel;
      }
    }

    // Calculate stability (fewer changes = more stable)
    let changes = 0;
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].emotion !== timeline[i - 1].emotion) {
        changes++;
      }
    }
    const stability = 1 - (changes / Math.max(1, timeline.length - 1));

    // Determine trajectory
    let trajectory: 'improving' | 'stable' | 'declining' | 'volatile' = 'stable';
    if (stability < 0.4) {
      trajectory = 'volatile';
    } else if (timeline.length >= 10) {
      const firstHalf = timeline.slice(0, Math.floor(timeline.length / 2));
      const secondHalf = timeline.slice(Math.floor(timeline.length / 2));

      const firstPositive = firstHalf.filter(e => e.emotion === 'happy').length;
      const secondPositive = secondHalf.filter(e => e.emotion === 'happy').length;

      if (secondPositive > firstPositive + 2) trajectory = 'improving';
      else if (secondPositive < firstPositive - 2) trajectory = 'declining';
    }

    return {
      dominantEmotion: dominant,
      emotionDistribution: distribution,
      stability,
      trajectory
    };
  }

  /**
   * Calculate therapist metrics for the session.
   */
  getTherapistMetrics(): TherapistMetrics {
    const summary = this.getEmotionalSummary();
    const riskLevel = this.getHighestRiskLevel();

    // Calculate emotional balance (-1 to 1)
    const emotionalBalance =
      (summary.emotionDistribution.happy * 1) +
      (summary.emotionDistribution.surprise * 0.3) +
      (summary.emotionDistribution.neutral * 0) +
      (summary.emotionDistribution.sad * -1);

    // Calculate stress indicator (based on surprise + volatility)
    const stressIndicator = Math.min(1,
      summary.emotionDistribution.surprise * 0.5 +
      (1 - summary.stability) * 0.5
    );

    // Calculate engagement (based on emotional expressivity)
    const avgConfidence = this.state.emotionalTimeline.length > 0
      ? this.state.emotionalTimeline.reduce((sum, e) => sum + e.confidence, 0) /
        this.state.emotionalTimeline.length
      : 0.5;
    const engagementLevel = avgConfidence;

    // Congruence score would need transcript analysis - placeholder
    const congruenceScore = 0.7;

    return {
      emotionalBalance,
      moodStability: summary.stability,
      stressIndicator,
      engagementLevel,
      congruenceScore,
      riskLevel,
      lastUpdated: Date.now()
    };
  }

  /**
   * Generate a full session report.
   */
  getSessionReport(): SessionReport {
    const summary = this.getEmotionalSummary();
    const topicsCovered = this.state.topicsCovered.filter(t => t.covered);
    const topicsUncovered = this.getUncoveredTopics();

    const recommendations: string[] = [];

    // Generate recommendations based on session data
    if (topicsUncovered.some(t => t.importance === 'high')) {
      const highPriority = topicsUncovered.filter(t => t.importance === 'high');
      recommendations.push(
        `Consider addressing these topics next session: ${highPriority.map(t => t.displayName).join(', ')}`
      );
    }

    if (summary.trajectory === 'declining') {
      recommendations.push('Monitor for worsening symptoms. Consider safety planning.');
    }

    if (summary.stability < 0.4) {
      recommendations.push('High emotional volatility observed. Grounding techniques may be helpful.');
    }

    if (this.state.riskEvents.length > 0) {
      recommendations.push('Risk indicators detected. Review safety plan and crisis resources.');
    }

    if (this.state.activePatterns.length > 0) {
      const patterns = this.state.activePatterns.map(p => p.pattern.displayName);
      recommendations.push(`Clinical patterns noted: ${patterns.join(', ')}. Consider relevant interventions.`);
    }

    return {
      session: this.state,
      summary: {
        totalDuration: this.state.duration,
        topicsCoveredCount: topicsCovered.length,
        topicsUncoveredCount: topicsUncovered.length,
        dominantEmotion: summary.dominantEmotion,
        emotionalStability: summary.stability,
        riskEventsCount: this.state.riskEvents.length,
        highestRiskLevel: this.getHighestRiskLevel(),
        suggestionsUsedCount: this.state.usedQuestions.length,
        suggestionsGeneratedCount: this.state.suggestedQuestions.length
      },
      patterns: this.state.activePatterns,
      recommendations
    };
  }

  // ============================================================================
  // SESSION LIFECYCLE
  // ============================================================================

  /**
   * Get the current session state.
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get session duration in seconds.
   */
  getDuration(): number {
    return (Date.now() - this.state.startTime) / 1000;
  }

  /**
   * End the session.
   */
  endSession(): SessionReport {
    this.state.isActive = false;
    this.state.duration = this.getDuration();
    return this.getSessionReport();
  }

  /**
   * Reset for a new session.
   */
  reset(newSessionId?: string): void {
    this.state = this.initializeState(
      newSessionId || `session_${Date.now()}`
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format duration in human-readable form.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get topic category color for UI.
 */
export function getTopicCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    physical: '#65a30d',
    social: '#0891b2',
    functional: '#7c3aed',
    treatment: '#db2777',
    safety: '#dc2626',
    skills: '#ca8a04',
    emotional: '#8e5572',
    history: '#64748b',
    behavioral: '#ea580c',
    situational: '#6366f1'
  };
  return colors[category] || '#64748b';
}
