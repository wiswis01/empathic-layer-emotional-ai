/**
 * LandingPage Component - Immersive Experience
 *
 * A beautiful, smooth landing experience:
 * - Immersive hero with high-contrast breathing message
 * - Rotating 3D feature carousel with pause-on-click
 * - Warm glow effects and premium animations
 * - CTA revealed only after feature exploration
 */

import React, { useCallback, useRef } from 'react';
import { useScrollProgress } from '@/hooks';
import {
  CustomCursor,
  GradientBackground,
  HeroSection,
  RotatingFeatures,
  CTASection,
} from './landing';
import '@/styles/landing.css';

type SectionState = 'past' | 'active' | 'upcoming';

interface LandingPageProps {
  /** Callback when user clicks to enter the app */
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { progress, sectionProgress, sectionIndex } = useScrollProgress({
    sectionCount: 3, // Hero, Rotating Features, CTA
    target: scrollContainerRef,
  });

  // Memoized enter handler
  const handleEnter = useCallback(() => {
    onEnter();
  }, [onEnter]);

  const getSectionState = useCallback(
    (index: number): SectionState =>
      sectionIndex === index
        ? 'active'
        : sectionIndex > index
          ? 'past'
          : 'upcoming',
    [sectionIndex]
  );

  const getSectionZoom = useCallback(
    (index: number) => {
      const easedProgress = Math.min(Math.max(sectionProgress, 0), 1);

      if (sectionIndex === index) {
        return 1 - easedProgress * 0.035;
      }

      if (sectionIndex + 1 === index) {
        return 0.94 + easedProgress * 0.06;
      }

      return sectionIndex > index ? 0.94 : 0.9;
    },
    [sectionIndex, sectionProgress]
  );

  const getSectionOpacity = useCallback(
    (index: number) => {
      if (sectionIndex === index) return 1;
      if (sectionIndex + 1 === index) return 0.9 + Math.min(sectionProgress, 0.1);
      return sectionIndex > index ? 0.82 : 0.75;
    },
    [sectionIndex, sectionProgress]
  );

  const getSectionProgress = useCallback(
    (index: number) => (sectionIndex === index ? sectionProgress : 0),
    [sectionIndex, sectionProgress]
  );

  return (
    <div className="landing-page">
      {/* Custom glass cursor for desktop */}
      <CustomCursor />

      {/* Dynamic gradient background */}
      <GradientBackground scrollProgress={progress} />

      {/* Scrollable content container */}
      <div
        ref={scrollContainerRef}
        className="landing-scroll-container"
      >
        {/* Hero Section - Immersive entry with breathing message */}
        <HeroSection
          onEnter={handleEnter}
          scrollProgress={getSectionProgress(0)}
          sectionState={getSectionState(0)}
          sectionZoom={getSectionZoom(0)}
          sectionOpacity={getSectionOpacity(0)}
          showCTA={false} // Hidden for immersive experience
        />

        {/* Rotating Features - Interactive 3D carousel */}
        <section className="rotating-features-section scroll-section">
          <RotatingFeatures onContinue={handleEnter} />
        </section>

        {/* CTA Section - Final conversion (shown after exploration) */}
        <CTASection
          onEnter={handleEnter}
          scrollProgress={getSectionProgress(2)}
          sectionState={getSectionState(2)}
          sectionZoom={getSectionZoom(2)}
          sectionOpacity={getSectionOpacity(2)}
        />
      </div>
    </div>
  );
};

export default React.memo(LandingPage);
