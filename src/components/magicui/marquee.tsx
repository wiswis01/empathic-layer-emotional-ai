"use client";

import { type ReactNode, useState } from "react";

interface MarqueeProps {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: ReactNode;
  vertical?: boolean;
  repeat?: number;
  duration?: number;
  gap?: number;
}

export function Marquee({
  className = "",
  reverse = false,
  pauseOnHover = true,
  children,
  vertical = false,
  repeat = 4,
  duration = 30,
  gap = 16,
}: MarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      className={`marquee-container ${vertical ? "marquee-vertical" : ""} ${className}`}
      style={{
        ["--duration" as string]: `${duration}s`,
        ["--gap" as string]: `${gap}px`,
      }}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={() => setIsPaused(!isPaused)}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={`marquee-content ${reverse ? "marquee-reverse" : ""}`}
          style={{ animationPlayState: isPaused ? "paused" : "running" }}
        >
          {children}
        </div>
      ))}
      <style>{`
        .marquee-container {
          display: flex;
          overflow: hidden;
          gap: var(--gap);
          user-select: none;
        }
        .marquee-vertical {
          flex-direction: column;
        }
        .marquee-content {
          display: flex;
          gap: var(--gap);
          flex-shrink: 0;
          animation: marquee-scroll var(--duration) linear infinite;
        }
        .marquee-vertical .marquee-content {
          animation-name: marquee-scroll-vertical;
        }
        .marquee-reverse {
          animation-direction: reverse;
        }
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100% - var(--gap))); }
        }
        @keyframes marquee-scroll-vertical {
          from { transform: translateY(0); }
          to { transform: translateY(calc(-100% - var(--gap))); }
        }
      `}</style>
    </div>
  );
}

export default Marquee;
