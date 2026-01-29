/**
 * Transcript Service
 *
 * Speech-to-text transcription with emotion-aligned timestamps.
 * Uses Web Speech API with optional Whisper.js integration.
 *
 * Features:
 * - Real-time transcription
 * - Emotion alignment per segment
 * - Keyword detection
 * - Speaker labeling (basic)
 */

import type { EmotionLabel } from '../types/emotion';
import type { TranscriptSegment, SessionTranscript } from '../agents/types';

// ============================================================================
// WEB SPEECH API BROWSER SUPPORT
// ============================================================================

// Web Speech API browser support - use any to avoid conflicts with lib.dom.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;

// Get the SpeechRecognition constructor from the browser
function getSpeechRecognition(): SpeechRecognitionType | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// ============================================================================
// TYPES
// ============================================================================

export interface TranscriptServiceConfig {
  /** Language for recognition */
  language: string;
  /** Enable continuous recognition */
  continuous: boolean;
  /** Enable interim results */
  interimResults: boolean;
  /** Keywords to flag */
  flagKeywords: string[];
}

export interface TranscriptCallbacks {
  /** Called when a segment is finalized */
  onSegment?: (segment: TranscriptSegment) => void;
  /** Called on interim transcript updates */
  onInterim?: (text: string) => void;
  /** Called when a flagged keyword is detected */
  onFlaggedKeyword?: (keyword: string, segment: TranscriptSegment) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

const DEFAULT_CONFIG: TranscriptServiceConfig = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  flagKeywords: [
    'kill', 'die', 'suicide', 'hurt', 'harm', 'hopeless',
    'give up', 'end it', 'no point', 'burden'
  ]
};

// ============================================================================
// TRANSCRIPT SERVICE CLASS
// ============================================================================

export class TranscriptService {
  private config: TranscriptServiceConfig;
  private callbacks: TranscriptCallbacks;
  private recognition: SpeechRecognitionType | null = null;
  private isListening: boolean = false;
  private sessionId: string = '';
  private segments: TranscriptSegment[] = [];
  private segmentIdCounter: number = 0;
  private sessionStartTime: number = 0;
  private currentEmotion: EmotionLabel = 'neutral';
  private currentEmotionConfidence: number = 0;
  private currentSpeaker: 'patient' | 'therapist' | 'unknown' = 'unknown';

  constructor(
    config: Partial<TranscriptServiceConfig> = {},
    callbacks: TranscriptCallbacks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
    this.initRecognition();
  }

  private initRecognition(): void {
    // Check for browser support
    const SpeechRecognitionConstructor = getSpeechRecognition();

    if (!SpeechRecognitionConstructor) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognitionConstructor();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;

    // Handle results
    this.recognition.onresult = (event: SpeechRecognitionType) => {
      this.handleResult(event);
    };

    // Handle errors
    this.recognition.onerror = (event: SpeechRecognitionType) => {
      console.error('Speech recognition error:', event.error);
      if (this.callbacks.onError) {
        this.callbacks.onError(new Error(event.error));
      }
    };

    // Auto-restart on end if still listening
    this.recognition.onend = () => {
      if (this.isListening) {
        try {
          this.recognition?.start();
        } catch (e) {
          // Already started
        }
      }
    };
  }

  private handleResult(event: SpeechRecognitionType): void {
    const now = Date.now();

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript.trim();

      if (result.isFinal) {
        // Create finalized segment
        const segment = this.createSegment(text, now);
        this.segments.push(segment);

        // Check for flagged keywords
        this.checkFlaggedKeywords(segment);

        // Callback
        if (this.callbacks.onSegment) {
          this.callbacks.onSegment(segment);
        }
      } else {
        // Interim result
        if (this.callbacks.onInterim) {
          this.callbacks.onInterim(text);
        }
      }
    }
  }

  private createSegment(text: string, timestamp: number): TranscriptSegment {
    const relativeTime = (timestamp - this.sessionStartTime) / 1000;

    // Detect keywords in text
    const detectedKeywords = this.detectKeywords(text);

    // Check if should be flagged
    const flaggedKeywords = detectedKeywords.filter(k =>
      this.config.flagKeywords.some(fk =>
        k.toLowerCase().includes(fk.toLowerCase())
      )
    );

    return {
      id: `seg_${++this.segmentIdCounter}`,
      text,
      startTime: relativeTime - (text.length * 0.05), // Estimate start time
      endTime: relativeTime,
      speaker: this.currentSpeaker,
      emotionAtTime: this.currentEmotion,
      emotionConfidence: this.currentEmotionConfidence,
      keywordsDetected: detectedKeywords,
      flagged: flaggedKeywords.length > 0,
      flagReason: flaggedKeywords.length > 0
        ? `Keywords detected: ${flaggedKeywords.join(', ')}`
        : undefined
    };
  }

  private detectKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    // Check for topic-related keywords
    const topicKeywords = [
      'sleep', 'tired', 'insomnia',
      'eat', 'food', 'appetite',
      'work', 'job', 'stress',
      'family', 'friend', 'relationship',
      'anxious', 'worried', 'panic',
      'sad', 'depressed', 'hopeless',
      'angry', 'frustrated', 'irritated',
      'medication', 'pills', 'prescription'
    ];

    for (const keyword of topicKeywords) {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    return keywords;
  }

  private checkFlaggedKeywords(segment: TranscriptSegment): void {
    if (segment.flagged && this.callbacks.onFlaggedKeyword) {
      for (const keyword of segment.keywordsDetected) {
        if (this.config.flagKeywords.some(fk =>
          keyword.toLowerCase().includes(fk.toLowerCase())
        )) {
          this.callbacks.onFlaggedKeyword(keyword, segment);
        }
      }
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Check if speech recognition is supported.
   */
  isSupported(): boolean {
    return getSpeechRecognition() !== null;
  }

  /**
   * Start a new transcription session.
   */
  startSession(sessionId: string): void {
    this.sessionId = sessionId;
    this.segments = [];
    this.segmentIdCounter = 0;
    this.sessionStartTime = Date.now();
    this.isListening = true;

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // Already started
      }
    }
  }

  /**
   * Stop the transcription session.
   */
  stopSession(): SessionTranscript {
    this.isListening = false;

    if (this.recognition) {
      this.recognition.stop();
    }

    return this.getTranscript();
  }

  /**
   * Pause transcription (can resume).
   */
  pause(): void {
    this.isListening = false;
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Resume transcription.
   */
  resume(): void {
    if (!this.isListening && this.recognition) {
      this.isListening = true;
      try {
        this.recognition.start();
      } catch (e) {
        // Already started
      }
    }
  }

  /**
   * Update current emotion context (for alignment).
   */
  updateEmotionContext(emotion: EmotionLabel, confidence: number): void {
    this.currentEmotion = emotion;
    this.currentEmotionConfidence = confidence;
  }

  /**
   * Set current speaker.
   */
  setSpeaker(speaker: 'patient' | 'therapist' | 'unknown'): void {
    this.currentSpeaker = speaker;
  }

  /**
   * Get the current transcript.
   */
  getTranscript(): SessionTranscript {
    const emotionTimeline = this.segments.map(s => ({
      timestamp: s.startTime,
      emotion: s.emotionAtTime || 'neutral' as EmotionLabel,
      confidence: s.emotionConfidence
    }));

    return {
      sessionId: this.sessionId,
      segments: this.segments,
      totalDuration: this.segments.length > 0
        ? this.segments[this.segments.length - 1].endTime
        : 0,
      emotionTimeline,
      isRecording: this.isListening
    };
  }

  /**
   * Get segments as formatted text.
   */
  getFormattedTranscript(): string {
    return this.segments.map(s => {
      const time = formatTime(s.startTime);
      const emotion = s.emotionAtTime ? `[${s.emotionAtTime.toUpperCase()}]` : '';
      const speaker = s.speaker !== 'unknown' ? `[${s.speaker.toUpperCase()}]` : '';
      const flag = s.flagged ? ' [!]' : '';
      return `${time} ${emotion} ${speaker} ${s.text}${flag}`;
    }).join('\n');
  }

  /**
   * Add flagged keywords to watch for.
   */
  addFlagKeywords(keywords: string[]): void {
    this.config.flagKeywords.push(...keywords);
  }

  /**
   * Check if currently listening.
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Get all segments.
   */
  getSegments(): TranscriptSegment[] {
    return this.segments;
  }

  /**
   * Get flagged segments only.
   */
  getFlaggedSegments(): TranscriptSegment[] {
    return this.segments.filter(s => s.flagged);
  }

  /**
   * Manually add a segment (for external input).
   */
  addManualSegment(
    text: string,
    speaker: 'patient' | 'therapist'
  ): TranscriptSegment {
    this.currentSpeaker = speaker;
    const segment = this.createSegment(text, Date.now());
    this.segments.push(segment);

    if (this.callbacks.onSegment) {
      this.callbacks.onSegment(segment);
    }

    this.checkFlaggedKeywords(segment);

    return segment;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format time as MM:SS.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Create a transcript service instance.
 */
export function createTranscriptService(
  config?: Partial<TranscriptServiceConfig>,
  callbacks?: TranscriptCallbacks
): TranscriptService {
  return new TranscriptService(config, callbacks);
}

