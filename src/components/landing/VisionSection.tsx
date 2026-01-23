/**
 * VisionSection Component
 *
 * Narrative section with GSAP staggered card animations.
 * Cards reveal with premium easing as user scrolls.
 */

import React, { useRef, useEffect } from 'react';
import ScrollSection from './ScrollSection';
import ParallaxText from './ParallaxText';
import GlassCard from './GlassCard';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PREMIUM_EASE, PREMIUM_DURATION } from '@/hooks/useGsap';

gsap.registerPlugin(ScrollTrigger);

interface VisionSectionProps {
  /** Current scroll progress for parallax effects */
  scrollProgress?: number;

  /** Section slide state */
  sectionState?: 'past' | 'active' | 'upcoming';

  /** Section zoom factor */
  sectionZoom?: number;

  /** Section opacity factor */
  sectionOpacity?: number;
}

export const VisionSection: React.FC<VisionSectionProps> = ({
  scrollProgress = 0,
  sectionState = 'active',
  sectionZoom = 1,
  sectionOpacity = 1,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Staggered card entrance animations with ScrollTrigger
  useEffect(() => {
    if (!sectionRef.current || !cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll('.vision-card');

    const ctx = gsap.context(() => {
      // Animate cards with stagger
      gsap.from(cards, {
        opacity: 0,
        y: 60,
        scale: 0.99,
        duration: PREMIUM_DURATION.slow,
        ease: PREMIUM_EASE.expoOut,
        stagger: {
          amount: 0.4,
          from: 'start',
        },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          end: 'top 30%',
          toggleActions: 'play none none reverse',
        },
      });

      // Add subtle floating animation on hover
      cards.forEach((card) => {
        const cardElement = card as HTMLElement;

        cardElement.addEventListener('mouseenter', () => {
          gsap.to(cardElement, {
            y: -8,
            duration: PREMIUM_DURATION.fast,
            ease: PREMIUM_EASE.power3Out,
          });
        });

        cardElement.addEventListener('mouseleave', () => {
          gsap.to(cardElement, {
            y: 0,
            duration: PREMIUM_DURATION.fast,
            ease: PREMIUM_EASE.power3Out,
          });
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <ScrollSection
      id="vision"
      className="vision-section"
      ref={sectionRef}
      sticky={false}
      state={sectionState}
      zoom={sectionZoom}
      opacity={sectionOpacity}
      variant="solid"
    >
      <div className="vision-content">
        <ParallaxText scrollProgress={scrollProgress} intensity={0.22}>
          <h2 className="vision-title">
            The <span className="gradient-text">Empathy Layer</span>
          </h2>
        </ParallaxText>

        <ParallaxText
          scrollProgress={scrollProgress}
          intensity={0.18}
          delay={100}
        >
          <p className="vision-subtitle">
            Breaking the 300ms barrier between emotion and response
          </p>
        </ParallaxText>

        <div ref={cardsRef} className="vision-cards">
          <GlassCard className="vision-card" size="lg">
            <div className="vision-card-number">01</div>
            <h3>Privacy First</h3>
            <p>
              All emotion detection happens locally on your device. Video data
              never leaves your browser.
            </p>
          </GlassCard>

          <GlassCard className="vision-card" size="lg">
            <div className="vision-card-number">02</div>
            <h3>Real-Time</h3>
            <p>
              TensorFlow.js with WebGPU acceleration delivers sub-100ms emotion
              inference.
            </p>
          </GlassCard>

          <GlassCard className="vision-card" size="lg">
            <div className="vision-card-number">03</div>
            <h3>Contextual</h3>
            <p>
              Emotional context is dynamically injected into every AI response
              for true empathy.
            </p>
          </GlassCard>
        </div>
      </div>
    </ScrollSection>
  );
};

export default React.memo(VisionSection);
