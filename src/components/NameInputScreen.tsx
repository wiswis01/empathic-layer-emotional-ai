/**
 * NameInputScreen Component - Landing Page Themed
 *
 * Beautiful onboarding flow matching the landing page aesthetic:
 * - Consistent logo placement (SpinningText + Empath)
 * - Same color palette and particles
 * - Clean, minimal design
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Heart, Brain, Droplet, Sun, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import { PREMIUM_EASE, PREMIUM_DURATION } from '@/hooks/useGsap';
import { SpinningText } from '@/components/magicui/spinning-text';
import { TypingAnimation } from '@/components/magicui/typing-animation';
import { Particles } from '@/components/magicui/particles';
import { Highlighter } from '@/components/magicui/highlighter';
import { CoolMode } from '@/components/magicui/cool-mode';

interface NameInputScreenProps {
  onComplete: (data: {
    name: string;
    feeling: number;
    thoughts: string;
    wellness: string;
    positive: string;
  }) => void;
}

interface Question {
  id: string;
  text: string;
  highlightWord?: string;
  highlightColor?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  type: 'text' | 'scale' | 'buttons';
  placeholder?: string;
  options?: string[];
  cardColor?: string;
  accentColor?: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'feeling',
    text: 'How are you feeling',
    highlightWord: 'right now?',
    highlightColor: '#F9E0E3',
    icon: Heart,
    type: 'scale',
    cardColor: '#F9E0E3',
    accentColor: '#A54452',
  },
  {
    id: 'thoughts',
    text: "What's on your",
    highlightWord: 'mind today?',
    highlightColor: '#FBF2EB',
    icon: Brain,
    type: 'buttons',
    options: ['Work / School', 'Relationships', 'Health', 'Future & Goals', 'Just feeling off', 'Nothing specific'],
    cardColor: '#FBF2EB',
    accentColor: '#d95f02',
  },
  {
    id: 'wellness',
    text: 'Have you taken care of',
    highlightWord: 'yourself?',
    highlightColor: '#F1F0F7',
    icon: Droplet,
    type: 'buttons',
    options: ['Yes, both!', 'Just ate', 'Just drank water', 'Not really', 'I forgot to'],
    cardColor: '#F1F0F7',
    accentColor: '#7570b3',
  },
  {
    id: 'positive',
    text: 'What felt',
    highlightWord: 'good today?',
    highlightColor: '#87CEFA',
    icon: Sun,
    type: 'buttons',
    options: ['Exercised', 'Talked to someone', 'Got some rest', 'Completed a task', 'Self-care', 'Nothing yet'],
    cardColor: '#E8F4FD',
    accentColor: '#2563eb',
  },
];

export const NameInputScreen: React.FC<NameInputScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'name' | 'questions' | 'review' | number>(0);
  const [name, setName] = useState('Friend');
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [scaleValue, setScaleValue] = useState(5);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  const currentQuestionIndex = typeof step === 'number' ? step : -1;
  const currentQuestion = currentQuestionIndex >= 0 ? QUESTIONS[currentQuestionIndex] : null;

  // Entrance animations
  useEffect(() => {
    if (!contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: PREMIUM_DURATION.normal, ease: PREMIUM_EASE.expoOut }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [step]);

  // Breathing animation for orbs
  useEffect(() => {
    if (!orb1Ref.current || !orb2Ref.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to([orb1Ref.current, orb2Ref.current], {
      scale: 1.1,
      duration: 4,
      ease: 'sine.inOut',
      stagger: 0.3,
    });

    return () => { tl.kill(); };
  }, []);

  const handleQuestionSubmit = () => {
    if (currentQuestionIndex >= 0) {
      const question = QUESTIONS[currentQuestionIndex];
      let value: string | number;

      if (question.type === 'scale') {
        value = scaleValue;
      } else if (question.type === 'buttons') {
        value = answers[question.id] || '';
      } else {
        value = '';
      }

      const updatedAnswers = { ...answers, [question.id]: value };
      setAnswers(updatedAnswers);

      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setStep(currentQuestionIndex + 1);
        setScaleValue(5);
      } else {
        setStep('review');
      }
    }
  };

  const handleReviewComplete = () => {
    onComplete({
      name: name.trim(),
      feeling: (answers.feeling as number) || scaleValue,
      thoughts: (answers.thoughts as string) || '',
      wellness: (answers.wellness as string) || '',
      positive: (answers.positive as string) || '',
    });
  };

  const canSubmit = () => {
    if (currentQuestion) {
      if (currentQuestion.type === 'scale') return true;
      if (currentQuestion.type === 'buttons') return !!answers[currentQuestion.id];
    }
    return false;
  };

  const IconComponent = currentQuestion?.icon || Heart;
  const accentColor = currentQuestion?.accentColor || '#A54452';
  const cardColor = currentQuestion?.cardColor || '#F9E0E3';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Particles background */}
      <Particles
        className="absolute inset-0"
        quantity={100}
        color="#000000"
        size={0.5}
        staticity={50}
        ease={60}
      />

      {/* Subtle gradient orbs */}
      <div
        ref={orb1Ref}
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(142, 85, 114, 0.25) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.4,
          top: '-10%',
          right: '-5%',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={orb2Ref}
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(187, 190, 100, 0.2) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.4,
          bottom: '-10%',
          left: '-5%',
          pointerEvents: 'none',
        }}
      />

      {/* Logo - Top Left (matching landing page) */}
      <div
        style={{
          position: 'absolute',
          top: '5rem',
          left: '5rem',
          width: '160px',
          height: '160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <SpinningText duration={12} radius={6} className="landing-spinning-text">
          {`Private • Secure • Caring • Always with you • `}
        </SpinningText>
        <div
          style={{
            position: 'absolute',
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: '1.5rem',
            fontWeight: 500,
            color: '#1a1a1a',
            letterSpacing: '-0.02em',
          }}
        >
          <TypingAnimation duration={150} delay={300} cursorStyle="line">
            Empath
          </TypingAnimation>
        </div>
      </div>

      {/* Progress dots */}
      {step !== 'review' && currentQuestionIndex >= 0 && (
        <div
          style={{
            position: 'absolute',
            top: '3rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.75rem',
            zIndex: 10,
          }}
        >
          {QUESTIONS.map((q, i) => (
            <div
              key={q.id}
              style={{
                width: i === currentQuestionIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '100px',
                background: i <= currentQuestionIndex ? accentColor : 'rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        ref={contentRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
          maxWidth: step === 'review' ? '700px' : '600px',
          width: '100%',
          zIndex: 1,
        }}
      >
        {step !== 'review' && currentQuestion && (
          <>
            {/* Question */}
            <h1
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 500,
                lineHeight: 1.3,
                color: '#000000',
                margin: '0 0 2.5rem',
                letterSpacing: '-0.01em',
              }}
            >
              {currentQuestion.text} {currentQuestion.highlightWord}
            </h1>

            {/* Interactive Scale Slider */}
            {currentQuestion.type === 'scale' && (
              <div style={{ width: '100%', maxWidth: '500px', marginBottom: '2.5rem' }}>
                {/* Slider container */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '56px',
                    borderRadius: '16px',
                    background: cardColor,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: `0 4px 20px ${cardColor}80`,
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, x / rect.width));
                    const value = Math.round(percentage * 9) + 1;
                    setScaleValue(value);
                  }}
                  onMouseMove={(e) => {
                    if (e.buttons === 1) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, x / rect.width));
                      const value = Math.round(percentage * 9) + 1;
                      setScaleValue(value);
                    }
                  }}
                >
                  {/* Fill bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${(scaleValue / 10) * 100}%`,
                      background: `linear-gradient(90deg, ${accentColor}dd 0%, ${accentColor} 100%)`,
                      borderRadius: '16px',
                      transition: 'width 0.15s ease-out',
                      boxShadow: `0 0 20px ${accentColor}40`,
                    }}
                  />
                  {/* Scale markers */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 12px',
                      pointerEvents: 'none',
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <span
                        key={num}
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: num === scaleValue ? 700 : 400,
                          color: num <= scaleValue ? 'white' : accentColor,
                          opacity: num <= scaleValue ? 1 : 0.6,
                          transition: 'all 0.15s ease',
                          zIndex: 1,
                          minWidth: '20px',
                          textAlign: 'center',
                        }}
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Label */}
                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '1rem', textAlign: 'center' }}>
                  {scaleValue <= 3 ? 'Not so great' : scaleValue <= 6 ? 'Okay' : scaleValue <= 8 ? 'Pretty good' : 'Great!'}
                </div>
              </div>
            )}

            {/* Button options - Bento Grid style with CoolMode */}
            {currentQuestion.type === 'buttons' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '2.5rem',
                  width: '100%',
                  maxWidth: '500px',
                }}
              >
                {currentQuestion.options?.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option;
                  return (
                    <CoolMode key={option} options={{ particleCount: 30, speedUp: 6 }}>
                      <button
                        type="button"
                        onClick={() => setAnswers({ ...answers, [currentQuestion.id]: option })}
                        style={{
                          padding: '1rem 0.75rem',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#1a1a1a' : 'white',
                          background: isSelected ? '#87CEFA' : '#1a1a1a',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected
                            ? '0 8px 24px rgba(135, 206, 250, 0.4)'
                            : '0 4px 12px rgba(0, 0, 0, 0.15)',
                          width: '100%',
                          minHeight: '56px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                        }}
                      >
                        {option}
                      </button>
                    </CoolMode>
                  );
                })}
              </div>
            )}

            {/* Continue button */}
            <button
              onClick={handleQuestionSubmit}
              disabled={!canSubmit()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 2.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: canSubmit() ? 'white' : '#999',
                background: canSubmit() ? '#1a1a1a' : 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: '12px',
                cursor: canSubmit() ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                boxShadow: canSubmit() ? '0 8px 24px rgba(0, 0, 0, 0.2)' : 'none',
              }}
            >
              <span>{currentQuestionIndex < QUESTIONS.length - 1 ? 'Continue' : 'Review'}</span>
              <ArrowRight size={18} />
            </button>
          </>
        )}

        {/* Review Screen */}
        {step === 'review' && (
          <>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: '#87CEFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '2rem',
                boxShadow: '0 8px 32px rgba(135, 206, 250, 0.4)',
              }}
            >
              <CheckCircle2 size={28} style={{ color: '#1a1a1a' }} />
            </div>

            <h1
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 500,
                color: '#000000',
                margin: '0 0 2rem',
              }}
            >
              Ready to{' '}
              <Highlighter action="highlight" color="#87CEFA">
                begin?
              </Highlighter>
            </h1>

            {/* Summary cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
              {QUESTIONS.map((q) => {
                const value = answers[q.id];
                const Icon = q.icon;
                return (
                  <div
                    key={q.id}
                    style={{
                      padding: '1rem 1.5rem',
                      background: q.cardColor,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      minWidth: '140px',
                    }}
                  >
                    <Icon size={18} style={{ color: q.accentColor }} />
                    <span style={{ fontSize: '0.875rem', color: q.accentColor, fontWeight: 500 }}>
                      {q.type === 'scale' ? `${value}/10` : value || '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleReviewComplete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 2.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'white',
                background: '#1a1a1a',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              }}
            >
              <span>Start chatting</span>
              <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NameInputScreen;
