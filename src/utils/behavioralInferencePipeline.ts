/**
 * Behavioral Inference Pipeline
 *
 * Implements the complete 8-step PMC8969204 adapted methodology:
 *
 * Step 1: Baseline Establishment (60s rolling window)
 * Step 2: Deviation Monitoring (<50ms)
 * Step 3: Behavioral Response Capture (<150ms)
 * Step 4: Consistency Analysis (coupling coefficient ρ)
 * Step 5: Pattern Stability Check (stability metric σ)
 * Step 6: Contextual Weighting (task type, time, success history)
 * Step 7: Dimensional Estimation (Bayesian fusion to [A,V,C])
 * Step 8: Feedback Integration (baseline update with EMA)
 *
 * Total Pipeline Budget: ≤300ms
 */

import type {
  BehavioralSignals,
  BehavioralBaseline,
  DeviationVector,
  BehavioralResponse,
  ThreeDimensionalState,
  ContextWeights,
  PipelineState,
  UncertaintyMetrics,
  EmotionDetectionResult,
  HandGestureResult,
  TrajectoryPoint,
} from '@/types/emotion';

import {
  analyzeConsistency,
  checkPatternStability,
  calculateSignalDensity,
  calculateUncertainty,
} from './uncertaintyQuantification';

import { calculateThreeDimensions } from './dimensionalEstimation';
import { fuseSignals } from './signalFusion';

// Pipeline configuration
export interface PipelineConfig {
  baselineWindowMs: number;
  deviationBudgetMs: number;
  responseBudgetMs: number;
  totalBudgetMs: number;
  emaAlpha: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  baselineWindowMs: 60000,  // 60 seconds
  deviationBudgetMs: 50,    // Step 2 budget
  responseBudgetMs: 150,    // Step 3 budget
  totalBudgetMs: 300,       // Total pipeline budget
  emaAlpha: 0.1,            // EMA update rate
};

// Pipeline history for Steps 4-5
interface PipelineHistory {
  deviations: DeviationVector[];
  responses: BehavioralResponse[];
  dimensions: ThreeDimensionalState[];
  trajectoryPoints: TrajectoryPoint[];
}

const MAX_HISTORY_SIZE = 100;

let pipelineHistory: PipelineHistory = {
  deviations: [],
  responses: [],
  dimensions: [],
  trajectoryPoints: [],
};

/**
 * Step 6: Calculate context weights
 */
export function calculateContextWeights(
  taskType: 'chat' | 'navigation' | 'passive' = 'chat',
  sessionDurationMs: number = 0,
  recentSuccessRate: number = 0.5
): ContextWeights {
  // Task type weights
  const taskWeights: Record<string, number> = {
    chat: 1.0,
    navigation: 0.7,
    passive: 0.5,
  };

  // Time decay: starts at 1.0, decays to 0.5 after 30 minutes
  const sessionMinutes = sessionDurationMs / 60000;
  const timeDecay = Math.max(0.5, 1.0 - sessionMinutes * 0.017);

  // Success history EMA
  const successWeight = 0.5 + recentSuccessRate * 0.5;

  return {
    taskType: taskWeights[taskType] || 1.0,
    timeInSession: timeDecay,
    successHistory: successWeight,
  };
}

/**
 * Apply context weights to dimensional estimates
 */
function applyContextWeights(
  dimensions: ThreeDimensionalState,
  context: ContextWeights
): ThreeDimensionalState {
  // Context modulates confidence, not the dimensions themselves
  const contextFactor = (
    context.taskType * 0.4 +
    context.timeInSession * 0.3 +
    context.successHistory * 0.3
  );

  return {
    ...dimensions,
    confidence: dimensions.confidence * contextFactor,
  };
}

/**
 * Run the complete 8-step pipeline
 */
export function runPipeline(
  signals: BehavioralSignals,
  baseline: BehavioralBaseline,
  deviation: DeviationVector,
  response: BehavioralResponse,
  faceEmotion: EmotionDetectionResult | null = null,
  handGesture: HandGestureResult | null = null,
  taskType: 'chat' | 'navigation' | 'passive' = 'chat',
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG
): PipelineState {
  const startTime = performance.now();

  // Add to history
  pipelineHistory.deviations.push(deviation);
  pipelineHistory.responses.push(response);
  if (pipelineHistory.deviations.length > MAX_HISTORY_SIZE) {
    pipelineHistory.deviations.shift();
    pipelineHistory.responses.shift();
  }

  // Step 4: Consistency Analysis
  const coupling = analyzeConsistency(
    pipelineHistory.deviations,
    pipelineHistory.responses
  );

  // Step 5: Pattern Stability
  const stability = checkPatternStability(pipelineHistory.dimensions);

  // Calculate uncertainty
  const signalDensity = calculateSignalDensity(
    (faceEmotion ? 1 : 0) + 1 + (handGesture?.isDetected ? 1 : 0),
    3
  );
  const uncertaintyMetrics = calculateUncertainty(coupling, stability, signalDensity);

  // Step 6: Contextual Weighting
  const sessionDuration = Date.now() - baseline.sessionStart;
  const contextWeights = calculateContextWeights(taskType, sessionDuration);

  // Step 7: Dimensional Estimation
  const behavioralDimensions = calculateThreeDimensions(
    signals,
    undefined,
    uncertaintyMetrics.level
  );

  // Fuse with face and hand if available
  const fused = fuseSignals(faceEmotion, behavioralDimensions, handGesture);

  // Apply context weights
  const finalDimensions = applyContextWeights(fused.dimensions, contextWeights);

  // Add to dimension history
  pipelineHistory.dimensions.push(finalDimensions);
  if (pipelineHistory.dimensions.length > MAX_HISTORY_SIZE) {
    pipelineHistory.dimensions.shift();
  }

  // Add trajectory point
  const trajectoryPoint: TrajectoryPoint = {
    arousal: finalDimensions.arousal,
    valence: finalDimensions.valence,
    control: finalDimensions.control,
    uncertainty: finalDimensions.uncertainty,
    timestamp: Date.now(),
  };
  pipelineHistory.trajectoryPoints.push(trajectoryPoint);
  if (pipelineHistory.trajectoryPoints.length > MAX_HISTORY_SIZE) {
    pipelineHistory.trajectoryPoints.shift();
  }

  // Calculate pipeline latency
  const pipelineLatency = performance.now() - startTime;

  // Warn if over budget
  if (pipelineLatency > config.totalBudgetMs) {
    console.warn(
      `[Pipeline] Exceeded ${config.totalBudgetMs}ms budget: ${pipelineLatency.toFixed(2)}ms`
    );
  }

  return {
    baseline,
    deviation,
    response,
    coupling,
    stability,
    contextWeights,
    dimensions: finalDimensions,
    baselineUpdated: true, // Baseline update happens in useBehavioralSignals
    pipelineLatency,
    timestamp: Date.now(),
  };
}

/**
 * Get current trajectory history
 */
export function getTrajectory(): TrajectoryPoint[] {
  return [...pipelineHistory.trajectoryPoints];
}

/**
 * Get uncertainty metrics from current history
 */
export function getCurrentUncertaintyMetrics(): UncertaintyMetrics {
  const coupling = analyzeConsistency(
    pipelineHistory.deviations,
    pipelineHistory.responses
  );
  const stability = checkPatternStability(pipelineHistory.dimensions);
  const signalDensity = calculateSignalDensity(pipelineHistory.dimensions.length, 10);

  return calculateUncertainty(coupling, stability, signalDensity);
}

/**
 * Reset pipeline history (e.g., on session start)
 */
export function resetPipelineHistory(): void {
  pipelineHistory = {
    deviations: [],
    responses: [],
    dimensions: [],
    trajectoryPoints: [],
  };
}

/**
 * Get pipeline performance stats
 */
export function getPipelineStats(): {
  historySize: number;
  avgLatency: number;
  lastCoupling: number;
  lastStability: number;
} {
  return {
    historySize: pipelineHistory.dimensions.length,
    avgLatency: 0, // Latency tracked in useBehavioralSignals hook
    lastCoupling: analyzeConsistency(
      pipelineHistory.deviations,
      pipelineHistory.responses
    ),
    lastStability: checkPatternStability(pipelineHistory.dimensions),
  };
}

export default {
  runPipeline,
  getTrajectory,
  getCurrentUncertaintyMetrics,
  resetPipelineHistory,
  getPipelineStats,
  calculateContextWeights,
  DEFAULT_PIPELINE_CONFIG,
};
