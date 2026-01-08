/**
 * ElevenLabs Text-to-Speech Service
 *
 * Provides high-quality voice synthesis for AI responses
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// ElevenLabs client instance (initialized lazily)
let elevenLabsClient: ElevenLabsClient | null = null;

/**
 * Initialize or get the ElevenLabs client
 */
function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenLabsClient) {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
      throw new Error(
        'VITE_ELEVENLABS_API_KEY environment variable is not set. Please add it to your .env file.'
      );
    }
    elevenLabsClient = new ElevenLabsClient({
      apiKey,
    });
  }
  return elevenLabsClient;
}

/**
 * Popular ElevenLabs voice IDs
 */
export const ELEVENLABS_VOICES = {
  RACHEL: '21m00Tcm4TlvDq8ikWAM', // Calm, clear female voice
  DOMI: 'AZnzlk1XvdvUeBnXmlld', // Strong, confident female voice
  BELLA: 'EXAVITQu4vr4xnSDxMaL', // Soft, gentle female voice
  ANTONI: 'ErXwobaYiN019PkySvjV', // Well-rounded male voice
  ELLI: 'MF3mGyEYCl7XYWbV9V6O', // Emotional female voice
  JOSH: 'TxGEqnHWrfWFTfGW9XjX', // Deep, resonant male voice
  ARNOLD: 'VR6AewLTigWG4xSOukaG', // Crisp male voice
  ADAM: 'pNInz6obpgDQGcFmaJgB', // Deep male voice
  SAM: 'yoZ06aMxZJJ28mfd3POQ', // Dynamic male voice
} as const;

export type ElevenLabsVoice = (typeof ELEVENLABS_VOICES)[keyof typeof ELEVENLABS_VOICES];

/**
 * Text-to-Speech options
 */
export interface TTSOptions {
  voiceId?: string;
}

/**
 * Convert text to speech and return audio blob
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Blob> {
  const client = getElevenLabsClient();

  const {
    voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || ELEVENLABS_VOICES.RACHEL,
  } = options;

  try {
    // Generate audio using ElevenLabs text-to-speech API
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: 'eleven_turbo_v2_5',
    });

    // Convert stream to array buffer
    const chunks: Uint8Array[] = [];
    const reader = audioStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks into a single Uint8Array
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to Blob
    return new Blob([combined], { type: 'audio/mpeg' });
  } catch (error) {
    console.error('[ElevenLabs] TTS error:', error);
    throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert text to speech and play immediately
 */
export async function speak(text: string, options: TTSOptions = {}): Promise<void> {
  try {
    const audioBlob = await textToSpeech(text, options);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    // Play audio
    await audio.play();

    // Clean up URL when done
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
    });
  } catch (error) {
    console.error('[ElevenLabs] Speak error:', error);
    throw error;
  }
}

/**
 * Stream text to speech (for long-form content)
 * Starts playing audio while still generating
 * Note: For now, uses the same implementation as speak()
 * Future: Can be optimized with actual streaming
 */
export async function streamSpeak(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  // For now, use the same implementation as speak
  // The ElevenLabs SDK handles optimization internally
  return speak(text, options);
}

/**
 * Check if ElevenLabs is properly configured
 */
export function isElevenLabsConfigured(): boolean {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  return Boolean(apiKey && apiKey !== 'your_elevenlabs_api_key_here');
}
