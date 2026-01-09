/**
 * EmpatheticChat Component
 *
 * Main application component that integrates:
 * - Webcam feed with emotion detection
 * - Chat interface with Groq LLM
 * - Real-time emotion context injection
 * - Debug panel for monitoring
 */

import React, { useEffect, useCallback, useState } from 'react';
import { cn } from '@/utils/cn';
import { useEmotionDetector } from '@/hooks/useEmotionDetector';
import { useWebcam } from '@/hooks/useWebcam';
import WebcamFeed from './WebcamFeed';
import ChatInterface from './ChatInterface';
import DebugPanel from './DebugPanel';
import { Eye, EyeOff, Maximize2, Minimize2, Sparkles, User } from 'lucide-react';

interface EmpatheticChatProps {
  /** Additional CSS classes */
  className?: string;
}

const EmpatheticChat: React.FC<EmpatheticChatProps> = ({ className }) => {
  const [emotionEnabled, setEmotionEnabled] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [webcamExpanded, setWebcamExpanded] = useState(false);

  // Initialize hooks
  const {
    videoRef,
    isActive: isWebcamActive,
    isLoading: isWebcamLoading,
    isPermissionDenied,
    error: webcamError,
    start: startWebcam,
    stop: stopWebcam,
  } = useWebcam({
    width: 640,
    height: 480,
    frameRate: 30,
  });

  const {
    isReady: isModelReady,
    isDetecting,
    emotionContext,
    latestResult,
    metrics,
    error: detectorError,
    startDetection,
    stopDetection,
    setContextActive,
  } = useEmotionDetector({
    inferenceInterval: 30,  // Ultra-fast - 33 FPS for <50ms latency
    historySize: 1,          // Minimal history for instant response
    preferWebGPU: true,
    debug: false,            // Disable debug for production performance
  });

  /**
   * Start detection when webcam and model are ready
   */
  useEffect(() => {
    if (isWebcamActive && isModelReady && videoRef.current && !isDetecting) {
      startDetection(videoRef.current);
    }
  }, [isWebcamActive, isModelReady, videoRef, isDetecting, startDetection]);

  /**
   * Stop detection when webcam stops
   */
  useEffect(() => {
    if (!isWebcamActive && isDetecting) {
      stopDetection();
    }
  }, [isWebcamActive, isDetecting, stopDetection]);

  /**
   * Update context active state
   */
  useEffect(() => {
    setContextActive(emotionEnabled);
  }, [emotionEnabled, setContextActive]);

  /**
   * Handle webcam toggle
   */
  const handleWebcamToggle = useCallback(() => {
    if (isWebcamActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  }, [isWebcamActive, startWebcam, stopWebcam]);

  /**
   * Handle emotion toggle
   */
  const handleEmotionToggle = useCallback((enabled: boolean) => {
    setEmotionEnabled(enabled);
  }, []);

  // Combine errors
  const combinedError = webcamError || detectorError;

  return (
    <div className={cn('flex h-screen', className)}>
      {/* Artistic Left Sidebar */}
      <div className="w-24 flex flex-col items-center py-8 gap-8 border-r" style={{
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(242, 247, 242, 0.98) 100%)',
        borderColor: 'var(--border)',
        boxShadow: 'inset -1px 0 0 rgba(142, 85, 114, 0.1)'
      }}>
        {/* Artistic Logo/Brand - Custom SVG */}
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transition-all hover:shadow-xl animate-gentle-float" style={{
          background: 'linear-gradient(135deg, var(--mauve) 0%, var(--eggplant) 100%)',
          boxShadow: '0 8px 24px rgba(142, 85, 114, 0.35), 0 0 0 3px rgba(142, 85, 114, 0.15)'
        }}>
          {/* Custom Creative Smiley Logo */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="13" fill="#f2f7f2" fillOpacity="0.95"/>
            <circle cx="12" cy="13" r="2" fill="#8e5572"/>
            <circle cx="20" cy="13" r="2" fill="#8e5572"/>
            <path d="M10 19C10 19 12 23 16 23C20 23 22 19 22 19" stroke="#8e5572" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 10C8 10 10 8 13 8" stroke="#f2f7f2" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
          </svg>
        </div>

        <div className="w-12 h-px rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />

        {/* Navigation Icons */}
        <div className="flex flex-col gap-5">
          {/* Camera Toggle */}
          <button
            onClick={handleWebcamToggle}
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95',
              isWebcamActive ? 'shadow-lg' : 'shadow-sm'
            )}
            style={{
              background: isWebcamActive
                ? 'linear-gradient(135deg, var(--mauve) 0%, var(--eggplant) 100%)'
                : 'rgba(188, 170, 153, 0.15)',
              color: isWebcamActive ? 'var(--text-on-primary)' : 'var(--text-primary)',
              border: isWebcamActive ? 'none' : '1.5px solid var(--border)'
            }}
            title={isWebcamActive ? 'Stop Camera' : 'Start Camera'}
          >
            {isWebcamActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>

          {/* Debug Toggle */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95',
              showDebug ? 'shadow-lg' : 'shadow-sm'
            )}
            style={{
              background: showDebug
                ? 'linear-gradient(135deg, var(--beige) 0%, var(--mauve) 100%)'
                : 'rgba(188, 170, 153, 0.15)',
              color: showDebug ? 'white' : 'var(--text-primary)',
              border: showDebug ? 'none' : '1.5px solid var(--border)'
            }}
            title={showDebug ? 'Hide Stats' : 'Show Stats'}
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Privacy Indicator - Organic Design with decorative SVG */}
        <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{
          background: 'rgba(142, 85, 114, 0.12)',
          border: '1.5px solid rgba(142, 85, 114, 0.25)'
        }}>
          <div className="w-3 h-3 rounded-full animate-pulse-glow" style={{
            background: 'var(--mauve)',
            boxShadow: '0 0 12px rgba(142, 85, 114, 0.7)'
          }} />
          {/* Decorative lock SVG */}
          <svg className="absolute -top-1 -right-1 w-5 h-5" viewBox="0 0 20 20" fill="none">
            <rect x="6" y="9" width="8" height="7" rx="1.5" fill="#8e5572" opacity="0.8"/>
            <path d="M8 9V6C8 4.895 8.895 4 10 4C11.105 4 12 4.895 12 6V9" stroke="#8e5572" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Center - Chat Interface */}
      <div className="flex-1 flex flex-col">
        <ChatInterface
          emotionContext={emotionContext}
          emotionEnabled={emotionEnabled}
          onToggleEmotion={handleEmotionToggle}
          className="flex-1"
        />
      </div>

      {/* Right Sidebar - Webcam & Stats - Artistic & Organic */}
      <div className="w-[28rem] flex flex-col p-8 gap-8 border-l overflow-y-auto" style={{
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(242, 247, 242, 0.8) 100%)',
        borderColor: 'var(--border)',
        boxShadow: 'inset 1px 0 0 rgba(142, 85, 114, 0.08)'
      }}>
        {/* User/Session Info Card - Artistic */}
        <div className="p-6 rounded-3xl shadow-md transition-all hover:shadow-lg" style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(188, 170, 153, 0.12) 100%)',
          border: '1.5px solid var(--border)'
        }}>
          <div className="flex items-center gap-5 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md" style={{
              background: 'linear-gradient(135deg, var(--mauve) 0%, var(--eggplant) 100%)'
            }}>
              <User className="w-8 h-8" style={{ color: 'var(--text-on-mauve)' }} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Empath Session</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Live emotion tracking</p>
            </div>
          </div>

          {/* Quick Stats - Organic Grid with decorative SVGs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative p-4 rounded-2xl border overflow-hidden" style={{
              background: 'rgba(142, 85, 114, 0.08)',
              borderColor: 'rgba(142, 85, 114, 0.2)'
            }}>
              {/* Decorative pulse SVG */}
              <svg className="absolute top-2 right-2 w-4 h-4" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#8e5572" strokeWidth="1.5" fill="none" opacity="0.3"/>
                <circle cx="8" cy="8" r="2" fill="#8e5572" opacity={isWebcamActive ? "0.8" : "0.3"}/>
              </svg>
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</div>
              <div className="text-sm font-bold font-display flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                {isWebcamActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--mauve)' }}></span>
                    Active
                  </>
                ) : 'Inactive'}
              </div>
            </div>
            <div className="relative p-4 rounded-2xl border overflow-hidden" style={{
              background: 'rgba(142, 85, 114, 0.08)',
              borderColor: 'rgba(142, 85, 114, 0.2)'
            }}>
              {/* Decorative brain SVG */}
              <svg className="absolute top-2 right-2 w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M8 3C6 3 4 4.5 4 6.5C4 8 5 9 6 9.5C5 10 4 11 4 12.5C4 14 6 15 8 15C10 15 12 14 12 12.5C12 11 11 10 10 9.5C11 9 12 8 12 6.5C12 4.5 10 3 8 3Z" fill="#8e5572" opacity={emotionEnabled ? "0.6" : "0.2"}/>
              </svg>
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Emotion AI</div>
              <div className="text-sm font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                {emotionEnabled ? 'Enabled' : 'Off'}
              </div>
            </div>
          </div>
        </div>

        {/* Webcam Feed Card - Artistic Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Emotion Detection
            </h2>
            {isWebcamActive && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
                background: 'rgba(142, 85, 114, 0.15)',
                border: '1px solid rgba(142, 85, 114, 0.3)'
              }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--mauve)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--mauve)' }}>Live</span>
              </div>
            )}
          </div>

          <WebcamFeed
            ref={videoRef}
            isActive={isWebcamActive}
            isPermissionDenied={isPermissionDenied}
            isLoading={isWebcamLoading}
            error={webcamError}
            onStart={startWebcam}
            onStop={stopWebcam}
            latestResult={latestResult}
            showOverlay={true}
            mirrored={true}
            className="h-72 shadow-lg"
          />
        </div>

        {/* Debug/Stats Panel */}
        {showDebug && (
          <DebugPanel
            metrics={metrics}
            emotionContext={emotionContext}
            isDetecting={isDetecting}
            isModelReady={isModelReady}
            error={combinedError}
            className="flex-shrink-0"
          />
        )}

        {/* Privacy Notice Card - Organic & Soft */}
        <div className="p-5 rounded-2xl shadow-sm" style={{
          background: 'linear-gradient(135deg, rgba(142, 85, 114, 0.1) 0%, rgba(188, 170, 153, 0.08) 100%)',
          border: '1.5px solid rgba(142, 85, 114, 0.2)'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse-glow" style={{
              background: 'var(--mauve)',
              boxShadow: '0 0 10px rgba(142, 85, 114, 0.6)'
            }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--mauve)' }}>
              Privacy Protected
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            All emotion processing happens locally in your browser. Video data never leaves your device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmpatheticChat;
