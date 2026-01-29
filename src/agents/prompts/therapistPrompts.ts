/**
 * Therapist Agent Prompts
 *
 * LLM prompts for question phrasing and therapeutic suggestions.
 * Used with Groq for natural language generation.
 */

import type { EmotionLabel } from '../../types/emotion';
import type {
  ClinicalCondition,
  PatternMatch,
  RiskLevel,
  SessionState
} from '../types';

// ============================================================================
// MAIN SYSTEM PROMPTS
// ============================================================================

/**
 * System prompt for the therapist assistance agent.
 */
export const THERAPIST_AGENT_SYSTEM_PROMPT = `You are an AI assistant helping a licensed therapist during a therapy session.

Your role:
1. Observe emotional patterns from facial detection data
2. Suggest relevant therapeutic questions
3. Alert to potential risk indicators
4. Track session coverage and suggest unexplored topics

IMPORTANT GUIDELINES:
- Never diagnose - only suggest patterns for the therapist to consider
- Prioritize safety-related suggestions
- Keep suggestions concise and actionable
- Consider timing - don't interrupt at sensitive moments
- Respect therapeutic pacing
- Use warm, professional language
- Match suggestions to the detected emotional state

You assist the therapist by providing:
- Context-appropriate question suggestions
- Pattern observations (not diagnoses)
- Risk awareness alerts
- Topic gap identification
- Emotional trajectory insights

Remember: You support the therapist's clinical judgment, never replace it.`;

/**
 * Dynamic context template to inject into prompts.
 */
export function buildEmotionContextBlock(
  currentEmotion: EmotionLabel,
  confidence: number,
  trajectory: 'improving' | 'stable' | 'declining' | 'volatile',
  stability: number
): string {
  const emotionDescriptions: Record<EmotionLabel, string> = {
    happy: 'positive, engaged, or relieved',
    sad: 'low, heavy, or withdrawn',
    surprise: 'activated, startled, or processing something unexpected',
    neutral: 'calm, measured, or guarded'
  };

  const trajectoryDescriptions = {
    improving: 'Their emotional state appears to be improving over the session.',
    stable: 'Their emotional state has remained consistent.',
    declining: 'Their emotional state appears to be declining - monitor closely.',
    volatile: 'Their emotional state is fluctuating significantly.'
  };

  return `[EMOTIONAL CONTEXT - REAL-TIME]
Current Detected State: ${currentEmotion.toUpperCase()} (${Math.round(confidence * 100)}% confidence)
The patient appears ${emotionDescriptions[currentEmotion]}.
Emotional Stability: ${Math.round(stability * 100)}%
${trajectoryDescriptions[trajectory]}
---`;
}

/**
 * Build session state context for prompts.
 */
export function buildSessionContextBlock(session: SessionState): string {
  const duration = Math.round(session.duration / 60);
  const covered = session.topicsCovered.filter(t => t.covered).length;
  const total = session.topicsCovered.length;
  const patterns = session.activePatterns.map(p => p.pattern.displayName).join(', ') || 'None detected';
  const riskEvents = session.riskEvents.length;

  return `[SESSION STATE]
Duration: ${duration} minutes
Topics Covered: ${covered}/${total}
Active Patterns: ${patterns}
Risk Events This Session: ${riskEvents}
---`;
}

// ============================================================================
// QUESTION REPHRASING PROMPTS
// ============================================================================

/**
 * Prompt for rephrasing a therapeutic question naturally.
 */
export function createQuestionRephrasingPrompt(
  originalQuestion: string,
  emotion: EmotionLabel,
  sessionContext: string,
  patientName?: string
): string {
  return `Rephrase this therapeutic question to sound natural and warm, appropriate for the patient's current emotional state.

Original question: "${originalQuestion}"

Patient's current state: Appears ${emotion}
Session context: ${sessionContext}
${patientName ? `Patient's name: ${patientName}` : ''}

Guidelines:
- Keep the clinical intent
- Use warm, conversational language
- Match the emotional tone appropriately
- Be concise (one sentence)
- Don't use clinical jargon

Output ONLY the rephrased question, nothing else.`;
}

/**
 * Prompt for generating contextual follow-up questions.
 */
export function createFollowUpPrompt(
  topic: string,
  patientResponse: string,
  emotion: EmotionLabel
): string {
  return `Generate a brief, empathetic follow-up question based on what the patient just shared.

Topic discussed: ${topic}
Patient's response summary: "${patientResponse}"
Current emotional state: ${emotion}

Guidelines:
- Acknowledge what they shared
- Gently deepen the exploration
- Be warm and curious, not probing
- One sentence only

Output ONLY the follow-up question.`;
}

// ============================================================================
// PATTERN INSIGHT PROMPTS
// ============================================================================

/**
 * Prompt for generating pattern-based insights.
 */
export function createPatternInsightPrompt(
  patterns: PatternMatch[],
  emotionHistory: string
): string {
  const patternSummary = patterns
    .map(p => `${p.pattern.displayName} (${Math.round(p.confidence * 100)}% confidence)`)
    .join(', ');

  return `Based on the detected emotional patterns, provide a brief clinical observation for the therapist.

Detected patterns: ${patternSummary}
Emotion history: ${emotionHistory}

Guidelines:
- Use tentative language (e.g., "This may suggest...", "Consider exploring...")
- Do NOT diagnose
- Keep it actionable
- Maximum 2 sentences

Output ONLY the observation.`;
}

/**
 * Prompt for risk-aware suggestions.
 */
export function createRiskAwareSuggestionPrompt(
  riskLevel: RiskLevel,
  indicators: string[],
  currentEmotion: EmotionLabel
): string {
  return `The patient shows ${riskLevel} risk indicators. Generate a brief, appropriate suggestion for the therapist.

Risk indicators detected: ${indicators.join(', ')}
Current emotional state: ${currentEmotion}

Guidelines:
- Prioritize safety
- Be direct but calm
- Suggest specific action
- One sentence

Output ONLY the suggestion.`;
}

// ============================================================================
// TOPIC GAP PROMPTS
// ============================================================================

/**
 * Prompt for suggesting uncovered topics.
 */
export function createTopicGapPrompt(
  uncoveredTopics: string[],
  sessionMinutes: number,
  dominantEmotion: EmotionLabel
): string {
  return `The session has been running for ${sessionMinutes} minutes. Some important topics haven't been addressed yet.

Uncovered topics: ${uncoveredTopics.join(', ')}
Patient's dominant emotion: ${dominantEmotion}

Suggest ONE topic to explore next and briefly explain why it might be relevant. Consider the emotional context.

Format:
Topic: [topic name]
Reason: [brief reason]`;
}

// ============================================================================
// SESSION SUMMARY PROMPTS
// ============================================================================

/**
 * Prompt for generating session summary.
 */
export function createSessionSummaryPrompt(
  topicsCovered: string[],
  dominantEmotion: EmotionLabel,
  patterns: string[],
  riskEvents: number,
  trajectory: string
): string {
  return `Generate a brief clinical summary of this therapy session for the therapist's notes.

Topics discussed: ${topicsCovered.join(', ') || 'None recorded'}
Dominant emotion observed: ${dominantEmotion}
Clinical patterns noted: ${patterns.join(', ') || 'None detected'}
Risk events: ${riskEvents}
Emotional trajectory: ${trajectory}

Guidelines:
- Use clinical but accessible language
- Note significant observations
- Mention any areas of concern
- Suggest focus for next session
- Maximum 3-4 sentences

Output ONLY the summary.`;
}

// ============================================================================
// EMOTION-SPECIFIC PROMPTS
// ============================================================================

/**
 * Get emotion-specific guidance for question generation.
 */
export function getEmotionGuidance(emotion: EmotionLabel): string {
  const guidance: Record<EmotionLabel, string> = {
    happy: 'The patient appears positive. Explore what\'s contributing to this. Consider building on strengths. Be mindful this could also mask underlying issues.',
    sad: 'The patient appears low. Use gentle, empathetic language. Validate their feelings. Don\'t rush to problem-solve. Explore what\'s weighing on them.',
    surprise: 'The patient appears activated or startled. Something unexpected may have come up. Give space to process. Ask open questions about what they\'re experiencing.',
    neutral: 'The patient appears calm or guarded. This could indicate stability, numbness, or emotional avoidance. Gently explore what\'s present for them.'
  };

  return guidance[emotion];
}

/**
 * Get condition-specific therapeutic approaches.
 */
export function getConditionApproach(condition: ClinicalCondition): string {
  const approaches: Record<ClinicalCondition, string> = {
    depression: 'Focus on behavioral activation. Explore anhedonia. Assess sleep, appetite, energy. Watch for hopelessness.',
    anxiety: 'Use grounding techniques if needed. Explore worry patterns. Identify avoidance. Work on cognitive restructuring.',
    ptsd: 'Prioritize safety. Be trauma-informed. Watch for triggers. Don\'t push disclosure. Use stabilization techniques.',
    bipolar: 'Monitor mood state. Assess sleep patterns. Watch for manic indicators. Review medication compliance.',
    grief: 'Validate the loss. Allow emotional waves. Explore meaning-making. Support healthy mourning.',
    crisis: 'Safety first. Assess suicidal ideation. Review crisis plan. Identify protective factors. Ensure support.'
  };

  return approaches[condition];
}

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

/**
 * Format a suggestion for display.
 */
export function formatSuggestionForDisplay(
  type: 'question' | 'pattern' | 'risk' | 'topic',
  content: string,
  priority: number
): string {
  const icons = {
    question: '?',
    pattern: 'P',
    risk: '!',
    topic: 'T'
  };

  const priorityLabels = ['', 'Low', 'Medium', 'High', 'Urgent', 'CRITICAL'];

  return `[${icons[type]}] ${priorityLabels[priority]}: ${content}`;
}

/**
 * Build the full context prompt for the agent.
 */
export function buildFullAgentPrompt(
  emotionContext: {
    emotion: EmotionLabel;
    confidence: number;
    trajectory: 'improving' | 'stable' | 'declining' | 'volatile';
    stability: number;
  },
  sessionState: SessionState,
  taskDescription: string
): string {
  const emotionBlock = buildEmotionContextBlock(
    emotionContext.emotion,
    emotionContext.confidence,
    emotionContext.trajectory,
    emotionContext.stability
  );

  const sessionBlock = buildSessionContextBlock(sessionState);

  return `${THERAPIST_AGENT_SYSTEM_PROMPT}

${emotionBlock}

${sessionBlock}

Task: ${taskDescription}`;
}
