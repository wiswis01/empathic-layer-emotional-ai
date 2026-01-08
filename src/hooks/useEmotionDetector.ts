/**
 * useEmotionDetector Hook
 *
 * A React hook for real-time emotion detection using TensorFlow.js.
 * Prioritizes WebGPU backend for performance, with fallbacks to WebGL and CPU.
 *
 * Key features:
 * - Memory-safe inference with tf.tidy() and proper tensor disposal
 * - Throttled inference to maintain <300ms latency target
 * - Emotion smoothing for stable readings
 * - Performance metrics tracking
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import type {
  EmotionLabel,
  EmotionScores,
  EmotionDetectionResult,
  EmotionContext,
  PerformanceMetrics,
  EmotionDetectorConfig,
} from '@/types/emotion';
import { createEmotionContext } from '@/utils/emotionAnalysis';

interface UseEmotionDetectorReturn {
  /** Whether the model is loaded and ready */
  isReady: boolean;
  /** Whether detection is currently running */
  isDetecting: boolean;
  /** Current emotion context for LLM injection */
  emotionContext: EmotionContext | null;
  /** Latest detection result */
  latestResult: EmotionDetectionResult | null;
  /** Performance metrics */
  metrics: PerformanceMetrics;
  /** Error message if any */
  error: string | null;
  /** Start detection on a video element */
  startDetection: (videoElement: HTMLVideoElement) => void;
  /** Stop detection */
  stopDetection: () => void;
  /** Toggle emotion context active state */
  setContextActive: (active: boolean) => void;
}

/**
 * Initialize TensorFlow.js with the best available backend
 * Priority: WebGPU > WebGL > CPU
 */
async function initializeTensorFlow(preferWebGPU: boolean): Promise<string> {
  // Try WebGPU first if preferred
  if (preferWebGPU) {
    try {
      // Dynamically import WebGPU backend
      await import('@tensorflow/tfjs-backend-webgpu');
      await tf.setBackend('webgpu');
      await tf.ready();
      console.log('[EmotionDetector] WebGPU backend initialized');
      return 'webgpu';
    } catch (e) {
      console.warn('[EmotionDetector] WebGPU not available, falling back to WebGL');
    }
  }

  // Try WebGL
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('[EmotionDetector] WebGL backend initialized');
    return 'webgl';
  } catch (e) {
    console.warn('[EmotionDetector] WebGL not available, falling back to CPU');
  }

  // Fall back to CPU
  await tf.setBackend('cpu');
  await tf.ready();
  console.log('[EmotionDetector] CPU backend initialized (performance may be limited)');
  return 'cpu';
}

/**
 * Create a simple emotion detection model
 * In production, this would load a pre-trained FER model
 */
async function createEmotionModel(): Promise<tf.LayersModel> {
  // Create a simple CNN model for emotion detection
  // This is a placeholder architecture - in production, load a pre-trained model
  const model = tf.sequential();

  // Input: 48x48 grayscale image
  model.add(
    tf.layers.conv2d({
      inputShape: [48, 48, 1],
      filters: 32,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same',
    })
  );
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.dropout({ rate: 0.25 }));

  model.add(
    tf.layers.conv2d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same',
    })
  );
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.dropout({ rate: 0.25 }));

  model.add(
    tf.layers.conv2d({
      filters: 128,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same',
    })
  );
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.dropout({ rate: 0.25 }));

  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.5 }));
  model.add(tf.layers.dense({ units: 4, activation: 'softmax' }));

  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  console.log('[EmotionDetector] Model created');
  return model;
}

/**
 * Custom hook for real-time emotion detection
 */
export function useEmotionDetector(
  config: Partial<EmotionDetectorConfig> = {}
): UseEmotionDetectorReturn {
  // Merge config with defaults
  const fullConfig: EmotionDetectorConfig = {
    inferenceInterval: config.inferenceInterval ?? 150,
    historySize: config.historySize ?? 5,
    minConfidence: config.minConfidence ?? 0.3,
    preferWebGPU: config.preferWebGPU ?? true,
    inputSize: config.inputSize ?? 48,
    debug: config.debug ?? false,
  };

  // State
  const [isReady, setIsReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [emotionContext, setEmotionContext] = useState<EmotionContext | null>(null);
  const [latestResult, setLatestResult] = useState<EmotionDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contextActive, setContextActive] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    avgLatency: 0,
    p95Latency: 0,
    memoryUsage: 0,
    detectionCount: 0,
    droppedFrames: 0,
    backend: 'unknown',
  });

  // Refs
  const modelRef = useRef<tf.LayersModel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const historyRef = useRef<EmotionDetectionResult[]>([]);
  const latencyHistoryRef = useRef<number[]>([]);
  const lastInferenceTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);
  const droppedFramesRef = useRef<number>(0);
  const backendRef = useRef<string>('unknown');

  /**
   * Initialize TensorFlow and load/create the model
   */
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        setError(null);

        // Initialize TensorFlow.js backend
        const backend = await initializeTensorFlow(fullConfig.preferWebGPU);
        backendRef.current = backend;

        if (!isMounted) return;

        // Try to load pre-trained model, fall back to creating one
        try {
          // In production, load from: /models/emotion_model/model.json
          modelRef.current = await tf.loadLayersModel('/models/emotion_model/model.json');
          console.log('[EmotionDetector] Pre-trained model loaded');
        } catch {
          console.log('[EmotionDetector] No pre-trained model found, creating new model');
          modelRef.current = await createEmotionModel();
        }

        if (!isMounted) return;

        // Warm up the model with a dummy inference
        const warmupTensor = tf.zeros([1, 48, 48, 1]);
        const warmupResult = modelRef.current.predict(warmupTensor) as tf.Tensor;
        warmupResult.dispose();
        warmupTensor.dispose();

        setMetrics((prev) => ({ ...prev, backend }));
        setIsReady(true);
        console.log('[EmotionDetector] Ready for inference');
      } catch (e) {
        console.error('[EmotionDetector] Initialization failed:', e);
        if (isMounted) {
          setError(`Failed to initialize emotion detector: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
  }, [fullConfig.preferWebGPU]);

  /**
   * Preprocess video frame for emotion detection
   */
  const preprocessFrame = useCallback(
    (video: HTMLVideoElement): tf.Tensor4D => {
      return tf.tidy(() => {
        // Capture frame from video
        const frame = tf.browser.fromPixels(video);

        // Convert to grayscale
        const grayscale = tf.mean(frame, 2, true);

        // Resize to model input size (48x48)
        const resized = tf.image.resizeBilinear(
          grayscale as tf.Tensor3D,
          [fullConfig.inputSize, fullConfig.inputSize]
        );

        // Normalize to [0, 1]
        const normalized = resized.div(255.0);

        // Add batch dimension
        return normalized.expandDims(0) as tf.Tensor4D;
      });
    },
    [fullConfig.inputSize]
  );

  /**
   * Run inference on a single frame
   */
  const runInference = useCallback(async (): Promise<EmotionDetectionResult | null> => {
    if (!modelRef.current || !videoRef.current) return null;

    const startTime = performance.now();

    try {
      // Preprocess the video frame (wrapped in tidy for memory safety)
      const inputTensor = preprocessFrame(videoRef.current);

      // Run prediction
      const prediction = modelRef.current.predict(inputTensor) as tf.Tensor;

      // Extract prediction data
      const probabilities = await prediction.data();

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      // Process results
      // Model output order: happy, sad, surprise, neutral (indices 0, 1, 2, 3)
      const scores: EmotionScores = {
        happy: probabilities[0],
        sad: probabilities[1],
        surprise: probabilities[2],
        neutral: probabilities[3],
      };

      // Find dominant emotion
      let maxScore = 0;
      let dominantEmotion: EmotionLabel = 'neutral';
      for (const [emotion, score] of Object.entries(scores) as [EmotionLabel, number][]) {
        if (score > maxScore) {
          maxScore = score;
          dominantEmotion = emotion;
        }
      }

      const inferenceTime = performance.now() - startTime;

      const result: EmotionDetectionResult = {
        dominantEmotion,
        confidence: maxScore,
        scores,
        timestamp: Date.now(),
        inferenceTime,
      };

      if (fullConfig.debug) {
        console.log('[EmotionDetector] Detection:', {
          emotion: dominantEmotion,
          confidence: maxScore.toFixed(3),
          latency: `${inferenceTime.toFixed(1)}ms`,
        });
      }

      return result;
    } catch (e) {
      console.error('[EmotionDetector] Inference error:', e);
      droppedFramesRef.current++;
      return null;
    }
  }, [preprocessFrame, fullConfig.debug]);

  /**
   * Update performance metrics
   */
  const updateMetrics = useCallback((latency: number) => {
    // Track latency history
    latencyHistoryRef.current.push(latency);
    if (latencyHistoryRef.current.length > 100) {
      latencyHistoryRef.current.shift();
    }

    // Calculate average and p95 latency
    const sorted = [...latencyHistoryRef.current].sort((a, b) => a - b);
    const avgLatency = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Latency = sorted[p95Index] || avgLatency;

    // Calculate FPS
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsUpdateRef.current >= 1000) {
      const fps = frameCountRef.current;
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;

      // Get memory info if available
      let memoryUsage = 0;
      const memInfo = tf.memory();
      memoryUsage = memInfo.numBytes / (1024 * 1024); // Convert to MB

      setMetrics({
        fps,
        avgLatency,
        p95Latency,
        memoryUsage,
        detectionCount: historyRef.current.length,
        droppedFrames: droppedFramesRef.current,
        backend: backendRef.current,
      });
    }
  }, []);

  /**
   * Detection loop
   */
  const detectionLoop = useCallback(
    async (timestamp: number) => {
      if (!isDetecting || !isReady) return;

      // Throttle inference to configured interval
      if (timestamp - lastInferenceTimeRef.current >= fullConfig.inferenceInterval) {
        const result = await runInference();

        if (result) {
          // Update history
          historyRef.current.push(result);
          if (historyRef.current.length > fullConfig.historySize) {
            historyRef.current.shift();
          }

          // Update latest result
          setLatestResult(result);

          // Create emotion context
          const context = createEmotionContext(historyRef.current, contextActive);
          setEmotionContext(context);

          // Update metrics
          updateMetrics(result.inferenceTime);
        }

        lastInferenceTimeRef.current = timestamp;
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(detectionLoop);
    },
    [isDetecting, isReady, fullConfig.inferenceInterval, fullConfig.historySize, runInference, updateMetrics, contextActive]
  );

  /**
   * Start detection on a video element
   */
  const startDetection = useCallback(
    (videoElement: HTMLVideoElement) => {
      if (!isReady) {
        console.warn('[EmotionDetector] Cannot start detection: not ready');
        return;
      }

      videoRef.current = videoElement;
      historyRef.current = [];
      latencyHistoryRef.current = [];
      frameCountRef.current = 0;
      droppedFramesRef.current = 0;
      lastInferenceTimeRef.current = 0;
      lastFpsUpdateRef.current = performance.now();

      setIsDetecting(true);
      console.log('[EmotionDetector] Detection started');
    },
    [isReady]
  );

  /**
   * Stop detection
   */
  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
    console.log('[EmotionDetector] Detection stopped');
  }, []);

  /**
   * Start/restart detection loop when isDetecting changes
   */
  useEffect(() => {
    if (isDetecting && isReady) {
      animationFrameRef.current = requestAnimationFrame(detectionLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDetecting, isReady, detectionLoop]);

  /**
   * Toggle context active state
   */
  const handleSetContextActive = useCallback((active: boolean) => {
    setContextActive(active);
    if (historyRef.current.length > 0) {
      const context = createEmotionContext(historyRef.current, active);
      setEmotionContext(context);
    }
  }, []);

  return {
    isReady,
    isDetecting,
    emotionContext,
    latestResult,
    metrics,
    error,
    startDetection,
    stopDetection,
    setContextActive: handleSetContextActive,
  };
}

export default useEmotionDetector;
