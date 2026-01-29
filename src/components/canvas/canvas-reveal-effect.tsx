"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, useAnimation } from "framer-motion";

interface CanvasRevealEffectProps {
  animationSpeed?: number;
  containerClassName?: string;
  colors?: number[][];
  dotSize?: number;
  showGradient?: boolean;
  density?: number;
}

interface Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  opacity: number;
  targetOpacity: number;
  color: number[];
  phase: number;
  speed: number;
  amplitude: number;
}

export const CanvasRevealEffect: React.FC<CanvasRevealEffectProps> = ({
  animationSpeed = 0.4,
  containerClassName,
  colors = [[0, 255, 255]],
  dotSize = 3,
  showGradient = true,
  density = 1.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // More dots with tighter spacing
    const spacing = dotSize * density;
    const cols = Math.ceil(dimensions.width / spacing) + 2;
    const rows = Math.ceil(dimensions.height / spacing) + 2;
    const dots: Dot[] = [];

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const colorIndex = Math.floor(Math.random() * colors.length);
        const baseX = i * spacing;
        const baseY = j * spacing;
        dots.push({
          x: baseX,
          y: baseY,
          baseX,
          baseY,
          opacity: 0,
          targetOpacity: Math.random() * 0.6 + 0.4,
          color: colors[colorIndex],
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.5,
          amplitude: 2 + Math.random() * 4,
        });
      }
    }

    let time = 0;
    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      time += 0.016 * animationSpeed;

      dots.forEach((dot) => {
        // Wave motion - flowing effect
        const waveX = Math.sin(time * dot.speed + dot.phase) * dot.amplitude;
        const waveY = Math.cos(time * dot.speed * 0.7 + dot.phase) * dot.amplitude * 0.5;

        dot.x = dot.baseX + waveX;
        dot.y = dot.baseY + waveY;

        // Pulsing opacity for flow effect
        const opacityWave = Math.sin(time * 2 + dot.phase) * 0.3 + 0.7;
        dot.opacity = dot.targetOpacity * opacityWave;

        // Size pulse
        const sizePulse = 1 + Math.sin(time * 1.5 + dot.phase) * 0.3;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize * sizePulse * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dot.color[0]}, ${dot.color[1]}, ${dot.color[2]}, ${dot.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [dimensions, colors, dotSize, animationSpeed, density]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", containerClassName)}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
      )}
    </div>
  );
};

interface CardProps {
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  colors?: number[][];
}

export const Card: React.FC<CardProps> = ({ title, icon, children, colors }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group/canvas-card relative mx-auto flex h-[20rem] w-full max-w-sm items-center justify-center rounded-3xl border border-black/[0.2] p-4 dark:border-white/[0.2]"
    >
      <Icon className="absolute -left-3 -top-3 h-6 w-6 text-black dark:text-white" />
      <Icon className="absolute -bottom-3 -left-3 h-6 w-6 text-black dark:text-white" />
      <Icon className="absolute -right-3 -top-3 h-6 w-6 text-black dark:text-white" />
      <Icon className="absolute -bottom-3 -right-3 h-6 w-6 text-black dark:text-white" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        className="absolute inset-0 h-full w-full"
      >
        {hovered && (
          <CanvasRevealEffect
            animationSpeed={3}
            containerClassName="bg-transparent"
            colors={colors || [[125, 211, 252]]}
            dotSize={2}
          />
        )}
      </motion.div>

      <div className="relative z-20">
        <div className="mx-auto flex w-fit items-center justify-center text-center transition duration-200 group-hover/canvas-card:-translate-y-4 group-hover/canvas-card:opacity-0">
          {icon}
        </div>
        <h2 className="relative z-10 mt-4 text-center text-xl font-bold text-black opacity-0 transition duration-200 group-hover/canvas-card:-translate-y-2 group-hover/canvas-card:text-white group-hover/canvas-card:opacity-100 dark:text-white">
          {title}
        </h2>
      </div>
    </div>
  );
};

const Icon = ({ className, ...rest }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
};

export default CanvasRevealEffect;
