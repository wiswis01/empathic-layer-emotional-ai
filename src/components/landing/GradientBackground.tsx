/**
 * GradientBackground Component
 *
 * Renders 11 stacked gradient layers that transition
 * based on scroll progress for an immersive atmosphere.
 */

import React, { useMemo } from 'react';
import { GRADIENTS, getGradientIndex } from '@/utils/gradients';
import { EASING, DURATION } from '@/utils/animations';

interface GradientBackgroundProps {
  /** Scroll progress from 0.0 to 1.0 */
  scrollProgress: number;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  scrollProgress,
}) => {
  const activeIndex = useMemo(
    () => getGradientIndex(scrollProgress),
    [scrollProgress]
  );

  return (
    <div className="gradient-background" aria-hidden="true">
      {GRADIENTS.map((gradient, index) => (
        <div
          key={index}
          className={`gradient-layer ${index === activeIndex ? 'active' : ''}`}
          style={{
            background: gradient,
            transition: `opacity ${DURATION.gradient}ms ${EASING.inkwell}`,
          }}
        />
      ))}
    </div>
  );
};

export default React.memo(GradientBackground);
