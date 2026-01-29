/**
 * Risk Detector Tool
 *
 * Real-time crisis and risk assessment combining:
 * - Keyword detection in transcripts
 * - Emotion trajectory analysis
 * - Behavioral pattern recognition
 *
 * CRITICAL: This tool provides ASSISTANCE to trained professionals.
 * It is NOT a substitute for clinical judgment.
 */

import type { EmotionDetectionResult } from '../../types/emotion';
import { RiskLevel } from '../types';
import type { RiskIndicator, RiskAssessment } from '../types';

// ============================================================================
// CRISIS KEYWORDS - Configurable
// ============================================================================

/**
 * Keywords that indicate potential crisis states.
 * Organized by severity and type.
 */
export const CRISIS_KEYWORDS = {
  suicidalIdeation: {
    high: [
      'kill myself',
      'end my life',
      'want to die',
      'better off dead',
      'no reason to live',
      'suicide',
      'suicidal',
      'end it all',
      "can't go on",
      'not worth living'
    ],
    moderate: [
      'what\'s the point',
      'give up',
      'disappear',
      'no hope',
      'burden to everyone',
      'everyone would be better',
      'tired of living',
      'don\'t want to be here'
    ]
  },
  selfHarm: {
    high: [
      'cut myself',
      'hurt myself',
      'self harm',
      'self-harm',
      'burning myself',
      'hitting myself'
    ],
    moderate: [
      'deserve pain',
      'punish myself',
      'feel numb',
      'need to feel something'
    ]
  },
  severeDistress: {
    high: [
      "can't breathe",
      "can't take it",
      'breaking down',
      'losing my mind',
      "can't handle this",
      'panic attack'
    ],
    moderate: [
      'overwhelmed',
      'falling apart',
      'losing control',
      "can't cope",
      'too much'
    ]
  },
  dissociation: {
    high: [
      "don't feel real",
      'not in my body',
      'watching myself',
      'disconnected from reality'
    ],
    moderate: [
      'zoned out',
      'not really here',
      'foggy',
      'detached'
    ]
  }
};

/**
 * Protective factors that may reduce risk level.
 */
export const PROTECTIVE_KEYWORDS = [
  'want help',
  'getting better',
  'support',
  'family',
  'friends',
  'therapist',
  'medication',
  'coping',
  'hope',
  'future',
  'goals',
  'reasons to live',
  'my kids',
  'my partner',
  'my pet'
];

// ============================================================================
// RISK DETECTOR CLASS
// ============================================================================

export interface RiskDetectorConfig {
  /** Sensitivity 0-1 (higher = more sensitive, more alerts) */
  sensitivity: number;
  /** Minimum emotion history for trajectory analysis */
  minHistoryLength: number;
  /** Time window for trend analysis (ms) */
  trendWindow: number;
  /** Custom keywords to add */
  customKeywords: string[];
}

const DEFAULT_CONFIG: RiskDetectorConfig = {
  sensitivity: 0.7,
  minHistoryLength: 10,
  trendWindow: 60000, // 1 minute
  customKeywords: []
};

export class RiskDetector {
  private config: RiskDetectorConfig;
  private recentIndicators: RiskIndicator[] = [];
  private lastAssessment: RiskAssessment | null = null;

  constructor(config: Partial<RiskDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main assessment method - combines all risk signals.
   */
  assessRisk(
    emotionHistory: EmotionDetectionResult[],
    transcriptContext?: string
  ): RiskAssessment {
    const indicators: RiskIndicator[] = [];
    const now = Date.now();

    // 1. Check transcript for crisis keywords
    if (transcriptContext) {
      const keywordIndicators = this.checkCrisisKeywords(transcriptContext);
      indicators.push(...keywordIndicators);
    }

    // 2. Analyze emotion trajectory
    const trajectoryRisk = this.analyzeEmotionTrajectory(emotionHistory);
    if (trajectoryRisk.level !== RiskLevel.LOW) {
      indicators.push({
        type: 'severe_distress',
        confidence: this.riskLevelToScore(trajectoryRisk.level),
        triggers: [`Emotion trajectory: ${trajectoryRisk.description}`],
        recommendedAction: trajectoryRisk.action,
        timestamp: now
      });
    }

    // 3. Check for crisis emotional patterns
    const emotionIndicators = this.checkEmotionPatterns(emotionHistory);
    indicators.push(...emotionIndicators);

    // Store recent indicators
    this.recentIndicators = indicators;

    // Calculate overall risk
    const assessment = this.calculateOverallRisk(indicators, emotionHistory);
    this.lastAssessment = assessment;

    return assessment;
  }

  /**
   * Check text for crisis keywords.
   */
  checkCrisisKeywords(text: string): RiskIndicator[] {
    const indicators: RiskIndicator[] = [];
    const lowerText = text.toLowerCase();
    const now = Date.now();

    // Check suicidal ideation
    const suicidalHigh = CRISIS_KEYWORDS.suicidalIdeation.high.filter(k =>
      lowerText.includes(k)
    );
    const suicidalMod = CRISIS_KEYWORDS.suicidalIdeation.moderate.filter(k =>
      lowerText.includes(k)
    );

    if (suicidalHigh.length > 0) {
      indicators.push({
        type: 'suicidal_ideation',
        confidence: 0.9 * this.config.sensitivity,
        triggers: suicidalHigh,
        recommendedAction: 'IMMEDIATE: Conduct safety assessment. Ask directly about suicidal thoughts and plans.',
        timestamp: now
      });
    } else if (suicidalMod.length > 0) {
      indicators.push({
        type: 'suicidal_ideation',
        confidence: 0.6 * this.config.sensitivity,
        triggers: suicidalMod,
        recommendedAction: 'Explore hopelessness. Gently assess for suicidal ideation.',
        timestamp: now
      });
    }

    // Check self-harm
    const selfHarmHigh = CRISIS_KEYWORDS.selfHarm.high.filter(k =>
      lowerText.includes(k)
    );
    const selfHarmMod = CRISIS_KEYWORDS.selfHarm.moderate.filter(k =>
      lowerText.includes(k)
    );

    if (selfHarmHigh.length > 0) {
      indicators.push({
        type: 'self_harm',
        confidence: 0.85 * this.config.sensitivity,
        triggers: selfHarmHigh,
        recommendedAction: 'Assess self-harm behaviors. Review safety plan and coping strategies.',
        timestamp: now
      });
    } else if (selfHarmMod.length > 0) {
      indicators.push({
        type: 'self_harm',
        confidence: 0.5 * this.config.sensitivity,
        triggers: selfHarmMod,
        recommendedAction: 'Explore feelings of self-punishment or numbness.',
        timestamp: now
      });
    }

    // Check severe distress
    const distressHigh = CRISIS_KEYWORDS.severeDistress.high.filter(k =>
      lowerText.includes(k)
    );
    const distressMod = CRISIS_KEYWORDS.severeDistress.moderate.filter(k =>
      lowerText.includes(k)
    );

    if (distressHigh.length > 0) {
      indicators.push({
        type: 'severe_distress',
        confidence: 0.8 * this.config.sensitivity,
        triggers: distressHigh,
        recommendedAction: 'Ground the patient. Use calming techniques. Assess immediate safety.',
        timestamp: now
      });
    } else if (distressMod.length > 0) {
      indicators.push({
        type: 'severe_distress',
        confidence: 0.5 * this.config.sensitivity,
        triggers: distressMod,
        recommendedAction: 'Acknowledge distress. Explore coping resources.',
        timestamp: now
      });
    }

    // Check dissociation
    const dissociationHigh = CRISIS_KEYWORDS.dissociation.high.filter(k =>
      lowerText.includes(k)
    );
    const dissociationMod = CRISIS_KEYWORDS.dissociation.moderate.filter(k =>
      lowerText.includes(k)
    );

    if (dissociationHigh.length > 0 || dissociationMod.length > 0) {
      indicators.push({
        type: 'dissociation',
        confidence: dissociationHigh.length > 0 ? 0.75 : 0.45 * this.config.sensitivity,
        triggers: [...dissociationHigh, ...dissociationMod],
        recommendedAction: 'Use grounding techniques. Assess trauma history if appropriate.',
        timestamp: now
      });
    }

    // Check for protective factors (may reduce severity)
    const protectiveFactors = PROTECTIVE_KEYWORDS.filter(k =>
      lowerText.includes(k)
    );

    // Adjust confidence based on protective factors
    if (protectiveFactors.length > 0) {
      indicators.forEach(ind => {
        ind.confidence *= (1 - (protectiveFactors.length * 0.05));
      });
    }

    // Add custom keywords
    const customMatches = this.config.customKeywords.filter(k =>
      lowerText.includes(k.toLowerCase())
    );
    if (customMatches.length > 0) {
      indicators.push({
        type: 'crisis',
        confidence: 0.6 * this.config.sensitivity,
        triggers: customMatches,
        recommendedAction: 'Custom crisis keyword detected. Assess context.',
        timestamp: now
      });
    }

    return indicators;
  }

  /**
   * Analyze emotion trajectory for risk signals.
   */
  analyzeEmotionTrajectory(
    history: EmotionDetectionResult[]
  ): { level: RiskLevel; description: string; action: string } {
    if (history.length < this.config.minHistoryLength) {
      return {
        level: RiskLevel.LOW,
        description: 'Insufficient data',
        action: 'Continue monitoring'
      };
    }

    const recent = history.slice(-20);
    const emotions = recent.map(h => h.dominantEmotion);

    // Calculate sadness persistence
    const sadCount = emotions.filter(e => e === 'sad').length;
    const sadRatio = sadCount / emotions.length;

    // Calculate high-confidence sadness
    const highConfidenceSad = recent.filter(
      h => h.dominantEmotion === 'sad' && h.confidence > 0.75
    ).length;

    // Calculate emotional volatility
    let shifts = 0;
    for (let i = 1; i < emotions.length; i++) {
      if (emotions[i] !== emotions[i - 1]) shifts++;
    }
    const volatility = shifts / (emotions.length - 1);

    // Calculate trend (getting worse?)
    const firstHalf = emotions.slice(0, Math.floor(emotions.length / 2));
    const secondHalf = emotions.slice(Math.floor(emotions.length / 2));
    const firstSadRatio = firstHalf.filter(e => e === 'sad').length / firstHalf.length;
    const secondSadRatio = secondHalf.filter(e => e === 'sad').length / secondHalf.length;
    const worseningTrend = secondSadRatio > firstSadRatio + 0.2;

    // Determine risk level
    if (highConfidenceSad >= 15 && worseningTrend) {
      return {
        level: RiskLevel.HIGH,
        description: 'Persistent high-intensity sadness with worsening trend',
        action: 'Priority safety assessment. Explore hopelessness and suicidal ideation.'
      };
    }

    if (sadRatio > 0.7 && volatility < 0.2) {
      return {
        level: RiskLevel.MODERATE,
        description: 'Sustained depressed affect with flat trajectory',
        action: 'Assess current mood episode. Review support systems.'
      };
    }

    if (volatility > 0.7) {
      return {
        level: RiskLevel.MODERATE,
        description: 'High emotional volatility detected',
        action: 'Ground the patient. Assess for crisis or dissociation.'
      };
    }

    if (sadRatio > 0.5) {
      return {
        level: RiskLevel.LOW,
        description: 'Elevated sadness present',
        action: 'Continue empathic exploration of current concerns.'
      };
    }

    return {
      level: RiskLevel.LOW,
      description: 'No concerning trajectory patterns',
      action: 'Continue session normally'
    };
  }

  /**
   * Check emotion patterns for acute risk signals.
   */
  private checkEmotionPatterns(history: EmotionDetectionResult[]): RiskIndicator[] {
    const indicators: RiskIndicator[] = [];
    const now = Date.now();

    if (history.length < 5) return indicators;

    const recent = history.slice(-10);

    // Check for sudden emotional shutdown (dissociation indicator)
    const avgConfidence = recent.reduce((sum, h) => sum + h.confidence, 0) / recent.length;
    if (avgConfidence < 0.3) {
      indicators.push({
        type: 'dissociation',
        confidence: 0.6 * this.config.sensitivity,
        triggers: ['Low emotional expression detected', 'Possible emotional shutdown'],
        recommendedAction: 'Check in with patient. Use grounding if needed.',
        timestamp: now
      });
    }

    // Check for sudden sadness spike
    const recentThree = recent.slice(-3);
    const allSadHighConf = recentThree.every(
      h => h.dominantEmotion === 'sad' && h.confidence > 0.8
    );
    if (allSadHighConf) {
      indicators.push({
        type: 'severe_distress',
        confidence: 0.7 * this.config.sensitivity,
        triggers: ['Acute sadness spike detected'],
        recommendedAction: 'Acknowledge distress. Pause to process what just came up.',
        timestamp: now
      });
    }

    return indicators;
  }

  /**
   * Calculate overall risk assessment from indicators.
   */
  private calculateOverallRisk(
    indicators: RiskIndicator[],
    history: EmotionDetectionResult[]
  ): RiskAssessment {
    const now = Date.now();

    if (indicators.length === 0) {
      return {
        level: RiskLevel.LOW,
        indicators: [],
        score: 0,
        emotionTrajectory: this.determineTrajectory(history),
        lastAssessed: now,
        immediateActions: []
      };
    }

    // Calculate weighted score
    const typeWeights: Record<RiskIndicator['type'], number> = {
      suicidal_ideation: 1.0,
      self_harm: 0.9,
      crisis: 0.85,
      severe_distress: 0.7,
      dissociation: 0.6
    };

    let totalScore = 0;
    let maxScore = 0;

    for (const indicator of indicators) {
      const weight = typeWeights[indicator.type];
      const weighted = indicator.confidence * weight;
      totalScore += weighted;
      maxScore = Math.max(maxScore, weighted);
    }

    // Normalize score (use max as primary, total as modifier)
    const score = Math.min(1, maxScore * 0.7 + (totalScore / indicators.length) * 0.3);

    // Determine level
    let level: RiskLevel;
    if (score >= 0.8 || indicators.some(i => i.type === 'suicidal_ideation' && i.confidence > 0.7)) {
      level = RiskLevel.CRISIS;
    } else if (score >= 0.6) {
      level = RiskLevel.HIGH;
    } else if (score >= 0.4) {
      level = RiskLevel.MODERATE;
    } else {
      level = RiskLevel.LOW;
    }

    // Collect immediate actions (deduplicated)
    const actions = [...new Set(indicators.map(i => i.recommendedAction))];

    return {
      level,
      indicators,
      score,
      emotionTrajectory: this.determineTrajectory(history),
      lastAssessed: now,
      immediateActions: actions.slice(0, 3) // Top 3 actions
    };
  }

  /**
   * Determine overall emotion trajectory trend.
   */
  private determineTrajectory(
    history: EmotionDetectionResult[]
  ): 'improving' | 'stable' | 'declining' | 'volatile' {
    if (history.length < 10) return 'stable';

    const recent = history.slice(-20);
    const emotions = recent.map(h => h.dominantEmotion);

    // Calculate volatility
    let shifts = 0;
    for (let i = 1; i < emotions.length; i++) {
      if (emotions[i] !== emotions[i - 1]) shifts++;
    }
    const volatility = shifts / (emotions.length - 1);

    if (volatility > 0.6) return 'volatile';

    // Calculate trend in positive emotions
    const firstHalf = emotions.slice(0, Math.floor(emotions.length / 2));
    const secondHalf = emotions.slice(Math.floor(emotions.length / 2));

    const firstPositive = firstHalf.filter(e => e === 'happy').length / firstHalf.length;
    const secondPositive = secondHalf.filter(e => e === 'happy').length / secondHalf.length;

    if (secondPositive > firstPositive + 0.15) return 'improving';
    if (secondPositive < firstPositive - 0.15) return 'declining';

    return 'stable';
  }

  /**
   * Convert risk level to numeric score.
   */
  private riskLevelToScore(level: RiskLevel): number {
    switch (level) {
      case RiskLevel.CRISIS: return 1.0;
      case RiskLevel.HIGH: return 0.75;
      case RiskLevel.MODERATE: return 0.5;
      case RiskLevel.LOW: return 0.25;
    }
  }

  /**
   * Get the last assessment result.
   */
  getLastAssessment(): RiskAssessment | null {
    return this.lastAssessment;
  }

  /**
   * Get recent risk indicators.
   */
  getRecentIndicators(): RiskIndicator[] {
    return this.recentIndicators;
  }

  /**
   * Update sensitivity at runtime.
   */
  setSensitivity(sensitivity: number): void {
    this.config.sensitivity = Math.max(0, Math.min(1, sensitivity));
  }

  /**
   * Add custom crisis keywords.
   */
  addCustomKeywords(keywords: string[]): void {
    this.config.customKeywords.push(...keywords);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick check if text contains any high-priority crisis keywords.
 */
export function containsCrisisKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  const allHighPriority = [
    ...CRISIS_KEYWORDS.suicidalIdeation.high,
    ...CRISIS_KEYWORDS.selfHarm.high,
    ...CRISIS_KEYWORDS.severeDistress.high
  ];

  return allHighPriority.some(keyword => lowerText.includes(keyword));
}

/**
 * Get risk level color for UI.
 */
export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case RiskLevel.CRISIS: return '#dc2626'; // Red
    case RiskLevel.HIGH: return '#ea580c';   // Orange
    case RiskLevel.MODERATE: return '#ca8a04'; // Yellow
    case RiskLevel.LOW: return '#65a30d';    // Green
  }
}

/**
 * Get risk level display text.
 */
export function getRiskLevelText(level: RiskLevel): string {
  switch (level) {
    case RiskLevel.CRISIS: return 'CRISIS';
    case RiskLevel.HIGH: return 'High Risk';
    case RiskLevel.MODERATE: return 'Moderate';
    case RiskLevel.LOW: return 'Low Risk';
  }
}
