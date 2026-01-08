/**
 * Groq Service
 *
 * Handles communication with Groq's ultra-fast LLM API.
 * Integrates emotional context into prompts for empathetic responses.
 */

import Groq from 'groq-sdk';
import type { EmotionContext, EmpatheticMessage } from '@/types/emotion';
import { formatContextForPrompt } from '@/utils/emotionAnalysis';

// Groq client instance (initialized lazily)
let groqClient: Groq | null = null;

/**
 * Initialize or get the Groq client
 */
function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        'VITE_GROQ_API_KEY environment variable is not set. Please add it to your .env file.'
      );
    }
    groqClient = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for browser usage
    });
  }
  return groqClient;
}

/**
 * Available Groq models optimized for low latency
 */
export const GROQ_MODELS = {
  // Ultra-fast models
  LLAMA3_8B: 'llama3-8b-8192',
  LLAMA3_70B: 'llama3-70b-8192',
  MIXTRAL: 'mixtral-8x7b-32768',
  GEMMA_7B: 'gemma-7b-it',
  // Newer models
  LLAMA3_1_8B: 'llama-3.1-8b-instant',
  LLAMA3_1_70B: 'llama-3.1-70b-versatile',
} as const;

export type GroqModel = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];

/**
 * Configuration for chat completion
 */
export interface ChatConfig {
  model?: GroqModel;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

const DEFAULT_CONFIG: Required<ChatConfig> = {
  model: GROQ_MODELS.LLAMA3_1_8B,
  temperature: 0.7,
  maxTokens: 1024,
  stream: true,
};

/**
 * Base system prompt for empathetic AI
 */
const BASE_SYSTEM_PROMPT = `You are a warm, empathetic AI assistant. Your responses should be:

1. **Emotionally Attuned**: Adjust your tone and approach based on the user's emotional state when provided.
2. **Supportive**: Acknowledge feelings without being dismissive or overly clinical.
3. **Helpful**: Provide useful information while being sensitive to the user's current state.
4. **Natural**: Don't explicitly mention that you're analyzing emotions - just respond appropriately.
5. **Concise**: Keep responses focused and avoid overwhelming users with too much information at once.

Remember: You're here to help AND to connect on a human level.`;

/**
 * Build the complete system prompt with emotional context
 */
function buildSystemPrompt(emotionContext: EmotionContext | null): string {
  if (!emotionContext || !emotionContext.isActive) {
    return BASE_SYSTEM_PROMPT;
  }

  const contextString = formatContextForPrompt(emotionContext);
  return `${BASE_SYSTEM_PROMPT}

${contextString}`;
}

/**
 * Convert message history to Groq format
 */
function formatMessages(
  messages: EmpatheticMessage[],
  emotionContext: EmotionContext | null
): Groq.Chat.Completions.ChatCompletionMessageParam[] {
  const formattedMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: buildSystemPrompt(emotionContext),
    },
  ];

  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      formattedMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return formattedMessages;
}

/**
 * Send a chat message and get a streaming response
 */
export async function* streamChatCompletion(
  messages: EmpatheticMessage[],
  emotionContext: EmotionContext | null,
  config: ChatConfig = {}
): AsyncGenerator<string, void, unknown> {
  const client = getGroqClient();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const formattedMessages = formatMessages(messages, emotionContext);

  console.log('[GroqService] Sending request with config:', {
    model: fullConfig.model,
    messageCount: formattedMessages.length,
    hasEmotionContext: !!emotionContext?.isActive,
  });

  const startTime = performance.now();

  try {
    const stream = await client.chat.completions.create({
      model: fullConfig.model,
      messages: formattedMessages,
      temperature: fullConfig.temperature,
      max_tokens: fullConfig.maxTokens,
      stream: true,
    });

    let firstTokenTime: number | null = null;
    let totalTokens = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        if (firstTokenTime === null) {
          firstTokenTime = performance.now();
          console.log(
            `[GroqService] Time to first token: ${(firstTokenTime - startTime).toFixed(0)}ms`
          );
        }
        totalTokens++;
        yield content;
      }
    }

    const endTime = performance.now();
    console.log('[GroqService] Stream complete:', {
      totalTime: `${(endTime - startTime).toFixed(0)}ms`,
      tokensPerSecond: (totalTokens / ((endTime - startTime) / 1000)).toFixed(1),
    });
  } catch (error) {
    console.error('[GroqService] Stream error:', error);
    throw error;
  }
}

/**
 * Send a chat message and get a complete response (non-streaming)
 */
export async function getChatCompletion(
  messages: EmpatheticMessage[],
  emotionContext: EmotionContext | null,
  config: ChatConfig = {}
): Promise<string> {
  const client = getGroqClient();
  const fullConfig = { ...DEFAULT_CONFIG, ...config, stream: false };
  const formattedMessages = formatMessages(messages, emotionContext);

  console.log('[GroqService] Sending non-streaming request');
  const startTime = performance.now();

  try {
    const response = await client.chat.completions.create({
      model: fullConfig.model,
      messages: formattedMessages,
      temperature: fullConfig.temperature,
      max_tokens: fullConfig.maxTokens,
      stream: false,
    });

    const endTime = performance.now();
    console.log(`[GroqService] Response received in ${(endTime - startTime).toFixed(0)}ms`);

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('[GroqService] Request error:', error);
    throw error;
  }
}

/**
 * Test the Groq connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getGroqClient();
    await client.chat.completions.create({
      model: GROQ_MODELS.LLAMA3_1_8B,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
    });
    return true;
  } catch (error) {
    console.error('[GroqService] Connection test failed:', error);
    return false;
  }
}

/**
 * Get available models
 */
export function getAvailableModels(): { id: GroqModel; name: string; description: string }[] {
  return [
    {
      id: GROQ_MODELS.LLAMA3_1_8B,
      name: 'LLaMA 3.1 8B Instant',
      description: 'Ultra-fast, great for quick responses',
    },
    {
      id: GROQ_MODELS.LLAMA3_1_70B,
      name: 'LLaMA 3.1 70B Versatile',
      description: 'More capable, slightly slower',
    },
    {
      id: GROQ_MODELS.LLAMA3_8B,
      name: 'LLaMA 3 8B',
      description: 'Fast and efficient',
    },
    {
      id: GROQ_MODELS.LLAMA3_70B,
      name: 'LLaMA 3 70B',
      description: 'High capability model',
    },
    {
      id: GROQ_MODELS.MIXTRAL,
      name: 'Mixtral 8x7B',
      description: 'Mixture of experts model',
    },
    {
      id: GROQ_MODELS.GEMMA_7B,
      name: 'Gemma 7B',
      description: 'Google\'s efficient model',
    },
  ];
}
