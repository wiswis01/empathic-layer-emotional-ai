/**
 * CustomCursor Component
 *
 * A glass-morphic circular cursor with physics-based inertia tracking.
 * Uses linear interpolation (lerp) for smooth, weighted movement
 * inspired by Inkwell.tech aesthetic.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useMousePosition } from '@/hooks';
import gsap from 'gsap';

interface CustomCursorProps {
  /** Optional label to display inside cursor */
  label?: string;

  /** Smoothing factor for inertia (0-1, lower = smoother) */
  smoothing?: number;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({
  label,
  smoothing = 0.15,
}) => {
  const { x, y, isInViewport, isTouchDevice } = useMousePosition();
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Lerp-based cursor position (inertia tracking)
  const positionRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  // Add/remove body class for cursor hiding
  useEffect(() => {
    if (isTouchDevice) return;

    document.body.classList.add('inkwell-landing');
    return () => {
      document.body.classList.remove('inkwell-landing');
    };
  }, [isTouchDevice]);

  // Detect hovering over interactive elements
  useEffect(() => {
    if (isTouchDevice) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.classList.contains('glass-card--interactive') ||
        target.closest('button, a, .glass-card--interactive');

      setIsHovering(!!isInteractive);
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, [isTouchDevice]);

  // Inertia-based tracking with GSAP
  useEffect(() => {
    if (isTouchDevice || !cursorRef.current) return;

    // Update target position
    targetRef.current = { x, y };

    // Use GSAP ticker for smooth lerp animation
    const ticker = gsap.ticker.add(() => {
      if (!cursorRef.current) return;

      // Linear interpolation (lerp) for inertia effect
      positionRef.current.x +=
        (targetRef.current.x - positionRef.current.x) * smoothing;
      positionRef.current.y +=
        (targetRef.current.y - positionRef.current.y) * smoothing;

      // Apply transform (GPU-accelerated)
      gsap.set(cursorRef.current, {
        x: positionRef.current.x,
        y: positionRef.current.y,
        scale: isHovering ? 0.8 : 1,
        duration: 0.3,
        ease: 'power3.out',
      });
    });

    return () => {
      gsap.ticker.remove(ticker);
    };
  }, [x, y, isTouchDevice, smoothing, isHovering]);

  // Don't render on touch devices or when outside viewport
  if (isTouchDevice || !isInViewport) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      style={{
        willChange: 'transform',
      }}
      aria-hidden="true"
    >
      {label && <span className="custom-cursor-label">{label}</span>}
    </div>
  );
};

export default React.memo(CustomCursor);
