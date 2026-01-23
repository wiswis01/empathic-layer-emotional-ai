/**
 * NameInputScreen Component
 *
 * Beautiful floating name input screen with companion questions.
 * Matches landing page aesthetic with white wash design.
 * Questions flow one after the other.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, Heart, Brain, Droplet, Sun, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import { PREMIUM_EASE, PREMIUM_DURATION } from '@/hooks/useGsap';

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
  icon: React.ComponentType<{ size?: number }>;
  type: 'text' | 'scale' | 'buttons';
  placeholder?: string;
  options?: string[];
}

const QUESTIONS: Question[] = [
  {
    id: 'feeling',
    text: 'How are you feeling right now?',
    icon: Heart,
    type: 'scale',
  },
  {
    id: 'thoughts',
    text: "What's on your mind most today?",
    icon: Brain,
    type: 'buttons',
    options: ['Work / School', 'Relationships', 'Health', 'Future & Goals', 'Just feeling off', 'Nothing specific'],
  },
  {
    id: 'wellness',
    text: 'Have you eaten well and stayed hydrated?',
    icon: Droplet,
    type: 'buttons',
    options: ['Yes, both!', 'Just ate', 'Just drank water', 'Not really', 'I forgot to'],
  },
  {
    id: 'positive',
    text: 'What did you do today that felt good or helpful?',
    icon: Sun,
    type: 'buttons',
    options: ['Exercised', 'Talked to someone', 'Got some rest', 'Completed a task', 'Self-care', 'Nothing yet'],
  },
];

export const NameInputScreen: React.FC<NameInputScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'name' | 'questions' | 'review' | number>('name');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isFocused, setIsFocused] = useState(false);
  const [scaleValue, setScaleValue] = useState(5);
  const [, setCurrentInputValue] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  const currentQuestionIndex = typeof step === 'number' ? step : -1;
  const currentQuestion = currentQuestionIndex >= 0 ? QUESTIONS[currentQuestionIndex] : null;

  // Entrance animations
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: PREMIUM_EASE.expoOut },
      });

      if (step === 'name') {
        tl.from(titleRef.current, {
          opacity: 0,
          y: 40,
          duration: PREMIUM_DURATION.slow,
        });

        tl.from(
          inputRef.current,
          {
            opacity: 0,
            y: 20,
            duration: PREMIUM_DURATION.normal,
          },
          '-=0.3'
        );

        tl.from(
          buttonRef.current,
          {
            opacity: 0,
            y: 20,
            duration: PREMIUM_DURATION.normal,
          },
          '-=0.2'
        );
      } else if (step === 'review') {
        tl.from(titleRef.current, {
          opacity: 0,
          y: 40,
          duration: PREMIUM_DURATION.slow,
        });

        tl.from(
          '.review-item',
          {
            opacity: 0,
            y: 20,
            duration: PREMIUM_DURATION.normal,
            stagger: 0.1,
          },
          '-=0.3'
        );

        tl.from(
          buttonRef.current,
          {
            opacity: 0,
            y: 20,
            duration: PREMIUM_DURATION.normal,
          },
          '-=0.2'
        );
      } else if (currentQuestion) {
        // Animate question entrance
        tl.from(titleRef.current, {
          opacity: 0,
          y: 40,
          duration: PREMIUM_DURATION.slow,
        });

        if (currentQuestion.type === 'scale') {
          tl.from(
            '.scale-container',
            {
              opacity: 0,
              y: 20,
              duration: PREMIUM_DURATION.normal,
            },
            '-=0.3'
          );
        } else if (currentQuestion.type === 'buttons') {
          tl.from(
            '.buttons-container',
            {
              opacity: 0,
              y: 20,
              duration: PREMIUM_DURATION.normal,
            },
            '-=0.3'
          );
        } else {
          tl.from(
            inputRef.current,
            {
              opacity: 0,
              y: 20,
              duration: PREMIUM_DURATION.normal,
            },
            '-=0.3'
          );
        }

        tl.from(
          buttonRef.current,
          {
            opacity: 0,
            y: 20,
            duration: PREMIUM_DURATION.normal,
          },
          '-=0.2'
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [step, currentQuestion]);

  // Breathing animation for orbs
  useEffect(() => {
    if (!orb1Ref.current || !orb2Ref.current) return;

    const tl = gsap.timeline({
      repeat: -1,
      yoyo: true,
    });

    tl.to([orb1Ref.current, orb2Ref.current], {
      scale: 1.1,
      duration: 4,
      ease: 'sine.inOut',
      stagger: 0.3,
    });

    return () => {
      tl.kill();
    };
  }, []);

  // Focus input on mount and step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && (step === 'name' || (currentQuestion && currentQuestion.type === 'text'))) {
        inputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [step, currentQuestion]);

  // Reset current input value when question changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === 'text') {
      setCurrentInputValue('');
    }
  }, [currentQuestion]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setStep('questions');
      setStep(0); // Start with first question
    }
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentQuestionIndex >= 0) {
      const question = QUESTIONS[currentQuestionIndex];
      let value: string | number;

      if (question.type === 'scale') {
        value = scaleValue;
      } else if (question.type === 'buttons') {
        value = answers[question.id] || '';
      } else {
        value = inputRef.current?.value || '';
      }

      const updatedAnswers = {
        ...answers,
        [question.id]: value,
      };

      setAnswers(updatedAnswers);

      // Move to next question or show review
      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setStep(currentQuestionIndex + 1);
        setScaleValue(5); // Reset scale
        setCurrentInputValue(''); // Reset current input
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      } else {
        // All questions answered, show review screen
        setStep('review');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'name' && name.trim()) {
        handleNameSubmit(e);
      } else if (currentQuestion && currentQuestion.type === 'text' && inputRef.current?.value.trim()) {
        handleQuestionSubmit(e);
      } else if (currentQuestion && currentQuestion.type === 'scale') {
        handleQuestionSubmit(e);
      }
    }
  };

  const canSubmit = () => {
    if (step === 'name') {
      return name.trim().length > 0;
    }
    if (currentQuestion) {
      if (currentQuestion.type === 'scale') {
        return true; // Scale always has a value
      }
      if (currentQuestion.type === 'buttons') {
        return !!answers[currentQuestion.id]; // Button must be selected
      }
      return (inputRef.current?.value.trim() || '').length > 0;
    }
    return false;
  };

  const getCurrentInputValue = () => {
    if (step === 'name') {
      return name;
    }
    if (currentQuestion && currentQuestion.type === 'text') {
      return answers[currentQuestion.id] as string || '';
    }
    return '';
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

  const IconComponent = step === 'name' 
    ? Sparkles 
    : step === 'review'
      ? CheckCircle2
      : currentQuestion 
        ? currentQuestion.icon 
        : Sparkles;

  return (
    <>
      <style>{`
        .name-input-screen input:-webkit-autofill,
        .name-input-screen input:-webkit-autofill:hover,
        .name-input-screen input:-webkit-autofill:focus,
        .name-input-screen input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
          -webkit-text-fill-color: #443850 !important;
          background-color: #ffffff !important;
          background: #ffffff !important;
        }
        .name-input-screen input {
          background-color: #ffffff !important;
          background: #ffffff !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className="name-input-screen"
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
          zIndex: 1000,
        }}
      >
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

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
          maxWidth: step === 'review' ? '800px' : '700px',
          width: '100%',
          minHeight: '100vh',
          zIndex: 1,
        }}
      >
        {/* Floating question with icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '3rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8e5572 0%, #443850 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 24px rgba(142, 85, 114, 0.3)',
            }}
          >
            <IconComponent size={24} />
          </div>
          <h1
            ref={titleRef}
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              fontWeight: 400,
              lineHeight: 1.2,
              color: '#443850',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {step === 'name' 
              ? 'What is your name?' 
              : currentQuestion 
                ? currentQuestion.text 
                : 'What is your name?'}
          </h1>
        </div>

        {/* Progress indicator for questions */}
        {step !== 'name' && step !== 'review' && currentQuestionIndex >= 0 && (
          <div
            style={{
              marginBottom: '2rem',
              fontSize: '0.875rem',
              color: '#8e5572',
              fontWeight: 500,
            }}
          >
            Question {currentQuestionIndex + 1} of {QUESTIONS.length}
          </div>
        )}

        {/* Review Screen */}
        {step === 'review' && (
          <div style={{ width: '100%', marginBottom: '2rem' }}>
            {/* Name */}
            <div className="review-item" style={{
              padding: '1.5rem',
              marginBottom: '1rem',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(68, 56, 80, 0.15)',
              borderRadius: '16px',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Sparkles size={20} style={{ color: '#8e5572' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e5572', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Name
                </span>
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: 300, color: '#443850', margin: 0 }}>
                {name}
              </p>
            </div>

            {/* Feeling */}
            <div className="review-item" style={{
              padding: '1.5rem',
              marginBottom: '1rem',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(68, 56, 80, 0.15)',
              borderRadius: '16px',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Heart size={20} style={{ color: '#8e5572' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e5572', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  How you're feeling
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#8e5572',
                  lineHeight: 1,
                }}>
                  {answers.feeling as number || scaleValue}
                </div>
                <div style={{ fontSize: '1rem', color: '#443850' }}>/ 10</div>
              </div>
            </div>

            {/* Thoughts */}
            {answers.thoughts && (
              <div className="review-item" style={{
                padding: '1.5rem',
                marginBottom: '1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(68, 56, 80, 0.15)',
                borderRadius: '16px',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Brain size={20} style={{ color: '#8e5572' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e5572', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    What's on your mind
                  </span>
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 300, color: '#443850', margin: 0, lineHeight: 1.6 }}>
                  {answers.thoughts as string}
                </p>
              </div>
            )}

            {/* Wellness */}
            {answers.wellness && (
              <div className="review-item" style={{
                padding: '1.5rem',
                marginBottom: '1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(68, 56, 80, 0.15)',
                borderRadius: '16px',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Droplet size={20} style={{ color: '#8e5572' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e5572', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Wellness
                  </span>
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 300, color: '#443850', margin: 0, lineHeight: 1.6 }}>
                  {answers.wellness as string}
                </p>
              </div>
            )}

            {/* Positive */}
            {answers.positive && (
              <div className="review-item" style={{
                padding: '1.5rem',
                marginBottom: '1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(68, 56, 80, 0.15)',
                borderRadius: '16px',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Sun size={20} style={{ color: '#8e5572' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8e5572', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Something positive
                  </span>
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 300, color: '#443850', margin: 0, lineHeight: 1.6 }}>
                  {answers.positive as string}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Input form - only show if not on review */}
        {step !== 'review' && (
          <form 
            onSubmit={step === 'name' ? handleNameSubmit : handleQuestionSubmit} 
            style={{ width: '100%', maxWidth: '500px' }}
          >
          {step === 'name' ? (
            <div
              style={{
                position: 'relative',
                marginBottom: '2rem',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Type your name here..."
                autoFocus
                autoComplete="name"
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  fontSize: '1.125rem',
                  fontFamily: 'inherit',
                  fontWeight: 300,
                  color: '#443850',
                  background: '#ffffff',
                  border: `2px solid ${isFocused ? '#8e5572' : 'rgba(68, 56, 80, 0.25)'}`,
                  borderRadius: '16px',
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isFocused
                    ? '0 8px 24px rgba(142, 85, 114, 0.15)'
                    : '0 4px 12px rgba(0, 0, 0, 0.05)',
                  caretColor: '#8e5572',
                }}
              />
            </div>
          ) : currentQuestion?.type === 'scale' ? (
            <div className="scale-container" style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setScaleValue(num)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      fontSize: '1rem',
                      fontWeight: scaleValue === num ? 600 : 400,
                      color: scaleValue === num ? 'white' : '#8e5572',
                      background: scaleValue === num
                        ? 'linear-gradient(135deg, #8e5572 0%, #443850 100%)'
                        : 'rgba(142, 85, 114, 0.1)',
                      border: `1px solid ${scaleValue === num ? 'transparent' : 'rgba(142, 85, 114, 0.2)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (scaleValue !== num) {
                        e.currentTarget.style.background = 'rgba(142, 85, 114, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (scaleValue !== num) {
                        e.currentTarget.style.background = 'rgba(142, 85, 114, 0.1)';
                      }
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  color: '#443850',
                  marginTop: '0.5rem',
                }}
              >
                Selected: {scaleValue}/10
              </div>
            </div>
          ) : currentQuestion?.type === 'buttons' ? (
            <div className="buttons-container" style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                {currentQuestion.options?.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setAnswers({ ...answers, [currentQuestion.id]: option });
                      }}
                      style={{
                        padding: '0.875rem 1.5rem',
                        fontSize: '0.95rem',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'white' : '#443850',
                        background: isSelected
                          ? 'linear-gradient(135deg, #8e5572 0%, #443850 100%)'
                          : 'rgba(255, 255, 255, 0.9)',
                        border: `2px solid ${isSelected ? 'transparent' : 'rgba(142, 85, 114, 0.25)'}`,
                        borderRadius: '100px',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isSelected
                          ? '0 4px 16px rgba(142, 85, 114, 0.3)'
                          : '0 2px 8px rgba(0, 0, 0, 0.05)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(142, 85, 114, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(142, 85, 114, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                          e.currentTarget.style.borderColor = 'rgba(142, 85, 114, 0.25)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {answers[currentQuestion.id] && (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#8e5572',
                    marginTop: '1rem',
                    fontWeight: 500,
                  }}
                >
                  {answers[currentQuestion.id]}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                marginBottom: '2rem',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                defaultValue={getCurrentInputValue()}
                onChange={(e) => {
                  setCurrentInputValue(e.target.value);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={currentQuestion?.placeholder || 'Share your thoughts...'}
                autoFocus
                maxLength={500}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  fontSize: '1.125rem',
                  fontFamily: 'inherit',
                  fontWeight: 300, // Thinner font weight
                  color: '#443850',
                  background: '#ffffff',
                  border: `2px solid ${isFocused ? '#8e5572' : 'rgba(68, 56, 80, 0.25)'}`,
                  borderRadius: '16px',
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isFocused
                    ? '0 8px 24px rgba(142, 85, 114, 0.15)'
                    : '0 4px 12px rgba(0, 0, 0, 0.05)',
                  caretColor: '#8e5572',
                }}
              />
            </div>
          )}

          <button
            ref={buttonRef}
            type="submit"
            disabled={!canSubmit()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: canSubmit() ? 'white' : '#8e5572',
              background: canSubmit()
                ? 'linear-gradient(135deg, #8e5572 0%, #443850 100%)'
                : 'rgba(142, 85, 114, 0.15)',
              border: canSubmit() ? 'none' : '2px solid rgba(142, 85, 114, 0.3)',
              borderRadius: '100px',
              cursor: canSubmit() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: canSubmit() ? '0 4px 20px rgba(142, 85, 114, 0.3)' : 'none',
              opacity: 1,
            }}
            onMouseEnter={(e) => {
              if (canSubmit()) {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(142, 85, 114, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (canSubmit()) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(142, 85, 114, 0.3)';
              }
            }}
          >
            <span>{step === 'name' ? 'Continue' : currentQuestionIndex < QUESTIONS.length - 1 ? 'Next' : 'Review'}</span>
            <ArrowRight size={20} />
          </button>
        </form>
        )}

        {/* Review Complete Button */}
        {step === 'review' && (
          <button
            ref={buttonRef}
            onClick={handleReviewComplete}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #8e5572 0%, #443850 100%)',
              border: '2px solid #8e5572',
              borderRadius: '100px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 4px 20px rgba(142, 85, 114, 0.3)',
              opacity: 1,
              visibility: 'visible',
              position: 'relative',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(142, 85, 114, 0.4)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #9d6380 0%, #52495a 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(142, 85, 114, 0.3)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #8e5572 0%, #443850 100%)';
            }}
          >
            <span style={{ color: '#ffffff' }}>Start Chatting</span>
            <ArrowRight size={20} style={{ color: '#ffffff' }} />
          </button>
        )}

        <p
          style={{
            marginTop: '2rem',
            fontSize: '0.875rem',
            color: '#999999',
          }}
        >
          {step === 'name'
            ? 'Your name helps personalize the experience'
            : step === 'review'
              ? 'Everything looks good? Let\'s begin your empathetic chat experience'
              : 'Take your time, there\'s no rush'}
        </p>
      </div>
    </div>
    </>
  );
};

export default NameInputScreen;
