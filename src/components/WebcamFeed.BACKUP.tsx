/**
 * WebcamFeed Component
 *
 * Displays the webcam feed with emotion detection overlay.
 * Shows the detected emotion and confidence in real-time.
 */

import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import type { EmotionDetectionResult, EmotionLabel } from '@/types/emotion';
import { EMOTION_COLORS } from '@/types/emotion';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface WebcamFeedProps {
  /** Whether the webcam is active */
  isActive: boolean;
  /** Whether permission was denied */
  isPermissionDenied: boolean;
  /** Whether we're loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Callback to start webcam */
  onStart: () => void;
  /** Callback to stop webcam */
  onStop: () => void;
  /** Latest emotion detection result */
  latestResult: EmotionDetectionResult | null;
  /** Whether to show the emotion overlay */
  showOverlay?: boolean;
  /** Whether to mirror the video */
  mirrored?: boolean;
  /** Additional CSS classes */
  className?: string;
}


const WebcamFeed = forwardRef<HTMLVideoElement, WebcamFeedProps>(
  (
    {
      isActive,
      isPermissionDenied,
      isLoading,
      error,
      onStart,
      onStop,
      latestResult,
      showOverlay = true,
      mirrored = true,
      className,
    },
    ref
  ) => {
    // Get the dominant emotion color for the border
    const emotionColor = latestResult
      ? EMOTION_COLORS[latestResult.dominantEmotion]
      : 'transparent';

    return (
      <div className={cn('relative rounded-2xl overflow-hidden shadow-2xl', className)} style={{
        background: 'var(--bg-card)',
        border: '2px solid var(--border)'
      }}>
        {/* Video element */}
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            mirrored && 'scale-x-[-1]',
            !isActive && 'hidden'
          )}
        />

        {/* Emotion border glow */}
        {isActive && latestResult && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-500"
            style={{
              boxShadow: `inset 0 0 40px ${emotionColor}50, 0 0 60px ${emotionColor}40`,
              borderRadius: 'inherit',
            }}
          />
        )}

        {/* Emotion overlay */}
        {isActive && showOverlay && latestResult && (
          <div className="absolute bottom-0 left-0 right-0 p-4 backdrop-blur-md" style={{
            background: 'linear-gradient(to top, rgba(92, 55, 76, 0.95) 0%, rgba(92, 55, 76, 0.7) 60%, transparent 100%)'
          }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full animate-pulse-glow shadow-lg"
                  style={{
                    backgroundColor: emotionColor,
                    boxShadow: `0 0 12px ${emotionColor}`
                  }}
                />
                <span className="font-semibold text-base capitalize tracking-wide" style={{
                  color: 'var(--text-primary)'
                }}>
                  {latestResult.dominantEmotion}
                </span>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-mono font-semibold" style={{
                background: 'rgba(250, 162, 117, 0.2)',
                color: 'var(--text-primary)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(250, 162, 117, 0.3)'
              }}>
                {(latestResult.confidence * 100).toFixed(0)}%
              </div>
            </div>

            {/* Emotion bars */}
            <div className="grid grid-cols-7 gap-2">
              {(Object.entries(latestResult.scores) as [EmotionLabel, number][]).map(
                ([emotion, score]) => (
                  <div key={emotion} className="flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-full h-1.5 overflow-hidden"
                      style={{ background: 'rgba(250, 162, 117, 0.15)' }}
                      title={`${emotion}: ${(score * 100).toFixed(1)}%`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300 shadow-sm"
                        style={{
                          width: `${score * 100}%`,
                          backgroundColor: EMOTION_COLORS[emotion],
                          boxShadow: `0 0 8px ${EMOTION_COLORS[emotion]}80`
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-medium capitalize truncate w-full text-center" style={{
                      color: 'var(--text-tertiary)'
                    }}>
                      {emotion.slice(0, 3)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Inactive state */}
        {!isActive && !isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6" style={{
            background: 'linear-gradient(135deg, rgba(106, 66, 88, 0.95) 0%, rgba(92, 55, 76, 0.95) 100%)'
          }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{
              background: 'rgba(250, 162, 117, 0.15)',
              border: '2px solid rgba(250, 162, 117, 0.3)'
            }}>
              <CameraOff className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            </div>
            <p className="text-center font-medium" style={{ color: 'var(--text-secondary)' }}>
              Camera is off
            </p>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-tertiary)' }}>
              Use the camera button in the sidebar
            </p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6" style={{
            background: 'linear-gradient(135deg, rgba(106, 66, 88, 0.95) 0%, rgba(92, 55, 76, 0.95) 100%)'
          }}>
            <div className="w-14 h-14 rounded-full mb-4 animate-spin" style={{
              border: '3px solid rgba(250, 162, 117, 0.2)',
              borderTopColor: 'var(--primary)'
            }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              Requesting camera access...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6" style={{
            background: 'linear-gradient(135deg, rgba(106, 66, 88, 0.95) 0%, rgba(92, 55, 76, 0.95) 100%)'
          }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{
              background: 'rgba(206, 106, 133, 0.2)',
              border: '2px solid rgba(206, 106, 133, 0.4)'
            }}>
              <AlertCircle className="w-8 h-8" style={{ color: 'var(--danger)' }} />
            </div>
            <p className="text-center mb-2 font-medium" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              {isPermissionDenied
                ? 'Please allow camera access in your browser settings'
                : 'Use the camera button in the sidebar to try again'}
            </p>
          </div>
        )}
      </div>
    );
  }
);

WebcamFeed.displayName = 'WebcamFeed';

export default WebcamFeed;
