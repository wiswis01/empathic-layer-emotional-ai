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
import { Camera, Brain, MessageCircle, ArrowRight, Heart } from 'lucide-react';
import { SpinningText } from '@/components/magicui/spinning-text';
import { Highlighter } from '@/components/magicui/highlighter';
import { TypingAnimation } from '@/components/magicui/typing-animation';
import { Pointer } from '@/components/magicui/pointer';
import { AnimatedList } from '@/components/magicui/animated-list';
import gsap from 'gsap';
import '@/styles/landing.css';

interface LandingPageProps {
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Understands Your Signals',
    description: 'Real-time detection of facial expressions and micro-emotions to understand how you truly feel.',
    bg: '#E3F2FD',
  },
  {
    icon: Brain,
    title: 'Interprets Your Emotions',
    description: 'Advanced AI analyzes emotional patterns and provides personalized, empathetic responses.',
    bg: '#E0F7FA',
  },
  {
    icon: MessageCircle,
    title: 'Responds With Care',
    description: 'Thoughtful conversations that adapt to your emotional state in real-time.',
    bg: '#E8EAF6',
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

      {/* Brand logo - top left */}
      <div className="landing-brand">
        <TypingAnimation duration={150} delay={300} cursorStyle="line">
          Empath
        </TypingAnimation>
      </div>

      {/* Subtle gradient orbs */}
      <div className="landing-orb landing-orb--1" />
      <div className="landing-orb landing-orb--2" />

      {/* Spinning text - bottom right */}
      <div ref={subtitleRef} className="landing-subtitle-container">
        <SpinningText
          duration={12}
          radius={6}
          className="landing-spinning-text"
        >
          {`Private • Secure • Empathic • Always with you • `}
        </SpinningText>
      </div>

      {/* Main content */}
      <main className="landing-main">
        <h1 ref={titleRef} className="landing-title">
          <Highlighter action="underline" color="#F5A623">
            Conversations
          </Highlighter>
          {" that "}
          <Highlighter action="highlight" color="#87CEFA">
            understand you
          </Highlighter>
        </h1>

        {/* Key features - Bento Grid */}
        <AnimatedList delay={400} className="landing-features-grid" ref={featuresRef}>
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="landing-feature-card"
                style={{ backgroundColor: feature.bg }}
              >
                <Icon size={28} strokeWidth={1.5} className="landing-feature-icon" />
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-desc">{feature.description}</p>
              </div>
            );
          })}
        </AnimatedList>

        {/* CTA */}
        <button ref={ctaRef} onClick={handleEnter} className="landing-cta">
          <Pointer>
            <Heart size={24} fill="#e91e63" color="#e91e63" />
          </Pointer>
          <span>Start a gentle check-in</span>
          <ArrowRight size={20} />
        </button>

        <p className="landing-footer">
          Private by design. Your data stays with you.
        </p>
      </main>
    </div>
  );
};

export default React.memo(LandingPage);
