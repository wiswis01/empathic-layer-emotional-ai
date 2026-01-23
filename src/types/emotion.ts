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

/**
 * Hand sign types from keypoint classifier
 */
export type HandSignLabel = 'Open' | 'Close' | 'Pointer' | 'OK';

/**
 * Finger gesture types from point history classifier
 */
export type FingerGestureLabel = 'Stop' | 'Clockwise' | 'Counter Clockwise' | 'Move';

/**
 * Hand landmark point (x, y coordinates)
 */
export interface HandLandmark {
  x: number;
  y: number;
}

/**
 * Hand gesture detection result
 */
export interface HandGestureResult {
  /** Detected hand sign */
  handSign: HandSignLabel | null;
  /** Detected finger gesture */
  fingerGesture: FingerGestureLabel | null;
  /** Confidence score for hand sign (0-1) */
  handSignConfidence: number;
  /** Confidence score for finger gesture (0-1) */
  fingerGestureConfidence: number;
  /** Hand landmarks (21 points) */
  landmarks: HandLandmark[];
  /** Whether hand is detected */
  isDetected: boolean;
  /** Timestamp of detection */
  timestamp: number;
  /** Time taken for inference in milliseconds */
  inferenceTime: number;
}

// ============================================================================
// PMC8969204 Adapted Methodology Types
// ============================================================================

/**
 * Uncertainty level thresholds (PMC8969204 A7)
 * - high: U < 0.3 (signals insufficient/conflicting)
 * - medium: 0.3 <= U < 0.6
 * - low: U >= 0.6 (high confidence)
 */
export type UncertaintyLevel = 'high' | 'medium' | 'low';

/**
 * 3D Dimensional State (PMC8969204 Adapted)
 * Extends 2D valence-arousal with Control dimension
 */
export interface ThreeDimensionalState {
  /** Arousal: 0-1 (calm to activated) */
  arousal: number;
  /** Valence: -1 to +1 (negative to positive) */
  valence: number;
  /** Control: 0-1 (low to high perceived control) */
  control: number;
  /** Overall confidence in estimate (0-1) */
  confidence: number;
  /** Uncertainty level classification */
  uncertainty: UncertaintyLevel;
}

/**
 * Raw behavioral signals captured from user interactions
 * (PMC8969204 Steps 1-3)
 */
export interface BehavioralSignals {
  // Latency & Hesitation (A12)
  /** Time since last interaction (ms) */
  interactionLatency: number;
  /** Pause before action (ms) */
  hesitationDuration: number;
  /** Time to respond to prompts (ms) */
  responseTime: number;

  // Motion Quality (A13)
  /** Motion smoothness 0-1 (Bezier fit R²) */
  motionSmoothness: number;
  /** Jitter magnitude (normalized deviation) */
  jitterMagnitude: number;
  /** Direction reversal count in window */
  correctionCount: number;
  /** Direct distance / actual distance (0-1) */
  pathEfficiency: number;
  /** Motion speed (px/ms) */
  motionSpeed: number;

  // Engagement (A14)
  /** Continuous interaction time (ms) */
  engagementDuration: number;
  /** Time before abandonment (ms), null if not abandoned */
  abandonmentTiming: number | null;

  // Temporal
  /** Capture timestamp */
  timestamp: number;
  /** Time since last sample (ms) */
  deltaTime: number;

  // Derived
  /** Deviation from baseline (0-1 normalized) */
  deviationFromBaseline: number;
}

/**
 * Rolling baseline for behavioral signals (PMC8969204 Step 1)
 * 60-second rolling window of interaction patterns
 */
export interface BehavioralBaseline {
  /** Mean interaction latency */
  μ_latency: number;
  /** Mean motion smoothness */
  μ_smooth: number;
  /** Mean engagement duration */
  μ_engage: number;
  /** Standard deviation of latency */
  σ_latency: number;
  /** Standard deviation of smoothness */
  σ_smooth: number;
  /** Standard deviation of engagement */
  σ_engage: number;
  /** Number of samples in baseline */
  sampleCount: number;
  /** Last update timestamp */
  lastUpdated: number;
  /** Session start time */
  sessionStart: number;
}

/**
 * Deviation vector from baseline (PMC8969204 Step 2)
 */
export interface DeviationVector {
  ΔLatency: number;
  ΔSmooth: number;
  ΔEngage: number;
  /** Whether deviation exceeds threshold (1.5σ) */
  isSignificant: boolean;
  /** Timestamp of deviation calculation */
  timestamp: number;
}

/**
 * Behavioral response capture (PMC8969204 Step 3)
 */
export interface BehavioralResponse {
  /** Jitter magnitude in 100ms window */
  jitter: number;
  /** Direction reversals in window */
  corrections: number;
  /** Whether interaction was abandoned */
  abandonment: boolean;
  /** Response latency (ms) */
  responseLatency: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Uncertainty metrics (PMC8969204 Steps 4-5)
 */
export interface UncertaintyMetrics {
  /** Coupling coefficient ρ - stimulus-response correlation (Step 4) */
  coupling: number;
  /** Stability metric σ - pattern consistency (Step 5) */
  stability: number;
  /** Signal density - proportion of valid signals */
  signalDensity: number;
  /** Overall uncertainty U = f(ρ, σ, density) */
  overallUncertainty: number;
  /** Classified uncertainty level */
  level: UncertaintyLevel;
}

/**
 * Context weights for dimensional estimation (PMC8969204 Step 6)
 */
export interface ContextWeights {
  /** Task type weight: chat=1.0, navigation=0.7, passive=0.5 */
  taskType: number;
  /** Time in session decay factor */
  timeInSession: number;
  /** Success history EMA */
  successHistory: number;
}

/**
 * Dimensional weights for signal-to-dimension mapping (PMC8969204 Step 7)
 */
export interface DimensionalWeights {
  arousal: {
    jitter: number;    // 0.4
    speed: number;     // 0.3
    deviation: number; // 0.3
  };
  valence: {
    engagement: number;   // 0.5
    abandonment: number;  // -0.3
    smoothness: number;   // 0.2
  };
  control: {
    corrections: number;    // -0.4
    hesitation: number;     // -0.35
    pathEfficiency: number; // 0.25
  };
}

/**
 * Default dimensional weights (PMC8969204 Assumptions A12-A14)
 */
export const DEFAULT_DIMENSIONAL_WEIGHTS: DimensionalWeights = {
  arousal: { jitter: 0.4, speed: 0.3, deviation: 0.3 },
  valence: { engagement: 0.5, abandonment: -0.3, smoothness: 0.2 },
  control: { corrections: -0.4, hesitation: -0.35, pathEfficiency: 0.25 },
};

/**
 * Full pipeline state (PMC8969204 Steps 1-8)
 */
export interface PipelineState {
  /** Step 1: Baseline */
  baseline: BehavioralBaseline;
  /** Step 2: Deviation */
  deviation: DeviationVector;
  /** Step 3: Response */
  response: BehavioralResponse;
  /** Step 4: Coupling coefficient */
  coupling: number;
  /** Step 5: Stability metric */
  stability: number;
  /** Step 6: Context weights */
  contextWeights: ContextWeights;
  /** Step 7: Dimensional estimate */
  dimensions: ThreeDimensionalState;
  /** Step 8: Baseline updated flag */
  baselineUpdated: boolean;
  /** Pipeline execution time (ms) */
  pipelineLatency: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Trajectory point for visualization
 */
export interface TrajectoryPoint {
  arousal: number;
  valence: number;
  control: number;
  uncertainty: UncertaintyLevel;
  timestamp: number;
}

/**
 * Enhanced emotion context with 3D model
 */
export interface EnhancedEmotionContext extends EmotionContext {
  /** 3D dimensional state */
  dimensions: ThreeDimensionalState;
  /** Uncertainty metrics */
  uncertaintyMetrics: UncertaintyMetrics;
  /** Control dimension description */
  controlDescription: string;
  /** Trajectory history */
  trajectory: TrajectoryPoint[];
}

/**
 * Session data for IndexedDB storage
 */
/**
 * Mental health metrics calculated from emotion data
 * (Duplicated here to avoid circular dependency with mentalHealthMetrics.ts)
 */
export interface MentalHealthMetrics {
  /** Ratio of positive to total emotions (0-1) */
  emotionalBalance: number;
  /** How stable emotions are over time (0-1, higher = more stable) */
  moodStability: number;
  /** Indicator of stress based on patterns (0-1, higher = more stress indicators) */
  stressIndicator: number;
  /** Level of emotional engagement/intensity (0-1) */
  engagementLevel: number;
  /** Timestamp of calculation */
  timestamp: number;
}

export interface EmotionSession {
  id: string;
  startTime: number;
  endTime: number;
  emotionSamples: EmotionDetectionResult[];
  behavioralSamples: BehavioralSignals[];
  trajectory: TrajectoryPoint[];
  finalBaseline: BehavioralBaseline;
  metrics: MentalHealthMetrics;
}
