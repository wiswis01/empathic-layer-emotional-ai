/**
 * WebcamFeed Component - ARTISTIC REDESIGN
 *
 * Displays the webcam feed with emotion detection overlay.
 * Shows the detected emotion and confidence in real-time.
 *
 * REDESIGNED with organic 5-color palette
 */

import { forwardRef, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import type { EmotionDetectionResult, EmotionLabel, HandGestureResult } from '@/types/emotion';
import { EMOTION_COLORS } from '@/types/emotion';
import { CameraOff, AlertCircle } from 'lucide-react';

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
  /** Latest hand gesture detection result */
  handGestureResult?: HandGestureResult | null;
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
      onStart: _onStart,
      onStop: _onStop,
      latestResult,
      handGestureResult,
      showOverlay = true,
      mirrored = true,
      className,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Get the dominant emotion color for the border
    const emotionColor = latestResult
      ? EMOTION_COLORS[latestResult.dominantEmotion]
      : 'transparent';

    // Draw hand landmarks on canvas overlay
    useEffect(() => {
      if (!isActive || !handGestureResult?.isDetected || !canvasRef.current || !containerRef.current) {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
        return;
      }

      const canvas = canvasRef.current;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get video element and its actual dimensions
      const videoElement = ref && typeof ref === 'object' && 'current' in ref ? ref.current : null;
      const videoWidth = videoElement?.videoWidth || 0;
      const videoHeight = videoElement?.videoHeight || 0;
      
      // Draw hand landmarks
      const landmarks = handGestureResult.landmarks;
      
      // Get actual video dimensions for correct scaling
      // Landmarks are in pixel coordinates relative to video dimensions (960x540 by default)
      // Fallback to expected dimensions if video element not ready
      const actualVideoWidth = videoWidth || 960;
      const actualVideoHeight = videoHeight || 540;
      
      // Calculate scaling factors from video dimensions to canvas dimensions
      // Landmarks are already in pixel coordinates relative to video dimensions,
      // so we scale them to match the canvas size
      const scaleX = canvas.width / actualVideoWidth;
      const scaleY = canvas.height / actualVideoHeight;

      // Draw connections
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17], // Palm
      ];

      ctx.strokeStyle = 'rgba(142, 85, 114, 0.8)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(142, 85, 114, 0.5)';

      for (const [start, end] of connections) {
        const startX = mirrored ? canvas.width - landmarks[start].x * scaleX : landmarks[start].x * scaleX;
        const startY = landmarks[start].y * scaleY;
        const endX = mirrored ? canvas.width - landmarks[end].x * scaleX : landmarks[end].x * scaleX;
        const endY = landmarks[end].y * scaleY;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      // Draw landmarks
      ctx.fillStyle = 'rgba(142, 85, 114, 0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(142, 85, 114, 0.7)';

      for (const landmark of landmarks) {
        const x = mirrored ? canvas.width - landmark.x * scaleX : landmark.x * scaleX;
        const y = landmark.y * scaleY;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw point history trail
      if (handGestureResult.handSign === 'Pointer') {
        ctx.strokeStyle = 'rgba(187, 190, 100, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Note: point history would need to be passed separately or tracked
        // For now, we'll just highlight the index finger tip
        const indexTip = landmarks[8];
        const x = mirrored ? canvas.width - indexTip.x * scaleX : indexTip.x * scaleX;
        const y = indexTip.y * scaleY;
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }, [isActive, handGestureResult, mirrored, ref]);

    return (
      <div
        ref={containerRef}
        className={cn('relative rounded-2xl overflow-hidden shadow-xl transition-all', className)}
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.04)'
        }}
      >
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

        {/* Hand gesture overlay canvas */}
        {isActive && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 10 }}
          />
        )}

        {/* Emotion border glow - subtle */}
        {isActive && latestResult && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-500 rounded-2xl"
            style={{
              boxShadow: `inset 0 0 40px ${emotionColor}25, 0 0 30px ${emotionColor}15`,
              borderRadius: 'inherit',
            }}
          />
        )}

        {/* Hand gesture info overlay - Onboarding themed */}
        {isActive && handGestureResult?.isDetected && (
          <div className="absolute top-4 left-4 p-3 rounded-2xl backdrop-blur-xl shadow-lg" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            zIndex: 20
          }}>
            {handGestureResult.handSign && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#666666' }}>
                  Hand:
                </span>
                <span className="text-sm font-bold font-display" style={{ color: '#A54452' }}>
                  {handGestureResult.handSign}
                </span>
                <span className="text-xs opacity-75" style={{ color: '#666666' }}>
                  ({(handGestureResult.handSignConfidence * 100).toFixed(0)}%)
                </span>
              </div>
            )}
            {handGestureResult.fingerGesture && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#666666' }}>
                  Gesture:
                </span>
                <span className="text-sm font-bold font-display" style={{ color: '#A54452' }}>
                  {handGestureResult.fingerGesture}
                </span>
                <span className="text-xs opacity-75" style={{ color: '#666666' }}>
                  ({(handGestureResult.fingerGestureConfidence * 100).toFixed(0)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Emotion overlay - Onboarding themed */}
        {isActive && showOverlay && latestResult && (
          <div className="absolute bottom-0 left-0 right-0 p-5 backdrop-blur-xl" style={{
            background: 'linear-gradient(to top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 60%, transparent 100%)',
            zIndex: 15
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
                  color: '#1a1a1a'
                }}>
                  {latestResult.dominantEmotion}
                </span>
              </div>
              <div className="px-4 py-1.5 rounded-full text-xs font-mono font-bold shadow-md" style={{
                background: '#F9E0E3',
                color: '#A54452',
                border: '1px solid rgba(165, 68, 82, 0.2)'
              }}>
                {(latestResult.confidence * 100).toFixed(0)}%
              </div>
            </div>

            {/* Emotion bars - Onboarding themed */}
            <div className="grid grid-cols-7 gap-2.5">
              {(Object.entries(latestResult.scores) as [EmotionLabel, number][]).map(
                ([emotion, score]) => (
                  <div key={emotion} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-full h-2.5 overflow-hidden"
                      style={{
                        background: 'rgba(0, 0, 0, 0.06)',
                        border: '1px solid rgba(0, 0, 0, 0.04)'
                      }}
                      title={`${emotion}: ${(score * 100).toFixed(1)}%`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${score * 100}%`,
                          backgroundColor: EMOTION_COLORS[emotion],
                          boxShadow: `0 0 12px ${EMOTION_COLORS[emotion]}60`
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold capitalize truncate w-full text-center" style={{
                      color: '#666666'
                    }}>
                      {emotion.slice(0, 3)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Inactive state - Clean white */}
        {!isActive && !isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8" style={{
            background: '#ffffff'
          }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-sm" style={{
              background: 'rgba(142, 85, 114, 0.08)',
              border: '1px solid rgba(142, 85, 114, 0.15)'
            }}>
              <CameraOff className="w-9 h-9" style={{ color: '#8e5572' }} />
            </div>
            <p className="text-center font-display font-semibold text-base mb-2" style={{ color: '#1a1a1a' }}>
              Camera is off
            </p>
            <p className="text-xs text-center" style={{ color: '#666666' }}>
              Click the camera button to start
            </p>
          </div>
        )}

        {/* Loading state - Clean spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8" style={{
            background: '#ffffff'
          }}>
            <div className="w-16 h-16 rounded-full mb-5 animate-spin" style={{
              border: '3px solid rgba(142, 85, 114, 0.15)',
              borderTopColor: '#8e5572',
            }} />
            <p className="font-semibold" style={{ color: '#1a1a1a' }}>
              Requesting camera access...
            </p>
          </div>
        )}

        {/* Error state - Clean */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8" style={{
            background: '#ffffff'
          }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-sm" style={{
              background: 'rgba(142, 85, 114, 0.08)',
              border: '1px solid rgba(142, 85, 114, 0.2)'
            }}>
              <AlertCircle className="w-9 h-9" style={{ color: '#8e5572' }} />
            </div>
            <p className="text-center mb-3 font-semibold" style={{ color: '#8e5572' }}>
              {error}
            </p>
            <p className="text-xs text-center" style={{ color: '#666666' }}>
              {isPermissionDenied
                ? 'Please allow camera access in your browser settings'
                : 'Click the camera button to try again'}
            </p>
          </div>
        )}
      </div>
    );
  }
);

WebcamFeed.displayName = 'WebcamFeed';

export default WebcamFeed;
