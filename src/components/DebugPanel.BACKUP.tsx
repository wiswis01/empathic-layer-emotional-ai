/**
 * DebugPanel Component
 *
 * Developer-friendly debug interface for monitoring:
 * - Real-time performance metrics (FPS, latency, memory)
 * - Emotion detection state visualization
 * - TensorFlow.js backend status
 * - Connection status
 */

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import type { PerformanceMetrics, EmotionContext, EmotionLabel } from '@/types/emotion';
import { EMOTION_COLORS } from '@/types/emotion';
import {
  Bug,
  ChevronUp,
  ChevronDown,
  Cpu,
  Gauge,
  Brain,
  Activity,
  MemoryStick,
  Zap,
} from 'lucide-react';

interface DebugPanelProps {
  /** Performance metrics from emotion detector */
  metrics: PerformanceMetrics;
  /** Current emotion context */
  emotionContext: EmotionContext | null;
  /** Whether detection is running */
  isDetecting: boolean;
  /** Whether the model is ready */
  isModelReady: boolean;
  /** Any error message */
  error: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format bytes to human readable
 */
function formatMemory(mb: number): string {
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Get latency status color
 */
function getLatencyColor(latency: number): string {
  if (latency < 100) return 'text-green-400';
  if (latency < 200) return 'text-yellow-400';
  if (latency < 300) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get FPS status color
 */
function getFpsColor(fps: number): string {
  if (fps >= 5) return 'text-green-400';
  if (fps >= 3) return 'text-yellow-400';
  return 'text-red-400';
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  metrics,
  emotionContext,
  isDetecting,
  isModelReady,
  error,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const state = emotionContext?.state;

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden shadow-lg border',
        className
      )}
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)'
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 transition-all hover:scale-[1.01]"
        style={{
          background: 'rgba(250, 162, 117, 0.1)',
          borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
        }}
      >
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Performance Stats
          </span>
          {!isExpanded && (
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full" style={{
              background: isDetecting ? 'rgba(250, 162, 117, 0.2)' : 'rgba(152, 82, 119, 0.2)',
              color: isDetecting ? 'var(--success)' : 'var(--text-tertiary)'
            }}>
              {isDetecting ? `${metrics.fps} FPS` : 'Inactive'}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Status indicators */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{
              background: isModelReady ? 'rgba(250, 162, 117, 0.2)' : 'rgba(255, 140, 97, 0.2)'
            }}>
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isModelReady ? '' : 'animate-pulse'
                )}
                style={{ background: isModelReady ? 'var(--success)' : 'var(--warning)' }}
              />
              <span className="font-medium" style={{
                color: isModelReady ? 'var(--success)' : 'var(--warning)'
              }}>
                Model: {isModelReady ? 'Ready' : 'Loading...'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{
              background: isDetecting ? 'rgba(250, 162, 117, 0.2)' : 'rgba(152, 82, 119, 0.2)'
            }}>
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isDetecting ? 'animate-pulse' : ''
                )}
                style={{ background: isDetecting ? 'var(--success)' : 'var(--text-disabled)' }}
              />
              <span className="font-medium" style={{
                color: isDetecting ? 'var(--success)' : 'var(--text-tertiary)'
              }}>
                Detection: {isDetecting ? 'Active' : 'Stopped'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{
              background: 'rgba(250, 162, 117, 0.15)'
            }}>
              <Cpu className="w-3 h-3" style={{ color: 'var(--primary)' }} />
              <span className="font-mono font-semibold uppercase" style={{ color: 'var(--primary)' }}>
                {metrics.backend}
              </span>
            </div>
          </div>

          {/* Performance metrics */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              icon={<Gauge className="w-4 h-4" />}
              label="FPS"
              value={metrics.fps.toString()}
              color={getFpsColor(metrics.fps)}
            />
            <MetricCard
              icon={<Zap className="w-4 h-4" />}
              label="Latency"
              value={`${metrics.avgLatency.toFixed(0)}ms`}
              color={getLatencyColor(metrics.avgLatency)}
            />
            <MetricCard
              icon={<Activity className="w-4 h-4" />}
              label="P95"
              value={`${metrics.p95Latency.toFixed(0)}ms`}
              color={getLatencyColor(metrics.p95Latency)}
            />
            <MetricCard
              icon={<MemoryStick className="w-4 h-4" />}
              label="Memory"
              value={formatMemory(metrics.memoryUsage)}
              color="text-blue-400"
            />
          </div>

          {/* Emotion state */}
          {state && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Emotion State
                  </span>
                </div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs font-medium transition-colors hover:scale-105"
                  style={{ color: 'var(--primary)' }}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              {/* Emotion summary */}
              <div className="flex items-center gap-3 p-3 rounded-xl border" style={{
                background: `${EMOTION_COLORS[state.current]}10`,
                borderColor: `${EMOTION_COLORS[state.current]}30`
              }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                  style={{
                    backgroundColor: `${EMOTION_COLORS[state.current]}20`,
                    color: EMOTION_COLORS[state.current],
                    border: `2px solid ${EMOTION_COLORS[state.current]}40`
                  }}
                >
                  <span>{getEmotionEmoji(state.current)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                      {state.current}
                    </span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full" style={{
                      background: 'rgba(250, 162, 117, 0.2)',
                      color: EMOTION_COLORS[state.current]
                    }}>
                      {(state.confidence * 100).toFixed(0)}%
                    </span>
                    {state.isStable && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                        background: 'rgba(250, 162, 117, 0.2)',
                        color: 'var(--success)'
                      }}>
                        Stable
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-mono">
                      Mood: {state.valence >= 0 ? '+' : ''}{state.valence.toFixed(2)}
                    </span>
                    <span className="font-mono">
                      Energy: {(state.arousal * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed scores */}
              {showDetails && state.history.length > 0 && (
                <div className="space-y-2 p-3 rounded-xl border" style={{
                  background: 'rgba(92, 55, 76, 0.3)',
                  borderColor: 'var(--border)'
                }}>
                  {(
                    Object.entries(state.history[state.history.length - 1].scores) as [
                      EmotionLabel,
                      number
                    ][]
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([emotion, score]) => (
                      <div key={emotion} className="flex items-center gap-3">
                        <span
                          className="w-20 text-xs font-semibold capitalize"
                          style={{ color: EMOTION_COLORS[emotion] }}
                        >
                          {emotion}
                        </span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
                          background: 'rgba(92, 55, 76, 0.5)'
                        }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${score * 100}%`,
                              backgroundColor: EMOTION_COLORS[emotion],
                              boxShadow: `0 0 8px ${EMOTION_COLORS[emotion]}60`
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-semibold w-14 text-right" style={{
                          color: 'var(--text-secondary)'
                        }}>
                          {(score * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-xl border animate-fade-in" style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'var(--danger)',
              color: 'var(--danger)'
            }}>
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs font-mono font-semibold pt-2 border-t" style={{
            color: 'var(--text-tertiary)',
            borderColor: 'var(--border)'
          }}>
            <span>Detections: {metrics.detectionCount}</span>
            <span>Dropped: {metrics.droppedFrames}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Metric card component
 */
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, color }) => (
  <div className="rounded-xl p-3 text-center border shadow-md transition-all hover:scale-105" style={{
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border)'
  }}>
    <div className={cn('flex items-center justify-center gap-1 mb-2', color)}>
      {icon}
    </div>
    <div className={cn('text-xl font-mono font-bold mb-1', color)}>{value}</div>
    <div className="text-[10px] font-semibold uppercase tracking-wide" style={{
      color: 'var(--text-tertiary)'
    }}>{label}</div>
  </div>
);

/**
 * Get emoji for emotion
 */
function getEmotionEmoji(emotion: EmotionLabel): string {
  const emojis: Record<EmotionLabel, string> = {
    happy: ':)',
    sad: ':(',
    surprise: ':O',
    neutral: ':|',
  };
  return emojis[emotion];
}

export default DebugPanel;
