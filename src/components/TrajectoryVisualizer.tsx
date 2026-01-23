/**
 * TrajectoryVisualizer Component
 *
 * Canvas-based visualization of emotional trajectory in 2D (valence-arousal plane)
 * with control dimension represented as color intensity and uncertainty as line thickness.
 *
 * Part of PMC8969204 adapted methodology for emotion trajectory visualization.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import type { TrajectoryPoint, UncertaintyLevel } from '@/types/emotion';

interface TrajectoryVisualizerProps {
  /** Trajectory points to render */
  trajectory: TrajectoryPoint[];
  /** Current emotional state */
  currentPoint: TrajectoryPoint | null;
  /** Whether to show uncertainty as path thickness */
  showUncertainty?: boolean;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

// Colors for control dimension (low to high)
const CONTROL_COLORS = {
  low: { r: 142, g: 85, b: 114 },    // Mauve (#8e5572) - uncertain
  medium: { r: 188, g: 170, b: 153 }, // Beige (#bcaa99) - moderate
  high: { r: 187, g: 190, b: 100 },   // Olive (#bbbe64) - confident
};

// Uncertainty to line width mapping
const UNCERTAINTY_WIDTH: Record<UncertaintyLevel, number> = {
  high: 1,    // Low confidence = thin line
  medium: 2,
  low: 4,     // High confidence = thick line
};

// Grid configuration
const GRID = {
  padding: 40,
  tickSize: 5,
  labelOffset: 15,
};

export const TrajectoryVisualizer: React.FC<TrajectoryVisualizerProps> = ({
  trajectory,
  currentPoint,
  showUncertainty = true,
  width = 300,
  height = 300,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Convert valence-arousal to canvas coordinates
  const toCanvasCoords = useCallback((valence: number, arousal: number): { x: number; y: number } => {
    const plotWidth = width - 2 * GRID.padding;
    const plotHeight = height - 2 * GRID.padding;

    // Valence: -1 to +1 → left to right
    const x = GRID.padding + ((valence + 1) / 2) * plotWidth;
    // Arousal: 0 to 1 → bottom to top
    const y = height - GRID.padding - arousal * plotHeight;

    return { x, y };
  }, [width, height]);

  // Interpolate color based on control value
  const getControlColor = useCallback((control: number): string => {
    let color;
    if (control < 0.4) {
      // Low to medium interpolation
      const t = control / 0.4;
      color = {
        r: Math.round(CONTROL_COLORS.low.r + t * (CONTROL_COLORS.medium.r - CONTROL_COLORS.low.r)),
        g: Math.round(CONTROL_COLORS.low.g + t * (CONTROL_COLORS.medium.g - CONTROL_COLORS.low.g)),
        b: Math.round(CONTROL_COLORS.low.b + t * (CONTROL_COLORS.medium.b - CONTROL_COLORS.low.b)),
      };
    } else {
      // Medium to high interpolation
      const t = (control - 0.4) / 0.6;
      color = {
        r: Math.round(CONTROL_COLORS.medium.r + t * (CONTROL_COLORS.high.r - CONTROL_COLORS.medium.r)),
        g: Math.round(CONTROL_COLORS.medium.g + t * (CONTROL_COLORS.high.g - CONTROL_COLORS.medium.g)),
        b: Math.round(CONTROL_COLORS.medium.b + t * (CONTROL_COLORS.high.b - CONTROL_COLORS.medium.b)),
      };
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }, []);

  // Draw the grid and axes
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;

    const plotWidth = width - 2 * GRID.padding;
    const plotHeight = height - 2 * GRID.padding;

    // Draw grid lines
    for (let i = 0; i <= 4; i++) {
      const x = GRID.padding + (i / 4) * plotWidth;
      const y = GRID.padding + (i / 4) * plotHeight;

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(x, GRID.padding);
      ctx.lineTo(x, height - GRID.padding);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(GRID.padding, y);
      ctx.lineTo(width - GRID.padding, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    // X axis (valence)
    ctx.beginPath();
    ctx.moveTo(GRID.padding, height - GRID.padding);
    ctx.lineTo(width - GRID.padding, height - GRID.padding);
    ctx.stroke();

    // Y axis (arousal)
    ctx.beginPath();
    ctx.moveTo(GRID.padding, GRID.padding);
    ctx.lineTo(GRID.padding, height - GRID.padding);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';

    // X axis labels
    ctx.fillText('-1', GRID.padding, height - GRID.padding + GRID.labelOffset);
    ctx.fillText('0', width / 2, height - GRID.padding + GRID.labelOffset);
    ctx.fillText('+1', width - GRID.padding, height - GRID.padding + GRID.labelOffset);
    ctx.fillText('Valence', width / 2, height - 5);

    // Y axis labels
    ctx.textAlign = 'right';
    ctx.fillText('0', GRID.padding - GRID.tickSize, height - GRID.padding + 3);
    ctx.fillText('0.5', GRID.padding - GRID.tickSize, height / 2 + 3);
    ctx.fillText('1', GRID.padding - GRID.tickSize, GRID.padding + 3);

    // Y axis title (rotated)
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Arousal', 0, 0);
    ctx.restore();
  }, [width, height]);

  // Draw trajectory path
  const drawTrajectory = useCallback((ctx: CanvasRenderingContext2D, points: TrajectoryPoint[]) => {
    if (points.length < 2) return;

    // Draw as segments to show control color and uncertainty width
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const start = toCanvasCoords(prev.valence, prev.arousal);
      const end = toCanvasCoords(curr.valence, curr.arousal);

      // Set line style based on control and uncertainty
      ctx.strokeStyle = getControlColor(curr.control);
      ctx.lineWidth = showUncertainty ? UNCERTAINTY_WIDTH[curr.uncertainty] : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Calculate opacity based on recency (more recent = more opaque)
      const recency = i / points.length;
      ctx.globalAlpha = 0.3 + recency * 0.7;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }, [toCanvasCoords, getControlColor, showUncertainty]);

  // Draw current point with glow effect
  const drawCurrentPoint = useCallback((ctx: CanvasRenderingContext2D, point: TrajectoryPoint) => {
    const { x, y } = toCanvasCoords(point.valence, point.arousal);
    const color = getControlColor(point.control);

    // Outer glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color.replace('rgb', 'rgba').replace(')', ', 0.3)'));
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // White center
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [toCanvasCoords, getControlColor]);

  // Draw legend
  const drawLegend = useCallback((ctx: CanvasRenderingContext2D) => {
    const legendX = width - 70;
    const legendY = 15;

    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('Control:', legendX, legendY);

    // Color samples
    const samples = [
      { label: 'Low', color: getControlColor(0.2) },
      { label: 'Med', color: getControlColor(0.5) },
      { label: 'High', color: getControlColor(0.8) },
    ];

    samples.forEach((sample, i) => {
      const y = legendY + 12 + i * 14;
      ctx.fillStyle = sample.color;
      ctx.fillRect(legendX, y - 6, 10, 10);
      ctx.fillStyle = '#666';
      ctx.fillText(sample.label, legendX + 14, y + 2);
    });
  }, [width, getControlColor]);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Draw components
    drawGrid(ctx);
    drawTrajectory(ctx, trajectory);
    if (currentPoint) {
      drawCurrentPoint(ctx, currentPoint);
    }
    drawLegend(ctx);
  }, [width, height, trajectory, currentPoint, drawGrid, drawTrajectory, drawCurrentPoint, drawLegend]);

  // Animation loop for smooth updates
  useEffect(() => {
    const animate = () => {
      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <div className={`trajectory-visualizer ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      />
      {trajectory.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#999',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          Collecting trajectory data...
        </div>
      )}
    </div>
  );
};

export default TrajectoryVisualizer;
