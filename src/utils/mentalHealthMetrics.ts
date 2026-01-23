/**
 * Mental Health Metrics
 *
 * Client-side calculation of mental wellness indicators from emotion detection.
 * Non-diagnostic, focusing on patterns and self-awareness.
 */

import type { EmotionLabel, EmotionDetectionResult, EmotionSession, MentalHealthMetrics } from '@/types/emotion';
import { indexedDBStore } from './indexedDBStore';

// Re-export MentalHealthMetrics for backward compatibility
export type { MentalHealthMetrics } from '@/types/emotion';

/**
 * Trend data for insights
 */
export interface EmotionTrend {
  period: 'day' | 'week' | 'month';
  averageBalance: number;
  averageStability: number;
  dominantEmotion: EmotionLabel;
  happinessChange: number; // percentage change
  sessionCount: number;
}

// Positive emotions for balance calculation
const POSITIVE_EMOTIONS: EmotionLabel[] = ['happy', 'surprise'];
const NEGATIVE_EMOTIONS: EmotionLabel[] = ['sad'];

/**
 * Calculate emotional balance (positive vs negative ratio)
 */
function calculateEmotionalBalance(samples: EmotionDetectionResult[]): number {
  if (samples.length === 0) return 0.5;

  let positiveSum = 0;
  let negativeSum = 0;
  let totalSum = 0;

  for (const sample of samples) {
    for (const [emotion, score] of Object.entries(sample.scores) as [EmotionLabel, number][]) {
      totalSum += score;
      if (POSITIVE_EMOTIONS.includes(emotion)) {
        positiveSum += score;
      } else if (NEGATIVE_EMOTIONS.includes(emotion)) {
        negativeSum += score;
      }
    }
  }

  if (totalSum === 0) return 0.5;

  // Balance = positive / (positive + negative), normalized
  const emotionalSum = positiveSum + negativeSum;
  if (emotionalSum === 0) return 0.5;

  return positiveSum / emotionalSum;
}

/**
 * Calculate mood stability (inverse of variability)
 */
function calculateMoodStability(samples: EmotionDetectionResult[]): number {
  if (samples.length < 2) return 1.0;

  let transitions = 0;
  let totalChangeMagnitude = 0;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];

    // Count emotion transitions
    if (prev.dominantEmotion !== curr.dominantEmotion) {
      transitions++;
    }

    // Calculate score changes
    for (const emotion of Object.keys(curr.scores) as EmotionLabel[]) {
      totalChangeMagnitude += Math.abs(curr.scores[emotion] - prev.scores[emotion]);
    }
  }

  const transitionRate = transitions / (samples.length - 1);
  const avgChangeMagnitude = totalChangeMagnitude / ((samples.length - 1) * 4); // 4 emotions

  // Stability = 1 - (normalized variability)
  const variability = (transitionRate * 0.5 + avgChangeMagnitude * 0.5);
  return Math.max(0, Math.min(1, 1 - variability));
}

/**
 * Calculate stress indicator based on patterns
 * High stress indicators: rapid changes, negative emotions, low stability
 */
function calculateStressIndicator(samples: EmotionDetectionResult[], stability: number): number {
  if (samples.length === 0) return 0;

  // Factor 1: Negative emotion prevalence
  let negativePrevalence = 0;
  for (const sample of samples) {
    negativePrevalence += sample.scores.sad;
  }
  negativePrevalence /= samples.length;

  // Factor 2: Inverse of stability (instability = stress)
  const instability = 1 - stability;

  // Factor 3: Low confidence detections (uncertain expressions)
  let avgConfidence = 0;
  for (const sample of samples) {
    avgConfidence += sample.confidence;
  }
  avgConfidence /= samples.length;
  const uncertaintyFactor = 1 - avgConfidence;

  // Weighted combination
  const stressIndicator = (
    negativePrevalence * 0.4 +
    instability * 0.35 +
    uncertaintyFactor * 0.25
  );

  return Math.max(0, Math.min(1, stressIndicator));
}

/**
 * Calculate engagement level (emotional intensity)
 */
function calculateEngagementLevel(samples: EmotionDetectionResult[]): number {
  if (samples.length === 0) return 0;

  let totalIntensity = 0;

  for (const sample of samples) {
    // Engagement = how far from neutral
    const nonNeutralIntensity = 1 - sample.scores.neutral;
    const confidence = sample.confidence;
    totalIntensity += nonNeutralIntensity * confidence;
  }

  return totalIntensity / samples.length;
}

/**
 * Calculate all mental health metrics from emotion samples
 */
export function calculateMentalHealthMetrics(
  samples: EmotionDetectionResult[]
): MentalHealthMetrics {
  const emotionalBalance = calculateEmotionalBalance(samples);
  const moodStability = calculateMoodStability(samples);
  const stressIndicator = calculateStressIndicator(samples, moodStability);
  const engagementLevel = calculateEngagementLevel(samples);

  return {
    emotionalBalance,
    moodStability,
    stressIndicator,
    engagementLevel,
    timestamp: Date.now(),
  };
}

/**
 * Generate a wellness insight message
 */
export function generateWellnessInsight(metrics: MentalHealthMetrics): string {
  const insights: string[] = [];

  // Balance insight
  if (metrics.emotionalBalance > 0.7) {
    insights.push('You\'re showing predominantly positive emotions.');
  } else if (metrics.emotionalBalance < 0.3) {
    insights.push('You might be experiencing some challenging emotions.');
  }

  // Stability insight
  if (metrics.moodStability > 0.7) {
    insights.push('Your emotional state appears stable.');
  } else if (metrics.moodStability < 0.4) {
    insights.push('Your emotions seem to be fluctuating.');
  }

  // Stress insight
  if (metrics.stressIndicator > 0.6) {
    insights.push('Some stress patterns detected. Consider a mindful break.');
  }

  // Engagement insight
  if (metrics.engagementLevel > 0.7) {
    insights.push('You\'re emotionally engaged and present.');
  } else if (metrics.engagementLevel < 0.3) {
    insights.push('You appear calm and neutral.');
  }

  if (insights.length === 0) {
    return 'Emotional patterns within normal range.';
  }

  return insights.join(' ');
}

// ============ Session Storage (IndexedDB) ============

/**
 * Initialize IndexedDB store
 * Call this on app startup
 */
export async function initSessionStorage(): Promise<void> {
  await indexedDBStore.init();
}

/**
 * Save a session to IndexedDB
 */
export async function saveSession(session: EmotionSession): Promise<void> {
  try {
    await indexedDBStore.saveSession(session);
  } catch (e) {
    console.warn('[MentalHealthMetrics] Failed to save session:', e);
    // Fallback to localStorage for this session
    try {
      const key = 'empathiclayer_sessions_fallback';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(session);
      if (existing.length > 100) existing.shift();
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // Silent fail
    }
  }
}

/**
 * Get all stored sessions from IndexedDB
 */
export async function getSessions(): Promise<EmotionSession[]> {
  try {
    return await indexedDBStore.getSessions();
  } catch {
    // Fallback to localStorage
    try {
      const key = 'empathiclayer_sessions_fallback';
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }
}

/**
 * Get sessions within a time range from IndexedDB
 */
export async function getSessionsInRange(startTime: number, endTime: number): Promise<EmotionSession[]> {
  try {
    return await indexedDBStore.getSessionsInRange(startTime, endTime);
  } catch {
    // Fallback to in-memory filtering
    const sessions = await getSessions();
    return sessions.filter(s => s.startTime >= startTime && s.endTime <= endTime);
  }
}

/**
 * Purge all session data (user-triggered privacy action)
 */
export async function purgeAllData(): Promise<void> {
  await indexedDBStore.purgeAllData();
  // Also clear localStorage fallback
  try {
    localStorage.removeItem('empathiclayer_sessions_fallback');
  } catch {
    // Silent fail
  }
}

/**
 * Calculate trend for a period
 */
export async function calculateTrend(period: 'day' | 'week' | 'month'): Promise<EmotionTrend | null> {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  let startTime: number;
  switch (period) {
    case 'day':
      startTime = now - msPerDay;
      break;
    case 'week':
      startTime = now - 7 * msPerDay;
      break;
    case 'month':
      startTime = now - 30 * msPerDay;
      break;
  }

  const sessions = await getSessionsInRange(startTime, now);
  if (sessions.length === 0) return null;

  // Calculate averages
  let totalBalance = 0;
  let totalStability = 0;
  const emotionCounts: Record<EmotionLabel, number> = {
    happy: 0,
    sad: 0,
    surprise: 0,
    neutral: 0,
  };

  for (const session of sessions) {
    totalBalance += session.metrics.emotionalBalance;
    totalStability += session.metrics.moodStability;

    // Count dominant emotions from samples
    for (const sample of session.emotionSamples) {
      emotionCounts[sample.dominantEmotion]++;
    }
  }

  const avgBalance = totalBalance / sessions.length;
  const avgStability = totalStability / sessions.length;

  // Find dominant emotion
  const dominantEmotion = (Object.entries(emotionCounts) as [EmotionLabel, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  // Calculate happiness change (compare first half to second half)
  const midpoint = Math.floor(sessions.length / 2);
  if (midpoint > 0) {
    const firstHalf = sessions.slice(0, midpoint);
    const secondHalf = sessions.slice(midpoint);

    const firstHappiness = firstHalf.reduce((sum, s) => {
      const happySum = s.emotionSamples.reduce((h, sample) => h + sample.scores.happy, 0);
      return sum + (s.emotionSamples.length > 0 ? happySum / s.emotionSamples.length : 0);
    }, 0) / firstHalf.length;

    const secondHappiness = secondHalf.reduce((sum, s) => {
      const happySum = s.emotionSamples.reduce((h, sample) => h + sample.scores.happy, 0);
      return sum + (s.emotionSamples.length > 0 ? happySum / s.emotionSamples.length : 0);
    }, 0) / secondHalf.length;

    const happinessChange = firstHappiness > 0
      ? ((secondHappiness - firstHappiness) / firstHappiness) * 100
      : 0;

    return {
      period,
      averageBalance: avgBalance,
      averageStability: avgStability,
      dominantEmotion,
      happinessChange,
      sessionCount: sessions.length,
    };
  }

  return {
    period,
    averageBalance: avgBalance,
    averageStability: avgStability,
    dominantEmotion,
    happinessChange: 0,
    sessionCount: sessions.length,
  };
}

/**
 * Generate trend insight message
 */
export function generateTrendInsight(trend: EmotionTrend): string {
  const periodLabel = trend.period === 'day' ? 'today' : `this ${trend.period}`;

  let insight = `Based on ${trend.sessionCount} session${trend.sessionCount > 1 ? 's' : ''} ${periodLabel}: `;

  if (Math.abs(trend.happinessChange) > 10) {
    const direction = trend.happinessChange > 0 ? 'increased' : 'decreased';
    insight += `Your happiness has ${direction} by ${Math.abs(trend.happinessChange).toFixed(0)}%. `;
  }

  if (trend.averageBalance > 0.6) {
    insight += 'Overall positive emotional patterns. ';
  } else if (trend.averageBalance < 0.4) {
    insight += 'Consider activities that bring you joy. ';
  }

  return insight.trim();
}

/**
 * Create a new session ID
 */
export function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
