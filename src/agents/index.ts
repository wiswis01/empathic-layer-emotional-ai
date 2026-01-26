/**
 * Agents Module
 *
 * Exports all agent-related functionality for the therapist assistance system.
 */

// Main agent
export {
  TherapistAgent,
  createTherapistAgent,
  getRiskLevelColor,
  getRiskLevelText,
  formatDuration
} from './TherapistAgent';

// Types
export * from './types';

// Tools
export {
  CLINICAL_PATTERNS,
  matchPatterns,
  getDominantPattern,
  isConditionDetected,
  getPatternConfidence,
  getRelevantQuestionTopics,
  calculateEmotionalStability,
  getPatternSummary
} from './tools/clinicalPatterns';

export {
  RiskDetector,
  CRISIS_KEYWORDS,
  PROTECTIVE_KEYWORDS,
  containsCrisisKeywords
} from './tools/riskDetector';

export {
  QuestionBank,
  EMOTION_QUESTIONS,
  CONDITION_QUESTIONS,
  CATEGORY_DESCRIPTIONS,
  createRephrasingPrompt
} from './tools/questionBank';

export {
  SessionTracker,
  STANDARD_TOPICS,
  getTopicCategoryColor
} from './tools/sessionTracker';

// Prompts
export {
  THERAPIST_AGENT_SYSTEM_PROMPT,
  buildEmotionContextBlock,
  buildSessionContextBlock,
  createQuestionRephrasingPrompt,
  createFollowUpPrompt,
  createPatternInsightPrompt,
  createRiskAwareSuggestionPrompt,
  createTopicGapPrompt,
  createSessionSummaryPrompt,
  getEmotionGuidance,
  getConditionApproach,
  formatSuggestionForDisplay,
  buildFullAgentPrompt
} from './prompts/therapistPrompts';
