/**
 * DebugPanel Component - ARTISTIC REDESIGN
 *
 * Developer-friendly debug interface for monitoring:
 * - Real-time performance metrics (FPS, latency, memory)
 * - Emotion detection state visualization
 * - TensorFlow.js backend status
 * - Connection status
 *
 * REDESIGNED with organic 5-color palette
 */

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import type { PerformanceMetrics, EmotionContext, EmotionLabel } from '@/types/emotion';
import { EMOTION_COLORS } from '@/types/emotion';
import {
  ChevronUp,
  ChevronDown,
  Brain,
  Waves,
  Sparkle,
  TrendingUp,
  Database,
  Layers,
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
 * Get latency status color using palette (non-yellowish colors)
 */
function getLatencyColor(latency: number): string {
  if (latency < 100) return '#8e5572'; // mauve - good
  if (latency < 200) return '#bcaa99'; // beige - ok
  if (latency < 300) return '#8e5572'; // mauve - moderate
  return '#443850'; // eggplant - slow
}

/**
 * Get FPS status color using palette (non-yellowish colors)
 */
function getFpsColor(fps: number): string {
  if (fps >= 5) return '#8e5572'; // mauve - good
  if (fps >= 3) return '#bcaa99'; // beige - moderate
  return '#443850'; // eggplant - slow
}

/**
 * Get metric card background color
 */
function getMetricCardStyle(index: number) {
  const styles = [
    { bg: 'rgba(142, 85, 114, 0.08)', border: 'rgba(142, 85, 114, 0.25)' }, // mauve
    { bg: 'rgba(188, 170, 153, 0.08)', border: 'rgba(188, 170, 153, 0.25)' }, // beige
    { bg: 'rgba(68, 56, 80, 0.08)', border: 'rgba(68, 56, 80, 0.25)' }, // eggplant
    { bg: 'rgba(142, 85, 114, 0.12)', border: 'rgba(142, 85, 114, 0.3)' }, // mauve darker
  ];
  return styles[index % styles.length];
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
        'rounded-3xl overflow-hidden shadow-lg border-2 transition-all',
        className
      )}
      style={{
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(188, 170, 153, 0.12) 100%)',
        borderColor: 'var(--border)'
      }}
    >
      {/* Header - Artistic */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 transition-all hover:bg-opacity-90"
        style={{
          background: 'linear-gradient(135deg, rgba(142, 85, 114, 0.12) 0%, rgba(188, 170, 153, 0.08) 100%)',
          borderBottom: isExpanded ? '1.5px solid var(--border)' : 'none'
        }}
      >
        <div className="flex items-center gap-4">
          <Waves className="w-5 h-5" style={{ color: 'var(--mauve)' }} />
          <span className="font-display text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Performance Stats
          </span>
          {!isExpanded && (
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full shadow-sm" style={{
              background: isDetecting ? 'rgba(142, 85, 114, 0.2)' : 'rgba(142, 85, 114, 0.15)',
              color: isDetecting ? 'var(--mauve)' : 'var(--text-tertiary)',
              border: `1px solid ${isDetecting ? 'rgba(142, 85, 114, 0.3)' : 'var(--border)'}`
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
        <div className="p-6 space-y-5">
          {/* Status indicators - Organic pills */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full border shadow-sm" style={{
              background: isModelReady ? 'rgba(142, 85, 114, 0.12)' : 'rgba(188, 170, 153, 0.15)',
              borderColor: isModelReady ? 'rgba(142, 85, 114, 0.25)' : 'var(--border)'
            }}>
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isModelReady ? '' : 'animate-pulse'
                )}
                style={{
                  background: isModelReady ? 'var(--mauve)' : 'var(--beige)',
                  boxShadow: isModelReady ? '0 0 8px rgba(142, 85, 114, 0.6)' : 'none'
                }}
              />
              <span className="font-semibold" style={{
                color: isModelReady ? 'var(--mauve)' : 'var(--text-secondary)'
              }}>
                Model: {isModelReady ? 'Ready' : 'Loading...'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full border shadow-sm" style={{
              background: isDetecting ? 'rgba(142, 85, 114, 0.12)' : 'rgba(142, 85, 114, 0.1)',
              borderColor: isDetecting ? 'rgba(142, 85, 114, 0.25)' : 'var(--border)'
            }}>
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isDetecting ? 'animate-pulse' : ''
                )}
                style={{
                  background: isDetecting ? 'var(--mauve)' : 'var(--text-disabled)',
                  boxShadow: isDetecting ? '0 0 8px rgba(142, 85, 114, 0.6)' : 'none'
                }}
              />
              <span className="font-semibold" style={{
                color: isDetecting ? 'var(--mauve)' : 'var(--text-tertiary)'
              }}>
                Detection: {isDetecting ? 'Active' : 'Stopped'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full border shadow-sm" style={{
              background: 'rgba(142, 85, 114, 0.1)',
              borderColor: 'rgba(142, 85, 114, 0.2)'
            }}>
              <Layers className="w-3.5 h-3.5" style={{ color: 'var(--mauve)' }} />
              <span className="font-mono font-bold uppercase" style={{ color: 'var(--mauve)' }}>
                {metrics.backend}
              </span>
            </div>
          </div>

          {/* Performance metrics - Artistic cards */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              icon={<Sparkle className="w-4 h-4" />}
              label="FPS"
              value={metrics.fps.toString()}
              color={getFpsColor(metrics.fps)}
              index={0}
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Latency"
              value={`${metrics.avgLatency.toFixed(0)}ms`}
              color={getLatencyColor(metrics.avgLatency)}
              index={1}
            />
            <MetricCard
              icon={<Waves className="w-4 h-4" />}
              label="P95"
              value={`${metrics.p95Latency.toFixed(0)}ms`}
              color={getLatencyColor(metrics.p95Latency)}
              index={2}
            />
            <MetricCard
              icon={<Database className="w-4 h-4" />}
              label="Memory"
              value={formatMemory(metrics.memoryUsage)}
              color="#8e5572"
              index={3}
            />
          </div>

          {/* Emotion state - Organic & beautiful */}
          {state && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5" style={{ color: 'var(--mauve)' }} />
                  <span className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Emotion State
                  </span>
                </div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs font-semibold transition-all hover:scale-105 px-3 py-1.5 rounded-full"
                  style={{
                    color: 'var(--mauve)',
                    background: 'rgba(142, 85, 114, 0.12)',
                    border: '1px solid rgba(142, 85, 114, 0.25)'
                  }}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              {/* Emotion summary - Artistic card */}
              <div className="flex items-center gap-4 p-5 rounded-2xl border-2 shadow-sm" style={{
                background: `linear-gradient(135deg, ${EMOTION_COLORS[state.current]}08 0%, ${EMOTION_COLORS[state.current]}05 100%)`,
                borderColor: `${EMOTION_COLORS[state.current]}30`
              }}>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                  style={{
                    backgroundColor: `${EMOTION_COLORS[state.current]}15`,
                    color: EMOTION_COLORS[state.current],
                    border: `2px solid ${EMOTION_COLORS[state.current]}35`
                  }}
                >
                  <span>{getEmotionEmoji(state.current)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-display font-bold text-lg capitalize" style={{ color: 'var(--text-primary)' }}>
                      {state.current}
                    </span>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full" style={{
                      background: `${EMOTION_COLORS[state.current]}20`,
                      color: EMOTION_COLORS[state.current],
                      border: `1px solid ${EMOTION_COLORS[state.current]}30`
                    }}>
                      {(state.confidence * 100).toFixed(0)}%
                    </span>
                    {state.isStable && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                        background: 'rgba(142, 85, 114, 0.15)',
                        color: 'var(--mauve)',
                        border: '1px solid rgba(142, 85, 114, 0.3)'
                      }}>
                        Stable
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-5 text-xs font-semibold font-mono" style={{ color: 'var(--text-secondary)' }}>
                    <span>
                      Mood: {state.valence >= 0 ? '+' : ''}{state.valence.toFixed(2)}
                    </span>
                    <span>
                      Energy: {(state.arousal * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed scores - Organic bars */}
              {showDetails && state.history.length > 0 && (
                <div className="space-y-3 p-5 rounded-2xl border" style={{
                  background: 'rgba(188, 170, 153, 0.08)',
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
                          className="w-24 text-xs font-bold capitalize"
                          style={{ color: EMOTION_COLORS[emotion] }}
                        >
                          {emotion}
                        </span>
                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{
                          background: 'rgba(68, 56, 80, 0.15)',
                          border: '1px solid rgba(68, 56, 80, 0.2)'
                        }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${score * 100}%`,
                              backgroundColor: EMOTION_COLORS[emotion],
                              boxShadow: `0 0 12px ${EMOTION_COLORS[emotion]}90, inset 0 0 4px rgba(255,255,255,0.2)`
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold w-14 text-right" style={{
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

          {/* Error display - Soft & organic */}
          {error && (
            <div className="p-4 rounded-2xl border-2 animate-fade-in shadow-sm" style={{
              background: 'rgba(142, 85, 114, 0.08)',
              borderColor: 'var(--mauve)',
              color: 'var(--mauve)'
            }}>
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          {/* Stats - Monospace */}
          <div className="flex items-center justify-between text-xs font-mono font-bold pt-3 border-t" style={{
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
 * Metric card component - Artistic & organic with colorful backgrounds
 */
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  index: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, color, index }) => {
  const cardStyle = getMetricCardStyle(index);

  return (
    <div className="rounded-2xl p-4 text-center border-2 shadow-sm transition-all hover:shadow-md hover:scale-105" style={{
      background: cardStyle.bg,
      borderColor: cardStyle.border
    }}>
      <div className="flex items-center justify-center gap-1 mb-2" style={{ color }}>
        {icon}
      </div>
      <div className="text-2xl font-mono font-bold mb-1" style={{ color }}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{
        color: 'var(--text-tertiary)'
      }}>{label}</div>
    </div>
  );
};

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
