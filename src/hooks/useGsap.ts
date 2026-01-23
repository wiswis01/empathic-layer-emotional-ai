/**
 * useGsap Hook
 *
 * Custom hook for integrating GSAP animations with React.
 * Provides cleanup and scoped animation contexts.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Premium easing curves inspired by Inkwell.tech
 */
export const PREMIUM_EASE = {
  // Rapid acceleration with precise braking
  power3Out: 'power3.out',
  power4Out: 'power4.out',

  // Cinematic entrance
  expoOut: 'expo.out',
  expoInOut: 'expo.inOut',

  // Organic, weighted movement
  elastic: 'elastic.out(1, 0.5)',

  // Smooth lerp-like easing
  custom: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
} as const;

/**
 * Animation durations for consistent timing
 */
export const PREMIUM_DURATION = {
  instant: 0.15,
  fast: 0.3,
  normal: 0.5,
  slow: 0.8,
  cinematic: 1.2,
} as const;

export interface UseGsapOptions {
  /** Scope for animations (useful for scoped selectors) */
  scope?: MutableRefObject<HTMLElement | null>;

  /** Dependencies to trigger effect re-run */
  dependencies?: unknown[];

  /** Enable revert on cleanup */
  revertOnUpdate?: boolean;
}

/**
 * Custom hook for GSAP animations
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 *
 * useGsap((gsap, ScrollTrigger) => {
 *   gsap.from('.element', {
 *     opacity: 0,
 *     y: 50,
 *     duration: 0.8,
 *     ease: PREMIUM_EASE.expoOut,
 *     scrollTrigger: {
 *       trigger: containerRef.current,
 *       start: 'top center',
 *     },
 *   });
 * }, { scope: containerRef });
 * ```
 */
type GsapType = typeof gsap;
type ScrollTriggerType = typeof ScrollTrigger;

export const useGsap = (
  callback: (g: GsapType, st: ScrollTriggerType) => void | (() => void),
  options: UseGsapOptions = {}
) => {
  const { scope, dependencies = [], revertOnUpdate = false } = options;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Create a context for scoped animations
    const ctx = gsap.context(() => {
      const cleanup = callback(gsap, ScrollTrigger);
      if (typeof cleanup === 'function') {
        cleanupRef.current = cleanup;
      }
    }, scope?.current || undefined);

    // Cleanup function
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      if (revertOnUpdate) {
        ctx.revert();
      } else {
        ctx.kill();
      }
    };
  }, dependencies);
};

/**
 * Hook for creating a lerp (linear interpolation) animation
 * Provides smooth inertia-based tracking
 *
 * @example
 * ```tsx
 * const { current, target, setCurrent, setTarget } = useLerp(0, 0.1);
 *
 * // Update target on mouse move
 * const handleMouseMove = (e: MouseEvent) => {
 *   setTarget({ x: e.clientX, y: e.clientY });
 * };
 * ```
 */
export const useLerp = <T extends Record<string, number>>(
  initialValue: T,
  smoothing: number = 0.1
) => {
  const current = useRef<T>(initialValue);
  const target = useRef<T>(initialValue);
  const rafId = useRef<number | undefined>(undefined);

  const lerp = useCallback((start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  }, []);

  const animate = useCallback(() => {
    let hasChanged = false;

    Object.keys(current.current).forEach((key) => {
      const currentVal = current.current[key as keyof T];
      const targetVal = target.current[key as keyof T];
      const newVal = lerp(currentVal, targetVal, smoothing);

      if (Math.abs(newVal - currentVal) > 0.01) {
        current.current[key as keyof T] = newVal as T[keyof T];
        hasChanged = true;
      } else {
        current.current[key as keyof T] = targetVal as T[keyof T];
      }
    });

    if (hasChanged) {
      rafId.current = requestAnimationFrame(animate);
    }
  }, [lerp, smoothing]);

  const setTarget = useCallback((newTarget: Partial<T>) => {
    Object.assign(target.current, newTarget);
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const setCurrent = useCallback((newCurrent: Partial<T>) => {
    Object.assign(current.current, newCurrent);
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return {
    current: current.current,
    target: target.current,
    setCurrent,
    setTarget,
  };
};

/**
 * Hook for staggered entrance animations
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 *
 * useStagger(containerRef, '.card', {
 *   from: { opacity: 0, y: 50 },
 *   to: { opacity: 1, y: 0 },
 *   stagger: 0.1,
 *   duration: 0.8,
 *   ease: PREMIUM_EASE.expoOut,
 * });
 * ```
 */
export const useStagger = (
  containerRef: MutableRefObject<HTMLElement | null>,
  selector: string,
  config: {
    from: gsap.TweenVars;
    to: gsap.TweenVars;
    stagger?: number | gsap.StaggerVars;
    duration?: number;
    ease?: string;
    scrollTrigger?: ScrollTrigger.Vars;
  }
) => {
  useGsap((gsap) => {
    if (!containerRef.current) return;

    const elements = containerRef.current.querySelectorAll(selector);

    gsap.fromTo(
      elements,
      {
        ...config.from,
      },
      {
        ...config.to,
        duration: config.duration || PREMIUM_DURATION.normal,
        ease: config.ease || PREMIUM_EASE.expoOut,
        stagger: config.stagger || 0.1,
        scrollTrigger: config.scrollTrigger,
      }
    );
  }, { scope: containerRef, dependencies: [selector] });
};

export default useGsap;
