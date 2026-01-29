"use client";

import { type CSSProperties } from "react";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className = "",
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": borderWidth,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as CSSProperties
      }
      className={`border-beam ${className}`}
    >
      <style>{`
        .border-beam {
          pointer-events: none;
          position: absolute;
          inset: 0;
          border-radius: inherit;
          mask-clip: padding-box, border-box;
          mask-composite: intersect;
          mask-image: linear-gradient(transparent, transparent),
            linear-gradient(white, white);
        }

        .border-beam::before {
          content: "";
          position: absolute;
          inset: calc(var(--border-width) * -1);
          border: calc(var(--border-width) * 1px) solid transparent;
          border-radius: inherit;
          background: conic-gradient(
            from calc(var(--anchor) * 1deg),
            transparent 0%,
            var(--color-from) 10%,
            var(--color-to) 20%,
            transparent 30%
          ) border-box;
          animation: border-beam-spin calc(var(--duration) * 1s) linear infinite;
          animation-delay: var(--delay);
        }

        @keyframes border-beam-spin {
          from {
            --anchor: 0;
          }
          to {
            --anchor: 360;
          }
        }

        @property --anchor {
          syntax: "<number>";
          initial-value: 0;
          inherits: false;
        }

        @media (prefers-reduced-motion: reduce) {
          .border-beam::before {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export default BorderBeam;
