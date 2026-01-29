/**
 * useTherapistAgent Hook
 *
 * React hook for integrating the TherapistAgent into components.
 * Provides reactive state management and easy access to agent features.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { EmotionContext } from '../types/emotion';
import {
  TherapistAgent,
  createTherapistAgent,
  getRiskLevelColor,
  getRiskLevelText
} from '../agents/TherapistAgent';
import type {
  TherapistSuggestion,
  TherapistMetrics,
  AgentConfig,
  RiskLevel,
  PatternMatch,
  SessionReport,
  AgentEvent,
  EmotionContextSnapshot
} from '../agents/types';

// ============================================================================
// HOOK TYPES
// ============================================================================

export interface UseTherapistAgentOptions {
  /** Agent configuration */
  config?: Partial<AgentConfig>;
  /** Auto-start session on mount */
  autoStart?: boolean;
  /** Callback for suggestion updates */
  onSuggestion?: (suggestion: TherapistSuggestion) => void;
  /** Callback for risk alerts */
  onRiskAlert?: (suggestion: TherapistSuggestion) => void;
  /** Callback for pattern detection */
  onPatternDetected?: (pattern: PatternMatch) => void;
  /** LLM callback for question rephrasing */
  llmCallback?: (prompt: string) => Promise<string>;
}

export interface UseTherapistAgentReturn {
  /** Whether the agent is initialized */
  isReady: boolean;
  /** Whether a session is active */
  isSessionActive: boolean;
  /** Current active suggestions */
  suggestions: TherapistSuggestion[];
  /** Current therapist metrics */
  metrics: TherapistMetrics | null;
  /** Current risk level */
  riskLevel: RiskLevel;
  /** Risk level display color */
  riskColor: string;
  /** Risk level display text */
  riskText: string;
  /** Active clinical patterns */
  patterns: PatternMatch[];
  /** Uncovered topics */
  uncoveredTopics: string[];
  /** Session duration in seconds */
  sessionDuration: number;
  /** Process an emotion context update */
  processEmotion: (context: EmotionContext) => Promise<void>;
  /** Process transcript text */
  processTranscript: (text: string, speaker: 'patient' | 'therapist') => void;
  /** Mark a suggestion as used */
  useSuggestion: (id: string) => void;
  /** Dismiss a suggestion */
  dismissSuggestion: (id: string) => void;
  /** Start a new session */
  startSession: (sessionId?: string) => void;
  /** End the current session */
  endSession: () => SessionReport | null;
  /** Get the full session report */
  getSessionReport: () => SessionReport | null;
  /** Update agent configuration */
  updateConfig: (config: Partial<AgentConfig>) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useTherapistAgent(
  options: UseTherapistAgentOptions = {}
): UseTherapistAgentReturn {
  const {
    config,
    autoStart = true,
    onSuggestion,
    onRiskAlert,
    onPatternDetected,
    llmCallback
  } = options;

  // Agent instance ref
  const agentRef = useRef<TherapistAgent | null>(null);

  // State
  const [isReady, setIsReady] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [suggestions, setSuggestions] = useState<TherapistSuggestion[]>([]);
  const [metrics, setMetrics] = useState<TherapistMetrics | null>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('low' as RiskLevel);
  const [patterns, setPatterns] = useState<PatternMatch[]>([]);
  const [uncoveredTopics, setUncoveredTopics] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Initialize agent
  useEffect(() => {
    const agent = createTherapistAgent(config);

    // Set LLM callback if provided
    if (llmCallback) {
      agent.setLLMCallback(llmCallback);
    }

    // Register event handlers
    agent.on((event: AgentEvent) => {
      switch (event.type) {
        case 'suggestion_generated':
          if (onSuggestion) {
            onSuggestion(event.payload as TherapistSuggestion);
          }
          break;
        case 'risk_alert':
          if (onRiskAlert) {
            onRiskAlert(event.payload as TherapistSuggestion);
          }
          break;
        case 'pattern_detected':
          if (onPatternDetected) {
            onPatternDetected(event.payload as PatternMatch);
          }
          break;
        case 'session_started':
          setIsSessionActive(true);
          break;
        case 'session_ended':
          setIsSessionActive(false);
          break;
      }
    });

    agentRef.current = agent;
    setIsReady(true);

    // Auto-start session
    if (autoStart) {
      agent.startSession();
      setIsSessionActive(true);
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.endSession();
      }
    };
  }, []); // Only run on mount

  // Update LLM callback if it changes
  useEffect(() => {
    if (agentRef.current && llmCallback) {
      agentRef.current.setLLMCallback(llmCallback);
    }
  }, [llmCallback]);

  // Session duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isSessionActive && agentRef.current) {
      interval = setInterval(() => {
        if (agentRef.current) {
          setSessionDuration(agentRef.current.getSessionDuration());
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive]);

  // Process emotion context
  const processEmotion = useCallback(async (context: EmotionContext) => {
    if (!agentRef.current || !isSessionActive) return;

    const snapshot: EmotionContextSnapshot = {
      emotionContext: context,
      timestamp: Date.now()
    };

    const newSuggestions = await agentRef.current.processEmotionalSnapshot(snapshot);

    // Update state
    setSuggestions(newSuggestions);
    setMetrics(agentRef.current.getMetrics());
    setRiskLevel(agentRef.current.getCurrentRiskLevel());
    setPatterns(agentRef.current.getActivePatterns());
    setUncoveredTopics(agentRef.current.getUncoveredTopics());
  }, [isSessionActive]);

  // Process transcript
  const processTranscript = useCallback((text: string, speaker: 'patient' | 'therapist') => {
    if (!agentRef.current || !isSessionActive) return;
    agentRef.current.processTranscript(text, speaker);

    // Update state after transcript processing
    setSuggestions(agentRef.current.getActiveSuggestions());
    setRiskLevel(agentRef.current.getCurrentRiskLevel());
  }, [isSessionActive]);

  // Use suggestion
  const useSuggestion = useCallback((id: string) => {
    if (!agentRef.current) return;
    agentRef.current.useSuggestion(id);
    setSuggestions(agentRef.current.getActiveSuggestions());
  }, []);

  // Dismiss suggestion
  const dismissSuggestion = useCallback((id: string) => {
    if (!agentRef.current) return;
    agentRef.current.dismissSuggestion(id);
    setSuggestions(agentRef.current.getActiveSuggestions());
  }, []);

  // Start session
  const startSession = useCallback((sessionId?: string) => {
    if (!agentRef.current) return;
    agentRef.current.startSession(sessionId);
    setIsSessionActive(true);
    setSuggestions([]);
    setMetrics(null);
    setRiskLevel('low' as RiskLevel);
    setPatterns([]);
    setSessionDuration(0);
  }, []);

  // End session
  const endSession = useCallback((): SessionReport | null => {
    if (!agentRef.current) return null;
    const report = agentRef.current.endSession();
    setIsSessionActive(false);
    return report;
  }, []);

  // Get session report
  const getSessionReport = useCallback((): SessionReport | null => {
    if (!agentRef.current) return null;
    return agentRef.current.getSessionReport();
  }, []);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<AgentConfig>) => {
    if (!agentRef.current) return;
    agentRef.current.updateConfig(newConfig);
  }, []);

  // Computed values
  const riskColor = useMemo(() => getRiskLevelColor(riskLevel), [riskLevel]);
  const riskText = useMemo(() => getRiskLevelText(riskLevel), [riskLevel]);

  return {
    isReady,
    isSessionActive,
    suggestions,
    metrics,
    riskLevel,
    riskColor,
    riskText,
    patterns,
    uncoveredTopics,
    sessionDuration,
    processEmotion,
    processTranscript,
    useSuggestion,
    dismissSuggestion,
    startSession,
    endSession,
    getSessionReport,
    updateConfig
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for just the metrics display
 */
export function useTherapistMetrics(
  agent: UseTherapistAgentReturn
): {
  emotionalBalance: number;
  moodStability: number;
  stressIndicator: number;
  engagementLevel: number;
  congruenceScore: number;
  riskLevel: RiskLevel;
} {
  const defaultMetrics = {
    emotionalBalance: 0,
    moodStability: 0.5,
    stressIndicator: 0,
    engagementLevel: 0.5,
    congruenceScore: 0.7,
    riskLevel: 'low' as RiskLevel
  };

  if (!agent.metrics) return defaultMetrics;

  return {
    emotionalBalance: agent.metrics.emotionalBalance,
    moodStability: agent.metrics.moodStability,
    stressIndicator: agent.metrics.stressIndicator,
    engagementLevel: agent.metrics.engagementLevel,
    congruenceScore: agent.metrics.congruenceScore,
    riskLevel: agent.metrics.riskLevel
  };
}

/**
 * Format session duration as MM:SS
 */
export function formatSessionDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
