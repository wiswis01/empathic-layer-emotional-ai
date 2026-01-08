/**
 * useVoiceInput Hook
 *
 * React hook for speech-to-text using Web Speech API
 * Provides real-time voice input for the chat interface
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface UseVoiceInputOptions {
  /** Language for speech recognition (default: 'en-US') */
  lang?: string;
  /** Whether to capture interim results (default: true) */
  interimResults?: boolean;
  /** Whether to keep listening continuously (default: false) */
  continuous?: boolean;
  /** Callback when final transcript is ready */
  onTranscript?: (transcript: string) => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
}

export interface UseVoiceInputReturn {
  /** Current transcript (interim + final) */
  transcript: string;
  /** Final transcript only */
  finalTranscript: string;
  /** Interim transcript only */
  interimTranscript: string;
  /** Whether voice input is currently listening */
  isListening: boolean;
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Error message if any */
  error: string | null;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Reset transcript */
  resetTranscript: () => void;
}

/**
 * Check if Web Speech API is supported
 */
function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Hook for voice input using Web Speech API
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    lang = 'en-US',
    interimResults = true,
    continuous = false,
    onTranscript,
    onError,
  } = options;

  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = isSpeechRecognitionSupported();
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onTranscript, onError]);

  /**
   * Initialize speech recognition
   */
  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      console.log('[VoiceInput] Started listening');
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('[VoiceInput] Stopped listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;

        if (result.isFinal) {
          finalText += transcriptPart + ' ';
        } else {
          interimText += transcriptPart;
        }
      }

      if (finalText) {
        setFinalTranscript((prev) => prev + finalText);
        setInterimTranscript('');

        // Trigger callback with final transcript
        if (onTranscriptRef.current) {
          onTranscriptRef.current(finalText.trim());
        }
      } else {
        setInterimTranscript(interimText);
      }

      setTranscript(finalTranscript + finalText + interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore "aborted" errors as they're expected during cleanup
      if (event.error === 'aborted') {
        console.log('[VoiceInput] Recognition aborted (expected during cleanup)');
        return;
      }

      const errorMessage = `Speech recognition error: ${event.error}`;
      console.error('[VoiceInput]', errorMessage, event.message);
      setError(errorMessage);
      setIsListening(false);

      if (onErrorRef.current) {
        onErrorRef.current(errorMessage);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported, lang, continuous, interimResults]);

  /**
   * Start listening
   */
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    try {
      recognitionRef.current.start();
    } catch (error) {
      const errorMsg = `Failed to start speech recognition: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[VoiceInput]', errorMsg);
      setError(errorMsg);
    }
  }, [isListening]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('[VoiceInput] Failed to stop:', error);
    }
  }, [isListening]);

  /**
   * Reset transcript
   */
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    finalTranscript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

export default useVoiceInput;
