"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, AnimatePresence } from "framer-motion";

interface PointerProps {
  children?: ReactNode;
  className?: string;
}

export function Pointer({ children, className = "" }: PointerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;

    // Hide default cursor on parent
    const originalCursor = parent.style.cursor;
    parent.style.cursor = "none";

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      x.set(e.clientX - rect.left);
      y.set(e.clientY - rect.top);
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseenter", handleMouseEnter);
    parent.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      parent.style.cursor = originalCursor;
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseenter", handleMouseEnter);
      parent.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [x, y]);

  return (
    <div ref={ref} className="pointer-wrapper" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <AnimatePresence>
        {isHovering && (
          <motion.div
            className={className}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 50,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children || (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="black"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M5.5 5.5L18 12L12 12L10 18L5.5 5.5Z" />
              </svg>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Pointer;
