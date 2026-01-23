/**
 * Gradient Configuration for Inkwell-style Landing Page
 *
 * 11 gradient variants using the Empath Layer color palette.
 * These transition smoothly as the user scrolls through sections.
 */

// Color palette reference
const COLORS = {
  mauve: '#8e5572',
  olive: '#bbbe64',
  mint: '#f2f7f2',
  beige: '#bcaa99',
  eggplant: '#443850',
} as const;

/**
 * 11-stage gradient array for scroll-based transitions
 * Each gradient flows vertically (180deg) for immersive effect
 */
export const GRADIENTS = [
  `linear-gradient(180deg, ${COLORS.mint} 0%, ${COLORS.mint} 100%)`,           // 0: Pure mint (start)
  `linear-gradient(180deg, ${COLORS.mint} 0%, ${COLORS.beige} 100%)`,          // 1: Mint → Beige
  `linear-gradient(180deg, ${COLORS.beige} 0%, ${COLORS.mauve} 100%)`,         // 2: Beige → Mauve
  `linear-gradient(180deg, ${COLORS.mauve} 0%, ${COLORS.olive} 100%)`,         // 3: Mauve → Olive
  `linear-gradient(180deg, ${COLORS.olive} 0%, ${COLORS.mint} 100%)`,          // 4: Olive → Mint
  `linear-gradient(180deg, ${COLORS.mint} 0%, ${COLORS.eggplant} 100%)`,       // 5: Mint → Eggplant
  `linear-gradient(180deg, ${COLORS.eggplant} 0%, ${COLORS.mauve} 100%)`,      // 6: Eggplant → Mauve
  `linear-gradient(180deg, ${COLORS.mauve} 0%, ${COLORS.beige} 100%)`,         // 7: Mauve → Beige
  `linear-gradient(180deg, ${COLORS.beige} 0%, ${COLORS.olive} 100%)`,         // 8: Beige → Olive
  `linear-gradient(180deg, ${COLORS.olive} 0%, ${COLORS.eggplant} 100%)`,      // 9: Olive → Eggplant
  `linear-gradient(180deg, ${COLORS.eggplant} 0%, ${COLORS.mint} 100%)`,       // 10: Eggplant → Mint (end)
] as const;

/**
 * Get the active gradient index based on scroll progress
 * @param progress - Scroll progress from 0.0 to 1.0
 * @returns The index of the active gradient (0-10)
 */
export function getGradientIndex(progress: number): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return Math.floor(clampedProgress * (GRADIENTS.length - 1));
}

/**
 * Get interpolation factor for smooth gradient blending
 * @param progress - Scroll progress from 0.0 to 1.0
 * @returns Object with current index, next index, and blend factor
 */
export function getGradientBlend(progress: number): {
  currentIndex: number;
  nextIndex: number;
  blend: number;
} {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const scaledProgress = clampedProgress * (GRADIENTS.length - 1);
  const currentIndex = Math.floor(scaledProgress);
  const nextIndex = Math.min(currentIndex + 1, GRADIENTS.length - 1);
  const blend = scaledProgress - currentIndex;

  return { currentIndex, nextIndex, blend };
}

export { COLORS };
