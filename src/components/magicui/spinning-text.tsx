"use client";

import { motion, type Transition, type Variants } from "framer-motion";
import { type ComponentPropsWithoutRef, useMemo } from "react";

interface SpinningTextProps extends ComponentPropsWithoutRef<"div"> {
  children: string;
  duration?: number;
  reverse?: boolean;
  radius?: number;
  transition?: Transition;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
}

export function SpinningText({
  children,
  duration = 10,
  reverse = false,
  radius = 5,
  transition,
  variants,
  className,
  onDrag,
  onDragEnd,
  onDragStart,
  ...props
}: SpinningTextProps) {
  const characters = useMemo(() => {
    const chars = children.split("");
    // Add invisible spacer for visual balance
    return [...chars, "\u00A0"];
  }, [children]);

  const containerVariants: Variants = variants?.container ?? {
    animate: {
      rotate: reverse ? -360 : 360,
      transition: transition ?? {
        duration,
        repeat: Infinity,
        ease: "linear",
      },
    },
  };

  const charAngle = 360 / characters.length;

  return (
    <motion.div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
      variants={containerVariants}
      animate="animate"
      {...props}
    >
      {characters.map((char, index) => {
        const angle = charAngle * index;
        const radians = (angle * Math.PI) / 180;
        const x = Math.sin(radians) * radius;
        const y = -Math.cos(radians) * radius;

        return (
          <motion.span
            key={`${char}-${index}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${x}em, ${y}em) rotate(${angle}deg)`,
              transformOrigin: "center center",
            }}
            variants={variants?.item}
          >
            {char}
          </motion.span>
        );
      })}
    </motion.div>
  );
}

export default SpinningText;
