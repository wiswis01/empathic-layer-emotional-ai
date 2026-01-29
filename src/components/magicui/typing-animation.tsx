"use client";

import { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";

interface TypingAnimationProps {
  children?: string;
  className?: string;
  duration?: number;
  delay?: number;
  startOnView?: boolean;
  showCursor?: boolean;
  cursorStyle?: "line" | "block" | "underscore";
}

export function TypingAnimation({
  children = "",
  className = "",
  duration = 100,
  delay = 0,
  startOnView = true,
  showCursor = true,
  cursorStyle = "line",
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (startOnView && !inView) return;

    const startTimeout = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [inView, startOnView, delay]);

  useEffect(() => {
    if (!started) return;

    let currentIndex = 0;
    const text = children;

    const intervalId = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(intervalId);
      }
    }, duration);

    return () => clearInterval(intervalId);
  }, [started, children, duration]);

  const cursorChar = {
    line: "|",
    block: "█",
    underscore: "_",
  }[cursorStyle];

  return (
    <span ref={ref} className={className}>
      {displayedText}
      {showCursor && (
        <span className="typing-cursor" style={{
          animation: "blink 1s step-end infinite",
          marginLeft: "2px"
        }}>
          {cursorChar}
        </span>
      )}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
}

export default TypingAnimation;
