/**
 * FeaturesSection Component
 *
 * Feature showcase with GSAP staggered animations and icon bounces.
 * Premium micro-interactions on hover.
 */

import React, { useRef, useEffect } from 'react';
import { Camera, Brain, MessageCircle } from 'lucide-react';
import ScrollSection from './ScrollSection';
import ParallaxText from './ParallaxText';
import GlassCard from './GlassCard';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PREMIUM_EASE, PREMIUM_DURATION } from '@/hooks/useGsap';

gsap.registerPlugin(ScrollTrigger);

interface FeaturesSectionProps {
  /** Current scroll progress for parallax effects */
  scrollProgress?: number;

  /** Section slide state */
  sectionState?: 'past' | 'active' | 'upcoming';

  /** Section zoom factor */
  sectionZoom?: number;

  /** Section opacity factor */
  sectionOpacity?: number;
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Capture',
    description:
      'Your webcam captures facial expressions in real-time. All processing stays local for complete privacy.',
    stat: '<10ms',
    statLabel: 'Frame capture',
  },
  {
    icon: Brain,
    title: 'Analyze',
    description:
      'Advanced ML models detect 7 emotion classes with WebGPU acceleration for instant inference.',
    stat: '<100ms',
    statLabel: 'Inference time',
  },
  {
    icon: MessageCircle,
    title: 'Adapt',
    description:
      'The AI dynamically adjusts its tone and responses to match your emotional state in real-time.',
    stat: '<200ms',
    statLabel: 'First token',
  },
];

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  scrollProgress = 0,
  sectionState = 'active',
  sectionZoom = 1,
  sectionOpacity = 1,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Staggered card entrance with icon bounce animations
  useEffect(() => {
    if (!sectionRef.current || !cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll('.feature-card');
    const icons = cardsRef.current.querySelectorAll('.feature-icon');

    const ctx = gsap.context(() => {
      // Animate cards with stagger
      gsap.from(cards, {
        opacity: 0,
        y: 70,
        scale: 0.95,
        rotateY: 0,
        duration: PREMIUM_DURATION.slow,
        ease: PREMIUM_EASE.expoOut,
        stagger: {
          amount: 0.5,
          from: 'start',
        },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          end: 'top 30%',
          toggleActions: 'play none none reverse',
        },
      });

      // Icon bounce animations (delayed for dramatic effect)
      gsap.from(icons, {
        scale: 0.85,
        rotation: -20,
        duration: PREMIUM_DURATION.slow,
        ease: PREMIUM_EASE.elastic,
        stagger: 0.15,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 65%',
          toggleActions: 'play none none reverse',
        },
      });

      // Hover micro-interactions
      cards.forEach((card, index) => {
        const cardElement = card as HTMLElement;
        const icon = icons[index] as HTMLElement;

        cardElement.addEventListener('mouseenter', () => {
          // Lift card
          gsap.to(cardElement, {
            y: -12,
            scale: 1.02,
            duration: PREMIUM_DURATION.fast,
            ease: PREMIUM_EASE.power3Out,
          });

          // Bounce icon
          gsap.to(icon, {
            scale: 1.15,
            rotation: 5,
            duration: PREMIUM_DURATION.fast,
            ease: PREMIUM_EASE.power3Out,
          });
        });

        cardElement.addEventListener('mouseleave', () => {
          // Reset card
          gsap.to(cardElement, {
            y: 0,
            scale: 1,
            duration: PREMIUM_DURATION.fast,
            ease: PREMIUM_EASE.power3Out,
          });

          // Reset icon
          gsap.to(icon, {
            scale: 1,
            rotation: 0,
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
      id="features"
      className="features-section"
      ref={sectionRef}
      sticky={false}
      state={sectionState}
      zoom={sectionZoom}
      opacity={sectionOpacity}
      variant="solid"
    >
      <div className="features-content">
        <ParallaxText scrollProgress={scrollProgress} intensity={0.22}>
          <h2 className="features-title">
            How It <span className="gradient-text">Works</span>
          </h2>
        </ParallaxText>

        <ParallaxText
          scrollProgress={scrollProgress}
          intensity={0.18}
          delay={50}
        >
          <p className="features-subtitle">
            From facial expression to empathetic response in under 300ms
          </p>
        </ParallaxText>

        <div ref={cardsRef} className="features-grid">
          {FEATURES.map((feature) => (
            <GlassCard
              key={feature.title}
              className="feature-card"
              size="lg"
              interactive
            >
              <div className="feature-icon">
                <feature.icon />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-stat">
                <span className="feature-stat-value">{feature.stat}</span>
                <span className="feature-stat-label">{feature.statLabel}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </ScrollSection>
  );
};

export default React.memo(FeaturesSection);
