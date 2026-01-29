/**
 * Therapist Agent Types
 *
 * Core type definitions for the hybrid AI therapist assistance system.
 * Integrates rule-based detection with LLM question phrasing.
 */

import type { EmotionLabel, EmotionContext } from '../types/emotion';

// ============================================================================
// ENUMS
// ============================================================================

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRISIS = 'crisis'
}

export enum QuestionCategory {
  OPENING = 'opening',
  EXPLORATION = 'exploration',
  CLARIFICATION = 'clarification',
  EMOTION_PROBE = 'emotion_probe',
  COPING = 'coping',
  SAFETY = 'safety',
  CLOSING = 'closing'
}

export enum SuggestionType {
  QUESTION = 'question',
  RISK_ALERT = 'risk_alert',
  TOPIC_GAP = 'topic_gap',
  PATTERN = 'pattern',
  INSIGHT = 'insight'
}

export enum ClinicalCondition {
  DEPRESSION = 'depression',
  ANXIETY = 'anxiety',
  PTSD = 'ptsd',
  BIPOLAR = 'bipolar',
  GRIEF = 'grief',
  CRISIS = 'crisis'
}

export enum TopicDepth {
  SURFACE = 'surface',
  MODERATE = 'moderate',
  DEEP = 'deep'
}

// ============================================================================
// THERAPIST SUGGESTIONS
// ============================================================================

export interface TherapistSuggestion {
  /** Unique identifier */
  id: string;
  /** Type of suggestion */
  type: SuggestionType;
  /** The suggestion text */
  content: string;
  /** Priority level 1-5 (5 = urgent) */
  priority: number;
  /** Reasoning behind the suggestion */
  reasoning: string;
  /** When this was generated */
  timestamp: number;
  /** What emotion triggered this */
  emotionTrigger?: EmotionLabel;
  /** Confidence in the suggestion (0-1) */
  confidence: number;
  /** Related clinical condition if applicable */
  condition?: ClinicalCondition;
  /** Whether the therapist has dismissed this */
  dismissed: boolean;
  /** Whether the therapist has used this */
  used: boolean;
}

// ============================================================================
// CLINICAL PATTERNS
// ============================================================================

export interface ClinicalPattern {
  /** The clinical condition */
  condition: ClinicalCondition;
  /** Display name */
  displayName: string;
  /** Behavioral/emotional markers to detect */
  markers: string[];
  /** Expected emotion distribution for this condition */
  emotionalProfile: Partial<Record<EmotionLabel, number>>;
  /** Weight for risk calculation (0-1) */
  riskWeight: number;
  /** Base question topics for this condition */
  baseQuestionTopics: string[];
  /** DSM/clinical reference (informational) */
  clinicalReference?: string;
}

export interface PatternMatch {
  /** The matched pattern */
  pattern: ClinicalPattern;
  /** Confidence in the match (0-1) */
  confidence: number;
  /** Which markers were detected */
  detectedMarkers: string[];
  /** Timestamp of detection */
  timestamp: number;
  /** Duration this pattern has been observed (ms) */
  duration: number;
}

// ============================================================================
// RISK DETECTION
// ============================================================================

export interface RiskIndicator {
  /** Type of risk detected */
  type: 'suicidal_ideation' | 'self_harm' | 'crisis' | 'dissociation' | 'severe_distress';
  /** Confidence in detection (0-1) */
  confidence: number;
  /** What triggered the detection */
  triggers: string[];
  /** Recommended action for therapist */
  recommendedAction: string;
  /** Timestamp */
  timestamp: number;
}

export interface RiskAssessment {
  /** Current risk level */
  level: RiskLevel;
  /** Individual risk indicators */
  indicators: RiskIndicator[];
  /** Overall risk score (0-1) */
  score: number;
  /** Emotion trajectory trend */
  emotionTrajectory: 'improving' | 'stable' | 'declining' | 'volatile';
  /** Time since last assessment */
  lastAssessed: number;
  /** Recommended immediate actions */
  immediateActions: string[];
}

// ============================================================================
// THERAPEUTIC QUESTIONS
// ============================================================================

export interface TherapeuticQuestion {
  /** Unique identifier */
  id: string;
  /** The question text */
  text: string;
  /** Category of question */
  category: QuestionCategory;
  /** Target emotions this question is for */
  targetEmotions: EmotionLabel[];
  /** Conditions this applies to */
  conditions: ClinicalCondition[];
  /** Suggested follow-up questions */
  followUps: string[];
  /** When NOT to ask this question */
  avoidWhen: string[];
  /** Minimum session time before asking (seconds) */
  minSessionTime?: number;
  /** Whether this has been rephrased by LLM */
  llmRephrased: boolean;
  /** Original template if rephrased */
  originalTemplate?: string;
}

// ============================================================================
// SESSION TRACKING
// ============================================================================

export interface TopicCoverage {
  /** Topic identifier */
  topic: string;
  /** Display name */
  displayName: string;
  /** Whether this has been covered */
  covered: boolean;
  /** Time spent on this topic (seconds) */
  timeSpentSeconds: number;
  /** Emotions detected during discussion */
  emotionsDuring: EmotionLabel[];
  /** Depth of coverage */
  depth: TopicDepth;
  /** Timestamps when discussed */
  discussedAt: number[];
}

export interface SessionState {
  /** Unique session identifier */
  sessionId: string;
  /** Session start timestamp */
  startTime: number;
  /** Topics covered with metadata */
  topicsCovered: TopicCoverage[];
  /** Emotional timeline: [timestamp, emotion, confidence] */
  emotionalTimeline: Array<{
    timestamp: number;
    emotion: EmotionLabel;
    confidence: number;
  }>;
  /** Risk events during session */
  riskEvents: RiskIndicator[];
  /** Questions that have been suggested */
  suggestedQuestions: TherapistSuggestion[];
  /** Questions that were used by therapist */
  usedQuestions: string[];
  /** Topics not yet covered */
  uncoveredTopics: string[];
  /** Current detected patterns */
  activePatterns: PatternMatch[];
  /** Session duration in seconds */
  duration: number;
  /** Whether session is active */
  isActive: boolean;
}

export interface SessionReport {
  /** Session state snapshot */
  session: SessionState;
  /** Summary statistics */
  summary: {
    totalDuration: number;
    topicsCoveredCount: number;
    topicsUncoveredCount: number;
    dominantEmotion: EmotionLabel;
    emotionalStability: number;
    riskEventsCount: number;
    highestRiskLevel: RiskLevel;
    suggestionsUsedCount: number;
    suggestionsGeneratedCount: number;
  };
  /** Detected clinical patterns */
  patterns: PatternMatch[];
  /** Recommendations for next session */
  recommendations: string[];
}

// ============================================================================
// TRANSCRIPT & STT
// ============================================================================

export interface TranscriptSegment {
  /** Unique identifier */
  id: string;
  /** The transcribed text */
  text: string;
  /** Start time from session start (seconds) */
  startTime: number;
  /** End time from session start (seconds) */
  endTime: number;
  /** Who spoke */
  speaker: 'patient' | 'therapist' | 'unknown';
  /** Emotion detected at this time */
  emotionAtTime?: EmotionLabel;
  /** Confidence of emotion detection */
  emotionConfidence: number;
  /** Risk/topic keywords detected */
  keywordsDetected: string[];
  /** Whether this segment contains flagged content */
  flagged: boolean;
  /** Reason for flagging if flagged */
  flagReason?: string;
}

export interface SessionTranscript {
  /** Session identifier */
  sessionId: string;
  /** All transcript segments */
  segments: TranscriptSegment[];
  /** Total duration in seconds */
  totalDuration: number;
  /** Emotion timeline aligned with transcript */
  emotionTimeline: Array<{
    timestamp: number;
    emotion: EmotionLabel;
    confidence: number;
  }>;
  /** Whether transcription is active */
  isRecording: boolean;
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface AgentConfig {
  /** Enable/disable LLM question rephrasing */
  enableLLMPhrasing: boolean;
  /** Risk detection sensitivity (0-1) */
  riskSensitivity: number;
  /** Minimum confidence for pattern detection */
  patternMinConfidence: number;
  /** How often to generate suggestions (ms) */
  suggestionInterval: number;
  /** Maximum suggestions to show at once */
  maxActiveSuggestions: number;
  /** Topics to track during session */
  trackedTopics: string[];
  /** Enable crisis keyword detection */
  enableCrisisDetection: boolean;
  /** Custom crisis keywords (added to defaults) */
  customCrisisKeywords: string[];
  /** Enable audio transcription */
  enableTranscription: boolean;
  /** Transcription language */
  transcriptionLanguage: string;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  enableLLMPhrasing: true,
  riskSensitivity: 0.7,
  patternMinConfidence: 0.6,
  suggestionInterval: 5000,
  maxActiveSuggestions: 5,
  trackedTopics: [
    'sleep_patterns',
    'appetite_eating',
    'social_relationships',
    'work_school',
    'physical_health',
    'medication_compliance',
    'coping_strategies',
    'safety_self_harm',
    'family_dynamics',
    'recent_stressors'
  ],
  enableCrisisDetection: true,
  customCrisisKeywords: [],
  enableTranscription: false,
  transcriptionLanguage: 'en-US'
};

// ============================================================================
// THERAPIST METRICS (6 Core Metrics)
// ============================================================================

export interface TherapistMetrics {
  /** Emotional balance score (-1 to 1) */
  emotionalBalance: number;
  /** Mood stability (0-1, higher = more stable) */
  moodStability: number;
  /** Stress indicator (0-1, higher = more stress) */
  stressIndicator: number;
  /** Engagement level (0-1) */
  engagementLevel: number;
  /** Congruence between words and facial expression (0-1) */
  congruenceScore: number;
  /** Current risk level */
  riskLevel: RiskLevel;
  /** Last updated timestamp */
  lastUpdated: number;
}

// ============================================================================
// EMOTION CONTEXT SNAPSHOT (Extended)
// ============================================================================

export interface EmotionContextSnapshot {
  /** The current emotion context from detection */
  emotionContext: EmotionContext;
  /** Timestamp of snapshot */
  timestamp: number;
  /** Recent transcript if available */
  recentTranscript?: string;
  /** Current session state */
  sessionState?: SessionState;
  /** Current metrics */
  metrics?: TherapistMetrics;
}

// ============================================================================
// AGENT EVENTS
// ============================================================================

export type AgentEventType =
  | 'suggestion_generated'
  | 'risk_alert'
  | 'pattern_detected'
  | 'topic_covered'
  | 'session_started'
  | 'session_ended'
  | 'transcript_segment';

export interface AgentEvent {
  type: AgentEventType;
  payload: unknown;
  timestamp: number;
}

export type AgentEventHandler = (event: AgentEvent) => void;
