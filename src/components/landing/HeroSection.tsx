/**
 * HeroSection Component
 *
 * Premium immersive hero with GSAP animations:
 * - Layered gradients with breathing animation
 * - Staggered text entrance with premium easing
 * - High contrast "Breathe in" message for visibility
 * - CTA hidden initially for immersive experience
 */

import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import ParallaxText from './ParallaxText';
import GlassCard from './GlassCard';
import ScrollSection from './ScrollSection';
import gsap from 'gsap';
import { PREMIUM_EASE, PREMIUM_DURATION } from '@/hooks/useGsap';
import { GL } from '@/components/gl';

interface HeroSectionProps {
  /** Callback when user clicks to enter the app */
  onEnter: () => void;

  /** Current scroll progress for parallax effects */
  scrollProgress?: number;

  /** Slide state for easing between sections */
  sectionState?: 'past' | 'active' | 'upcoming';

  /** Zoom factor for PowerPoint-style easing */
  sectionZoom?: number;

  /** Opacity factor for section layering */
  sectionOpacity?: number;

  /** Whether to show the CTA button */
  showCTA?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onEnter: _onEnter, // Reserved for future CTA
  scrollProgress = 0,
  sectionState = 'active',
  sectionZoom = 1,
  sectionOpacity = 1,
  showCTA: _showCTA = false, // Hidden by default for immersive experience
}) => {
  const [hovering, setHovering] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const gradient1Ref = useRef<HTMLDivElement>(null);
  const gradient2Ref = useRef<HTMLDivElement>(null);

  const glowOpacity = Math.min(0.9, 0.25 + scrollProgress * 0.45);
  const blurStrength = 14 + scrollProgress * 6;

  // GSAP entrance animations with premium easing
  useEffect(() => {
    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      // Staggered entrance timeline
      const tl = gsap.timeline({
        defaults: {
          ease: PREMIUM_EASE.expoOut,
        },
      });

      // Animate title with split reveal
      if (titleRef.current) {
        tl.from(titleRef.current, {
          opacity: 0,
          y: 80,
          duration: PREMIUM_DURATION.cinematic,
          ease: PREMIUM_EASE.expoOut,
        }, 0);
      }

      // Animate subtitle
      if (subtitleRef.current) {
        tl.from(subtitleRef.current, {
          opacity: 0,
          y: 40,
          duration: PREMIUM_DURATION.slow,
          ease: PREMIUM_EASE.power3Out,
        }, 0.2);
      }

      // Animate card with breathing message
      if (cardRef.current) {
        tl.from(cardRef.current, {
          opacity: 0,
          scale: 0.9,
          y: 30,
          duration: PREMIUM_DURATION.slow,
          ease: PREMIUM_EASE.power4Out,
        }, 0.4);
      }

      // Animate scroll indicator
      if (scrollIndicatorRef.current) {
        tl.from(scrollIndicatorRef.current, {
          opacity: 0,
          y: 20,
          duration: PREMIUM_DURATION.normal,
          ease: PREMIUM_EASE.power3Out,
        }, 0.8);
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Breathing animation for gradients
  useEffect(() => {
    if (!gradient1Ref.current || !gradient2Ref.current) return;

    const tl = gsap.timeline({
      repeat: -1,
      yoyo: true,
    });

    tl.to([gradient1Ref.current, gradient2Ref.current], {
      scale: 1.1,
      duration: 4,
      ease: 'sine.inOut',
      stagger: 0.3,
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <ScrollSection
      id="hero"
      className="hero-section"
      ref={heroRef}
      sticky={false}
      state={sectionState}
      zoom={sectionZoom}
      opacity={sectionOpacity}
    >
      {/* WebGL Particle System */}
      <GL hovering={hovering} />

      {/* Layered gradient backdrop with soft blur */}
      <div
        ref={gradient1Ref}
        className="hero-gradient"
        style={{
          opacity: 0.9,
          filter: `blur(${blurStrength}px)`,
          willChange: 'transform',
        }}
      />
      <div
        ref={gradient2Ref}
        className="hero-gradient hero-gradient--accent"
        style={{
          opacity: glowOpacity,
          filter: `blur(${blurStrength + 6}px)`,
          willChange: 'transform',
        }}
      />

      {/* Glassmorphic content overlay */}
      <div className="hero-content">
        <div className="hero-inner">
          <ParallaxText scrollProgress={scrollProgress} intensity={0.25}>
            <h1 ref={titleRef} className="hero-title">
            Emotion-Aware
            <br />
            <span className="gradient-text">AI Conversations</span>
          </h1>
        </ParallaxText>

        <ParallaxText
          scrollProgress={scrollProgress}
            intensity={0.18}
            delay={120}
        >
            <p ref={subtitleRef} className="hero-subtitle">
            Experience AI that understands your emotions in real-time.
            <br />
            Privacy-first. Ultra-fast. Truly empathetic.
          </p>
        </ParallaxText>

          {/* High contrast breathing message */}
          <GlassCard 
            className="hero-greeting hero-greeting--high-contrast" 
            ref={cardRef}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <div className="hero-greeting-row">
              <Sparkles className="hero-greeting-icon hero-greeting-icon--animated" />
              <p className="hero-breathing-text">
                <span className="breathing-word">Breathe in.</span>
                <span className="breathing-word breathing-word--delay">Scroll slow.</span>
                <span className="breathing-word breathing-word--delay-2">Let the experience unfold.</span>
              </p>
            </div>
          </GlassCard>

        {/* Immersive scroll indicator with higher contrast */}
        <div className="hero-scroll-indicator hero-scroll-indicator--prominent" ref={scrollIndicatorRef}>
          <span className="hero-scroll-text">Scroll to explore</span>
          <ChevronDown className="hero-scroll-chevron" />
          </div>
        </div>
      </div>
    </ScrollSection>
  );
};

export default React.memo(HeroSection);
