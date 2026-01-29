/**
 * EmpatheticChat Component - Landing Page Themed
 *
 * Clean, minimal interface matching landing page:
 * - Same color palette and particles
 * - Wide camera view
 * - Smooth, spacious layout
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
import { Particles } from '@/components/magicui/particles';
import { SpinningText } from '@/components/magicui/spinning-text';
import { TypingAnimation } from '@/components/magicui/typing-animation';

interface EmpatheticChatProps {
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

  const handleNameComplete = useCallback((data: UserData) => {
    setUserData(data);
    setShowNameInput(false);
  }, []);

  useEffect(() => {
    if (!showNameInput) {
      startWebcam();
    }
  }, [showNameInput, startWebcam]);

  useEffect(() => {
    if (isWebcamActive && isModelReady && videoRef.current && !isDetecting) {
      startDetection(videoRef.current);
    }
    if (isWebcamActive && isHandGestureReady && videoRef.current && !isHandGestureDetecting) {
      startHandGestureDetection(videoRef.current);
    }
  }, [isWebcamActive, isModelReady, isHandGestureReady, videoRef, isDetecting, isHandGestureDetecting, startDetection, startHandGestureDetection]);

  useEffect(() => {
    if (!isWebcamActive && isDetecting) {
      stopDetection();
    }
    if (!isWebcamActive && isHandGestureDetecting) {
      stopHandGestureDetection();
    }
  }, [isWebcamActive, isDetecting, isHandGestureDetecting, stopDetection, stopHandGestureDetection]);

  useEffect(() => {
    setContextActive(emotionEnabled);
  }, [emotionEnabled, setContextActive]);

  const handleWebcamToggle = useCallback(() => {
    if (isWebcamActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  }, [isWebcamActive, startWebcam, stopWebcam]);

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
      {/* Particles background */}
      <Particles
        className="absolute inset-0 pointer-events-none"
        quantity={80}
        color="#000000"
        size={0.4}
        staticity={60}
        ease={80}
      />

      {/* Subtle gradient orbs */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(135, 206, 250, 0.2) 0%, transparent 70%)',
          filter: 'blur(100px)',
          opacity: 0.5,
          top: '-15%',
          right: '-10%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249, 224, 227, 0.3) 0%, transparent 70%)',
          filter: 'blur(100px)',
          opacity: 0.5,
          bottom: '-15%',
          left: '-10%',
          pointerEvents: 'none',
        }}
      />

      {/* Logo - Top Left */}
      <div
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2.5rem',
          width: '120px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <SpinningText duration={12} radius={4.5} className="landing-spinning-text" style={{ fontSize: '0.7rem' }}>
          {`Private • Secure • Caring • `}
        </SpinningText>
        <div
          style={{
            position: 'absolute',
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: '1.1rem',
            fontWeight: 500,
            color: '#1a1a1a',
            letterSpacing: '-0.02em',
          }}
        >
          <TypingAnimation duration={100} delay={200} cursorStyle="line">
            Empath
          </TypingAnimation>
        </div>
      </div>

      {/* Main camera section */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem 2rem',
          position: 'relative',
        }}
      >
        {/* Camera controls - top right of camera area */}
        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '2rem',
            display: 'flex',
            gap: '0.75rem',
            zIndex: 20,
          }}
        >
          <button
            onClick={handleWebcamToggle}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: isWebcamActive ? '#87CEFA' : '#F9E0E3',
              border: 'none',
              color: isWebcamActive ? '#1a1a1a' : '#A54452',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: isWebcamActive
                ? '0 4px 16px rgba(135, 206, 250, 0.4)'
                : '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Camera size={18} />
          </button>

          <button
            onClick={() => setTherapistMode(!therapistMode)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: therapistMode ? '#F1F0F7' : '#FBF2EB',
              border: 'none',
              color: therapistMode ? '#7570b3' : '#d95f02',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: therapistMode
                ? '0 4px 16px rgba(117, 112, 179, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
            title={therapistMode ? 'Hide Therapist Dashboard' : 'Show Therapist Dashboard'}
          >
            <Stethoscope size={18} />
          </button>
        </div>

        {/* Camera feed - wide and spacious */}
        <div
          style={{
            width: '100%',
            maxWidth: '1100px',
            aspectRatio: '16/9',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.08)',
            background: '#fafafa',
            border: '1px solid rgba(0, 0, 0, 0.04)',
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
      </div>

      {/* Therapist Dashboard Panel */}
      {therapistMode && (
        <div
          style={{
            width: '380px',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid rgba(0, 0, 0, 0.04)',
            background: '#fafafa',
            overflow: 'hidden',
          }}
        >
          <TherapistDashboard
            emotionContext={emotionContext ?? undefined}
            enabled={therapistMode}
            compact={false}
          />
        </div>
      )}

      {/* Chat sidebar */}
      <div
        style={{
          width: '360px',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid rgba(0, 0, 0, 0.04)',
          background: 'rgba(255, 255, 255, 0.95)',
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
