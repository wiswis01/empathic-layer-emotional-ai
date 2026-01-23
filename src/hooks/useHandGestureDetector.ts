/**
 * useHandGestureDetector Hook
 *
 * A React hook for real-time hand gesture detection using MediaPipe Hands
 * with rule-based gesture classification from hand landmarks.
 *
 * Key features:
 * - MediaPipe Hands for hand landmark detection (21 3D keypoints)
 * - Rule-based hand sign classification (Open, Close, Pointer, OK)
 * - Finger gesture tracking with point history
 * - Memory-safe with proper cleanup
 * - Throttled inference for performance
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Hands } from '@mediapipe/hands';
import type {
  HandSignLabel,
  FingerGestureLabel,
  HandGestureResult,
  HandLandmark,
} from '@/types/emotion';

interface UseHandGestureDetectorReturn {
  /** Whether the models are loaded and ready */
  isReady: boolean;
  /** Whether detection is currently running */
  isDetecting: boolean;
  /** Latest hand gesture detection result */
  latestResult: HandGestureResult | null;
  /** Error message if any */
  error: string | null;
  /** Start detection on a video element */
  startDetection: (videoElement: HTMLVideoElement) => void;
  /** Stop detection */
  stopDetection: () => void;
}

interface HandGestureDetectorConfig {
  /** Minimum time between inferences in ms (default: 50) */
  inferenceInterval: number;
  /** Minimum confidence for hand sign (default: 0.5) */
  minHandSignConfidence: number;
  /** Minimum confidence for finger gesture (default: 0.5) */
  minFingerGestureConfidence: number;
  /** History length for finger gesture (default: 16) */
  historyLength: number;
  /** Whether to enable debug logging (default: false) */
  debug: boolean;
  /** Skip frames for MediaPipe processing (default: 1 = every frame) */
  frameSkip: number;
}

/**
 * MediaPipe Hand Landmark Indices
 * 0: Wrist
 * 1-4: Thumb (CMC, MCP, IP, TIP)
 * 5-8: Index (MCP, PIP, DIP, TIP)
 * 9-12: Middle (MCP, PIP, DIP, TIP)
 * 13-16: Ring (MCP, PIP, DIP, TIP)
 * 17-20: Pinky (MCP, PIP, DIP, TIP)
 */

/**
 * Calculate distance between two landmarks
 */
function distance(p1: HandLandmark, p2: HandLandmark): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Calculate angle between three points (in degrees)
 */
function angle(a: HandLandmark, b: HandLandmark, c: HandLandmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const cross = ab.x * cb.y - ab.y * cb.x;
  return Math.abs(Math.atan2(cross, dot) * (180 / Math.PI));
}

/**
 * Check if a finger is extended using angle-based detection
 * More accurate than distance-based
 */
function isFingerExtended(landmarks: HandLandmark[], mcp: number, pip: number, dip: number, tip: number): boolean {
  // A finger is extended if both joints are relatively straight (angle > 160°)
  const pipAngle = angle(landmarks[mcp], landmarks[pip], landmarks[dip]);
  const dipAngle = angle(landmarks[pip], landmarks[dip], landmarks[tip]);

  // Extended = both joints are straight
  return pipAngle > 150 && dipAngle > 150;
}

/**
 * Check if thumb is extended using angle and position
 */
function isThumbExtended(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];
  const indexMCP = landmarks[5];

  // Check thumb angle
  const thumbAngle = angle(landmarks[1], thumbMCP, thumbIP);

  // Check if thumb tip is far from palm
  const thumbToIndex = distance(thumbTip, indexMCP);
  const palmWidth = distance(landmarks[5], landmarks[17]);

  return thumbAngle > 120 && thumbToIndex > palmWidth * 0.6;
}

/**
 * Check if finger is curled (bent inward)
 */
function isFingerCurled(landmarks: HandLandmark[], mcp: number, pip: number, dip: number, tip: number): boolean {
  const pipAngle = angle(landmarks[mcp], landmarks[pip], landmarks[dip]);
  const dipAngle = angle(landmarks[pip], landmarks[dip], landmarks[tip]);

  // Curled = joints are bent
  return pipAngle < 130 || dipAngle < 130;
}

/**
 * Accurate rule-based hand sign classification
 */
function classifyHandSign(landmarks: HandLandmark[]): { sign: HandSignLabel; confidence: number } {
  if (landmarks.length !== 21) {
    return { sign: 'Open', confidence: 0.3 };
  }

  // Finger states using angle-based detection
  const thumbExtended = isThumbExtended(landmarks);
  const indexExtended = isFingerExtended(landmarks, 5, 6, 7, 8);
  const middleExtended = isFingerExtended(landmarks, 9, 10, 11, 12);
  const ringExtended = isFingerExtended(landmarks, 13, 14, 15, 16);
  const pinkyExtended = isFingerExtended(landmarks, 17, 18, 19, 20);

  const indexCurled = isFingerCurled(landmarks, 5, 6, 7, 8);
  const middleCurled = isFingerCurled(landmarks, 9, 10, 11, 12);
  const ringCurled = isFingerCurled(landmarks, 13, 14, 15, 16);
  const pinkyCurled = isFingerCurled(landmarks, 17, 18, 19, 20);

  const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended]
    .filter(Boolean).length;

  const curledCount = [indexCurled, middleCurled, ringCurled, pinkyCurled]
    .filter(Boolean).length;

  // OK Sign: Thumb and index tips touch, other fingers extended
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const thumbIndexDist = distance(thumbTip, indexTip);
  const palmSize = distance(landmarks[0], landmarks[9]);

  if (thumbIndexDist < palmSize * 0.25 && middleExtended && ringExtended && pinkyExtended) {
    return { sign: 'OK', confidence: 0.92 };
  }

  // Pointer: Only index extended, others curled
  if (indexExtended && middleCurled && ringCurled && pinkyCurled) {
    return { sign: 'Pointer', confidence: 0.9 };
  }

  // Also pointer if index is extended and others are not
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return { sign: 'Pointer', confidence: 0.85 };
  }

  // Open Hand: Most fingers extended (4-5)
  if (extendedCount >= 4) {
    return { sign: 'Open', confidence: 0.85 + (extendedCount - 4) * 0.05 };
  }

  // Closed Fist: Most fingers curled
  if (curledCount >= 3 && !indexExtended) {
    return { sign: 'Close', confidence: 0.85 + (curledCount - 3) * 0.05 };
  }

  // Few fingers extended = Close
  if (extendedCount <= 2 && curledCount >= 2) {
    return { sign: 'Close', confidence: 0.75 };
  }

  // Default based on extended count
  if (extendedCount >= 3) {
    return { sign: 'Open', confidence: 0.6 };
  }

  return { sign: 'Close', confidence: 0.6 };
}

/**
 * Classify finger gesture based on point history
 * Analyzes movement patterns of the index finger tip
 */
function classifyFingerGesture(
  pointHistory: Array<[number, number]>,
  _imageWidth: number,
  _imageHeight: number
): { gesture: FingerGestureLabel | null; confidence: number } {
  if (pointHistory.length < 8) {
    return { gesture: null, confidence: 0 };
  }

  // Filter out zero points (when not pointing)
  const validPoints = pointHistory.filter(p => p[0] !== 0 || p[1] !== 0);
  if (validPoints.length < 4) {
    return { gesture: 'Stop', confidence: 0.7 };
  }

  // Calculate total movement
  let totalMovement = 0;
  let dx = 0;
  let dy = 0;
  let crossProduct = 0; // For rotation detection

  for (let i = 1; i < validPoints.length; i++) {
    const deltaX = validPoints[i][0] - validPoints[i - 1][0];
    const deltaY = validPoints[i][1] - validPoints[i - 1][1];
    totalMovement += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    dx += deltaX;
    dy += deltaY;

    // Cross product for rotation detection
    if (i > 1) {
      const prevDx = validPoints[i - 1][0] - validPoints[i - 2][0];
      const prevDy = validPoints[i - 1][1] - validPoints[i - 2][1];
      crossProduct += prevDx * deltaY - prevDy * deltaX;
    }
  }

  // Minimal movement = Stop
  if (totalMovement < 20) {
    return { gesture: 'Stop', confidence: 0.8 };
  }

  // Check for circular motion (clockwise or counter-clockwise)
  const avgCrossProduct = crossProduct / (validPoints.length - 2);
  if (Math.abs(avgCrossProduct) > 5) {
    if (avgCrossProduct > 0) {
      return { gesture: 'Counter Clockwise', confidence: Math.min(0.9, 0.6 + Math.abs(avgCrossProduct) / 20) };
    } else {
      return { gesture: 'Clockwise', confidence: Math.min(0.9, 0.6 + Math.abs(avgCrossProduct) / 20) };
    }
  }

  // Linear movement
  if (totalMovement > 30) {
    return { gesture: 'Move', confidence: Math.min(0.9, 0.5 + totalMovement / 100) };
  }

  return { gesture: 'Stop', confidence: 0.6 };
}

/**
 * Smooth landmarks using exponential moving average
 */
function smoothLandmarks(
  current: HandLandmark[],
  previous: HandLandmark[] | null,
  alpha: number = 0.4
): HandLandmark[] {
  if (!previous || previous.length !== current.length) {
    return current;
  }
  return current.map((curr, i) => ({
    x: alpha * curr.x + (1 - alpha) * previous[i].x,
    y: alpha * curr.y + (1 - alpha) * previous[i].y,
  }));
}

/**
 * Custom hook for real-time hand gesture detection
 */
export function useHandGestureDetector(
  config: Partial<HandGestureDetectorConfig> = {}
): UseHandGestureDetectorReturn {
  const fullConfig: HandGestureDetectorConfig = {
    inferenceInterval: config.inferenceInterval ?? 33, // ~30fps for smoothness
    minHandSignConfidence: config.minHandSignConfidence ?? 0.6,
    minFingerGestureConfidence: config.minFingerGestureConfidence ?? 0.6,
    historyLength: config.historyLength ?? 16,
    debug: config.debug ?? false,
    frameSkip: config.frameSkip ?? 1, // Process every frame for smoothness
  };

  // State
  const [isReady, setIsReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [latestResult, setLatestResult] = useState<HandGestureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const handsRef = useRef<Hands | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pointHistoryRef = useRef<Array<[number, number]>>([]);
  const lastInferenceTimeRef = useRef<number>(0);
  const isInferringRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const isDetectingRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastLandmarksRef = useRef<HandLandmark[] | null>(null);
  const lastSignRef = useRef<HandSignLabel | null>(null);
  const signStabilityRef = useRef<number>(0);

  /**
   * Initialize MediaPipe Hands
   */
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        setError(null);

        // Initialize MediaPipe Hands
        handsRef.current = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        handsRef.current.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (!isMounted) return;

        setIsReady(true);
        console.log('[HandGestureDetector] Ready for inference');
      } catch (e) {
        console.error('[HandGestureDetector] Initialization failed:', e);
        if (isMounted) {
          setError(`Failed to initialize hand gesture detector: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  /**
   * Process hand detection results
   */
  const processHandResults = useCallback(
    async (results: { multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }, videoWidth: number, videoHeight: number): Promise<HandGestureResult | null> => {
      if (!handsRef.current) {
        return null;
      }

      if (isInferringRef.current) {
        return null;
      }

      const now = performance.now();
      if (now - lastInferenceTimeRef.current < fullConfig.inferenceInterval) {
        return null;
      }

      isInferringRef.current = true;
      const startTime = performance.now();

      try {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
          pointHistoryRef.current.push([0, 0]);
          if (pointHistoryRef.current.length > fullConfig.historyLength) {
            pointHistoryRef.current.shift();
          }
          isInferringRef.current = false;
          return {
            handSign: null,
            fingerGesture: null,
            handSignConfidence: 0,
            fingerGestureConfidence: 0,
            landmarks: [],
            isDetected: false,
            timestamp: Date.now(),
            inferenceTime: performance.now() - startTime,
          };
        }

        // Get first hand and convert to pixel coordinates
        const handLandmarks = results.multiHandLandmarks[0];
        const rawLandmarks: HandLandmark[] = handLandmarks.map((lm) => ({
          x: lm.x * videoWidth,
          y: lm.y * videoHeight,
        }));

        // Smooth landmarks for buttery smooth tracking
        const landmarks = smoothLandmarks(rawLandmarks, lastLandmarksRef.current, 0.5);
        lastLandmarksRef.current = landmarks;

        // Classify hand sign using rule-based approach
        const { sign: handSign, confidence: handSignConfidence } = classifyHandSign(landmarks);

        // Stabilize sign detection - require 3 consistent frames before changing
        let validHandSign: HandSignLabel | null = null;
        if (handSignConfidence >= fullConfig.minHandSignConfidence) {
          if (handSign === lastSignRef.current) {
            signStabilityRef.current++;
          } else {
            signStabilityRef.current = 1;
          }

          if (signStabilityRef.current >= 2) {
            validHandSign = handSign;
            lastSignRef.current = handSign;
          } else {
            validHandSign = lastSignRef.current; // Keep previous until stable
          }
        } else {
          signStabilityRef.current = 0;
          lastSignRef.current = null;
        }

        // Update point history for finger gesture (index finger tip)
        if (validHandSign === 'Pointer') {
          pointHistoryRef.current.push([landmarks[8].x, landmarks[8].y]);
        } else {
          pointHistoryRef.current.push([0, 0]);
        }

        // Keep history within limit
        if (pointHistoryRef.current.length > fullConfig.historyLength) {
          pointHistoryRef.current.shift();
        }

        // Classify finger gesture
        const { gesture: fingerGesture, confidence: fingerGestureConfidence } = classifyFingerGesture(
          pointHistoryRef.current,
          videoWidth,
          videoHeight
        );
        const validFingerGesture = fingerGestureConfidence >= fullConfig.minFingerGestureConfidence ? fingerGesture : null;

        const inferenceTime = performance.now() - startTime;

        if (fullConfig.debug) {
          console.log('[HandGestureDetector]', {
            handSign: validHandSign,
            handSignConfidence: handSignConfidence.toFixed(3),
            fingerGesture: validFingerGesture,
            fingerGestureConfidence: fingerGestureConfidence.toFixed(3),
            latency: inferenceTime.toFixed(2) + 'ms',
          });
        }

        isInferringRef.current = false;
        lastInferenceTimeRef.current = now;

        return {
          handSign: validHandSign,
          fingerGesture: validFingerGesture,
          handSignConfidence,
          fingerGestureConfidence,
          landmarks,
          isDetected: true,
          timestamp: Date.now(),
          inferenceTime,
        };
      } catch (e) {
        console.error('[HandGestureDetector] Inference error:', e);
        isInferringRef.current = false;
        return null;
      }
    },
    [fullConfig]
  );

  /**
   * Start detection on a video element
   */
  const startDetection = useCallback(
    (videoElement: HTMLVideoElement) => {
      if (!isReady || !handsRef.current) {
        console.warn('[HandGestureDetector] Cannot start detection: not ready');
        return;
      }

      videoRef.current = videoElement;
      pointHistoryRef.current = [];
      lastInferenceTimeRef.current = 0;
      isInferringRef.current = false;
      frameCountRef.current = 0;

      // Set up MediaPipe Hands callback
      handsRef.current.onResults(async (results) => {
        if (videoRef.current) {
          const result = await processHandResults(
            results,
            videoRef.current.videoWidth,
            videoRef.current.videoHeight
          );
          if (result) {
            setLatestResult(result);
          }
        }
      });

      // Process video frames using requestAnimationFrame with frame skipping
      const processFrame = async () => {
        if (!videoRef.current || !handsRef.current || !isDetectingRef.current) {
          return;
        }

        frameCountRef.current++;
        
        // Skip frames for better performance
        if (frameCountRef.current % fullConfig.frameSkip === 0) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            console.error('[HandGestureDetector] Frame processing error:', e);
          }
        }

        if (isDetectingRef.current) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
        }
      };

      isDetectingRef.current = true;
      setIsDetecting(true);
      animationFrameRef.current = requestAnimationFrame(processFrame);
      console.log('[HandGestureDetector] Detection started');
    },
    [isReady, processHandResults]
  );

  /**
   * Stop detection
   */
  const stopDetection = useCallback(() => {
    isDetectingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
    setLatestResult(null);
    console.log('[HandGestureDetector] Detection stopped');
  }, []);

  return {
    isReady,
    isDetecting,
    latestResult,
    error,
    startDetection,
    stopDetection,
  };
}

export default useHandGestureDetector;
