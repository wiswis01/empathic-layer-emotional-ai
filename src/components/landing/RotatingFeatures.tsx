/**
 * RotatingFeatures Component - Immersive 3D Circular Carousel
 *
 * A beautiful rotating system for the three landing features:
 * - Continuous circular rotation with physics-based inertia
 * - Pauses when user clicks/focuses on a feature
 * - Warm glow effects inspired by Inkwell aesthetic
 * - Premium GSAP animations
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Brain, MessageCircle, Play, Pause } from 'lucide-react';
import gsap from 'gsap';
import { PREMIUM_EASE, PREMIUM_DURATION } from '@/hooks/useGsap';

interface Feature {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  color: string;
  glowColor: string;
}

const FEATURES: Feature[] = [
  {
    id: 'capture',
    icon: Camera,
    title: 'Capture',
    description:
      'Your webcam captures facial expressions in real-time. All processing stays local for complete privacy.',
    stat: '<10ms',
    statLabel: 'Frame capture',
    color: '#8e5572',
    glowColor: 'rgba(142, 85, 114, 0.4)',
  },
  {
    id: 'analyze',
    icon: Brain,
    title: 'Analyze',
    description:
      'Advanced ML models detect 7 emotion classes with WebGPU acceleration for instant inference.',
    stat: '<100ms',
    statLabel: 'Inference time',
    color: '#bbbe64',
    glowColor: 'rgba(187, 190, 100, 0.4)',
  },
  {
    id: 'adapt',
    icon: MessageCircle,
    title: 'Adapt',
    description:
      'The AI dynamically adjusts its tone and responses to match your emotional state in real-time.',
    stat: '<200ms',
    statLabel: 'First token',
    color: '#443850',
    glowColor: 'rgba(68, 56, 80, 0.4)',
  },
];

interface RotatingFeaturesProps {
  /** Callback when user wants to continue to the app */
  onContinue?: () => void;
}

export const RotatingFeatures: React.FC<RotatingFeaturesProps> = ({
  onContinue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef({ current: 0, target: 0, velocity: 0 });
  const animationRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Calculate position for each feature in the circle
  const getFeaturePosition = useCallback((index: number, rotation: number) => {
    const angle = (index * (360 / FEATURES.length) + rotation) * (Math.PI / 180);
    const radius = 180; // Distance from center
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const scale = 0.7 + (z + radius) / (radius * 2) * 0.3; // Scale based on depth
    const opacity = 0.5 + (z + radius) / (radius * 2) * 0.5;
    const zIndex = Math.round((z + radius) / (radius * 2) * 100);

    return { x, z, scale, opacity, zIndex, angle };
  }, []);

  // Physics-based rotation animation loop
  useEffect(() => {
    if (!carouselRef.current) return;

    const animate = () => {
      const rotation = rotationRef.current;

      if (!isPaused) {
        // Auto-rotate with gentle drift
        rotation.target += 0.15; // Slow continuous rotation
      }

      // Lerp towards target with inertia
      const diff = rotation.target - rotation.current;
      rotation.velocity = diff * 0.08; // Smooth interpolation factor
      rotation.current += rotation.velocity;

      // Update feature positions
      const features = carouselRef.current?.querySelectorAll('.rotating-feature');
      features?.forEach((feature, index) => {
        const pos = getFeaturePosition(index, rotation.current);
        const el = feature as HTMLElement;

        gsap.set(el, {
          x: pos.x,
          scale: pos.scale,
          opacity: pos.opacity,
          zIndex: pos.zIndex,
          filter: `blur(${(1 - pos.scale) * 2}px)`,
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, getFeaturePosition]);

  // Handle feature click - pause and focus
  const handleFeatureClick = useCallback((featureId: string, index: number) => {
    setHasInteracted(true);

    if (activeFeature === featureId) {
      // If clicking the same feature, unpause
      setIsPaused(false);
      setActiveFeature(null);
    } else {
      // Pause and rotate to bring clicked feature to front
      setIsPaused(true);
      setActiveFeature(featureId);

      // Calculate target rotation to bring this feature to front (0 degrees)
      const currentAngle = (index * (360 / FEATURES.length) + rotationRef.current.current) % 360;
      const targetRotation = rotationRef.current.current - currentAngle + 180;

      gsap.to(rotationRef.current, {
        target: targetRotation,
        duration: PREMIUM_DURATION.slow / 1000,
        ease: PREMIUM_EASE.expoOut,
      });
    }
  }, [activeFeature]);

  // Toggle pause/play
  const togglePause = useCallback(() => {
    if (isPaused && activeFeature) {
      setActiveFeature(null);
    }
    setIsPaused(!isPaused);
  }, [isPaused, activeFeature]);

  // Get the currently focused feature data
  const focusedFeature = activeFeature
    ? FEATURES.find((f) => f.id === activeFeature)
    : null;

  return (
    <div className="rotating-features-container" ref={containerRef}>
      {/* Ambient glow background */}
      <div className="rotating-features-glow" />

      {/* Title */}
      <div className="rotating-features-header">
        <h2 className="rotating-features-title">
          How It <span className="gradient-text">Works</span>
        </h2>
        <p className="rotating-features-subtitle">
          Click on each step to explore the magic
        </p>
      </div>

      {/* 3D Carousel */}
      <div className="rotating-features-stage">
        <div className="rotating-features-carousel" ref={carouselRef}>
          {FEATURES.map((feature, index) => {
            const IconComponent = feature.icon;
            const isActive = activeFeature === feature.id;

            return (
              <div
                key={feature.id}
                className={`rotating-feature ${isActive ? 'rotating-feature--active' : ''}`}
                onClick={() => handleFeatureClick(feature.id, index)}
                style={{
                  '--feature-color': feature.color,
                  '--feature-glow': feature.glowColor,
                } as React.CSSProperties}
              >
                <div className="rotating-feature-glow" />
                <div className="rotating-feature-card">
                  <div className="rotating-feature-icon">
                    <IconComponent size={24} />
                  </div>
                  <h3 className="rotating-feature-title">{feature.title}</h3>
                  <div className="rotating-feature-stat">
                    <span className="rotating-feature-stat-value">{feature.stat}</span>
                    <span className="rotating-feature-stat-label">{feature.statLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center indicator */}
        <div className="rotating-features-center">
          <button
            className="rotating-features-control"
            onClick={togglePause}
            aria-label={isPaused ? 'Resume rotation' : 'Pause rotation'}
          >
            {isPaused ? <Play /> : <Pause />}
          </button>
        </div>
      </div>

      {/* Expanded detail panel (shown when feature is focused) */}
      {focusedFeature && (
        <div className="rotating-feature-detail animate-fade-in">
          <div className="rotating-feature-detail-content">
            <div
              className="rotating-feature-detail-icon"
              style={{ background: focusedFeature.color }}
            >
              {React.createElement(focusedFeature.icon, { size: 32 })}
            </div>
            <div className="rotating-feature-detail-text">
              <h3>{focusedFeature.title}</h3>
              <p>{focusedFeature.description}</p>
              <div className="rotating-feature-detail-stat">
                <span className="stat-value">{focusedFeature.stat}</span>
                <span className="stat-label">{focusedFeature.statLabel}</span>
              </div>
            </div>
          </div>
          <button
            className="rotating-feature-detail-close"
            onClick={() => {
              setActiveFeature(null);
              setIsPaused(false);
            }}
          >
            Tap to continue
          </button>
        </div>
      )}

      {/* Continue CTA (shown after interaction) */}
      {hasInteracted && !activeFeature && onContinue && (
        <div className="rotating-features-cta animate-fade-in">
          <button onClick={onContinue} className="rotating-features-continue">
            Ready to Experience
            <span className="rotating-features-continue-arrow">→</span>
          </button>
        </div>
      )}

      {/* Navigation dots */}
      <div className="rotating-features-dots">
        {FEATURES.map((feature) => (
          <button
            key={feature.id}
            className={`rotating-features-dot ${activeFeature === feature.id ? 'active' : ''}`}
            onClick={() => handleFeatureClick(feature.id, FEATURES.indexOf(feature))}
            aria-label={`Go to ${feature.title}`}
            style={{
              '--dot-color': feature.color,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(RotatingFeatures);
