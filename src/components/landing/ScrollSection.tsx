/**
 * ScrollSection Component
 *
 * A reusable full-screen (100vh) sticky section wrapper
 * for creating the Inkwell-style scroll experience.
 * Now with ref forwarding for GSAP animations.
 */

import React, { forwardRef } from 'react';
import type { CSSProperties } from 'react';

interface ScrollSectionProps {
  /** Section content */
  children: React.ReactNode;

  /** Optional className for custom styling */
  className?: string;

  /** Section ID for navigation */
  id?: string;

  /** Whether to use sticky positioning (default: true) */
  sticky?: boolean;

  /** Background variant */
  variant?: 'transparent' | 'glass' | 'solid';

  /** Section state for styling (slide-style transitions) */
  state?: 'past' | 'active' | 'upcoming';

  /** Zoom factor for slide transition */
  zoom?: number;

  /** Opacity factor for slide transition */
  opacity?: number;

  /** Optional inline styles */
  style?: CSSProperties;
}

export const ScrollSection = forwardRef<HTMLElement, ScrollSectionProps>(
  (
    {
      children,
      className = '',
      id,
      sticky = true,
      variant = 'transparent',
      state = 'active',
      zoom = 1,
      opacity = 1,
      style,
    },
    ref
  ) => {
    const variantClasses = {
      transparent: '',
      glass: 'glass-section',
      solid: 'solid-section',
    };

    const computedStyle: CSSProperties = {
      ...style,
      ['--section-zoom' as string]: zoom,
      ['--section-opacity' as string]: opacity,
    };

    return (
      <section
        ref={ref}
        id={id}
        data-state={state}
        className={`scroll-section ${sticky ? 'scroll-section--sticky' : ''} ${variantClasses[variant]} scroll-section--${state} ${className}`}
        style={computedStyle}
      >
        <div className="scroll-section-content">{children}</div>
      </section>
    );
  }
);

ScrollSection.displayName = 'ScrollSection';

export default React.memo(ScrollSection);
