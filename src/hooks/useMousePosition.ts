/**
 * useMousePosition Hook
 *
 * Efficient mouse position tracking for custom cursor.
 * Includes throttling and touch device detection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface MousePosition {
  /** X coordinate relative to viewport */
  x: number;

  /** Y coordinate relative to viewport */
  y: number;

  /** Whether the mouse is currently over the viewport */
  isInViewport: boolean;

  /** Whether this is a touch device (cursor should be hidden) */
  isTouchDevice: boolean;

  /** Whether the mouse is currently moving */
  isMoving: boolean;
}

interface UseMousePositionOptions {
  /** Throttle interval in ms (default: 16 for ~60fps) */
  throttleMs?: number;

  /** Delay before isMoving becomes false (default: 100ms) */
  movingTimeoutMs?: number;
}

/**
 * Hook to track mouse position with throttling for smooth cursor animation
 */
export function useMousePosition(
  options: UseMousePositionOptions = {}
): MousePosition {
  const { throttleMs = 16, movingTimeoutMs = 100 } = options;

  const [position, setPosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    isInViewport: false,
    isTouchDevice: false,
    isMoving: false,
  });

  const lastUpdateTime = useRef(0);
  const movingTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef<number | null>(null);

  // Detect touch device
  useEffect(() => {
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE-specific
      navigator.msMaxTouchPoints > 0;

    setPosition((prev) => ({ ...prev, isTouchDevice }));
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const now = Date.now();

      // Clear any pending moving timeout
      if (movingTimeoutId.current) {
        clearTimeout(movingTimeoutId.current);
      }

      // Throttle updates
      if (now - lastUpdateTime.current < throttleMs) {
        if (rafId.current === null) {
          rafId.current = requestAnimationFrame(() => {
            rafId.current = null;
            setPosition((prev) => ({
              ...prev,
              x: event.clientX,
              y: event.clientY,
              isInViewport: true,
              isMoving: true,
            }));
            lastUpdateTime.current = Date.now();
          });
        }
        return;
      }

      lastUpdateTime.current = now;

      setPosition((prev) => ({
        ...prev,
        x: event.clientX,
        y: event.clientY,
        isInViewport: true,
        isMoving: true,
      }));

      // Set timeout to mark as not moving
      movingTimeoutId.current = setTimeout(() => {
        setPosition((prev) => ({ ...prev, isMoving: false }));
      }, movingTimeoutMs);
    },
    [throttleMs, movingTimeoutMs]
  );

  const handleMouseLeave = useCallback(() => {
    setPosition((prev) => ({
      ...prev,
      isInViewport: false,
      isMoving: false,
    }));
  }, []);

  const handleMouseEnter = useCallback((event: MouseEvent) => {
    setPosition((prev) => ({
      ...prev,
      x: event.clientX,
      y: event.clientY,
      isInViewport: true,
    }));
  }, []);

  useEffect(() => {
    // Don't add listeners on touch devices
    if (position.isTouchDevice) return;

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);

      if (movingTimeoutId.current) {
        clearTimeout(movingTimeoutId.current);
      }
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [
    handleMouseMove,
    handleMouseLeave,
    handleMouseEnter,
    position.isTouchDevice,
  ]);

  return position;
}

export default useMousePosition;
