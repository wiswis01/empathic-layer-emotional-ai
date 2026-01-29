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
import { Camera, Brain, MessageCircle } from 'lucide-react';
import { SpinningText } from '@/components/magicui/spinning-text';
import { Highlighter } from '@/components/magicui/highlighter';
import { TypingAnimation } from '@/components/magicui/typing-animation';
import { Marquee } from '@/components/magicui/marquee';
import { Particles } from '@/components/magicui/particles';
import { MagicCard } from '@/components/magicui/magic-card';
import { BlurFade } from '@/components/magicui/blur-fade';
import { CanvasRevealButton } from '@/components/canvas';
import gsap from 'gsap';
import '@/styles/landing.css';

interface LandingPageProps {
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Understands your signals',
    description: 'Real-time detection of facial expressions and micro-emotions to understand how you truly feel.',
  },
  {
    icon: Brain,
    title: 'Interprets your emotions',
    description: 'Advanced AI analyzes emotional patterns and provides personalized, empathetic responses.',
  },
  {
    icon: MessageCircle,
    title: 'Responds with care',
    description: 'Thoughtful conversations that adapt to your emotional state in real-time.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

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

      {/* Particles background */}
      <Particles
        className="absolute inset-0"
        quantity={150}
        color="#000000"
        size={0.6}
        staticity={40}
        ease={60}
      />

      {/* Spinning text with brand logo centered inside */}
      <div ref={subtitleRef} className="landing-subtitle-container">
        <SpinningText
          duration={12}
          radius={6}
          className="landing-spinning-text"
        >
          {`Private • Secure • Caring • Always with you • `}
        </SpinningText>
        <div className="landing-brand">
          <TypingAnimation duration={150} delay={300} cursorStyle="line">
            Empath
          </TypingAnimation>
        </div>
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

        {/* Key features - Double Marquee */}
        <div className="landing-features-wrapper" ref={featuresRef}>
          <Marquee pauseOnHover duration={25} gap={20} className="landing-features-marquee">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <BlurFade key={feature.title} delay={0.1 * index} inView>
                  <MagicCard className={`landing-feature-card landing-feature-card--${index + 1}`}>
                    <div className="landing-feature-header">
                      <h3 className="landing-feature-title">{feature.title}</h3>
                      <Icon size={20} strokeWidth={1.5} className="landing-feature-icon" />
                    </div>
                    <p className="landing-feature-desc">{feature.description}</p>
                  </MagicCard>
                </BlurFade>
              );
            })}
          </Marquee>
          <Marquee pauseOnHover reverse duration={25} gap={20} className="landing-features-marquee">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <BlurFade key={`${feature.title}-rev`} delay={0.15 * index} inView>
                  <MagicCard className={`landing-feature-card landing-feature-card--${index + 1}`}>
                    <div className="landing-feature-header">
                      <h3 className="landing-feature-title">{feature.title}</h3>
                      <Icon size={20} strokeWidth={1.5} className="landing-feature-icon" />
                    </div>
                    <p className="landing-feature-desc">{feature.description}</p>
                  </MagicCard>
                </BlurFade>
              );
            })}
          </Marquee>
        </div>

        {/* CTA with Canvas Reveal Effect */}
        <div ref={ctaRef}>
          <CanvasRevealButton
            onClick={handleEnter}
            className="landing-cta"
            colors={[[255, 255, 255]]}
            animationSpeed={2.5}
            dotSize={1.2}
            density={5}
          >
            <span className="text-white">Start a quick check-in</span>
          </CanvasRevealButton>
        </div>

      </main>
    </div>
  );
};

export default React.memo(LandingPage);
