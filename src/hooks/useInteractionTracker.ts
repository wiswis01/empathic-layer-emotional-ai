/**
 * useInteractionTracker Hook
 *
 * Tracks user interaction events (click, key, scroll, touch) with timing metadata.
 * Part of PMC8969204 adapted methodology for behavioral signal capture.
 *
 * Assumptions:
 * - A2: Monitoring operates within ~50ms of event capture
 * - A5: Abandonment defined as >5s without interaction after engaged state
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface InteractionEvent {
  type: 'click' | 'keydown' | 'scroll' | 'touch' | 'mousemove';
  timestamp: number;
  position?: { x: number; y: number };
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface UseInteractionTrackerReturn {
  /** Recent interaction events (last 100) */
  events: InteractionEvent[];
  /** Most recent interaction */
  lastInteraction: InteractionEvent | null;
  /** Time since last interaction (ms) */
  timeSinceLastInteraction: number;
  /** Interactions per minute */
  interactionRate: number;
  /** Whether user is currently engaged (interaction within 5s) */
  isEngaged: boolean;
  /** Time of last engagement start */
  engagementStart: number | null;
  /** Current engagement duration (ms) */
  engagementDuration: number;
  /** Whether user has abandoned (>5s no interaction after engagement) */
  hasAbandoned: boolean;
  /** Time of abandonment (ms since engagement start) */
  abandonmentTiming: number | null;
}

const MAX_EVENTS = 100;
const ENGAGEMENT_TIMEOUT_MS = 5000; // 5 seconds
const RATE_WINDOW_MS = 60000; // 1 minute

export function useInteractionTracker(): UseInteractionTrackerReturn {
  const [events, setEvents] = useState<InteractionEvent[]>([]);
  const [lastInteraction, setLastInteraction] = useState<InteractionEvent | null>(null);
  const [timeSinceLastInteraction, setTimeSinceLastInteraction] = useState(0);
  const [isEngaged, setIsEngaged] = useState(false);
  const [engagementStart, setEngagementStart] = useState<number | null>(null);
  const [hasAbandoned, setHasAbandoned] = useState(false);
  const [abandonmentTiming, setAbandonmentTiming] = useState<number | null>(null);

  const engagementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Add new interaction event
  const addEvent = useCallback((event: InteractionEvent) => {
    setEvents(prev => {
      const updated = [...prev, event];
      if (updated.length > MAX_EVENTS) {
        updated.shift();
      }
      return updated;
    });
    setLastInteraction(event);
    setTimeSinceLastInteraction(0);

    // Start or extend engagement
    if (!isEngaged) {
      setIsEngaged(true);
      setEngagementStart(event.timestamp);
      setHasAbandoned(false);
      setAbandonmentTiming(null);
    }

    // Reset abandonment timeout
    if (engagementTimeoutRef.current) {
      clearTimeout(engagementTimeoutRef.current);
    }
    engagementTimeoutRef.current = setTimeout(() => {
      setIsEngaged(false);
      setHasAbandoned(true);
      if (engagementStart) {
        setAbandonmentTiming(Date.now() - engagementStart);
      }
    }, ENGAGEMENT_TIMEOUT_MS);
  }, [isEngaged, engagementStart]);

  // Event handlers
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      addEvent({
        type: 'click',
        timestamp: performance.now(),
        position: { x: e.clientX, y: e.clientY },
        target: (e.target as HTMLElement)?.tagName,
      });
    };

    const handleKeydown = (e: KeyboardEvent) => {
      addEvent({
        type: 'keydown',
        timestamp: performance.now(),
        metadata: { key: e.key, code: e.code },
      });
    };

    const handleScroll = () => {
      addEvent({
        type: 'scroll',
        timestamp: performance.now(),
        metadata: { scrollY: window.scrollY },
      });
    };

    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        addEvent({
          type: 'touch',
          timestamp: performance.now(),
          position: { x: touch.clientX, y: touch.clientY },
        });
      }
    };

    // Throttled mousemove (every 100ms)
    let lastMouseMove = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastMouseMove >= 100) {
        lastMouseMove = now;
        addEvent({
          type: 'mousemove',
          timestamp: now,
          position: { x: e.clientX, y: e.clientY },
        });
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [addEvent]);

  // Update time since last interaction
  useEffect(() => {
    updateIntervalRef.current = setInterval(() => {
      if (lastInteraction) {
        setTimeSinceLastInteraction(performance.now() - lastInteraction.timestamp);
      }
    }, 100);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [lastInteraction]);

  // Cleanup engagement timeout
  useEffect(() => {
    return () => {
      if (engagementTimeoutRef.current) {
        clearTimeout(engagementTimeoutRef.current);
      }
    };
  }, []);

  // Calculate interaction rate (events per minute)
  const interactionRate = (() => {
    const now = performance.now();
    const recentEvents = events.filter(e => now - e.timestamp < RATE_WINDOW_MS);
    return recentEvents.length;
  })();

  // Calculate engagement duration
  const engagementDuration = (() => {
    if (!engagementStart) return 0;
    if (isEngaged) {
      return performance.now() - engagementStart;
    }
    return abandonmentTiming || 0;
  })();

  return {
    events,
    lastInteraction,
    timeSinceLastInteraction,
    interactionRate,
    isEngaged,
    engagementStart,
    engagementDuration,
    hasAbandoned,
    abandonmentTiming,
  };
}

export default useInteractionTracker;
