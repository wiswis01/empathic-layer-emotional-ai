/**
 * Therapist Dashboard Component
 *
 * A comprehensive dashboard for therapists providing:
 * - Real-time suggestions and alerts
 * - 6 core metrics visualization
 * - Clinical pattern indicators
 * - Session transcript with emotion markers
 * - Topic coverage tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { EmotionContext } from '../types/emotion';
import {
  useTherapistAgent,
  useTherapistMetrics,
  formatSessionDuration
} from '../hooks/useTherapistAgent';
import type {
  TherapistSuggestion,
  PatternMatch,
  TranscriptSegment,
  RiskLevel
} from '../agents/types';
import { SuggestionType } from '../agents/types';

// ============================================================================
// COMPONENT TYPES
// ============================================================================

interface TherapistDashboardProps {
  /** Current emotion context from detection */
  emotionContext?: EmotionContext;
  /** Enable/disable the dashboard */
  enabled?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when a suggestion is used */
  onSuggestionUsed?: (suggestion: TherapistSuggestion) => void;
  /** LLM callback for question rephrasing */
  llmCallback?: (prompt: string) => Promise<string>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TherapistDashboard({
  emotionContext,
  enabled = true,
  compact = false,
  className = '',
  onSuggestionUsed,
  llmCallback
}: TherapistDashboardProps) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'metrics' | 'transcript' | 'topics'>('suggestions');
  const [transcript] = useState<TranscriptSegment[]>([]);

  // Initialize therapist agent
  const agent = useTherapistAgent({
    autoStart: true,
    llmCallback,
    onSuggestion: (_suggestion) => {
      // Could add toast notification here
    },
    onRiskAlert: (_suggestion) => {
      // Could add sound/vibration alert here
    }
  });

  // Get metrics
  const metrics = useTherapistMetrics(agent);

  // Process emotion updates
  useEffect(() => {
    if (emotionContext && enabled) {
      agent.processEmotion(emotionContext);
    }
  }, [emotionContext, enabled, agent.processEmotion]);

  // Handle suggestion use
  const handleUseSuggestion = useCallback((suggestion: TherapistSuggestion) => {
    agent.useSuggestion(suggestion.id);
    if (onSuggestionUsed) {
      onSuggestionUsed(suggestion);
    }
  }, [agent.useSuggestion, onSuggestionUsed]);

  // Handle suggestion dismiss
  const handleDismissSuggestion = useCallback((suggestion: TherapistSuggestion) => {
    agent.dismissSuggestion(suggestion.id);
  }, [agent.dismissSuggestion]);

  if (!enabled) return null;

  return (
    <div className={`therapist-dashboard ${compact ? 'compact' : ''} ${className}`}>
      {/* Header with session info */}
      <DashboardHeader
        sessionDuration={agent.sessionDuration}
        riskLevel={agent.riskLevel}
        riskColor={agent.riskColor}
        riskText={agent.riskText}
        isSessionActive={agent.isSessionActive}
        onEndSession={() => agent.endSession()}
        onStartSession={() => agent.startSession()}
      />

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <TabButton
          active={activeTab === 'suggestions'}
          onClick={() => setActiveTab('suggestions')}
          badge={agent.suggestions.length}
        >
          Suggestions
        </TabButton>
        <TabButton
          active={activeTab === 'metrics'}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics
        </TabButton>
        <TabButton
          active={activeTab === 'topics'}
          onClick={() => setActiveTab('topics')}
          badge={agent.uncoveredTopics.length}
        >
          Topics
        </TabButton>
        <TabButton
          active={activeTab === 'transcript'}
          onClick={() => setActiveTab('transcript')}
        >
          Transcript
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'suggestions' && (
          <SuggestionsPanel
            suggestions={agent.suggestions}
            patterns={agent.patterns}
            onUse={handleUseSuggestion}
            onDismiss={handleDismissSuggestion}
          />
        )}
        {activeTab === 'metrics' && (
          <MetricsPanel metrics={metrics} />
        )}
        {activeTab === 'topics' && (
          <TopicsPanel
            uncoveredTopics={agent.uncoveredTopics}
            sessionDuration={agent.sessionDuration}
          />
        )}
        {activeTab === 'transcript' && (
          <TranscriptPanel segments={transcript} />
        )}
      </div>

      <style>{dashboardStyles}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DashboardHeaderProps {
  sessionDuration: number;
  riskLevel: RiskLevel;
  riskColor: string;
  riskText: string;
  isSessionActive: boolean;
  onEndSession: () => void;
  onStartSession: () => void;
}

function DashboardHeader({
  sessionDuration,
  riskLevel,
  riskColor,
  riskText,
  isSessionActive,
  onEndSession,
  onStartSession
}: DashboardHeaderProps) {
  return (
    <div className="dashboard-header">
      <div className="header-left">
        <span className="session-label">Session</span>
        <span className="session-time">{formatSessionDuration(sessionDuration)}</span>
      </div>

      <div className="header-center">
        <div
          className={`risk-indicator ${riskLevel}`}
          style={{ backgroundColor: riskColor }}
        >
          <span className="risk-dot" />
          <span className="risk-text">{riskText}</span>
        </div>
      </div>

      <div className="header-right">
        {isSessionActive ? (
          <button className="session-btn end" onClick={onEndSession}>
            End Session
          </button>
        ) : (
          <button className="session-btn start" onClick={onStartSession}>
            Start Session
          </button>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}

function TabButton({ active, onClick, badge, children }: TabButtonProps) {
  return (
    <button
      className={`tab-btn ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="tab-badge">{badge}</span>
      )}
    </button>
  );
}

interface SuggestionsPanelProps {
  suggestions: TherapistSuggestion[];
  patterns: PatternMatch[];
  onUse: (suggestion: TherapistSuggestion) => void;
  onDismiss: (suggestion: TherapistSuggestion) => void;
}

function SuggestionsPanel({ suggestions, patterns, onUse, onDismiss }: SuggestionsPanelProps) {
  if (suggestions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">?</div>
        <p>No suggestions yet</p>
        <p className="empty-hint">Suggestions will appear based on detected emotions and conversation context</p>
      </div>
    );
  }

  return (
    <div className="suggestions-panel">
      {/* Risk alerts first */}
      {suggestions
        .filter(s => s.type === SuggestionType.RISK_ALERT)
        .map(suggestion => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onUse={() => onUse(suggestion)}
            onDismiss={() => onDismiss(suggestion)}
          />
        ))}

      {/* Pattern insights */}
      {patterns.length > 0 && (
        <div className="patterns-summary">
          <h4>Detected Patterns</h4>
          <div className="pattern-chips">
            {patterns.map(p => (
              <span
                key={p.pattern.condition}
                className="pattern-chip"
                title={`${Math.round(p.confidence * 100)}% confidence`}
              >
                {p.pattern.displayName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Other suggestions */}
      {suggestions
        .filter(s => s.type !== SuggestionType.RISK_ALERT)
        .map(suggestion => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onUse={() => onUse(suggestion)}
            onDismiss={() => onDismiss(suggestion)}
          />
        ))}
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: TherapistSuggestion;
  onUse: () => void;
  onDismiss: () => void;
}

function SuggestionCard({ suggestion, onUse, onDismiss }: SuggestionCardProps) {
  const typeConfig = {
    [SuggestionType.QUESTION]: { icon: '?', label: 'Question', className: 'question' },
    [SuggestionType.RISK_ALERT]: { icon: '!', label: 'Alert', className: 'risk' },
    [SuggestionType.PATTERN]: { icon: 'P', label: 'Pattern', className: 'pattern' },
    [SuggestionType.TOPIC_GAP]: { icon: 'T', label: 'Topic', className: 'topic' },
    [SuggestionType.INSIGHT]: { icon: 'i', label: 'Insight', className: 'insight' }
  };

  const config = typeConfig[suggestion.type];

  return (
    <div className={`suggestion-card ${config.className} priority-${suggestion.priority}`}>
      <div className="suggestion-header">
        <span className="suggestion-type-icon">{config.icon}</span>
        <span className="suggestion-type-label">{config.label}</span>
        {suggestion.priority >= 4 && <span className="priority-badge">Urgent</span>}
      </div>

      <div className="suggestion-content">
        <p className="suggestion-text">{suggestion.content}</p>
        {suggestion.reasoning && (
          <p className="suggestion-reasoning">{suggestion.reasoning}</p>
        )}
      </div>

      <div className="suggestion-actions">
        <button className="action-btn use" onClick={onUse}>
          Use
        </button>
        <button className="action-btn dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

interface MetricsPanelProps {
  metrics: ReturnType<typeof useTherapistMetrics>;
}

function MetricsPanel({ metrics }: MetricsPanelProps) {
  const metricConfigs = [
    {
      label: 'Emotional Balance',
      value: metrics.emotionalBalance,
      min: -1,
      max: 1,
      format: (v: number) => v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2),
      color: metrics.emotionalBalance > 0 ? '#bbbe64' : '#8e5572'
    },
    {
      label: 'Mood Stability',
      value: metrics.moodStability,
      min: 0,
      max: 1,
      format: (v: number) => `${Math.round(v * 100)}%`,
      color: metrics.moodStability > 0.6 ? '#bbbe64' : '#ca8a04'
    },
    {
      label: 'Stress Level',
      value: metrics.stressIndicator,
      min: 0,
      max: 1,
      format: (v: number) => `${Math.round(v * 100)}%`,
      color: metrics.stressIndicator < 0.4 ? '#65a30d' : metrics.stressIndicator < 0.7 ? '#ca8a04' : '#dc2626'
    },
    {
      label: 'Engagement',
      value: metrics.engagementLevel,
      min: 0,
      max: 1,
      format: (v: number) => `${Math.round(v * 100)}%`,
      color: '#bbbe64'
    },
    {
      label: 'Congruence',
      value: metrics.congruenceScore,
      min: 0,
      max: 1,
      format: (v: number) => `${Math.round(v * 100)}%`,
      color: metrics.congruenceScore > 0.7 ? '#bbbe64' : '#ca8a04'
    }
  ];

  return (
    <div className="metrics-panel">
      <div className="metrics-grid">
        {metricConfigs.map(config => (
          <MetricCard
            key={config.label}
            label={config.label}
            value={config.value}
            min={config.min}
            max={config.max}
            format={config.format}
            color={config.color}
          />
        ))}

        {/* Risk level special card */}
        <div className="metric-card risk-card">
          <div className="metric-label">Risk Level</div>
          <div className={`risk-level-display ${metrics.riskLevel}`}>
            {metrics.riskLevel.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  min: number;
  max: number;
  format: (v: number) => string;
  color: string;
}

function MetricCard({ label, value, min, max, format, color }: MetricCardProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>
        {format(value)}
      </div>
      <div className="metric-bar">
        <div
          className="metric-bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface TopicsPanelProps {
  uncoveredTopics: string[];
  sessionDuration: number;
}

function TopicsPanel({ uncoveredTopics, sessionDuration }: TopicsPanelProps) {
  const coveredCount = 14 - uncoveredTopics.length; // Assuming 14 standard topics
  const progress = (coveredCount / 14) * 100;

  return (
    <div className="topics-panel">
      <div className="topics-progress">
        <div className="progress-header">
          <span>Topics Covered</span>
          <span>{coveredCount} / 14</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {uncoveredTopics.length > 0 && (
        <div className="uncovered-topics">
          <h4>Not Yet Discussed</h4>
          <div className="topic-list">
            {uncoveredTopics.map(topic => (
              <div key={topic} className="topic-item">
                <span className="topic-indicator" />
                <span className="topic-name">{topic}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessionDuration < 300 && (
        <p className="topics-hint">
          Topic suggestions will become more relevant after 5 minutes of session time.
        </p>
      )}
    </div>
  );
}

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
}

function TranscriptPanel({ segments }: TranscriptPanelProps) {
  if (segments.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">T</div>
        <p>No transcript available</p>
        <p className="empty-hint">Enable voice transcription to see emotion-aligned transcript</p>
      </div>
    );
  }

  return (
    <div className="transcript-panel">
      {segments.map(segment => (
        <div key={segment.id} className={`transcript-segment ${segment.flagged ? 'flagged' : ''}`}>
          <div className="segment-time">
            {formatTime(segment.startTime)}
          </div>
          {segment.emotionAtTime && (
            <div className={`segment-emotion ${segment.emotionAtTime}`}>
              {segment.emotionAtTime.toUpperCase()}
            </div>
          )}
          <div className="segment-speaker">
            {segment.speaker !== 'unknown' && `[${segment.speaker}]`}
          </div>
          <div className="segment-text">
            {segment.text}
            {segment.flagged && <span className="flag-indicator" title={segment.flagReason}>!</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// UTILITY
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// STYLES
// ============================================================================

const dashboardStyles = `
  /* Google Fonts Import */
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  .therapist-dashboard {
    font-family: 'Space Grotesk', -apple-system, system-ui, sans-serif;
    background: #f2f7f2;
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 500px;
    color: #443850;
    box-shadow: 0 8px 32px rgba(68, 56, 80, 0.08);
    animation: fadeIn 0.4s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .therapist-dashboard.compact {
    min-height: 350px;
  }

  /* ============================================================================
     HEADER
     ============================================================================ */

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 32px;
    background: linear-gradient(135deg, #443850 0%, #5a4a66 50%, #8e5572 100%);
    color: #f2f7f2;
    position: relative;
    overflow: hidden;
  }

  .dashboard-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(187, 190, 100, 0.08), transparent 60%);
    pointer-events: none;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    z-index: 1;
  }

  .session-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    opacity: 0.65;
    font-weight: 500;
  }

  .session-time {
    font-family: 'DM Mono', monospace;
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.5px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
    position: relative;
    z-index: 1;
  }

  .risk-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    border-radius: 24px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transition: all 0.3s ease;
  }

  .risk-indicator:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  }

  .risk-indicator.low {
    background: rgba(101, 163, 13, 0.25);
    color: #d4fc79;
  }

  .risk-indicator.moderate {
    background: rgba(202, 138, 4, 0.25);
    color: #fde68a;
  }

  .risk-indicator.high {
    background: rgba(234, 88, 12, 0.3);
    color: #fed7aa;
  }

  .risk-indicator.crisis {
    background: rgba(220, 38, 38, 0.35);
    color: #fef2f2;
    animation: pulse-alert 1.5s ease-in-out infinite;
  }

  @keyframes pulse-alert {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
    }
    50% {
      transform: scale(1.03);
      box-shadow: 0 8px 24px rgba(220, 38, 38, 0.5);
    }
  }

  .risk-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 12px currentColor;
    animation: breathe 2s ease-in-out infinite;
  }

  @keyframes breathe {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .header-right {
    display: flex;
    gap: 10px;
    position: relative;
    z-index: 1;
  }

  .session-btn {
    padding: 10px 20px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(8px);
    letter-spacing: 0.3px;
  }

  .session-btn.end {
    background: rgba(220, 38, 38, 0.25);
    color: #fecaca;
    border: 1px solid rgba(220, 38, 38, 0.3);
  }

  .session-btn.end:hover {
    background: rgba(220, 38, 38, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  .session-btn.start {
    background: rgba(187, 190, 100, 0.25);
    color: #f2f7f2;
    border: 1px solid rgba(187, 190, 100, 0.3);
  }

  .session-btn.start:hover {
    background: rgba(187, 190, 100, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(187, 190, 100, 0.3);
  }

  /* ============================================================================
     TABS
     ============================================================================ */

  .dashboard-tabs {
    display: flex;
    gap: 8px;
    padding: 20px 24px 0;
    background: #FEFFFE;
    border-bottom: 2px solid rgba(68, 56, 80, 0.06);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    background: transparent;
    color: #443850;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 12px 12px 0 0;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    letter-spacing: 0.2px;
  }

  .tab-btn:hover {
    background: rgba(142, 85, 114, 0.06);
    transform: translateY(-2px);
  }

  .tab-btn.active {
    background: #f2f7f2;
    color: #8e5572;
    font-weight: 600;
  }

  .tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #8e5572, #bbbe64);
    border-radius: 3px 3px 0 0;
  }

  .tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    background: #8e5572;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    border-radius: 11px;
    box-shadow: 0 2px 6px rgba(142, 85, 114, 0.3);
    animation: pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  @keyframes pop {
    0% { transform: scale(0); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  /* ============================================================================
     CONTENT
     ============================================================================ */

  .dashboard-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    background: #f2f7f2;
  }

  .dashboard-content::-webkit-scrollbar {
    width: 8px;
  }

  .dashboard-content::-webkit-scrollbar-track {
    background: rgba(68, 56, 80, 0.03);
    border-radius: 4px;
  }

  .dashboard-content::-webkit-scrollbar-thumb {
    background: rgba(142, 85, 114, 0.2);
    border-radius: 4px;
  }

  .dashboard-content::-webkit-scrollbar-thumb:hover {
    background: rgba(142, 85, 114, 0.3);
  }

  /* ============================================================================
     EMPTY STATE
     ============================================================================ */

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 32px;
    text-align: center;
    color: #443850;
    opacity: 0.5;
    animation: fadeIn 0.5s ease-out;
  }

  .empty-icon {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(142, 85, 114, 0.08), rgba(188, 170, 153, 0.08));
    border-radius: 20px;
    font-size: 32px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #8e5572;
    box-shadow: 0 4px 16px rgba(142, 85, 114, 0.08);
  }

  .empty-hint {
    font-size: 14px;
    margin-top: 8px;
    max-width: 320px;
    line-height: 1.6;
  }

  /* ============================================================================
     SUGGESTIONS PANEL
     ============================================================================ */

  .suggestions-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: staggerIn 0.5s ease-out;
  }

  @keyframes staggerIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .patterns-summary {
    padding: 20px 24px;
    background: linear-gradient(135deg, rgba(142, 85, 114, 0.08), rgba(142, 85, 114, 0.04));
    border-radius: 16px;
    border: 1px solid rgba(142, 85, 114, 0.12);
    margin-bottom: 8px;
    backdrop-filter: blur(8px);
  }

  .patterns-summary h4 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #8e5572;
    margin: 0 0 12px;
    font-weight: 700;
  }

  .pattern-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pattern-chip {
    padding: 8px 16px;
    background: rgba(142, 85, 114, 0.15);
    color: #8e5572;
    font-size: 12px;
    font-weight: 600;
    border-radius: 20px;
    border: 1px solid rgba(142, 85, 114, 0.2);
    transition: all 0.2s ease;
    letter-spacing: 0.3px;
  }

  .pattern-chip:hover {
    background: rgba(142, 85, 114, 0.22);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(142, 85, 114, 0.15);
  }

  /* ============================================================================
     SUGGESTION CARDS
     ============================================================================ */

  .suggestion-card {
    background: #FEFFFE;
    border-radius: 16px;
    padding: 20px 24px;
    box-shadow: 0 2px 8px rgba(68, 56, 80, 0.06), 0 1px 2px rgba(68, 56, 80, 0.04);
    border-left: 4px solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideIn 0.4s ease-out;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-16px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .suggestion-card:hover {
    box-shadow: 0 8px 24px rgba(68, 56, 80, 0.12), 0 2px 6px rgba(68, 56, 80, 0.06);
    transform: translateY(-2px);
  }

  .suggestion-card.question {
    border-left-color: #bbbe64;
  }

  .suggestion-card.risk {
    border-left-color: #dc2626;
    background: linear-gradient(135deg, #fef2f2 0%, #FEFFFE 100%);
  }

  .suggestion-card.pattern {
    border-left-color: #8e5572;
  }

  .suggestion-card.topic {
    border-left-color: #bcaa99;
  }

  .suggestion-card.insight {
    border-left-color: #bbbe64;
  }

  .suggestion-card.priority-5 {
    animation: pulse-card 2s ease-in-out infinite;
  }

  @keyframes pulse-card {
    0%, 100% {
      box-shadow: 0 2px 8px rgba(68, 56, 80, 0.06);
    }
    50% {
      box-shadow: 0 8px 32px rgba(220, 38, 38, 0.25);
      transform: translateY(-3px);
    }
  }

  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .suggestion-type-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(68, 56, 80, 0.08);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    transition: all 0.2s ease;
  }

  .suggestion-card:hover .suggestion-type-icon {
    transform: scale(1.05);
  }

  .suggestion-card.risk .suggestion-type-icon {
    background: rgba(220, 38, 38, 0.15);
    color: #dc2626;
  }

  .suggestion-card.question .suggestion-type-icon {
    background: rgba(187, 190, 100, 0.15);
    color: #8a8d3f;
  }

  .suggestion-card.pattern .suggestion-type-icon {
    background: rgba(142, 85, 114, 0.15);
    color: #8e5572;
  }

  .suggestion-type-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #443850;
    opacity: 0.6;
    font-weight: 600;
  }

  .priority-badge {
    margin-left: auto;
    padding: 4px 12px;
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    border-radius: 12px;
    letter-spacing: 0.8px;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }

  .suggestion-content {
    margin-bottom: 16px;
  }

  .suggestion-text {
    font-size: 16px;
    line-height: 1.6;
    color: #443850;
    margin: 0 0 8px;
    font-weight: 500;
  }

  .suggestion-reasoning {
    font-size: 14px;
    color: #443850;
    opacity: 0.65;
    margin: 0;
    font-style: italic;
    line-height: 1.5;
  }

  .suggestion-actions {
    display: flex;
    gap: 10px;
  }

  .action-btn {
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.3px;
  }

  .action-btn.use {
    background: linear-gradient(135deg, #bbbe64, #a9ac58);
    color: #443850;
    box-shadow: 0 2px 8px rgba(187, 190, 100, 0.25);
  }

  .action-btn.use:hover {
    background: linear-gradient(135deg, #a9ac58, #989b4f);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(187, 190, 100, 0.35);
  }

  .action-btn.dismiss {
    background: transparent;
    color: #443850;
    opacity: 0.5;
    border: 1px solid rgba(68, 56, 80, 0.15);
  }

  .action-btn.dismiss:hover {
    opacity: 0.8;
    background: rgba(68, 56, 80, 0.04);
    border-color: rgba(68, 56, 80, 0.25);
  }

  /* ============================================================================
     METRICS PANEL
     ============================================================================ */

  .metrics-panel {
    padding: 4px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .metric-card {
    background: #FEFFFE;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(68, 56, 80, 0.06), 0 1px 2px rgba(68, 56, 80, 0.04);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    animation: fadeIn 0.5s ease-out;
  }

  .metric-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--metric-color, #8e5572), transparent);
    opacity: 0.5;
  }

  .metric-card:hover {
    box-shadow: 0 8px 24px rgba(68, 56, 80, 0.12);
    transform: translateY(-4px);
  }

  .metric-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #443850;
    opacity: 0.6;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .metric-value {
    font-family: 'DM Mono', monospace;
    font-size: 32px;
    font-weight: 500;
    margin-bottom: 16px;
    letter-spacing: -1px;
    line-height: 1;
  }

  .metric-bar-container {
    position: relative;
    margin-top: 8px;
  }

  .metric-bar {
    height: 6px;
    background: rgba(68, 56, 80, 0.08);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .metric-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .metric-bar-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .risk-card {
    grid-column: span 2;
    background: linear-gradient(135deg, #FEFFFE 0%, #f2f7f2 100%);
  }

  .risk-level-display {
    font-size: 28px;
    font-weight: 700;
    text-align: center;
    padding: 20px;
    border-radius: 12px;
    letter-spacing: 1px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .risk-level-display.low {
    background: linear-gradient(135deg, rgba(101, 163, 13, 0.1), rgba(101, 163, 13, 0.05));
    color: #65a30d;
    border: 2px solid rgba(101, 163, 13, 0.2);
  }

  .risk-level-display.moderate {
    background: linear-gradient(135deg, rgba(202, 138, 4, 0.1), rgba(202, 138, 4, 0.05));
    color: #ca8a04;
    border: 2px solid rgba(202, 138, 4, 0.2);
  }

  .risk-level-display.high {
    background: linear-gradient(135deg, rgba(234, 88, 12, 0.15), rgba(234, 88, 12, 0.08));
    color: #ea580c;
    border: 2px solid rgba(234, 88, 12, 0.25);
  }

  .risk-level-display.crisis {
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(220, 38, 38, 0.1));
    color: #dc2626;
    border: 2px solid rgba(220, 38, 38, 0.3);
    animation: pulse-alert 1.5s ease-in-out infinite;
  }

  /* ============================================================================
     TOPICS PANEL
     ============================================================================ */

  .topics-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: fadeIn 0.5s ease-out;
  }

  .topics-progress {
    background: #FEFFFE;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(68, 56, 80, 0.06), 0 1px 2px rgba(68, 56, 80, 0.04);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    margin-bottom: 16px;
    font-weight: 600;
  }

  .progress-header span:first-child {
    color: #443850;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 11px;
  }

  .progress-header span:last-child {
    font-family: 'DM Mono', monospace;
    color: #8e5572;
    font-size: 16px;
  }

  .progress-bar {
    height: 12px;
    background: rgba(68, 56, 80, 0.08);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #bbbe64 0%, #8e5572 100%);
    border-radius: 6px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 2px 8px rgba(142, 85, 114, 0.25);
  }

  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
  }

  .uncovered-topics {
    background: #FEFFFE;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(68, 56, 80, 0.06), 0 1px 2px rgba(68, 56, 80, 0.04);
  }

  .uncovered-topics h4 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #443850;
    opacity: 0.6;
    margin: 0 0 16px;
    font-weight: 700;
  }

  .topic-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .topic-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    padding: 8px 0;
    transition: all 0.2s ease;
  }

  .topic-item:hover {
    transform: translateX(4px);
  }

  .topic-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(188, 170, 153, 0.4);
    border: 2px solid rgba(188, 170, 153, 0.6);
    flex-shrink: 0;
  }

  .topic-name {
    color: #443850;
    font-weight: 500;
  }

  .topics-hint {
    font-size: 14px;
    color: #443850;
    opacity: 0.5;
    text-align: center;
    padding: 20px;
    line-height: 1.6;
    font-style: italic;
  }

  /* ============================================================================
     TRANSCRIPT PANEL
     ============================================================================ */

  .transcript-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: fadeIn 0.5s ease-out;
  }

  .transcript-segment {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 20px;
    background: #FEFFFE;
    border-radius: 12px;
    font-size: 14px;
    box-shadow: 0 1px 4px rgba(68, 56, 80, 0.04);
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
  }

  .transcript-segment:hover {
    box-shadow: 0 4px 12px rgba(68, 56, 80, 0.08);
    transform: translateX(4px);
  }

  .transcript-segment.flagged {
    background: linear-gradient(135deg, #fef2f2 0%, #FEFFFE 100%);
    border-left-color: #dc2626;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.12);
  }

  .segment-time {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: #443850;
    opacity: 0.5;
    min-width: 50px;
    font-weight: 500;
  }

  .segment-emotion {
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .segment-emotion.happy {
    background: rgba(187, 190, 100, 0.2);
    color: #8a8d3f;
    border: 1px solid rgba(187, 190, 100, 0.3);
  }

  .segment-emotion.sad {
    background: rgba(142, 85, 114, 0.2);
    color: #8e5572;
    border: 1px solid rgba(142, 85, 114, 0.3);
  }

  .segment-emotion.surprise {
    background: rgba(187, 190, 100, 0.2);
    color: #8a8d3f;
    border: 1px solid rgba(187, 190, 100, 0.3);
  }

  .segment-emotion.neutral {
    background: rgba(188, 170, 153, 0.2);
    color: #8b7a6a;
    border: 1px solid rgba(188, 170, 153, 0.3);
  }

  .segment-speaker {
    font-size: 11px;
    text-transform: uppercase;
    color: #443850;
    opacity: 0.5;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .segment-text {
    flex: 1;
    line-height: 1.6;
    color: #443850;
  }

  .flag-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    border-radius: 50%;
    margin-left: 8px;
    cursor: help;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.3);
    transition: all 0.2s ease;
  }

  .flag-indicator:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 8px rgba(220, 38, 38, 0.4);
  }

  /* ============================================================================
     RESPONSIVE DESIGN
     ============================================================================ */

  @media (max-width: 768px) {
    .dashboard-header {
      padding: 16px 20px;
      flex-direction: column;
      gap: 12px;
    }

    .header-left,
    .header-center,
    .header-right {
      width: 100%;
      justify-content: center;
    }

    .session-time {
      font-size: 24px;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .risk-card {
      grid-column: span 1;
    }

    .dashboard-tabs {
      padding: 12px 16px 0;
      gap: 4px;
      overflow-x: auto;
    }

    .tab-btn {
      padding: 10px 16px;
      font-size: 13px;
    }

    .dashboard-content {
      padding: 16px;
    }
  }
`;

export default TherapistDashboard;
