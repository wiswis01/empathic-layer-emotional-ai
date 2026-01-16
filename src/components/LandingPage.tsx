/**
 * LandingPage Component - Minimal Full-Screen Experience
 *
 * A clean, focused landing page:
 * - Full-screen white background
 * - Simple layout with key features
 * - Subtle visual effects
 * - Clear CTA
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Camera, Brain, MessageCircle, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import '@/styles/landing.css';

interface LandingPageProps {
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Capture',
    stat: '<10ms',
    label: 'Frame capture',
    color: '#8e5572',
  },
  {
    icon: Brain,
    title: 'Analyze',
    stat: '<100ms',
    label: 'Inference',
    color: '#bbbe64',
  },
  {
    icon: MessageCircle,
    title: 'Adapt',
    stat: '<200ms',
    label: 'First token',
    color: '#443850',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const handleEnter = useCallback(() => {
    onEnter();
  }, [onEnter]);

  // Entrance animations
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      tl.from(titleRef.current, {
        opacity: 0,
        y: 40,
        duration: 0.8,
      });

      tl.from(
        subtitleRef.current,
        {
          opacity: 0,
          y: 30,
          duration: 0.6,
        },
        '-=0.4'
      );

      tl.from(
        featuresRef.current?.children || [],
        {
          opacity: 0,
          y: 20,
          duration: 0.5,
          stagger: 0.1,
        },
        '-=0.3'
      );

      tl.from(
        ctaRef.current,
        {
          opacity: 0,
          y: 20,
          duration: 0.5,
        },
        '-=0.2'
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="landing" ref={containerRef}>
      {/* Subtle gradient orbs */}
      <div className="landing-orb landing-orb--1" />
      <div className="landing-orb landing-orb--2" />

      {/* Main content */}
      <main className="landing-main">
        <h1 ref={titleRef} className="landing-title">
          Emotion-Aware
          <br />
          <span className="landing-title--accent">AI Conversations</span>
        </h1>

        <p ref={subtitleRef} className="landing-subtitle">
          AI that understands how you feel. Privacy-first. Ultra-fast.
        </p>

        {/* Key features */}
        <div className="landing-features" ref={featuresRef}>
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="landing-feature"
                style={{ '--feature-color': feature.color } as React.CSSProperties}
              >
                <div className="landing-feature-icon">
                  <Icon size={24} />
                </div>
                <div className="landing-feature-content">
                  <span className="landing-feature-title">{feature.title}</span>
                  <span className="landing-feature-stat">{feature.stat}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button ref={ctaRef} onClick={handleEnter} className="landing-cta">
          <span>Start Chatting</span>
          <ArrowRight size={20} />
        </button>

        <p className="landing-footer">
          No account required. Your data stays on your device.
        </p>
      </main>
    </div>
  );
};

export default React.memo(LandingPage);
