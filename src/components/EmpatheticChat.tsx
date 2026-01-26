/**
 * EmpatheticChat Component - REDESIGNED
 *
 * Beautiful white-wash interface matching landing page:
 * - Camera centered as main focus
 * - Smaller chat sidebar
 * - Clean, minimal design
 * - Pre-camera name input
 * - Therapist Dashboard integration
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { cn } from '@/utils/cn';
import { useDeepFaceDetector } from '@/hooks/useDeepFaceDetector';
import { useHandGestureDetector } from '@/hooks/useHandGestureDetector';
import { useWebcam } from '@/hooks/useWebcam';
import WebcamFeed from './WebcamFeed';
import ChatInterface from './ChatInterface';
import NameInputScreen from './NameInputScreen';
import { TherapistDashboard } from './TherapistDashboard';
import { Camera, Stethoscope } from 'lucide-react';

interface EmpatheticChatProps {
  /** Additional CSS classes */
  className?: string;
}

interface UserData {
  name: string;
  feeling: number;
  thoughts: string;
  wellness: string;
  positive: string;
}

const EmpatheticChat: React.FC<EmpatheticChatProps> = ({ className }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showNameInput, setShowNameInput] = useState(true);
  const [emotionEnabled, setEmotionEnabled] = useState(true);
  const [therapistMode, setTherapistMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

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
    width: 1280,
    height: 720,
    frameRate: 30,
  });

  const {
    isReady: isModelReady,
    isDetecting,
    emotionContext,
    latestResult,
    error: _detectorError,
    startDetection,
    stopDetection,
    setContextActive,
  } = useDeepFaceDetector();

  const {
    isReady: isHandGestureReady,
    isDetecting: isHandGestureDetecting,
    latestResult: handGestureResult,
    error: _handGestureError,
    startDetection: startHandGestureDetection,
    stopDetection: stopHandGestureDetection,
  } = useHandGestureDetector({
    inferenceInterval: 50,
    frameSkip: 2,
    debug: false,
  });

  // Handle name input completion with all question answers
  const handleNameComplete = useCallback((data: UserData) => {
    setUserData(data);
    setShowNameInput(false);
  }, []);

  // Auto-start webcam when main interface shows
  useEffect(() => {
    if (!showNameInput) {
      startWebcam();
    }
  }, [showNameInput, startWebcam]);

  // Start detection when webcam and models are ready
  useEffect(() => {
    if (isWebcamActive && isModelReady && videoRef.current && !isDetecting) {
      startDetection(videoRef.current);
    }
    if (isWebcamActive && isHandGestureReady && videoRef.current && !isHandGestureDetecting) {
      startHandGestureDetection(videoRef.current);
    }
  }, [isWebcamActive, isModelReady, isHandGestureReady, videoRef, isDetecting, isHandGestureDetecting, startDetection, startHandGestureDetection]);

  // Stop detection when webcam stops
  useEffect(() => {
    if (!isWebcamActive && isDetecting) {
      stopDetection();
    }
    if (!isWebcamActive && isHandGestureDetecting) {
      stopHandGestureDetection();
    }
  }, [isWebcamActive, isDetecting, isHandGestureDetecting, stopDetection, stopHandGestureDetection]);

  // Update context active state
  useEffect(() => {
    setContextActive(emotionEnabled);
  }, [emotionEnabled, setContextActive]);

  // Handle webcam toggle
  const handleWebcamToggle = useCallback(() => {
    if (isWebcamActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  }, [isWebcamActive, startWebcam, stopWebcam]);

  // Show name input screen first
  if (showNameInput) {
    return <NameInputScreen onComplete={handleNameComplete} />;
  }

  return (
    <div
      ref={containerRef}
      className={cn('empathic-chat-container', className)}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#ffffff',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient orbs for ambiance */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(142, 85, 114, 0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.3,
          top: '-10%',
          right: '-5%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(187, 190, 100, 0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.3,
          bottom: '-10%',
          left: '-5%',
          pointerEvents: 'none',
        }}
      />

      {/* Main camera section - CENTERED */}
      <div
        ref={cameraRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {/* Camera controls - top right */}
        <div
          style={{
            position: 'absolute',
            top: '2rem',
            right: '2rem',
            display: 'flex',
            gap: '0.75rem',
            zIndex: 20,
          }}
        >
          <button
            onClick={handleWebcamToggle}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: isWebcamActive
                ? 'linear-gradient(135deg, #8e5572 0%, #443850 100%)'
                : 'rgba(142, 85, 114, 0.1)',
              border: isWebcamActive ? 'none' : '2px solid rgba(142, 85, 114, 0.3)',
              color: isWebcamActive ? 'white' : '#8e5572',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isWebcamActive
                ? '0 8px 24px rgba(142, 85, 114, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Camera size={20} />
          </button>

          {/* Therapist Mode Toggle */}
          <button
            onClick={() => setTherapistMode(!therapistMode)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: therapistMode
                ? 'linear-gradient(135deg, #dc2626 0%, #8e5572 100%)'
                : 'rgba(142, 85, 114, 0.1)',
              border: therapistMode ? 'none' : '2px solid rgba(142, 85, 114, 0.3)',
              color: therapistMode ? 'white' : '#8e5572',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: therapistMode
                ? '0 8px 24px rgba(220, 38, 38, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={therapistMode ? 'Hide Therapist Dashboard' : 'Show Therapist Dashboard'}
          >
            <Stethoscope size={20} />
          </button>
        </div>

        {/* Camera feed - large and centered */}
        <div
          style={{
            width: '100%',
            maxWidth: '900px',
            aspectRatio: '16/9',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
            background: '#f5f5f5',
          }}
        >
          <WebcamFeed
            ref={videoRef}
            isActive={isWebcamActive}
            isPermissionDenied={isPermissionDenied}
            isLoading={isWebcamLoading}
            error={webcamError}
            onStart={startWebcam}
            onStop={stopWebcam}
            latestResult={latestResult}
            handGestureResult={handGestureResult}
            showOverlay={true}
            mirrored={true}
            className="w-full h-full"
          />
        </div>

        {/* User name display - bottom center */}
        {userData && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '100px',
              background: 'rgba(142, 85, 114, 0.1)',
              border: '1px solid rgba(142, 85, 114, 0.2)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#8e5572',
            }}
          >
            Welcome, {userData.name}
          </div>
        )}
      </div>

      {/* Therapist Dashboard Panel */}
      {therapistMode && (
        <div
          style={{
            width: '420px',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid rgba(0, 0, 0, 0.06)',
            background: '#f2f7f2',
            overflow: 'hidden',
          }}
        >
          <TherapistDashboard
            emotionContext={emotionContext}
            enabled={therapistMode}
            compact={false}
          />
        </div>
      )}

      {/* Chat sidebar - SMALLER */}
      <div
        ref={chatRef}
        style={{
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <ChatInterface
          emotionContext={emotionContext}
          emotionEnabled={emotionEnabled}
          onToggleEmotion={(enabled) => setEmotionEnabled(enabled)}
          userName={userData?.name || null}
          userData={userData}
          className="flex-1"
        />
      </div>
    </div>
  );
};

export default EmpatheticChat;
