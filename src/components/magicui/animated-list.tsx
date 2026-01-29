"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface AnimatedListProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedListItem({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 40,
      }}
      layout
    >
      {children}
    </motion.div>
  );
}

export function AnimatedList({
  children,
  delay = 1000,
  className = "",
}: AnimatedListProps) {
  const [index, setIndex] = useState(0);
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  );

  useEffect(() => {
    if (index < childrenArray.length) {
      const timer = setTimeout(() => {
        setIndex((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [index, delay, childrenArray.length]);

  const visibleItems = useMemo(
    () => childrenArray.slice(0, index),
    [childrenArray, index]
  );

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {visibleItems.map((item, i) => (
          <AnimatedListItem key={i}>{item}</AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedList;
