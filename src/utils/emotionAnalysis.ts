/**
 * Emotion Analysis Utilities
 *
 * Functions for analyzing and processing emotion detection results
 * to create stable, meaningful emotional context for LLM prompts.
 */

import type {
  EmotionLabel,
  EmotionScores,
  EmotionDetectionResult,
  EmotionalState,
  EmotionContext,
} from '@/types/emotion';

/**
 * Valence values for each emotion (-1 to +1 scale)
 * Represents how negative or positive the emotion is
 */
const EMOTION_VALENCE: Record<EmotionLabel, number> = {
  happy: 0.9,
  surprise: 0.3,
  neutral: 0.0,
  sad: -0.7,
};

/**
 * Arousal values for each emotion (0 to 1 scale)
 * Represents how calm or excited the emotion is
 */
const EMOTION_AROUSAL: Record<EmotionLabel, number> = {
  surprise: 0.9,
  happy: 0.6,
  sad: 0.3,
  neutral: 0.2,
};

/**
 * Calculate the dominant emotion from raw scores
 */
export function getDominantEmotion(scores: EmotionScores): {
  emotion: EmotionLabel;
  confidence: number;
} {
  const entries = Object.entries(scores) as [EmotionLabel, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return {
    emotion: sorted[0][0],
    confidence: sorted[0][1],
  };
}

/**
 * Apply fast smoothing to emotion history (optimized for <50ms latency)
 * Uses minimal smoothing for instant response while preventing jitter
 */
export function smoothEmotionScores(
  history: EmotionDetectionResult[],
  _alpha: number = 1.0  // 1.0 = no smoothing, use latest directly
): EmotionScores {
  if (history.length === 0) {
    return {
      happy: 0,
      sad: 0,
      surprise: 0,
      neutral: 1,
    };
  }

  // For minimal history (1-2 items), return latest immediately for speed
  if (history.length <= 2) {
    return history[history.length - 1].scores;
  }

  // Fast weighted average: 70% latest, 30% previous (light smoothing)
  const latest = history[history.length - 1].scores;
  const previous = history[history.length - 2].scores;
  
  return {
    happy: 0.7 * latest.happy + 0.3 * previous.happy,
    sad: 0.7 * latest.sad + 0.3 * previous.sad,
    surprise: 0.7 * latest.surprise + 0.3 * previous.surprise,
    neutral: 0.7 * latest.neutral + 0.3 * previous.neutral,
  };
}

/**
 * Calculate emotional valence and arousal from scores
 */
export function calculateEmotionalDimensions(scores: EmotionScores): {
  valence: number;
  arousal: number;
} {
  let valence = 0;
  let arousal = 0;
  let totalWeight = 0;

  for (const emotion of Object.keys(scores) as EmotionLabel[]) {
    const weight = scores[emotion];
    valence += EMOTION_VALENCE[emotion] * weight;
    arousal += EMOTION_AROUSAL[emotion] * weight;
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    valence /= totalWeight;
    arousal /= totalWeight;
  }

  return { valence, arousal };
}

/**
 * Determine if the emotional state is stable (optimized for speed)
 * Simplified check for minimal latency
 */
export function isEmotionStable(
  history: EmotionDetectionResult[],
  _threshold: number = 0.5  // Lower threshold for faster detection
): boolean {
  if (history.length < 2) return false;

  // Fast check: if last two emotions match, consider stable
  const last = history[history.length - 1].dominantEmotion;
  const prev = history[history.length - 2].dominantEmotion;
  return last === prev;
}

/**
 * Create an EmotionalState from detection history
 */
export function createEmotionalState(
  history: EmotionDetectionResult[]
): EmotionalState {
  const smoothedScores = smoothEmotionScores(history);
  const { emotion, confidence } = getDominantEmotion(smoothedScores);
  const { valence, arousal } = calculateEmotionalDimensions(smoothedScores);
  const stable = isEmotionStable(history);

  return {
    current: emotion,
    confidence,
    history,
    valence,
    arousal,
    isStable: stable,
  };
}

/**
 * Generate a human-readable description of the emotional state
 */
export function describeEmotionalState(state: EmotionalState): string {
  const { current, confidence, valence, arousal, isStable } = state;

  // Intensity descriptors based on confidence
  let intensity: string;
  if (confidence > 0.8) intensity = 'strongly';
  else if (confidence > 0.5) intensity = 'moderately';
  else if (confidence > 0.3) intensity = 'slightly';
  else intensity = 'possibly';

  // Stability descriptor
  const stabilityNote = isStable
    ? 'This appears to be a sustained state.'
    : 'This state may be transitioning.';

  // Valence/arousal description
  let dimensionalDesc: string;
  if (valence > 0.3 && arousal > 0.5) {
    dimensionalDesc = 'The user seems energized and positive.';
  } else if (valence > 0.3 && arousal <= 0.5) {
    dimensionalDesc = 'The user seems calm and content.';
  } else if (valence < -0.3 && arousal > 0.5) {
    dimensionalDesc = 'The user seems distressed or agitated.';
  } else if (valence < -0.3 && arousal <= 0.5) {
    dimensionalDesc = 'The user seems subdued or melancholic.';
  } else {
    dimensionalDesc = 'The user appears emotionally neutral.';
  }

  return `The user appears ${intensity} ${current}. ${stabilityNote} ${dimensionalDesc}`;
}

/**
 * Generate response guidance based on emotional state
 */
export function generateResponseGuidance(state: EmotionalState): string {
  const { current, confidence, arousal } = state;

  // Skip guidance for low-confidence or neutral states
  if (confidence < 0.3 || current === 'neutral') {
    return 'Respond naturally without specific emotional adjustments.';
  }

  const guidanceMap: Record<EmotionLabel, string> = {
    happy:
      'Match the positive energy. Feel free to use a warm, enthusiastic tone. Celebrate their mood when appropriate.',
    sad: 'Be empathetic and supportive. Use a gentle, understanding tone. Acknowledge their feelings without trying to immediately fix things.',
    surprise:
      'Help them process the unexpected. Be clear and informative. Give them space to react.',
    neutral: 'Respond naturally without specific emotional adjustments.',
  };

  let guidance = guidanceMap[current];

  // Add dimensional guidance
  if (arousal > 0.7) {
    guidance += ' The user seems to be in a high-energy state, so be prepared for rapid exchanges.';
  } else if (arousal < 0.3) {
    guidance += ' The user seems to be in a low-energy state, so be patient and give thoughtful responses.';
  }

  return guidance;
}

/**
 * Create a complete EmotionContext for LLM injection
 */
export function createEmotionContext(
  history: EmotionDetectionResult[],
  isActive: boolean = true
): EmotionContext {
  const state = createEmotionalState(history);
  const description = describeEmotionalState(state);
  const responseGuidance = generateResponseGuidance(state);

  return {
    state,
    description,
    responseGuidance,
    isActive,
  };
}

/**
 * Format emotion context for injection into system prompt
 */
export function formatContextForPrompt(context: EmotionContext): string {
  if (!context.isActive) {
    return '';
  }

  return `
[EMOTIONAL CONTEXT - REAL-TIME]
${context.description}

Response Guidance: ${context.responseGuidance}

Note: This emotional context is detected in real-time from the user's facial expressions.
Use it to inform your tone and approach, but don't explicitly reference that you're analyzing their emotions.
---
`.trim();
}

