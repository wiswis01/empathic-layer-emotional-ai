/**
 * Dimensional Estimation
 *
 * Implements PMC8969204 adapted methodology Step 7:
 * Calculate 3D emotional dimensions from behavioral signals
 *
 * Dimensions:
 * - Arousal (0-1): jitter(0.4) + speed(0.3) + deviation(0.3)
 * - Valence (-1 to +1): engagement(0.5) - abandonment(0.3) + smoothness(0.2)
 * - Control (0-1): -corrections(0.4) - hesitation(0.35) + pathEfficiency(0.25)
 */

import type {
  BehavioralSignals,
  ThreeDimensionalState,
  DimensionalWeights,
  UncertaintyLevel,
} from '@/types/emotion';

// Default weights from PMC8969204 methodology
const DEFAULT_WEIGHTS: DimensionalWeights = {
  arousal: { jitter: 0.4, speed: 0.3, deviation: 0.3 },
  valence: { engagement: 0.5, abandonment: -0.3, smoothness: 0.2 },
  control: { corrections: -0.4, hesitation: -0.35, pathEfficiency: 0.25 },
};

// Normalization parameters (empirically tuned)
const NORMALIZATION = {
  speed: { min: 0, max: 2 }, // px/ms
  jitter: { min: 0, max: 1 },
  deviation: { min: 0, max: 3 }, // standard deviations
  engagement: { min: 0, max: 30000 }, // ms
  hesitation: { min: 0, max: 5000 }, // ms
  corrections: { min: 0, max: 10 }, // count
  pathEfficiency: { min: 0, max: 1 },
};

/**
 * Normalize a value to 0-1 range
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Clamp a value to a specified range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate arousal dimension from behavioral signals
 * Arousal = jitter(0.4) + speed(0.3) + deviation(0.3)
 */
export function calculateArousal(
  signals: BehavioralSignals,
  weights: DimensionalWeights['arousal'] = DEFAULT_WEIGHTS.arousal
): number {
  const normalizedJitter = signals.jitterMagnitude; // Already 0-1
  const normalizedSpeed = normalize(
    signals.motionSpeed,
    NORMALIZATION.speed.min,
    NORMALIZATION.speed.max
  );
  const normalizedDeviation = normalize(
    signals.deviationFromBaseline,
    NORMALIZATION.deviation.min,
    NORMALIZATION.deviation.max
  );

  const arousal =
    normalizedJitter * weights.jitter +
    normalizedSpeed * weights.speed +
    normalizedDeviation * weights.deviation;

  return clamp(arousal, 0, 1);
}

/**
 * Calculate valence dimension from behavioral signals
 * Valence = engagement(0.5) - abandonment(0.3) + smoothness(0.2)
 */
export function calculateValence(
  signals: BehavioralSignals,
  weights: DimensionalWeights['valence'] = DEFAULT_WEIGHTS.valence
): number {
  const normalizedEngagement = normalize(
    signals.engagementDuration,
    NORMALIZATION.engagement.min,
    NORMALIZATION.engagement.max
  );
  const abandonmentPenalty = signals.abandonmentTiming !== null ? 1 : 0;
  const normalizedSmoothness = signals.motionSmoothness; // Already 0-1

  // Calculate raw valence (can be -1 to +1)
  const rawValence =
    normalizedEngagement * weights.engagement +
    abandonmentPenalty * weights.abandonment + // abandonment weight is negative
    normalizedSmoothness * weights.smoothness;

  // Scale to -1 to +1 range
  // Raw range: ~[-0.3, 0.7] → scale to [-1, +1]
  const scaledValence = (rawValence - 0.2) / 0.5;

  return clamp(scaledValence, -1, 1);
}

/**
 * Calculate control dimension from behavioral signals
 * Control = -corrections(0.4) - hesitation(0.35) + pathEfficiency(0.25)
 */
export function calculateControl(
  signals: BehavioralSignals,
  weights: DimensionalWeights['control'] = DEFAULT_WEIGHTS.control
): number {
  const normalizedCorrections = normalize(
    signals.correctionCount,
    NORMALIZATION.corrections.min,
    NORMALIZATION.corrections.max
  );
  const normalizedHesitation = normalize(
    signals.hesitationDuration,
    NORMALIZATION.hesitation.min,
    NORMALIZATION.hesitation.max
  );
  const normalizedPathEfficiency = signals.pathEfficiency; // Already 0-1

  // Calculate control (weights for corrections and hesitation are negative)
  const control =
    (1 - normalizedCorrections) * Math.abs(weights.corrections) +
    (1 - normalizedHesitation) * Math.abs(weights.hesitation) +
    normalizedPathEfficiency * weights.pathEfficiency;

  return clamp(control, 0, 1);
}

/**
 * Calculate all three dimensions from behavioral signals
 */
export function calculateThreeDimensions(
  signals: BehavioralSignals,
  weights: DimensionalWeights = DEFAULT_WEIGHTS,
  uncertaintyLevel: UncertaintyLevel = 'medium'
): ThreeDimensionalState {
  const arousal = calculateArousal(signals, weights.arousal);
  const valence = calculateValence(signals, weights.valence);
  const control = calculateControl(signals, weights.control);

  // Calculate confidence based on signal quality
  const signalQuality =
    (signals.motionSmoothness + signals.pathEfficiency + (1 - signals.jitterMagnitude)) / 3;

  const confidence = uncertaintyLevel === 'low'
    ? 0.8 + signalQuality * 0.2
    : uncertaintyLevel === 'medium'
      ? 0.4 + signalQuality * 0.3
      : 0.1 + signalQuality * 0.2;

  return {
    arousal,
    valence,
    control,
    confidence: clamp(confidence, 0, 1),
    uncertainty: uncertaintyLevel,
  };
}

/**
 * Describe arousal level for prompts
 */
export function describeArousal(arousal: number): string {
  if (arousal > 0.7) return 'high energy, activated';
  if (arousal > 0.4) return 'moderate energy';
  return 'calm, relaxed';
}

/**
 * Describe valence level for prompts
 */
export function describeValence(valence: number): string {
  if (valence > 0.3) return 'positive, engaged';
  if (valence > -0.3) return 'neutral';
  return 'negative, disengaged';
}

/**
 * Describe control level for prompts
 */
export function describeControl(control: number): string {
  if (control > 0.7) return 'confident, in control';
  if (control > 0.4) return 'moderate control';
  return 'uncertain, hesitant';
}

/**
 * Get full dimensional description for prompts
 */
export function getDimensionalDescription(state: ThreeDimensionalState): string {
  const arousalDesc = describeArousal(state.arousal);
  const valenceDesc = describeValence(state.valence);
  const controlDesc = describeControl(state.control);

  return `The user appears ${arousalDesc}, with ${valenceDesc} affect, and ${controlDesc}.`;
}

export default {
  calculateArousal,
  calculateValence,
  calculateControl,
  calculateThreeDimensions,
  describeArousal,
  describeValence,
  describeControl,
  getDimensionalDescription,
};
