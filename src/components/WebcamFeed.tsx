/**
 * WebcamFeed Component - ARTISTIC REDESIGN
 *
 * Displays the webcam feed with emotion detection overlay.
 * Shows the detected emotion and confidence in real-time.
 *
 * REDESIGNED with organic 5-color palette
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
      <div className={cn('relative rounded-3xl overflow-hidden shadow-xl transition-all', className)} style={{
        background: 'linear-gradient(145deg, rgba(242, 247, 242, 0.8) 0%, rgba(188, 170, 153, 0.15) 100%)',
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

        {/* Emotion border glow - organic soft glow */}
        {isActive && latestResult && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-500 rounded-3xl"
            style={{
              boxShadow: `inset 0 0 50px ${emotionColor}35, 0 0 40px ${emotionColor}25`,
              borderRadius: 'inherit',
            }}
          />
        )}

        {/* Emotion overlay - Artistic & organic */}
        {isActive && showOverlay && latestResult && (
          <div className="absolute bottom-0 left-0 right-0 p-5 backdrop-blur-xl" style={{
            background: 'linear-gradient(to top, rgba(68, 56, 80, 0.85) 0%, rgba(68, 56, 80, 0.6) 60%, transparent 100%)'
          }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-3.5 h-3.5 rounded-full animate-pulse-glow shadow-lg"
                  style={{
                    backgroundColor: emotionColor,
                    boxShadow: `0 0 16px ${emotionColor}, 0 0 8px ${emotionColor}`
                  }}
                />
                <span className="font-display font-semibold text-lg capitalize tracking-wide" style={{
                  color: 'var(--mint)'
                }}>
                  {latestResult.dominantEmotion}
                </span>
              </div>
              <div className="px-4 py-1.5 rounded-full text-xs font-mono font-bold shadow-md" style={{
                background: 'rgba(142, 85, 114, 0.3)',
                color: 'var(--mint)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(142, 85, 114, 0.5)'
              }}>
                {(latestResult.confidence * 100).toFixed(0)}%
              </div>
            </div>

            {/* Emotion bars - Organic design */}
            <div className="grid grid-cols-7 gap-2.5">
              {(Object.entries(latestResult.scores) as [EmotionLabel, number][]).map(
                ([emotion, score]) => (
                  <div key={emotion} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-full h-2.5 overflow-hidden"
                      style={{
                        background: 'rgba(68, 56, 80, 0.4)',
                        border: '1px solid rgba(68, 56, 80, 0.5)'
                      }}
                      title={`${emotion}: ${(score * 100).toFixed(1)}%`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${score * 100}%`,
                          backgroundColor: EMOTION_COLORS[emotion],
                          boxShadow: `0 0 12px ${EMOTION_COLORS[emotion]}90, inset 0 0 4px rgba(255,255,255,0.3)`
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold capitalize truncate w-full text-center" style={{
                      color: 'rgba(242, 247, 242, 0.9)'
                    }}>
                      {emotion.slice(0, 3)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Inactive state - Artistic */}
        {!isActive && !isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8" style={{
            background: 'linear-gradient(135deg, rgba(242, 247, 242, 0.98) 0%, rgba(188, 170, 153, 0.25) 100%)'
          }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-md" style={{
              background: 'rgba(142, 85, 114, 0.12)',
              border: '2px solid rgba(142, 85, 114, 0.25)'
            }}>
              <CameraOff className="w-9 h-9" style={{ color: 'var(--mauve)' }} />
            </div>
            <p className="text-center font-display font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
              Camera is off
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              Use the camera button in the sidebar
            </p>
          </div>
        )}

        {/* Loading state - Organic spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8" style={{
            background: 'linear-gradient(135deg, rgba(242, 247, 242, 0.98) 0%, rgba(188, 170, 153, 0.25) 100%)'
          }}>
            <div className="w-16 h-16 rounded-full mb-5 animate-spin" style={{
              border: '3px solid rgba(142, 85, 114, 0.2)',
              borderTopColor: 'var(--mauve)',
              boxShadow: '0 0 20px rgba(142, 85, 114, 0.4)'
            }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Requesting camera access...
            </p>
          </div>
        )}

        {/* Error state - Soft & organic */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8" style={{
            background: 'linear-gradient(135deg, rgba(242, 247, 242, 0.98) 0%, rgba(142, 85, 114, 0.12) 100%)'
          }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-md" style={{
              background: 'rgba(142, 85, 114, 0.15)',
              border: '2px solid rgba(142, 85, 114, 0.3)'
            }}>
              <AlertCircle className="w-9 h-9" style={{ color: 'var(--mauve)' }} />
            </div>
            <p className="text-center mb-3 font-semibold" style={{ color: 'var(--mauve)' }}>
              {error}
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
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
