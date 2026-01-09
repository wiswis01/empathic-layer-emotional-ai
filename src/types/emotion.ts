/**
 * Emotion Detection Types
 *
 * These types define the core data structures for emotion detection
 * and context injection in the empathy layer system.
 */

/**
 * The four emotions detected by the FER model
 * Based on the training dataset: happy, sad, surprise, neutral
 */
export type EmotionLabel =
  | 'happy'
  | 'sad'
  | 'surprise'
  | 'neutral';

/**
 * Confidence scores for each emotion class (0-1 range)
 */
export interface EmotionScores {
  happy: number;
  sad: number;
  surprise: number;
  neutral: number;
}

/**
 * Result of a single emotion detection inference
 */
export interface EmotionDetectionResult {
  /** The dominant emotion detected */
  dominantEmotion: EmotionLabel;
  /** Confidence score for the dominant emotion (0-1) */
  confidence: number;
  /** Full breakdown of all emotion scores */
  scores: EmotionScores;
  /** Timestamp of detection */
  timestamp: number;
  /** Time taken for inference in milliseconds */
  inferenceTime: number;
}

/**
 * Aggregated emotional state over a time window
 * Used for more stable emotion context in prompts
 */
export interface EmotionalState {
  /** Current dominant emotion based on recent history */
  current: EmotionLabel;
  /** Confidence in the current state (smoothed) */
  confidence: number;
  /** Recent emotion history for trend analysis */
  history: EmotionDetectionResult[];
  /** Emotional valence (-1 negative to +1 positive) */
  valence: number;
  /** Emotional arousal (0 calm to 1 excited) */
  arousal: number;
  /** Whether the emotion is considered stable or transitioning */
  isStable: boolean;
}

/**
 * Context object injected into LLM prompts
 */
export interface EmotionContext {
  /** The detected emotional state */
  state: EmotionalState;
  /** Human-readable description for prompt injection */
  description: string;
  /** Suggested response adjustments based on emotion */
  responseGuidance: string;
  /** Whether context should be actively used */
  isActive: boolean;
}

/**
 * Performance metrics for the emotion detection system
 */
export interface PerformanceMetrics {
  /** Current frames per second */
  fps: number;
  /** Average inference latency in ms */
  avgLatency: number;
  /** 95th percentile latency in ms */
  p95Latency: number;
  /** Current memory usage estimate in MB */
  memoryUsage: number;
  /** Number of successful detections */
  detectionCount: number;
  /** Number of dropped frames */
  droppedFrames: number;
  /** Backend being used (webgpu, webgl, cpu) */
  backend: string;
}

/**
 * Configuration for the emotion detection system
 */
export interface EmotionDetectorConfig {
  /** Minimum time between inferences in ms (default: 150) */
  inferenceInterval: number;
  /** Size of the history buffer for smoothing (default: 5) */
  historySize: number;
  /** Minimum confidence to consider a detection valid (default: 0.3) */
  minConfidence: number;
  /** Whether to prefer WebGPU backend (default: true) */
  preferWebGPU: boolean;
  /** Input image size for the model (default: 48) */
  inputSize: number;
  /** Whether to enable debug logging (default: false) */
  debug: boolean;
}

/**
 * Chat message with emotional context
 */
export interface EmpatheticMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Emotional context at the time of message */
  emotionContext?: EmotionContext;
}

/**
 * State of the empathetic chat session
 */
export interface ChatState {
  messages: EmpatheticMessage[];
  isLoading: boolean;
  error: string | null;
  emotionContextEnabled: boolean;
}

/**
 * Emotion-to-color mapping for UI - ARTISTIC PALETTE
 * Using ONLY the 5-color organic palette
 */
export const EMOTION_COLORS: Record<EmotionLabel, string> = {
  happy: '#bbbe64',     // Olive/Lime Yellow - Energy & warmth
  sad: '#8e5572',       // Dusty Mauve/Plum - Empathy & depth
  surprise: '#bbbe64',  // Olive/Lime Yellow - Energy & excitement
  neutral: '#bcaa99',   // Warm Beige/Tan - Natural grounding
};

/**
 * Emotion-to-emoji mapping for UI
 */
export const EMOTION_EMOJIS: Record<EmotionLabel, string> = {
  happy: 'happy',
  sad: 'sad',
  surprise: 'surprised',
  neutral: 'neutral',
};

/**
 * Default configuration for emotion detection
 */
export const DEFAULT_DETECTOR_CONFIG: EmotionDetectorConfig = {
  inferenceInterval: 100,
  historySize: 2,
  minConfidence: 0.3,
  preferWebGPU: true,
  inputSize: 48,
  debug: false,
};
