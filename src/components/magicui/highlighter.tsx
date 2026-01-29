"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { annotate, type RoughAnnotation } from "rough-notation";

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket";

interface HighlighterProps {
  children: ReactNode;
  action?: AnnotationAction;
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animationDuration = 800,
  iterations = 2,
  padding = 2,
  multiline = true,
}: HighlighterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<RoughAnnotation | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Small delay to ensure element is rendered
    const timer = setTimeout(() => {
      if (ref.current && !annotationRef.current) {
        annotationRef.current = annotate(ref.current, {
          type: action,
          color,
          strokeWidth,
          animationDuration,
          iterations,
          padding,
          multiline,
        });
        annotationRef.current.show();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <span ref={ref} style={{ display: "inline" }}>
      {children}
    </span>
  );
}

export default Highlighter;
