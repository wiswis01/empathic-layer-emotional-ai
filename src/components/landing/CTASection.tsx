/**
 * CTASection Component
 *
 * Final call-to-action section with prominent
 * "Start Chatting" button.
 */

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import ScrollSection from './ScrollSection';
import ParallaxText from './ParallaxText';

interface CTASectionProps {
  /** Callback when user clicks to enter the app */
  onEnter: () => void;

  /** Current scroll progress for parallax effects */
  scrollProgress?: number;

  /** Section slide state */
  sectionState?: 'past' | 'active' | 'upcoming';

  /** Section zoom factor */
  sectionZoom?: number;

  /** Section opacity factor */
  sectionOpacity?: number;
}

export const CTASection: React.FC<CTASectionProps> = ({
  onEnter,
  scrollProgress = 0,
  sectionState = 'active',
  sectionZoom = 1,
  sectionOpacity = 1,
}) => {
  return (
    <ScrollSection
      id="cta"
      className="cta-section"
      sticky={false}
      state={sectionState}
      zoom={sectionZoom}
      opacity={sectionOpacity}
      variant="solid"
    >
      <div className="cta-content">
        <ParallaxText scrollProgress={scrollProgress} intensity={0.18}>
          <div className="cta-icon">
            <Sparkles />
          </div>
        </ParallaxText>

        <ParallaxText
          scrollProgress={scrollProgress}
          intensity={0.22}
          delay={50}
        >
          <h2 className="cta-title">
            Ready to experience
            <br />
            <span className="gradient-text">empathetic AI?</span>
          </h2>
        </ParallaxText>

        <ParallaxText
          scrollProgress={scrollProgress}
          intensity={0.18}
          delay={100}
        >
          <p className="cta-subtitle">
            Start a conversation that truly understands how you feel.
          </p>
        </ParallaxText>

        <ParallaxText
          scrollProgress={scrollProgress}
          intensity={0.2}
          delay={150}
        >
          <button onClick={onEnter} className="cta-button">
            <span>Start Chatting</span>
            <ArrowRight className="cta-button-icon" />
          </button>
        </ParallaxText>

        <div className="cta-footer">
          <p className="cta-footer-text">
            No account required. Your data stays on your device.
          </p>
        </div>
      </div>
    </ScrollSection>
  );
};

export default React.memo(CTASection);
