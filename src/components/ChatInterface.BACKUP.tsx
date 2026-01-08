/**
 * ChatInterface Component
 *
 * Main chat interface for the empathetic AI assistant.
 * Displays messages and handles user input with streaming responses.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import type { EmpatheticMessage, EmotionContext } from '@/types/emotion';
import { EMOTION_COLORS } from '@/types/emotion';
import { streamChatCompletion, GROQ_MODELS, type GroqModel } from '@/services/groqService';
import { speak, isElevenLabsConfigured } from '@/services/elevenLabsService';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Send, Loader2, Bot, User, Settings, Sparkles, AlertCircle, Mic, MicOff, Volume2 } from 'lucide-react';

interface ChatInterfaceProps {
  /** Current emotion context for LLM injection */
  emotionContext: EmotionContext | null;
  /** Whether emotion context is enabled */
  emotionEnabled: boolean;
  /** Callback to toggle emotion context */
  onToggleEmotion: (enabled: boolean) => void;
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
  }, [inputValue, isLoading, messages, emotionContext, emotionEnabled, selectedModel]);

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
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b" style={{
        borderColor: 'var(--border)',
        background: 'rgba(26, 35, 50, 0.4)',
        backdropFilter: 'blur(12px)'
      }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
          }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Empathetic Assistant</h2>
            {emotionEnabled && emotionContext?.state && (
              <div className="flex items-center gap-2 mt-0.5">
                <Sparkles className="w-3 h-3" style={{ color: EMOTION_COLORS[emotionContext.state.current] }} />
                <span className="text-xs font-medium capitalize" style={{ color: EMOTION_COLORS[emotionContext.state.current] }}>
                  Responding to {emotionContext.state.current} state
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Emotion toggle */}
          <button
            onClick={() => onToggleEmotion(!emotionEnabled)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:scale-105 active:scale-95',
              emotionEnabled ? 'text-white' : 'hover:shadow-lg'
            )}
            style={{
              background: emotionEnabled
                ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                : 'var(--bg-card)',
              color: emotionEnabled ? 'white' : 'var(--text-secondary)'
            }}
            title={emotionEnabled ? 'Emotion context enabled' : 'Emotion context disabled'}
          >
            {emotionEnabled ? 'Emotion ON' : 'Emotion OFF'}
          </button>

          {/* Voice toggle */}
          {isElevenLabsConfigured() && (
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2.5 rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{
                background: voiceEnabled ? 'var(--secondary)' : 'var(--bg-card)',
                color: voiceEnabled ? 'white' : 'var(--text-secondary)'
              }}
              title={voiceEnabled ? 'Voice output enabled' : 'Voice output disabled'}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)'
            }}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-8 py-4 border-b animate-fade-in" style={{
          background: 'rgba(26, 35, 50, 0.3)',
          backdropFilter: 'blur(8px)',
          borderColor: 'var(--border)'
        }}>
          <div className="flex items-center gap-6">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GroqModel)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                focusRingColor: 'var(--primary)',
                focusRingOffsetColor: 'transparent'
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
              className="ml-auto text-sm font-medium transition-colors hover:scale-105"
              style={{ color: 'var(--danger)' }}
            >
              Clear Chat
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-xl" style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
            }}>
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Start a conversation
            </h3>
            <p className="text-center max-w-md leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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
                'flex gap-4 animate-fade-in',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg',
                  message.role === 'user' ? '' : ''
                )}
                style={{
                  background: message.role === 'user'
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                    : 'var(--bg-card)'
                }}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-5 py-3 shadow-md',
                  message.role === 'user' ? '' : ''
                )}
                style={{
                  background: message.role === 'user'
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                    : 'var(--bg-card)',
                  border: message.role === 'assistant' ? '1px solid var(--border)' : 'none'
                }}
              >
                {/* Emotion indicator for user messages */}
                {message.role === 'user' && message.emotionContext?.state && (
                  <div
                    className="text-xs mb-2 flex items-center gap-2 pb-2 border-b"
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="capitalize">Sent while {message.emotionContext.state.current}</span>
                  </div>
                )}

                {/* Message content */}
                <div className="whitespace-pre-wrap break-words leading-relaxed" style={{
                  color: message.role === 'user' ? 'white' : 'var(--text-primary)'
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

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border animate-fade-in" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'var(--danger)'
          }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-6 border-t" style={{
        borderColor: 'var(--border)',
        background: 'rgba(26, 35, 50, 0.4)',
        backdropFilter: 'blur(12px)'
      }}>
        <div className="flex gap-3 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Type a message or use voice..."}
            rows={1}
            className="flex-1 rounded-xl px-5 py-4 resize-none focus:outline-none focus:ring-2 transition-all shadow-md"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              focusRing: '2px solid var(--primary)'
            }}
            disabled={isLoading || isListening}
          />

          {/* Microphone button */}
          {isVoiceSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={cn(
                'p-4 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95',
                isListening ? 'animate-pulse' : ''
              )}
              style={{
                background: isListening
                  ? 'linear-gradient(135deg, var(--danger) 0%, #DC2626 100%)'
                  : 'var(--bg-card)',
                color: isListening ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${isListening ? 'transparent' : 'var(--border)'}`
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
              'p-4 rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95',
              inputValue.trim() && !isLoading ? 'text-white' : ''
            )}
            style={{
              background: inputValue.trim() && !isLoading
                ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                : 'var(--bg-card)',
              color: inputValue.trim() && !isLoading ? 'white' : 'var(--text-disabled)',
              cursor: !inputValue.trim() || isLoading ? 'not-allowed' : 'pointer',
              border: `1px solid ${inputValue.trim() && !isLoading ? 'transparent' : 'var(--border)'}`
            }}
          >
            {isLoading || isSpeaking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-center mt-3 font-mono" style={{ color: 'var(--text-tertiary)' }}>
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
