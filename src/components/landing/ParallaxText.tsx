/**
 * ParallaxText Component
 *
 * Text component with gentle 2D offsets
 * that respond to scroll position.
 */

import React, { useMemo } from 'react';
import { EASING, DURATION } from '@/utils/animations';

interface ParallaxTextProps {
  /** Text content */
  children: React.ReactNode;

  /** Scroll progress for parallax calculation (0.0 - 1.0) */
  scrollProgress?: number;

  /** Parallax intensity multiplier (default: 1) */
  intensity?: number;

  /** Optional className */
  className?: string;

  /** Animation delay in ms */
  delay?: number;

  /** Direction of parallax movement */
  direction?: 'up' | 'down';
}

export const ParallaxText: React.FC<ParallaxTextProps> = ({
  children,
  scrollProgress = 0,
  intensity = 1,
  className = '',
  delay = 0,
  direction = 'up',
}) => {
  const transform = useMemo(() => {
    // Calculate Y offset based on scroll progress
    const maxOffset = 50 * intensity;
    const offset = direction === 'up'
      ? scrollProgress * maxOffset
      : -scrollProgress * maxOffset;

    return `translateY(${offset}px)`;
  }, [scrollProgress, intensity, direction]);

  return (
    <div className="parallax-container">
      <div
        className={`parallax-text ${className}`}
        style={{
          transform,
          transition: `transform ${DURATION.parallax}ms ${EASING.inkwell}`,
          transitionDelay: `${delay}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default React.memo(ParallaxText);
