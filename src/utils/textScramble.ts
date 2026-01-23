/**
 * Text Scramble Effect Utility
 *
 * Inkwell.tech-inspired text scramble/decode effect where characters
 * cycle through random glyphs before resolving to their final state.
 */

/**
 * Characters to use for scrambling effect
 */
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________';

export interface ScrambleConfig {
  /** Duration per character resolution in ms */
  speed?: number;

  /** Number of frames to scramble each character */
  iterations?: number;

  /** Callback when scramble completes */
  onComplete?: () => void;
}

/**
 * Scrambles text with a decode effect
 *
 * @example
 * ```tsx
 * const [displayText, setDisplayText] = useState('');
 *
 * useEffect(() => {
 *   scrambleText('Hello World', setDisplayText, {
 *     speed: 50,
 *     iterations: 10,
 *   });
 * }, []);
 * ```
 */
export const scrambleText = (
  targetText: string,
  setter: (text: string) => void,
  config: ScrambleConfig = {}
): (() => void) => {
  const { speed = 50, iterations = 10, onComplete } = config;

  let frame = 0;
  let rafId: number;
  let isCancelled = false;

  const animate = () => {
    if (isCancelled) return;

    const progress = frame / iterations;
    const resolvedChars = Math.floor(progress * targetText.length);

    let output = '';

    for (let i = 0; i < targetText.length; i++) {
      if (i < resolvedChars) {
        // Character is resolved
        output += targetText[i];
      } else if (targetText[i] === ' ') {
        // Preserve spaces
        output += ' ';
      } else {
        // Scramble this character
        output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
    }

    setter(output);
    frame++;

    if (frame <= iterations) {
      rafId = requestAnimationFrame(() => {
        setTimeout(animate, speed);
      });
    } else {
      // Ensure final state is exact
      setter(targetText);
      onComplete?.();
    }
  };

  // Start animation
  rafId = requestAnimationFrame(animate);

  // Return cleanup function
  return () => {
    isCancelled = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
  };
};

/**
 * Hook for scramble effect
 */
import { useState, useEffect, useCallback } from 'react';

export const useTextScramble = (
  targetText: string,
  config: ScrambleConfig = {}
) => {
  const [displayText, setDisplayText] = useState('');
  const [isScrambling, setIsScrambling] = useState(false);

  const startScramble = useCallback(() => {
    setIsScrambling(true);
    return scrambleText(targetText, setDisplayText, {
      ...config,
      onComplete: () => {
        setIsScrambling(false);
        config.onComplete?.();
      },
    });
  }, [targetText, config]);

  useEffect(() => {
    const cleanup = startScramble();
    return cleanup;
  }, [startScramble]);

  return { displayText, isScrambling, startScramble };
};

/**
 * Hover-triggered scramble effect
 *
 * @example
 * ```tsx
 * const { displayText, handleMouseEnter } = useHoverScramble('Hover Me');
 *
 * <button onMouseEnter={handleMouseEnter}>
 *   {displayText}
 * </button>
 * ```
 */
export const useHoverScramble = (
  targetText: string,
  config: ScrambleConfig = {}
) => {
  const [displayText, setDisplayText] = useState(targetText);

  const handleMouseEnter = useCallback(() => {
    scrambleText(targetText, setDisplayText, config);
  }, [targetText, config]);

  return { displayText, handleMouseEnter };
};
