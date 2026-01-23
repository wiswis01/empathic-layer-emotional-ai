/**
 * useBehavioralSignals Hook
 *
 * Captures and processes behavioral signals for edge-based emotion inference.
 * Implements PMC8969204 adapted methodology Steps 1-3.
 *
 * Pipeline Budget: <50ms for Steps 1-3
 *
 * Assumptions (PMC8969204 Adapted):
 * - A1: Baseline = 60s rolling window interaction average
 * - A2: Monitoring = deviation from baseline (<50ms)
 * - A3: Physiological proxy = jitter, corrections, abandonment
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useInteractionTracker } from './useInteractionTracker';
import { useMotionAnalyzer } from './useMotionAnalyzer';
import type {
  BehavioralSignals,
  BehavioralBaseline,
  DeviationVector,
  BehavioralResponse,
} from '@/types/emotion';

export interface UseBehavioralSignalsReturn {
  /** Current behavioral signals */
  signals: BehavioralSignals;
  /** Rolling baseline (60s window) */
  baseline: BehavioralBaseline;
  /** Deviation from baseline */
  deviation: DeviationVector;
  /** Behavioral response */
  response: BehavioralResponse;
  /** Whether baseline is established (requires 10+ samples) */
  isBaselineReady: boolean;
  /** Pipeline processing time (ms) */
  processingTime: number;
}

const BASELINE_WINDOW_MS = 60000; // 60 seconds
const MIN_BASELINE_SAMPLES = 10;
const DEVIATION_THRESHOLD_SIGMA = 1.5;
const SAMPLE_INTERVAL_MS = 100; // Sample every 100ms
const EMA_ALPHA = 0.1; // Exponential moving average factor

// Initial baseline state
const initialBaseline: BehavioralBaseline = {
  μ_latency: 1000,
  μ_smooth: 0.8,
  μ_engage: 5000,
  σ_latency: 500,
  σ_smooth: 0.1,
  σ_engage: 2000,
  sampleCount: 0,
  lastUpdated: 0,
  sessionStart: Date.now(),
};

export function useBehavioralSignals(): UseBehavioralSignalsReturn {
  const interaction = useInteractionTracker();
  const motion = useMotionAnalyzer();

  const [baseline, setBaseline] = useState<BehavioralBaseline>(initialBaseline);
  const [processingTime, setProcessingTime] = useState(0);

  const samplesRef = useRef<BehavioralSignals[]>([]);
  const lastSampleTimeRef = useRef(0);

  // Calculate current behavioral signals
  const signals: BehavioralSignals = useMemo(() => {
    const now = performance.now();

    return {
      interactionLatency: interaction.timeSinceLastInteraction,
      hesitationDuration: motion.hesitationDuration,
      responseTime: interaction.lastInteraction
        ? now - interaction.lastInteraction.timestamp
        : 0,
      motionSmoothness: motion.smoothness,
      jitterMagnitude: motion.jitter,
      correctionCount: motion.corrections,
      pathEfficiency: motion.pathEfficiency,
      motionSpeed: motion.avgSpeed,
      engagementDuration: interaction.engagementDuration,
      abandonmentTiming: interaction.abandonmentTiming,
      timestamp: now,
      deltaTime: lastSampleTimeRef.current > 0 ? now - lastSampleTimeRef.current : 0,
      deviationFromBaseline: 0, // Calculated after baseline comparison
    };
  }, [interaction, motion]);

  // Step 2: Calculate deviation from baseline
  const deviation: DeviationVector = useMemo(() => {
    const startTime = performance.now();

    const ΔLatency = (signals.interactionLatency - baseline.μ_latency) /
      (baseline.σ_latency || 1);
    const ΔSmooth = (signals.motionSmoothness - baseline.μ_smooth) /
      (baseline.σ_smooth || 0.1);
    const ΔEngage = (signals.engagementDuration - baseline.μ_engage) /
      (baseline.σ_engage || 1);

    const isSignificant =
      Math.abs(ΔLatency) > DEVIATION_THRESHOLD_SIGMA ||
      Math.abs(ΔSmooth) > DEVIATION_THRESHOLD_SIGMA ||
      Math.abs(ΔEngage) > DEVIATION_THRESHOLD_SIGMA;

    const elapsed = performance.now() - startTime;
    if (elapsed > 10) {
      console.warn(`[BehavioralSignals] Step 2 exceeded budget: ${elapsed.toFixed(2)}ms`);
    }

    return {
      ΔLatency,
      ΔSmooth,
      ΔEngage,
      isSignificant,
      timestamp: performance.now(),
    };
  }, [signals, baseline]);

  // Step 3: Capture behavioral response
  const response: BehavioralResponse = useMemo(() => {
    return {
      jitter: motion.jitter,
      corrections: motion.corrections,
      abandonment: interaction.hasAbandoned,
      responseLatency: interaction.timeSinceLastInteraction,
      timestamp: performance.now(),
    };
  }, [motion, interaction]);

  // Step 1 & 8: Update baseline with EMA
  const updateBaseline = useCallback((newSample: BehavioralSignals) => {
    setBaseline(prev => {
      const α = EMA_ALPHA;
      const β = 1 - α;

      // Exponential moving average for means
      const μ_latency = β * prev.μ_latency + α * newSample.interactionLatency;
      const μ_smooth = β * prev.μ_smooth + α * newSample.motionSmoothness;
      const μ_engage = β * prev.μ_engage + α * newSample.engagementDuration;

      // Update standard deviations using Welford's online algorithm approximation
      const σ_latency = Math.sqrt(
        β * prev.σ_latency ** 2 +
        α * (newSample.interactionLatency - μ_latency) ** 2
      );
      const σ_smooth = Math.sqrt(
        β * prev.σ_smooth ** 2 +
        α * (newSample.motionSmoothness - μ_smooth) ** 2
      );
      const σ_engage = Math.sqrt(
        β * prev.σ_engage ** 2 +
        α * (newSample.engagementDuration - μ_engage) ** 2
      );

      return {
        μ_latency,
        μ_smooth,
        μ_engage,
        σ_latency: Math.max(σ_latency, 0.01), // Prevent division by zero
        σ_smooth: Math.max(σ_smooth, 0.01),
        σ_engage: Math.max(σ_engage, 0.01),
        sampleCount: prev.sampleCount + 1,
        lastUpdated: Date.now(),
        sessionStart: prev.sessionStart,
      };
    });
  }, []);

  // Sample signals periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const startTime = performance.now();
      const now = Date.now();

      // Only sample if enough time has passed
      if (now - lastSampleTimeRef.current >= SAMPLE_INTERVAL_MS) {
        lastSampleTimeRef.current = now;

        // Add to samples buffer
        samplesRef.current.push(signals);

        // Remove samples outside 60s window
        const cutoff = now - BASELINE_WINDOW_MS;
        samplesRef.current = samplesRef.current.filter(
          s => s.timestamp > cutoff
        );

        // Update baseline
        updateBaseline(signals);

        const elapsed = performance.now() - startTime;
        setProcessingTime(elapsed);

        if (elapsed > 50) {
          console.warn(`[BehavioralSignals] Pipeline exceeded 50ms budget: ${elapsed.toFixed(2)}ms`);
        }
      }
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [signals, updateBaseline]);

  const isBaselineReady = baseline.sampleCount >= MIN_BASELINE_SAMPLES;

  return {
    signals,
    baseline,
    deviation,
    response,
    isBaselineReady,
    processingTime,
  };
}

export default useBehavioralSignals;
