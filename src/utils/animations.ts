/**
 * Animation Constants for Inkwell-style Landing Page
 *
 * All timing and easing values match the Inkwell.tech aesthetic.
 */

/**
 * Easing functions for different animation contexts
 * Primary: Inkwell's signature smooth easing
 */
export const EASING = {
  /** Primary Inkwell easing - used for all layout transitions */
  inkwell: 'cubic-bezier(0.39, 0.575, 0.565, 1)',

  /** Smooth easing for subtle movements */
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',

  /** Bounce easing for playful interactions */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  /** Linear for continuous animations */
  linear: 'linear',

  /** Ease out for exits */
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',

  /** Ease in for entrances */
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

/**
 * Duration values in milliseconds
 */
export const DURATION = {
  /** Fast micro-interactions (hover states) */
  fast: 150,

  /** Normal transitions */
  normal: 300,

  /** Slow, dramatic transitions */
  slow: 600,

  /** Gradient background transitions */
  gradient: 1000,

  /** Parallax text movements */
  parallax: 600,

  /** Cursor following delay */
  cursor: 150,
} as const;

/**
 * CSS transition strings for common use cases
 */
export const TRANSITIONS = {
  /** Default transition for most elements */
  default: `all ${DURATION.normal}ms ${EASING.inkwell}`,

  /** Cursor movement */
  cursor: `transform ${DURATION.cursor}ms ${EASING.inkwell}`,

  /** Gradient opacity changes */
  gradient: `opacity ${DURATION.gradient}ms ${EASING.inkwell}`,

  /** Parallax text movement */
  parallax: `transform ${DURATION.parallax}ms ${EASING.inkwell}`,

  /** Fast hover states */
  hover: `all ${DURATION.fast}ms ${EASING.smooth}`,
} as const;

/**
 * Perspective values for 3D effects
 */
export const PERSPECTIVE = {
  /** Default perspective for parallax text */
  text: '10cm',

  /** Deeper perspective for more dramatic effects */
  deep: '20cm',

  /** Shallow perspective for subtle effects */
  shallow: '5cm',
} as const;

/**
 * Z-index layers for proper stacking
 */
export const Z_INDEX = {
  /** Background gradients */
  background: -1,

  /** Main content */
  content: 1,

  /** Overlays and modals */
  overlay: 100,

  /** Custom cursor (always on top) */
  cursor: 9999,
} as const;
