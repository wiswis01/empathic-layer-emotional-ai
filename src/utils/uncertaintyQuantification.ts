/**
 * Uncertainty Quantification
 *
 * Implements PMC8969204 adapted methodology Steps 4-5:
 * - Step 4: Consistency Analysis (coupling coefficient ρ)
 * - Step 5: Pattern Stability Check (stability metric σ)
 *
 * Uncertainty U = f(ρ, σ, signal_density)
 * Thresholds:
 * - High confidence: U >= 0.6 (uncertainty level = 'low')
 * - Medium confidence: 0.3 <= U < 0.6 (uncertainty level = 'medium')
 * - Low confidence: U < 0.3 (uncertainty level = 'high')
 */

import type {
  UncertaintyMetrics,
  UncertaintyLevel,
  DeviationVector,
  BehavioralResponse,
  ThreeDimensionalState,
} from '@/types/emotion';

// Weights for uncertainty calculation
const COUPLING_WEIGHT = 0.4;
const STABILITY_WEIGHT = 0.4;
const SIGNAL_DENSITY_WEIGHT = 0.2;

// Thresholds
const HIGH_CONFIDENCE_THRESHOLD = 0.6;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Step 4: Analyze consistency between deviation and response
 * Calculates coupling coefficient ρ (Pearson correlation approximation)
 *
 * High ρ → Strong stimulus-response coupling (good interoception proxy)
 * Low ρ → Weak coupling (poor interoception proxy)
 */
export function analyzeConsistency(
  deviations: DeviationVector[],
  responses: BehavioralResponse[]
): number {
  if (deviations.length < 3 || responses.length < 3) {
    return 0.5; // Default moderate coupling when insufficient data
  }

  // Use the last 10 samples for correlation
  const n = Math.min(10, deviations.length, responses.length);
  const recentDeviations = deviations.slice(-n);
  const recentResponses = responses.slice(-n);

  // Calculate deviation magnitude
  const devMagnitudes = recentDeviations.map(d =>
    Math.sqrt(d.ΔLatency ** 2 + d.ΔSmooth ** 2 + d.ΔEngage ** 2)
  );

  // Calculate response magnitude
  const respMagnitudes = recentResponses.map(r =>
    (r.jitter + r.corrections * 0.1 + (r.abandonment ? 1 : 0)) / 2
  );

  // Pearson correlation coefficient
  const meanDev = devMagnitudes.reduce((a, b) => a + b, 0) / n;
  const meanResp = respMagnitudes.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomDev = 0;
  let denomResp = 0;

  for (let i = 0; i < n; i++) {
    const devDiff = devMagnitudes[i] - meanDev;
    const respDiff = respMagnitudes[i] - meanResp;
    numerator += devDiff * respDiff;
    denomDev += devDiff ** 2;
    denomResp += respDiff ** 2;
  }

  const denominator = Math.sqrt(denomDev * denomResp);
  if (denominator === 0) return 0.5;

  // Correlation coefficient (normalize to 0-1 range)
  const ρ = (numerator / denominator + 1) / 2;

  return Math.max(0, Math.min(1, ρ));
}

/**
 * Step 5: Check pattern stability across recent history
 * Calculates stability metric σ based on coefficient of variation
 *
 * High σ → Stable patterns (good metacognitive consistency proxy)
 * Low σ → Unstable patterns (poor metacognitive consistency)
 */
export function checkPatternStability(
  history: ThreeDimensionalState[],
  windowSize: number = 10
): number {
  if (history.length < 3) {
    return 0.5; // Default moderate stability when insufficient data
  }

  const n = Math.min(windowSize, history.length);
  const recentHistory = history.slice(-n);

  // Calculate variance for each dimension
  const arousalValues = recentHistory.map(h => h.arousal);
  const valenceValues = recentHistory.map(h => h.valence);
  const controlValues = recentHistory.map(h => h.control);

  const calcCV = (values: number[]): number => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 1; // High CV if mean is zero
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / Math.abs(mean);
  };

  const cvArousal = calcCV(arousalValues);
  const cvValence = calcCV(valenceValues);
  const cvControl = calcCV(controlValues);

  // Average coefficient of variation (lower CV = higher stability)
  const avgCV = (cvArousal + cvValence + cvControl) / 3;

  // Convert to stability metric (0-1, higher = more stable)
  // CV of 0 → stability 1
  // CV of 1+ → stability ~0
  const stability = Math.exp(-avgCV);

  return Math.max(0, Math.min(1, stability));
}

/**
 * Calculate signal density (proportion of valid/available signals)
 */
export function calculateSignalDensity(
  availableSignals: number,
  maxSignals: number = 10
): number {
  return Math.min(1, availableSignals / maxSignals);
}

/**
 * Calculate overall uncertainty metrics
 * U = f(ρ, σ, signal_density)
 */
export function calculateUncertainty(
  coupling: number,
  stability: number,
  signalDensity: number
): UncertaintyMetrics {
  // Weighted combination
  const overallUncertainty =
    coupling * COUPLING_WEIGHT +
    stability * STABILITY_WEIGHT +
    signalDensity * SIGNAL_DENSITY_WEIGHT;

  // Classify uncertainty level (inverted: high U = low uncertainty)
  let level: UncertaintyLevel;
  if (overallUncertainty >= HIGH_CONFIDENCE_THRESHOLD) {
    level = 'low'; // Low uncertainty = high confidence
  } else if (overallUncertainty >= MEDIUM_CONFIDENCE_THRESHOLD) {
    level = 'medium';
  } else {
    level = 'high'; // High uncertainty = low confidence
  }

  return {
    coupling,
    stability,
    signalDensity,
    overallUncertainty,
    level,
  };
}

/**
 * Get uncertainty-based confidence description for prompts
 */
export function getUncertaintyDescription(metrics: UncertaintyMetrics): string {
  const { level, coupling, stability } = metrics;

  if (level === 'low') {
    return 'High confidence in emotional assessment with consistent behavioral patterns.';
  } else if (level === 'medium') {
    if (coupling < 0.4) {
      return 'Moderate confidence; stimulus-response patterns are inconsistent.';
    } else if (stability < 0.4) {
      return 'Moderate confidence; emotional state appears to be transitioning.';
    }
    return 'Moderate confidence in emotional assessment.';
  } else {
    return 'EMOTIONAL STATE UNRESOLVED — CONTINUE PASSIVE SENSING';
  }
}

export default {
  analyzeConsistency,
  checkPatternStability,
  calculateSignalDensity,
  calculateUncertainty,
  getUncertaintyDescription,
};
