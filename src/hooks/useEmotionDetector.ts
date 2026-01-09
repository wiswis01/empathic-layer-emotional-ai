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
 * - Video frame change detection to prevent stale emotion readings
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import type {
  EmotionLabel,
  EmotionScores,
  EmotionDetectionResult,
  EmotionContext,
  PerformanceMetrics,
  EmotionDetectorConfig,
} from '@/types/emotion';
import { createEmotionContext } from '@/utils/emotionAnalysis';

/** How many consecutive frames with no face before clearing the cached face box */
const NO_FACE_THRESHOLD = 5;
/** How many frames to cache face detection (reduces overhead) */
const FACE_DETECTION_CACHE_FRAMES = 3; // Only re-detect face every 3 frames

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
  // Merge config with defaults - optimized for <50ms latency
  const fullConfig: EmotionDetectorConfig = {
    inferenceInterval: config.inferenceInterval ?? 30, // 30ms = ~33 FPS for ultra-fast updates
    historySize: config.historySize ?? 1, // Minimal history for instant response
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
  const faceModelRef = useRef<blazeface.BlazeFaceModel | null>(null);
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

        // Load face detection model
        console.log('[EmotionDetector] Loading face detection model...');
        faceModelRef.current = await blazeface.load();
        console.log('[EmotionDetector] Face detection model loaded');

        if (!isMounted) return;

        // Try to load pre-trained model, fall back to creating one
        try {
          // In production, load from: /models/emotion_model/model.json
          modelRef.current = await tf.loadLayersModel('/models/emotion_model/model.json');
          console.log('[EmotionDetector] Pre-trained emotion model loaded');
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

  // Canvas for faster preprocessing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  // Debug canvas to show what model sees
  const debugCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Last detected face box for smoothing
  const lastFaceBoxRef = useRef<{x: number, y: number, width: number, height: number} | null>(null);
  // Counter for consecutive frames with no face detected
  const noFaceCountRef = useRef<number>(0);
  // Track video frame changes to avoid processing same frame
  const lastVideoTimeRef = useRef<number>(-1);
  // Flag to prevent concurrent inference runs
  const isInferringRef = useRef<boolean>(false);
  // Ref to hold the latest detection loop to avoid stale closures
  const detectionLoopRef = useRef<((timestamp: number) => void) | null>(null);
  // Cache face detection results to reduce overhead
  const faceDetectionFrameCountRef = useRef<number>(0);

  /**
   * Preprocess video frame with face detection (optimized for speed)
   */
  const preprocessFrame = useCallback(
    async (video: HTMLVideoElement): Promise<tf.Tensor4D | null> => {
      if (!faceModelRef.current) return null;

      // Create canvas once and reuse
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = fullConfig.inputSize;
        canvasRef.current.height = fullConfig.inputSize;
        ctxRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });
      }

      // Create debug canvas only if debug mode is enabled
      if (fullConfig.debug && !debugCanvasRef.current) {
        debugCanvasRef.current = document.createElement('canvas');
        debugCanvasRef.current.width = fullConfig.inputSize;
        debugCanvasRef.current.height = fullConfig.inputSize;
        debugCanvasRef.current.id = 'emotion-debug-canvas';
        debugCanvasRef.current.style.cssText = 'position:fixed;bottom:20px;left:20px;width:150px;height:150px;border:3px solid #8e5572;border-radius:12px;z-index:9999;image-rendering:pixelated;background:#000;';
        document.body.appendChild(debugCanvasRef.current);
      }

      // Cache face detection - only run every N frames to reduce overhead
      let predictions: blazeface.NormalizedFace[] = [];
      const shouldDetectFace = faceDetectionFrameCountRef.current % FACE_DETECTION_CACHE_FRAMES === 0;
      
      if (shouldDetectFace) {
        predictions = await faceModelRef.current.estimateFaces(video, false);
        faceDetectionFrameCountRef.current = 0;
      }
      faceDetectionFrameCountRef.current++;

      if (predictions.length === 0) {
        // Increment no-face counter
        noFaceCountRef.current++;

        // If no face for too long, clear the cached face box
        if (noFaceCountRef.current >= NO_FACE_THRESHOLD) {
          lastFaceBoxRef.current = null;
          noFaceCountRef.current = 0; // Reset counter
          return null;
        }

        // No face detected, use last known position if available
        if (!lastFaceBoxRef.current) {
          return null;
        }
        // Use cached face box (will be processed below)
      } else {
        // Reset no-face counter when face is found
        noFaceCountRef.current = 0;
        // Get the first face
        const face = predictions[0];
        const topLeft = face.topLeft as [number, number];
        const bottomRight = face.bottomRight as [number, number];

        // Calculate face box - VERY tight crop to match FER2013 training data
        // BlazeFace returns a box around the face, but we need to adjust it
        // to match the training data format (face fills entire frame)
        const faceWidth = bottomRight[0] - topLeft[0];
        const faceHeight = bottomRight[1] - topLeft[1];

        // Make the crop square and centered on the face
        const size = Math.max(faceWidth, faceHeight);
        const centerX = (topLeft[0] + bottomRight[0]) / 2;
        const centerY = (topLeft[1] + bottomRight[1]) / 2;

        // Slight vertical offset (faces in FER2013 are slightly higher in frame)
        const yOffset = -size * 0.05;

        lastFaceBoxRef.current = {
          x: Math.max(0, centerX - size / 2),
          y: Math.max(0, centerY - size / 2 + yOffset),
          width: size,
          height: size,
        };
      }

      const faceBox = lastFaceBoxRef.current!;
      const ctx = ctxRef.current!;
      const size = fullConfig.inputSize;

      // Draw cropped face region and resize to 48x48 (optimized single draw)
      ctx.drawImage(
        video,
        faceBox.x, faceBox.y, faceBox.width, faceBox.height, // source (face region)
        0, 0, size, size // destination (48x48)
      );

      // Use getImageData once (faster than multiple operations)
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const pixelCount = size * size;

      // Convert to grayscale Float32Array directly with optimized loop
      // Normalize to [0, 1] range (matching training: rescale=1./255)
      const grayscale = new Float32Array(pixelCount);
      const inv255 = 1.0 / 255.0;
      for (let i = 0; i < pixelCount; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Normalize to [0, 1] to match training preprocessing (optimized grayscale)
        grayscale[i] = (0.299 * r + 0.587 * g + 0.114 * b) * inv255;
      }

      // Update debug canvas only if debug mode is enabled
      if (fullConfig.debug && debugCanvasRef.current) {
        const debugCtx = debugCanvasRef.current.getContext('2d')!;
        const debugImageData = debugCtx.createImageData(size, size);
        for (let i = 0; i < size * size; i++) {
          const val = Math.round(grayscale[i] * 255); // Convert back for display
          debugImageData.data[i * 4] = val;
          debugImageData.data[i * 4 + 1] = val;
          debugImageData.data[i * 4 + 2] = val;
          debugImageData.data[i * 4 + 3] = 255;
        }
        debugCtx.putImageData(debugImageData, 0, 0);
      }

      // Create tensor from preprocessed data
      return tf.tensor4d(grayscale, [1, size, size, 1]);
    },
    [fullConfig.inputSize]
  );

  /**
   * Run inference on a single frame
   */
  const runInference = useCallback(async (): Promise<EmotionDetectionResult | null> => {
    if (!modelRef.current || !videoRef.current || !faceModelRef.current) return null;

    // Prevent concurrent inference runs
    if (isInferringRef.current) {
      if (fullConfig.debug) {
        console.log('[EmotionDetector] Skipping inference - previous inference still running');
      }
      return null;
    }

    // Check if video has a new frame
    const currentVideoTime = videoRef.current.currentTime;
    if (currentVideoTime === lastVideoTimeRef.current) {
      // Same frame, skip processing
      if (fullConfig.debug) {
        console.log('[EmotionDetector] Skipping - same video frame');
      }
      return null;
    }
    lastVideoTimeRef.current = currentVideoTime;

    isInferringRef.current = true;
    const startTime = performance.now();

    try {
      // Preprocess the video frame with face detection
      const inputTensor = await preprocessFrame(videoRef.current);

      // No face detected
      if (!inputTensor) {
        if (fullConfig.debug) {
          console.log('[EmotionDetector] No face detected');
        }
        isInferringRef.current = false;
        return null;
      }

      // Run prediction
      const prediction = modelRef.current.predict(inputTensor) as tf.Tensor;

      // Extract prediction data
      const probabilities = await prediction.data();

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      // Process results
      // Model output order: happy, neutral, sad, surprise (indices 0, 1, 2, 3)
      const scores: EmotionScores = {
        happy: probabilities[0],
        neutral: probabilities[1],
        sad: probabilities[2],
        surprise: probabilities[3],
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

      // Log raw scores only in debug mode
      if (fullConfig.debug) {
        console.log('[EmotionDetector] RAW SCORES:', {
          happy: probabilities[0].toFixed(3),
          neutral: probabilities[1].toFixed(3),
          sad: probabilities[2].toFixed(3),
          surprise: probabilities[3].toFixed(3),
          dominant: dominantEmotion,
          confidence: maxScore.toFixed(3),
          latency: inferenceTime.toFixed(2) + 'ms',
        });
      }

      isInferringRef.current = false;
      return result;
    } catch (e) {
      console.error('[EmotionDetector] Inference error:', e);
      droppedFramesRef.current++;
      isInferringRef.current = false;
      return null;
    }
  }, [preprocessFrame, fullConfig.debug]);

  /**
   * Update performance metrics (optimized - throttled to avoid blocking)
   */
  const updateMetrics = useCallback((latency: number) => {
    // Track latency history (limited size for speed)
    latencyHistoryRef.current.push(latency);
    if (latencyHistoryRef.current.length > 50) { // Reduced from 100 for speed
      latencyHistoryRef.current.shift();
    }

    // Calculate FPS and update metrics (throttled to 1 second)
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsUpdateRef.current >= 1000) {
      const fps = frameCountRef.current;
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;

      // Fast latency calculation (avoid full sort for speed)
      const latencies = latencyHistoryRef.current;
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      
      // Simplified p95 (use last 20 values for speed)
      const recent = latencies.slice(-20).sort((a, b) => a - b);
      const p95Latency = recent[Math.floor(recent.length * 0.95)] || avgLatency;

      // Get memory info if available
      let memoryUsage = 0;
      const memInfo = tf.memory();
      memoryUsage = memInfo.numBytes / (1024 * 1024); // Convert to MB

      // Batch state update
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
   * Detection loop implementation
   * Uses a ref-based approach to avoid stale closure issues
   */
  const detectionLoopImpl = useCallback(
    async (timestamp: number) => {
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
    },
    [fullConfig.inferenceInterval, fullConfig.historySize, runInference, updateMetrics, contextActive]
  );

  // Keep the ref updated with the latest implementation
  useEffect(() => {
    detectionLoopRef.current = detectionLoopImpl;
  }, [detectionLoopImpl]);

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
      faceDetectionFrameCountRef.current = 0; // Reset face detection cache
      lastVideoTimeRef.current = -1; // Reset video time tracking
      noFaceCountRef.current = 0; // Reset no-face counter
      isInferringRef.current = false; // Reset inference flag

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
    isInferringRef.current = false;
    setIsDetecting(false);
    console.log('[EmotionDetector] Detection stopped');
  }, []);

  /**
   * Start/restart detection loop when isDetecting changes
   * Uses a stable wrapper that calls through the ref to avoid stale closures
   */
  useEffect(() => {
    if (!isDetecting || !isReady) return;

    let isRunning = true;

    const loop = async (timestamp: number) => {
      if (!isRunning) return;

      // Call the latest implementation via ref
      if (detectionLoopRef.current) {
        await detectionLoopRef.current(timestamp);
      }

      // Schedule next frame only if still running
      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    // Start the loop
    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDetecting, isReady]);

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
