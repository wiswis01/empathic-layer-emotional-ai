/**
 * useMotionAnalyzer Hook
 *
 * Analyzes mouse/touch movement patterns for smoothness, jitter, and corrections.
 * Part of PMC8969204 adapted methodology for behavioral signal capture.
 *
 * Assumptions:
 * - A3: Jitter measured as RMS deviation from fitted Bezier curve
 * - A4: Corrections are direction reversals >15 degrees in 100ms window
 * - A14: Control = -corrections(0.4) - hesitation(0.35) + pathEfficiency(0.25)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface MotionMetrics {
  /** Motion smoothness 0-1 (higher = smoother) */
  smoothness: number;
  /** Jitter magnitude (normalized 0-1) */
  jitter: number;
  /** Direction reversal count in analysis window */
  corrections: number;
  /** Average motion speed (px/ms) */
  avgSpeed: number;
  /** Path efficiency: direct distance / actual distance (0-1) */
  pathEfficiency: number;
  /** Recent trajectory points for visualization */
  trajectory: Point[];
  /** Whether motion is currently active */
  isMoving: boolean;
  /** Time since last motion (ms) */
  hesitationDuration: number;
}

const TRAJECTORY_SIZE = 50;
const ANALYSIS_WINDOW_MS = 100;
const DIRECTION_THRESHOLD_DEG = 15;
const MOTION_TIMEOUT_MS = 150;

export function useMotionAnalyzer(): MotionMetrics {
  const [metrics, setMetrics] = useState<MotionMetrics>({
    smoothness: 1,
    jitter: 0,
    corrections: 0,
    avgSpeed: 0,
    pathEfficiency: 1,
    trajectory: [],
    isMoving: false,
    hesitationDuration: 0,
  });

  const trajectoryRef = useRef<Point[]>([]);
  const lastMoveTimeRef = useRef<number>(0);
  const motionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hesitationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate angle between two vectors
  const getAngle = useCallback((p1: Point, p2: Point, p3: Point): number => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
  }, []);

  // Calculate distance between two points
  const getDistance = useCallback((p1: Point, p2: Point): number => {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }, []);

  // Analyze trajectory and calculate metrics
  const analyzeTrajectory = useCallback((points: Point[]): Partial<MotionMetrics> => {
    if (points.length < 3) {
      return { smoothness: 1, jitter: 0, corrections: 0, avgSpeed: 0, pathEfficiency: 1 };
    }

    const now = performance.now();
    const recentPoints = points.filter(p => now - p.timestamp < ANALYSIS_WINDOW_MS * 5);

    if (recentPoints.length < 3) {
      return { smoothness: 1, jitter: 0, corrections: 0, avgSpeed: 0, pathEfficiency: 1 };
    }

    // Calculate corrections (direction reversals)
    let corrections = 0;
    for (let i = 1; i < recentPoints.length - 1; i++) {
      const angle = getAngle(recentPoints[i - 1], recentPoints[i], recentPoints[i + 1]);
      if (angle > 180 - DIRECTION_THRESHOLD_DEG) {
        corrections++;
      }
    }

    // Calculate path length and direct distance
    let pathLength = 0;
    for (let i = 1; i < recentPoints.length; i++) {
      pathLength += getDistance(recentPoints[i - 1], recentPoints[i]);
    }
    const directDistance = getDistance(recentPoints[0], recentPoints[recentPoints.length - 1]);
    const pathEfficiency = pathLength > 0 ? Math.min(1, directDistance / pathLength) : 1;

    // Calculate average speed
    const timeSpan = recentPoints[recentPoints.length - 1].timestamp - recentPoints[0].timestamp;
    const avgSpeed = timeSpan > 0 ? pathLength / timeSpan : 0;

    // Calculate jitter (deviation from smooth path)
    // Using simplified approach: variance of distances between consecutive points
    const distances: number[] = [];
    for (let i = 1; i < recentPoints.length; i++) {
      distances.push(getDistance(recentPoints[i - 1], recentPoints[i]));
    }

    if (distances.length > 0) {
      const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      const variance = distances.reduce((sum, d) => sum + (d - meanDist) ** 2, 0) / distances.length;
      const stdDev = Math.sqrt(variance);
      // Normalize jitter to 0-1 (assuming max stdDev of 50px)
      const jitter = Math.min(1, stdDev / 50);

      // Smoothness is inverse of jitter
      const smoothness = 1 - jitter;

      return {
        smoothness,
        jitter,
        corrections,
        avgSpeed,
        pathEfficiency,
      };
    }

    return { smoothness: 1, jitter: 0, corrections, avgSpeed, pathEfficiency };
  }, [getAngle, getDistance]);

  // Handle mouse/touch movement
  useEffect(() => {
    const handleMove = (x: number, y: number) => {
      const now = performance.now();
      const point: Point = { x, y, timestamp: now };

      // Update trajectory
      trajectoryRef.current.push(point);
      if (trajectoryRef.current.length > TRAJECTORY_SIZE) {
        trajectoryRef.current.shift();
      }

      lastMoveTimeRef.current = now;

      // Analyze and update metrics
      const analysis = analyzeTrajectory(trajectoryRef.current);

      setMetrics(prev => ({
        ...prev,
        ...analysis,
        trajectory: [...trajectoryRef.current],
        isMoving: true,
        hesitationDuration: 0,
      }));

      // Reset motion timeout
      if (motionTimeoutRef.current) {
        clearTimeout(motionTimeoutRef.current);
      }
      motionTimeoutRef.current = setTimeout(() => {
        setMetrics(prev => ({ ...prev, isMoving: false }));
      }, MOTION_TIMEOUT_MS);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      if (motionTimeoutRef.current) {
        clearTimeout(motionTimeoutRef.current);
      }
    };
  }, [analyzeTrajectory]);

  // Track hesitation duration
  useEffect(() => {
    hesitationIntervalRef.current = setInterval(() => {
      if (!metrics.isMoving && lastMoveTimeRef.current > 0) {
        const hesitation = performance.now() - lastMoveTimeRef.current;
        setMetrics(prev => ({ ...prev, hesitationDuration: hesitation }));
      }
    }, 50);

    return () => {
      if (hesitationIntervalRef.current) {
        clearInterval(hesitationIntervalRef.current);
      }
    };
  }, [metrics.isMoving]);

  return metrics;
}

export default useMotionAnalyzer;
