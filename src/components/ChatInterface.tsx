/**
 * ChatInterface Component - ARTISTIC REDESIGN
 * Palette:mauve #8e5572, beige #bcaa99, eggplant #443850, mint #f2f7f2
 *
 * Main chat interface for the empathetic AI assistant.
 * Displays messages and handles user input with streaming responses.
 *
 * REDESIGNED with organic 5-color palette and artistic typography
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import type { EmpatheticMessage, EmotionContext } from '@/types/emotion';
import { EMOTION_COLORS } from '@/types/emotion';
import { streamChatCompletion, GROQ_MODELS, type GroqModel } from '@/services/groqService';
import { speak, isElevenLabsConfigured } from '@/services/elevenLabsService';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Send, Loader2, Bot, User, Settings, Sparkles, AlertCircle, Mic, MicOff, Volume2 } from 'lucide-react';

interface UserData {
  name: string;
  feeling: number;
  thoughts: string;
  wellness: string;
  positive: string;
}

interface ChatInterfaceProps {
  /** Current emotion context for LLM injection */
  emotionContext: EmotionContext | null;
  /** Whether emotion context is enabled */
  emotionEnabled: boolean;
  /** Callback to toggle emotion context */
  onToggleEmotion: (enabled: boolean) => void;
  /** User's name for personalization */
  userName?: string | null;
  /** Complete user data from onboarding */
  userData?: UserData | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Generate a unique message ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  emotionContext,
  emotionEnabled,
  onToggleEmotion,
  userName: _userName,
  userData: _userData,
  className,
}) => {
  const [messages, setMessages] = useState<EmpatheticMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<GroqModel>(GROQ_MODELS.LLAMA3_1_8B);
  const [showSettings, setShowSettings] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(isElevenLabsConfigured());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Voice input hook
  const {
    isListening,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
  } = useVoiceInput({
    onTranscript: (transcript) => {
      setInputValue((prev) => prev + ' ' + transcript);
      stopListening();
    },
  });

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    // Clear input and error
    setInputValue('');
    setError(null);

    // Create user message
    const userMessage: EmpatheticMessage = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
      emotionContext: emotionContext || undefined,
    };

    // Add user message to state
    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for assistant message
    const assistantMessageId = generateId();
    const assistantMessage: EmpatheticMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Start loading
    setIsLoading(true);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Get all messages for context
      const allMessages = [...messages, userMessage];

      // Stream the response
      const stream = streamChatCompletion(
        allMessages,
        emotionEnabled ? emotionContext : null,
        { model: selectedModel }
      );

      let fullContent = '';

      for await (const chunk of stream) {
        fullContent += chunk;
        // Update assistant message with new content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
          )
        );
      }

      // Mark as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: fullContent, timestamp: Date.now() }
            : msg
        )
      );

      // Auto-speak the response if voice is enabled
      if (voiceEnabled && fullContent && isElevenLabsConfigured()) {
        try {
          setIsSpeaking(true);
          await speak(fullContent);
        } catch (speakError) {
          console.error('[Chat] Speech error:', speakError);
        } finally {
          setIsSpeaking(false);
        }
      }
    } catch (e) {
      console.error('[Chat] Error:', e);

      // Check if it's an API key error
      if (e instanceof Error && e.message.includes('VITE_GROQ_API_KEY')) {
        setError('Please set your VITE_GROQ_API_KEY in the .env file');
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unexpected error occurred');
      }

      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, messages, emotionContext, emotionEnabled, selectedModel, voiceEnabled]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  /**
   * Clear chat history
   */
  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)} style={{ background: 'transparent' }}>
      {/* Header - Artistic & Organic */}
      <div className="flex items-center justify-between px-10 py-6 border-b" style={{
        borderColor: 'var(--border)',
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(242, 247, 242, 0.7) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 1px 0 rgba(187, 190, 100, 0.08)'
      }}>
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{
            background: 'linear-gradient(135deg, var(--olive) 0%, var(--mauve) 100%)'
          }}>
            <Bot className="w-6 h-6" style={{ color: 'var(--text-on-primary)' }} />
          </div>
          <div>
            <h2 className="font-display font-semibold text-xl" style={{ color: 'var(--text-primary)' }}>Empathetic Assistant</h2>
            {emotionEnabled && emotionContext?.state && (
              <div className="flex items-center gap-2 mt-1">
                <Sparkles className="w-3.5 h-3.5" style={{ color: EMOTION_COLORS[emotionContext.state.current] }} />
                <span className="text-xs font-semibold capitalize tracking-wide" style={{ color: EMOTION_COLORS[emotionContext.state.current] }}>
                  Responding to {emotionContext.state.current} state
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Emotion toggle */}
          <button
            onClick={() => onToggleEmotion(!emotionEnabled)}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:scale-105 active:scale-95',
              emotionEnabled ? '' : 'hover:shadow-md'
            )}
            style={{
              background: emotionEnabled
                ? 'linear-gradient(135deg, var(--olive) 0%, var(--mauve) 100%)'
                : 'rgba(188, 170, 153, 0.15)',
              color: emotionEnabled ? 'var(--text-on-primary)' : 'var(--text-primary)',
              border: emotionEnabled ? 'none' : '1.5px solid var(--border)'
            }}
            title={emotionEnabled ? 'Emotion context enabled' : 'Emotion context disabled'}
          >
            {emotionEnabled ? 'Emotion ON' : 'Emotion OFF'}
          </button>

          {/* Voice toggle */}
          {isElevenLabsConfigured() && (
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm"
              style={{
                background: voiceEnabled
                  ? 'linear-gradient(135deg, var(--beige) 0%, var(--olive) 100%)'
                  : 'rgba(188, 170, 153, 0.15)',
                color: voiceEnabled ? 'var(--eggplant)' : 'var(--text-primary)',
                border: voiceEnabled ? 'none' : '1.5px solid var(--border)'
              }}
              title={voiceEnabled ? 'Voice output enabled' : 'Voice output disabled'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm"
            style={{
              background: 'rgba(188, 170, 153, 0.15)',
              color: 'var(--text-primary)',
              border: '1.5px solid var(--border)'
            }}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-10 py-5 border-b animate-fade-in" style={{
          background: 'rgba(242, 247, 242, 0.6)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--border)'
        }}>
          <div className="flex items-center gap-8">
            <label className="text-sm font-semibold font-display" style={{ color: 'var(--text-primary)' }}>Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GroqModel)}
              className="rounded-xl px-5 py-2.5 text-sm font-medium transition-all focus:outline-none shadow-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                color: 'var(--text-primary)',
                border: '1.5px solid var(--border)'
              }}
            >
              <option value={GROQ_MODELS.LLAMA3_1_8B}>LLaMA 3.1 8B (Fastest)</option>
              <option value={GROQ_MODELS.LLAMA3_1_70B}>LLaMA 3.1 70B (Best)</option>
              <option value={GROQ_MODELS.LLAMA3_8B}>LLaMA 3 8B</option>
              <option value={GROQ_MODELS.LLAMA3_70B}>LLaMA 3 70B</option>
              <option value={GROQ_MODELS.MIXTRAL}>Mixtral 8x7B</option>
            </select>

            <button
              onClick={handleClear}
              className="ml-auto text-sm font-semibold transition-all hover:scale-105"
              style={{ color: 'var(--mauve)' }}
            >
              Clear Chat
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-10 space-y-8">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-xl animate-gentle-float" style={{
              background: 'linear-gradient(135deg, var(--olive) 0%, var(--mauve) 100%)',
              boxShadow: '0 12px 32px rgba(142, 85, 114, 0.25)'
            }}>
              <Bot className="w-12 h-12" style={{ color: 'var(--text-on-primary)' }} />
            </div>
            <h3 className="font-display text-3xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Start a conversation
            </h3>
            <p className="text-center max-w-lg leading-relaxed text-base" style={{ color: 'var(--text-secondary)' }}>
              {emotionEnabled
                ? 'Your emotional state is being detected and will be used to provide more empathetic, contextual responses.'
                : 'Enable emotion detection in the sidebar to receive empathetic responses based on your emotional state.'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-5 animate-fade-in',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              {/* Avatar - Artistic & Organic */}
              <div
                className={cn(
                  'flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-md',
                  message.role === 'user' ? '' : ''
                )}
                style={{
                  background: message.role === 'user'
                    ? 'linear-gradient(135deg, var(--mauve) 0%, var(--eggplant) 100%)'
                    : 'rgba(188, 170, 153, 0.25)',
                  border: message.role === 'assistant' ? '1.5px solid var(--border)' : 'none'
                }}
              >
                {message.role === 'user' ? (
                  <User className="w-6 h-6" style={{ color: 'var(--text-on-mauve)' }} />
                ) : (
                  <Bot className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
                )}
              </div>

              {/* Message bubble - Organic styling */}
              <div
                className={cn(
                  'max-w-[70%] rounded-3xl px-6 py-4 shadow-sm',
                  message.role === 'user' ? '' : ''
                )}
                style={{
                  background: message.role === 'user'
                    ? 'linear-gradient(135deg, var(--olive) 0%, var(--mauve) 100%)'
                    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(242, 247, 242, 0.9) 100%)',
                  border: message.role === 'assistant' ? '1.5px solid var(--border)' : 'none'
                }}
              >
                {/* Emotion indicator for user messages */}
                {message.role === 'user' && message.emotionContext?.state && (
                  <div
                    className="text-xs mb-3 flex items-center gap-2 pb-3 border-b"
                    style={{
                      color: 'rgba(255, 255, 255, 0.85)',
                      borderColor: 'rgba(255, 255, 255, 0.25)'
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="capitalize font-semibold">Sent while {message.emotionContext.state.current}</span>
                  </div>
                )}

                {/* Message content */}
                <div className="whitespace-pre-wrap break-words leading-relaxed" style={{
                  color: message.role === 'user' ? 'var(--text-on-primary)' : 'var(--text-primary)',
                  fontSize: '0.9375rem'
                }}>
                  {message.content || (
                    <span className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Thinking...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Error message - Organic styling */}
        {error && (
          <div className="flex items-center gap-4 p-5 rounded-2xl border-2 animate-fade-in shadow-sm" style={{
            background: 'rgba(142, 85, 114, 0.08)',
            borderColor: 'var(--mauve)'
          }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--mauve)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--mauve)' }}>{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Artistic & Organic */}
      <div className="p-8 border-t" style={{
        borderColor: 'var(--border)',
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(242, 247, 242, 0.7) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -1px 0 rgba(187, 190, 100, 0.08)'
      }}>
        <div className="flex gap-4 max-w-5xl mx-auto">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Type a message or use voice..."}
            rows={1}
            className="flex-1 rounded-2xl px-6 py-4 resize-none focus:outline-none transition-all shadow-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              color: 'var(--text-primary)',
              border: '1.5px solid var(--border)',
              fontSize: '0.9375rem'
            }}
            disabled={isLoading || isListening}
          />

          {/* Microphone button */}
          {isVoiceSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={cn(
                'p-4 rounded-2xl transition-all shadow-sm hover:scale-105 active:scale-95',
                isListening ? 'animate-pulse' : ''
              )}
              style={{
                background: isListening
                  ? 'linear-gradient(135deg, var(--mauve) 0%, var(--eggplant) 100%)'
                  : 'rgba(188, 170, 153, 0.2)',
                color: isListening ? 'var(--text-on-mauve)' : 'var(--text-primary)',
                border: `1.5px solid ${isListening ? 'transparent' : 'var(--border)'}`
              }}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              'p-4 rounded-2xl transition-all shadow-md hover:scale-105 active:scale-95',
              inputValue.trim() && !isLoading ? '' : ''
            )}
            style={{
              background: inputValue.trim() && !isLoading
                ? 'linear-gradient(135deg, var(--olive) 0%, var(--mauve) 100%)'
                : 'rgba(188, 170, 153, 0.2)',
              color: inputValue.trim() && !isLoading ? 'var(--text-on-primary)' : 'var(--text-disabled)',
              cursor: !inputValue.trim() || isLoading ? 'not-allowed' : 'pointer',
              border: `1.5px solid ${inputValue.trim() && !isLoading ? 'transparent' : 'var(--border)'}`
            }}
          >
            {isLoading || isSpeaking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-center mt-4 font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {isListening
            ? 'Listening... Click the mic to stop'
            : isVoiceSupported
              ? 'Press Enter to send • Shift+Enter for new line • Use voice input'
              : 'Press Enter to send • Shift+Enter for new line'
          }
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
