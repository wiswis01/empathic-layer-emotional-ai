/**
 * GlassCard Component
 *
 * Reusable glassmorphism card with backdrop blur
 * and subtle borders for the Inkwell aesthetic.
 * Now with ref forwarding for GSAP animations.
 */

import React, { forwardRef } from 'react';
import { EASING, DURATION } from '@/utils/animations';

interface GlassCardProps {
  /** Card content */
  children: React.ReactNode;

  /** Optional className */
  className?: string;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Whether card is interactive (hover effects) */
  interactive?: boolean;

  /** Click handler */
  onClick?: () => void;

  /** Mouse enter handler */
  onMouseEnter?: () => void;

  /** Mouse leave handler */
  onMouseLeave?: () => void;
}

export const GlassCard = forwardRef<HTMLDivElement | HTMLButtonElement, GlassCardProps>(
  ({ children, className = '', size = 'md', interactive = false, onClick, onMouseEnter, onMouseLeave }, ref) => {
    const sizeClasses = {
      sm: 'glass-card--sm',
      md: 'glass-card--md',
      lg: 'glass-card--lg',
    };

    const Component = onClick ? 'button' : 'div';

    return (
      <Component
        ref={ref as any}
        className={`glass-card ${sizeClasses[size]} ${interactive ? 'glass-card--interactive' : ''} ${className}`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          transition: `all ${DURATION.normal}ms ${EASING.inkwell}`,
        }}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default React.memo(GlassCard);
