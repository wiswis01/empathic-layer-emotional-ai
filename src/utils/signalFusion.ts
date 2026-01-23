/**
 * Signal Fusion
 *
 * Bayesian fusion of multiple signal sources:
 * - Face emotion (from TensorFlow.js model)
 * - Behavioral signals (from interaction/motion tracking)
 * - Hand gestures (from MediaPipe)
 *
 * Implements PMC8969204 adapted methodology Step 7 (partial):
 * Combines signals with uncertainty-weighted averaging
 */

import type {
  EmotionDetectionResult,
  ThreeDimensionalState,
  HandGestureResult,
  UncertaintyLevel,
  EmotionLabel,
} from '@/types/emotion';

// Weight assignments for signal sources
const SOURCE_WEIGHTS = {
  face: 0.3,      // Face emotion
  behavioral: 0.5, // Behavioral signals (primary)
  hand: 0.2,       // Hand gestures
};

// Face emotion to dimensional mapping
const FACE_EMOTION_MAP: Record<EmotionLabel, { valence: number; arousal: number }> = {
  happy: { valence: 0.8, arousal: 0.6 },
  sad: { valence: -0.7, arousal: 0.3 },
  surprise: { valence: 0.2, arousal: 0.9 },
  neutral: { valence: 0, arousal: 0.2 },
};

// Hand sign to control mapping
const HAND_SIGN_CONTROL: Record<string, number> = {
  Open: 0.8,     // Relaxed, open posture
  Pointer: 0.7,  // Directed, intentional
  OK: 0.9,       // Confident gesture
  Close: 0.4,    // Tense, closed
};

export interface FusedEmotionalState {
  /** Fused 3D dimensions */
  dimensions: ThreeDimensionalState;
  /** Source contributions for debugging */
  sourceContributions: {
    face: number;
    behavioral: number;
    hand: number;
  };
  /** Overall fusion confidence */
  fusionConfidence: number;
  /** Whether face was available */
  hasFace: boolean;
  /** Whether hand was available */
  hasHand: boolean;
}

/**
 * Calculate face emotion contribution to dimensions
 */
function getFaceDimensions(
  faceEmotion: EmotionDetectionResult | null
): { valence: number; arousal: number; weight: number } | null {
  if (!faceEmotion || faceEmotion.confidence < 0.3) {
    return null;
  }

  const mapping = FACE_EMOTION_MAP[faceEmotion.dominantEmotion];
  const weight = faceEmotion.confidence;

  return {
    valence: mapping.valence,
    arousal: mapping.arousal,
    weight,
  };
}

/**
 * Calculate hand gesture contribution to control dimension
 */
function getHandControl(
  handGesture: HandGestureResult | null
): { control: number; weight: number } | null {
  if (!handGesture || !handGesture.isDetected || !handGesture.handSign) {
    return null;
  }

  const control = HAND_SIGN_CONTROL[handGesture.handSign] ?? 0.5;
  const weight = handGesture.handSignConfidence;

  return { control, weight };
}

/**
 * Fuse multiple signal sources into unified 3D emotional state
 *
 * Uses weighted averaging with confidence-based weight adjustment
 */
export function fuseSignals(
  faceEmotion: EmotionDetectionResult | null,
  behavioral: ThreeDimensionalState,
  handGesture: HandGestureResult | null
): FusedEmotionalState {
  // Get available signal contributions
  const face = getFaceDimensions(faceEmotion);
  const hand = getHandControl(handGesture);

  // Track which sources are available
  const hasFace = face !== null;
  const hasHand = hand !== null;

  // Calculate effective weights based on availability
  let totalWeight = SOURCE_WEIGHTS.behavioral;
  let faceWeight = 0;
  let handWeight = 0;

  if (hasFace) {
    faceWeight = SOURCE_WEIGHTS.face * face!.weight;
    totalWeight += faceWeight;
  }

  if (hasHand) {
    handWeight = SOURCE_WEIGHTS.hand * hand!.weight;
    totalWeight += handWeight;
  }

  // Normalize weights
  const behavioralWeight = SOURCE_WEIGHTS.behavioral / totalWeight;
  faceWeight = faceWeight / totalWeight;
  handWeight = handWeight / totalWeight;

  // Fuse arousal
  let fusedArousal = behavioral.arousal * behavioralWeight;
  if (hasFace) {
    fusedArousal += face!.arousal * faceWeight;
  }

  // Fuse valence
  let fusedValence = behavioral.valence * behavioralWeight;
  if (hasFace) {
    fusedValence += face!.valence * faceWeight;
  }

  // Fuse control
  let fusedControl = behavioral.control * behavioralWeight;
  if (hasHand) {
    fusedControl += hand!.control * handWeight;
  }
  // Behavioral also contributes to control when hand unavailable
  if (!hasHand) {
    fusedControl = behavioral.control;
  }

  // Calculate fusion confidence
  const availableSources = 1 + (hasFace ? 1 : 0) + (hasHand ? 1 : 0);
  const fusionConfidence = (
    behavioral.confidence * behavioralWeight +
    (hasFace ? face!.weight * faceWeight : 0) +
    (hasHand ? hand!.weight * handWeight : 0)
  ) * (availableSources / 3);

  // Determine uncertainty level from fusion confidence
  let uncertainty: UncertaintyLevel;
  if (fusionConfidence >= 0.6) {
    uncertainty = 'low';
  } else if (fusionConfidence >= 0.3) {
    uncertainty = 'medium';
  } else {
    uncertainty = 'high';
  }

  return {
    dimensions: {
      arousal: Math.max(0, Math.min(1, fusedArousal)),
      valence: Math.max(-1, Math.min(1, fusedValence)),
      control: Math.max(0, Math.min(1, fusedControl)),
      confidence: fusionConfidence,
      uncertainty,
    },
    sourceContributions: {
      face: faceWeight,
      behavioral: behavioralWeight,
      hand: handWeight,
    },
    fusionConfidence,
    hasFace,
    hasHand,
  };
}

/**
 * Fuse only behavioral signals (when face/hand unavailable)
 */
export function fuseBehavioralOnly(
  behavioral: ThreeDimensionalState
): FusedEmotionalState {
  return {
    dimensions: behavioral,
    sourceContributions: {
      face: 0,
      behavioral: 1,
      hand: 0,
    },
    fusionConfidence: behavioral.confidence * 0.7, // Reduce confidence when single source
    hasFace: false,
    hasHand: false,
  };
}

export default {
  fuseSignals,
  fuseBehavioralOnly,
};
