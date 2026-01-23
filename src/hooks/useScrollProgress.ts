/**
 * useScrollProgress Hook
 *
 * Tracks scroll position as a normalized value (0.0 - 1.0)
 * for driving scroll-based animations and transitions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface ScrollProgress {
  /** Overall scroll progress from 0.0 to 1.0 */
  progress: number;

  /** Current section index (0-based) */
  sectionIndex: number;

  /** Progress within the current section (0.0 - 1.0) */
  sectionProgress: number;

  /** Raw scroll position in pixels */
  scrollY: number;

  /** Total scrollable height */
  scrollHeight: number;

  /** Viewport height */
  viewportHeight: number;

  /** Scroll direction: 1 = down, -1 = up, 0 = stationary */
  direction: -1 | 0 | 1;
}

interface UseScrollProgressOptions {
  /** Number of sections for section-based calculations */
  sectionCount?: number;

  /** Throttle interval in ms (default: 16 for ~60fps) */
  throttleMs?: number;

  /** Target element to track (default: window) */
  target?: React.RefObject<HTMLElement | null>;
}

/**
 * Hook to track scroll progress with throttling for performance
 */
export function useScrollProgress(
  options: UseScrollProgressOptions = {}
): ScrollProgress {
  const { sectionCount = 4, throttleMs = 16, target } = options;

  const [scrollProgress, setScrollProgress] = useState<ScrollProgress>({
    progress: 0,
    sectionIndex: 0,
    sectionProgress: 0,
    scrollY: 0,
    scrollHeight: 0,
    viewportHeight: 0,
    direction: 0,
  });

  const lastScrollY = useRef(0);
  const lastUpdateTime = useRef(0);
  const rafId = useRef<number | null>(null);

  const calculateProgress = useCallback(() => {
    const element = target?.current;
    const scrollY = element ? element.scrollTop : window.scrollY;
    const viewportHeight = element
      ? element.clientHeight
      : window.innerHeight;
    const scrollHeight = element
      ? element.scrollHeight
      : document.documentElement.scrollHeight;

    // Calculate total scrollable distance
    const maxScroll = scrollHeight - viewportHeight;
    const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;

    // Calculate section-based values
    const sectionHeight = maxScroll / sectionCount;
    const sectionIndex = Math.min(
      Math.floor(scrollY / sectionHeight),
      sectionCount - 1
    );
    const sectionStart = sectionIndex * sectionHeight;
    const sectionProgress =
      sectionHeight > 0
        ? Math.min((scrollY - sectionStart) / sectionHeight, 1)
        : 0;

    // Calculate direction
    const direction =
      scrollY > lastScrollY.current
        ? 1
        : scrollY < lastScrollY.current
          ? -1
          : 0;

    lastScrollY.current = scrollY;

    return {
      progress,
      sectionIndex,
      sectionProgress,
      scrollY,
      scrollHeight,
      viewportHeight,
      direction,
    } as ScrollProgress;
  }, [sectionCount, target]);

  const handleScroll = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateTime.current < throttleMs) {
      // Schedule update for next frame if throttled
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = null;
          setScrollProgress(calculateProgress());
          lastUpdateTime.current = Date.now();
        });
      }
      return;
    }

    lastUpdateTime.current = now;
    setScrollProgress(calculateProgress());
  }, [calculateProgress, throttleMs]);

  useEffect(() => {
    const element = target?.current;
    const scrollTarget = element || window;

    // Initial calculation
    setScrollProgress(calculateProgress());

    // Add scroll listener
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    // Add resize listener for recalculation
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll, calculateProgress, target]);

  return scrollProgress;
}

export default useScrollProgress;
