/**
 * useDeepFaceDetector Hook
 *
 * Uses Python DeepFace backend for accurate emotion detection.
 * Requires backend/emotion_server.py running on port 5001.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type {
  EmotionLabel,
  EmotionScores,
  EmotionDetectionResult,
  EmotionContext,
  PerformanceMetrics,
} from '@/types/emotion';
import { createEmotionContext } from '@/utils/emotionAnalysis';

const API_URL = 'http://localhost:5001/analyze';

interface UseDeepFaceDetectorReturn {
  isReady: boolean;
  isDetecting: boolean;
  emotionContext: EmotionContext | null;
  latestResult: EmotionDetectionResult | null;
  metrics: PerformanceMetrics;
  error: string | null;
  startDetection: (videoElement: HTMLVideoElement) => void;
  stopDetection: () => void;
  setContextActive: (active: boolean) => void;
}

export function useDeepFaceDetector(): UseDeepFaceDetectorReturn {
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
    backend: 'deepface',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const historyRef = useRef<EmotionDetectionResult[]>([]);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const latenciesRef = useRef<number[]>([]);

  // Check backend health on mount
  useEffect(() => {
    fetch('http://localhost:5001/health')
      .then(res => res.json())
      .then(() => {
        setIsReady(true);
        setError(null);
        console.log('[DeepFace] Backend connected');
      })
      .catch(() => {
        setError('DeepFace backend not running. Start: python backend/emotion_server.py');
        setIsReady(false);
      });
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const startTime = performance.now();

    try {
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await response.json();
      const inferenceTime = performance.now() - startTime;

      const result: EmotionDetectionResult = {
        dominantEmotion: data.emotion as EmotionLabel,
        confidence: data.confidence,
        scores: data.scores as EmotionScores,
        timestamp: Date.now(),
        inferenceTime,
      };

      // Update history
      historyRef.current.push(result);
      if (historyRef.current.length > 5) {
        historyRef.current.shift();
      }

      setLatestResult(result);
      setEmotionContext(createEmotionContext(historyRef.current, contextActive));

      // Update metrics
      frameCountRef.current++;
      latenciesRef.current.push(inferenceTime);
      if (latenciesRef.current.length > 30) latenciesRef.current.shift();

      const now = Date.now();
      if (now - lastFpsUpdateRef.current >= 1000) {
        const fps = frameCountRef.current;
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;

        const avgLatency = latenciesRef.current.reduce((a, b) => a + b, 0) / latenciesRef.current.length;
        const sorted = [...latenciesRef.current].sort((a, b) => a - b);
        const p95Latency = sorted[Math.floor(sorted.length * 0.95)] || avgLatency;

        setMetrics({
          fps,
          avgLatency,
          p95Latency,
          memoryUsage: 0,
          detectionCount: historyRef.current.length,
          droppedFrames: 0,
          backend: 'deepface',
        });
      }
    } catch (e) {
      console.error('[DeepFace] Analysis error:', e);
    }
  }, [contextActive]);

  const startDetection = useCallback((videoElement: HTMLVideoElement) => {
    if (!isReady) {
      console.warn('[DeepFace] Backend not ready');
      return;
    }

    videoRef.current = videoElement;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    historyRef.current = [];
    frameCountRef.current = 0;
    latenciesRef.current = [];

    // Run at ~3 FPS (333ms interval)
    intervalRef.current = window.setInterval(captureAndAnalyze, 333);
    setIsDetecting(true);
    console.log('[DeepFace] Detection started');
  }, [isReady, captureAndAnalyze]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsDetecting(false);
    console.log('[DeepFace] Detection stopped');
  }, []);

  const handleSetContextActive = useCallback((active: boolean) => {
    setContextActive(active);
    if (historyRef.current.length > 0) {
      setEmotionContext(createEmotionContext(historyRef.current, active));
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
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

export default useDeepFaceDetector;
