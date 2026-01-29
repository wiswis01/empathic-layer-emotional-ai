/**
 * Clinical Patterns Tool
 *
 * Rule-based pattern matching for 6 core clinical conditions.
 * No LLM calls - purely algorithmic detection based on emotional profiles.
 *
 * IMPORTANT: This tool assists therapists - it does NOT diagnose.
 * All patterns are suggestions for professional consideration.
 */

import type { EmotionLabel, EmotionDetectionResult } from '../../types/emotion';
import type {
  ClinicalPattern,
  ClinicalCondition,
  PatternMatch
} from '../types';

// ============================================================================
// CLINICAL PATTERNS DEFINITIONS
// ============================================================================

/**
 * The 6 core clinical patterns with their emotional profiles.
 * Based on DSM-5 criteria and validated assessment tools (PHQ-9, GAD-7).
 */
export const CLINICAL_PATTERNS: Record<ClinicalCondition, ClinicalPattern> = {
  depression: {
    condition: 'depression' as ClinicalCondition,
    displayName: 'Depressive Indicators',
    markers: [
      'persistent_sadness',
      'low_engagement',
      'flat_affect',
      'reduced_expressivity',
      'low_energy_signals'
    ],
    emotionalProfile: {
      sad: 0.5,
      neutral: 0.4,
      happy: 0.05,
      surprise: 0.05
    },
    riskWeight: 0.6,
    baseQuestionTopics: [
      'sleep_quality',
      'appetite_changes',
      'energy_levels',
      'concentration',
      'hopelessness',
      'anhedonia',
      'self_worth'
    ],
    clinicalReference: 'PHQ-9 aligned markers'
  },

  anxiety: {
    condition: 'anxiety' as ClinicalCondition,
    displayName: 'Anxiety Indicators',
    markers: [
      'restlessness',
      'rapid_emotion_shifts',
      'surprise_spikes',
      'hypervigilance_signals',
      'tension_indicators'
    ],
    emotionalProfile: {
      neutral: 0.3,
      surprise: 0.4,
      sad: 0.2,
      happy: 0.1
    },
    riskWeight: 0.5,
    baseQuestionTopics: [
      'worry_frequency',
      'physical_symptoms',
      'avoidance_behaviors',
      'sleep_anxiety',
      'catastrophic_thinking',
      'control_concerns'
    ],
    clinicalReference: 'GAD-7 aligned markers'
  },

  ptsd: {
    condition: 'ptsd' as ClinicalCondition,
    displayName: 'Trauma Response Indicators',
    markers: [
      'startle_response',
      'emotional_avoidance',
      'hypervigilance',
      'emotional_numbing',
      'sudden_distress_spikes'
    ],
    emotionalProfile: {
      surprise: 0.4,
      sad: 0.3,
      neutral: 0.25,
      happy: 0.05
    },
    riskWeight: 0.7,
    baseQuestionTopics: [
      'intrusive_thoughts',
      'nightmares',
      'triggers',
      'safety_feeling',
      'avoidance_patterns',
      'flashback_experiences'
    ],
    clinicalReference: 'PCL-5 aligned markers'
  },

  bipolar: {
    condition: 'bipolar' as ClinicalCondition,
    displayName: 'Mood Instability Indicators',
    markers: [
      'mood_swings',
      'elevated_then_crash',
      'emotional_instability',
      'rapid_cycling',
      'extreme_shifts'
    ],
    emotionalProfile: {
      happy: 0.35,
      sad: 0.35,
      surprise: 0.2,
      neutral: 0.1
    },
    riskWeight: 0.6,
    baseQuestionTopics: [
      'sleep_patterns',
      'energy_fluctuations',
      'impulsive_behavior',
      'mood_tracking',
      'racing_thoughts',
      'grandiosity'
    ],
    clinicalReference: 'MDQ aligned markers'
  },

  grief: {
    condition: 'grief' as ClinicalCondition,
    displayName: 'Grief Processing Indicators',
    markers: [
      'waves_of_sadness',
      'nostalgia_triggers',
      'acceptance_work',
      'loss_processing',
      'emotional_waves'
    ],
    emotionalProfile: {
      sad: 0.6,
      neutral: 0.25,
      happy: 0.1,
      surprise: 0.05
    },
    riskWeight: 0.4,
    baseQuestionTopics: [
      'loss_timeline',
      'support_system',
      'meaning_making',
      'daily_functioning',
      'memory_processing',
      'relationship_to_loss'
    ],
    clinicalReference: 'Grief stage model markers'
  },

  crisis: {
    condition: 'crisis' as ClinicalCondition,
    displayName: 'Crisis State Indicators',
    markers: [
      'hopelessness_spike',
      'agitation',
      'withdrawal',
      'severe_distress',
      'emotional_shutdown'
    ],
    emotionalProfile: {
      sad: 0.7,
      neutral: 0.25,
      happy: 0.0,
      surprise: 0.05
    },
    riskWeight: 1.0,
    baseQuestionTopics: [
      'safety_check',
      'immediate_support',
      'crisis_plan',
      'current_thoughts',
      'protective_factors'
    ],
    clinicalReference: 'Columbia Protocol aligned markers'
  }
};

// ============================================================================
// PATTERN MATCHING ENGINE
// ============================================================================

/**
 * Calculate the similarity between observed emotions and a pattern's expected profile.
 * Uses cosine similarity normalized to 0-1 range.
 */
function calculateProfileSimilarity(
  observed: Record<EmotionLabel, number>,
  expected: Partial<Record<EmotionLabel, number>>
): number {
  const emotions: EmotionLabel[] = ['happy', 'sad', 'surprise', 'neutral'];

  let dotProduct = 0;
  let observedMagnitude = 0;
  let expectedMagnitude = 0;

  for (const emotion of emotions) {
    const o = observed[emotion] || 0;
    const e = expected[emotion] || 0;

    dotProduct += o * e;
    observedMagnitude += o * o;
    expectedMagnitude += e * e;
  }

  const magnitude = Math.sqrt(observedMagnitude) * Math.sqrt(expectedMagnitude);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Calculate the emotion distribution from detection history.
 */
function calculateEmotionDistribution(
  history: EmotionDetectionResult[]
): Record<EmotionLabel, number> {
  const distribution: Record<EmotionLabel, number> = {
    happy: 0,
    sad: 0,
    surprise: 0,
    neutral: 0
  };

  if (history.length === 0) return distribution;

  // Weight recent detections more heavily
  const weights = history.map((_, i) => Math.pow(0.9, history.length - 1 - i));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  history.forEach((result, i) => {
    const weight = weights[i] / totalWeight;
    distribution.happy += result.scores.happy * weight;
    distribution.sad += result.scores.sad * weight;
    distribution.surprise += result.scores.surprise * weight;
    distribution.neutral += result.scores.neutral * weight;
  });

  return distribution;
}

/**
 * Detect markers based on emotion history patterns.
 */
function detectMarkers(
  history: EmotionDetectionResult[],
  pattern: ClinicalPattern
): string[] {
  const detected: string[] = [];
  if (history.length < 3) return detected;

  const recentEmotions = history.slice(-10).map(h => h.dominantEmotion);

  // Check for persistent sadness
  if (pattern.markers.includes('persistent_sadness')) {
    const sadCount = recentEmotions.filter(e => e === 'sad').length;
    if (sadCount / recentEmotions.length > 0.5) {
      detected.push('persistent_sadness');
    }
  }

  // Check for flat affect (low variation, mostly neutral)
  if (pattern.markers.includes('flat_affect')) {
    const neutralCount = recentEmotions.filter(e => e === 'neutral').length;
    if (neutralCount / recentEmotions.length > 0.6) {
      detected.push('flat_affect');
    }
  }

  // Check for rapid emotion shifts
  if (pattern.markers.includes('rapid_emotion_shifts')) {
    let shifts = 0;
    for (let i = 1; i < recentEmotions.length; i++) {
      if (recentEmotions[i] !== recentEmotions[i - 1]) shifts++;
    }
    if (shifts / (recentEmotions.length - 1) > 0.6) {
      detected.push('rapid_emotion_shifts');
    }
  }

  // Check for surprise spikes (anxiety indicator)
  if (pattern.markers.includes('surprise_spikes')) {
    const surpriseSpikes = history.slice(-10).filter(
      h => h.dominantEmotion === 'surprise' && h.confidence > 0.7
    ).length;
    if (surpriseSpikes >= 3) {
      detected.push('surprise_spikes');
    }
  }

  // Check for mood swings (bipolar indicator)
  if (pattern.markers.includes('mood_swings') || pattern.markers.includes('elevated_then_crash')) {
    const hasHappy = recentEmotions.includes('happy');
    const hasSad = recentEmotions.includes('sad');
    if (hasHappy && hasSad) {
      // Check for actual swings (happy followed by sad or vice versa)
      for (let i = 1; i < recentEmotions.length; i++) {
        if ((recentEmotions[i - 1] === 'happy' && recentEmotions[i] === 'sad') ||
            (recentEmotions[i - 1] === 'sad' && recentEmotions[i] === 'happy')) {
          detected.push('mood_swings');
          break;
        }
      }
    }
  }

  // Check for emotional waves (grief indicator)
  if (pattern.markers.includes('waves_of_sadness') || pattern.markers.includes('emotional_waves')) {
    let sadWaves = 0;
    let inWave = false;
    for (const emotion of recentEmotions) {
      if (emotion === 'sad' && !inWave) {
        inWave = true;
        sadWaves++;
      } else if (emotion !== 'sad') {
        inWave = false;
      }
    }
    if (sadWaves >= 2) {
      detected.push('waves_of_sadness');
    }
  }

  // Check for hopelessness spike (crisis indicator)
  if (pattern.markers.includes('hopelessness_spike')) {
    const recentSad = history.slice(-5);
    const highSadConfidence = recentSad.filter(
      h => h.dominantEmotion === 'sad' && h.confidence > 0.8
    ).length;
    if (highSadConfidence >= 4) {
      detected.push('hopelessness_spike');
    }
  }

  // Check for withdrawal/emotional shutdown
  if (pattern.markers.includes('withdrawal') || pattern.markers.includes('emotional_shutdown')) {
    const avgConfidence = history.slice(-10).reduce((sum, h) => sum + h.confidence, 0) /
                         Math.min(10, history.length);
    if (avgConfidence < 0.4) {
      detected.push('withdrawal');
    }
  }

  return detected;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Match emotion history against all clinical patterns.
 * Returns patterns ordered by confidence.
 */
export function matchPatterns(
  emotionHistory: EmotionDetectionResult[],
  minConfidence: number = 0.4
): PatternMatch[] {
  if (emotionHistory.length < 5) return [];

  const matches: PatternMatch[] = [];
  const distribution = calculateEmotionDistribution(emotionHistory);
  const now = Date.now();
  const sessionStart = emotionHistory[0]?.timestamp || now;

  for (const [_, pattern] of Object.entries(CLINICAL_PATTERNS)) {
    // Calculate profile similarity
    const similarity = calculateProfileSimilarity(distribution, pattern.emotionalProfile);

    // Detect specific markers
    const detectedMarkers = detectMarkers(emotionHistory, pattern);

    // Combine similarity with marker detection for final confidence
    const markerRatio = pattern.markers.length > 0
      ? detectedMarkers.length / pattern.markers.length
      : 0;

    const confidence = (similarity * 0.6) + (markerRatio * 0.4);

    if (confidence >= minConfidence) {
      matches.push({
        pattern,
        confidence,
        detectedMarkers,
        timestamp: now,
        duration: now - sessionStart
      });
    }
  }

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get the single most likely pattern match.
 */
export function getDominantPattern(
  emotionHistory: EmotionDetectionResult[],
  minConfidence: number = 0.5
): PatternMatch | null {
  const matches = matchPatterns(emotionHistory, minConfidence);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Check if a specific condition is detected.
 */
export function isConditionDetected(
  emotionHistory: EmotionDetectionResult[],
  condition: ClinicalCondition,
  minConfidence: number = 0.5
): boolean {
  const matches = matchPatterns(emotionHistory, minConfidence);
  return matches.some(m => m.pattern.condition === condition);
}

/**
 * Get pattern confidence for a specific condition.
 */
export function getPatternConfidence(
  emotionHistory: EmotionDetectionResult[],
  condition: ClinicalCondition
): number {
  const pattern = CLINICAL_PATTERNS[condition];
  if (!pattern || emotionHistory.length < 5) return 0;

  const distribution = calculateEmotionDistribution(emotionHistory);
  const similarity = calculateProfileSimilarity(distribution, pattern.emotionalProfile);
  const detectedMarkers = detectMarkers(emotionHistory, pattern);
  const markerRatio = pattern.markers.length > 0
    ? detectedMarkers.length / pattern.markers.length
    : 0;

  return (similarity * 0.6) + (markerRatio * 0.4);
}

/**
 * Get question topics relevant to detected patterns.
 */
export function getRelevantQuestionTopics(
  patterns: PatternMatch[]
): string[] {
  const topics = new Set<string>();

  for (const match of patterns) {
    for (const topic of match.pattern.baseQuestionTopics) {
      topics.add(topic);
    }
  }

  return Array.from(topics);
}

/**
 * Calculate emotional stability score from history.
 * 0 = very unstable, 1 = very stable
 */
export function calculateEmotionalStability(
  emotionHistory: EmotionDetectionResult[]
): number {
  if (emotionHistory.length < 3) return 0.5;

  const recentEmotions = emotionHistory.slice(-15).map(h => h.dominantEmotion);

  // Count emotion changes
  let changes = 0;
  for (let i = 1; i < recentEmotions.length; i++) {
    if (recentEmotions[i] !== recentEmotions[i - 1]) changes++;
  }

  const changeRate = changes / (recentEmotions.length - 1);

  // Invert: fewer changes = more stable
  return Math.max(0, 1 - changeRate);
}

/**
 * Get a human-readable summary of detected patterns.
 */
export function getPatternSummary(patterns: PatternMatch[]): string {
  if (patterns.length === 0) {
    return 'No significant clinical patterns detected.';
  }

  const summaries = patterns.slice(0, 3).map(match => {
    const confidence = Math.round(match.confidence * 100);
    return `${match.pattern.displayName} (${confidence}% confidence)`;
  });

  return `Detected patterns: ${summaries.join(', ')}`;
}
