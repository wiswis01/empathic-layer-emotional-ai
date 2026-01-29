"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CanvasRevealEffect } from "./canvas-reveal-effect";

interface CanvasRevealButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  colors?: number[][];
  animationSpeed?: number;
  dotSize?: number;
  density?: number;
}

export const CanvasRevealButton: React.FC<CanvasRevealButtonProps> = ({
  children,
  onClick,
  className,
  colors = [[135, 206, 250]], // Light sky blue to match your CTA
  animationSpeed = 3,
  dotSize = 1.5,
  density = 4,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative overflow-hidden rounded-[9px] cursor-pointer",
        className
      )}
    >
      {/* Canvas reveal effect on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-0"
      >
        {hovered && (
          <CanvasRevealEffect
            animationSpeed={animationSpeed}
            containerClassName="rounded-[9px]"
            colors={colors}
            dotSize={dotSize}
            density={density}
            showGradient={false}
          />
        )}
      </motion.div>

      {/* Button content */}
      <div className="relative z-10">{children}</div>
    </button>
  );
};

export default CanvasRevealButton;
