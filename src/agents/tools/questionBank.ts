/**
 * Question Bank Tool
 *
 * Context-aware therapeutic question generation combining:
 * - Pre-defined question templates by emotion/condition
 * - Optional LLM rephrasing for natural delivery
 * - Session context awareness
 */

import type { EmotionLabel } from '../../types/emotion';
import {
  QuestionCategory,
  ClinicalCondition,
  TherapeuticQuestion,
  SessionState,
  PatternMatch
} from '../types';

// ============================================================================
// QUESTION TEMPLATES BY EMOTION
// ============================================================================

let questionIdCounter = 0;
const generateId = () => `q_${++questionIdCounter}`;

/**
 * Questions organized by the emotion they're designed to explore.
 */
export const EMOTION_QUESTIONS: Record<EmotionLabel, TherapeuticQuestion[]> = {
  sad: [
    {
      id: generateId(),
      text: "What's weighing on you the most right now?",
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad'],
      conditions: [ClinicalCondition.DEPRESSION, ClinicalCondition.GRIEF],
      followUps: [
        'How long have you been feeling this way?',
        'What does this sadness feel like in your body?'
      ],
      avoidWhen: ['crisis_mode', 'first_5_minutes'],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Can you tell me more about what brought this sadness up today?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad'],
      conditions: [ClinicalCondition.DEPRESSION, ClinicalCondition.GRIEF],
      followUps: [
        'Is this connected to something specific?',
        'When did you first notice this feeling today?'
      ],
      avoidWhen: ['topic_recently_discussed'],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'How has this been affecting your daily life?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad'],
      conditions: [ClinicalCondition.DEPRESSION],
      followUps: [
        'What activities have been most difficult?',
        'How is your sleep and appetite?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'What helps you get through the difficult moments?',
      category: QuestionCategory.COPING,
      targetEmotions: ['sad'],
      conditions: [ClinicalCondition.DEPRESSION, ClinicalCondition.GRIEF],
      followUps: [
        'Have you been able to use those strategies lately?',
        'What makes it hard to use your coping skills?'
      ],
      avoidWhen: ['crisis_mode'],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Who in your life can you turn to when you feel this way?',
      category: QuestionCategory.COPING,
      targetEmotions: ['sad'],
      conditions: [ClinicalCondition.DEPRESSION, ClinicalCondition.GRIEF],
      followUps: [
        'Have you reached out to them recently?',
        'What holds you back from reaching out?'
      ],
      avoidWhen: [],
      llmRephrased: false
    }
  ],

  happy: [
    {
      id: generateId(),
      text: 'I notice you seem lighter today. What\'s contributing to that?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['happy'],
      conditions: [],
      followUps: [
        'How can we build on this positive moment?',
        'What helped create this shift?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'What\'s been going well for you recently?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['happy'],
      conditions: [],
      followUps: [
        'How does it feel to acknowledge these positive aspects?',
        'What role did you play in making this happen?'
      ],
      avoidWhen: ['crisis_mode'],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'How does this positive feeling compare to how you\'ve been feeling lately?',
      category: QuestionCategory.CLARIFICATION,
      targetEmotions: ['happy'],
      conditions: [ClinicalCondition.BIPOLAR, ClinicalCondition.DEPRESSION],
      followUps: [
        'Has anything changed that might explain this shift?',
        'How sustainable does this feeling seem?'
      ],
      avoidWhen: [],
      llmRephrased: false
    }
  ],

  surprise: [
    {
      id: generateId(),
      text: 'Something unexpected seems to have come up. Would you like to explore that?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['surprise'],
      conditions: [ClinicalCondition.ANXIETY, ClinicalCondition.PTSD],
      followUps: [
        'What just came to mind?',
        'How are you feeling about what came up?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'I noticed a shift just now. What are you experiencing?',
      category: QuestionCategory.EMOTION_PROBE,
      targetEmotions: ['surprise'],
      conditions: [ClinicalCondition.ANXIETY, ClinicalCondition.PTSD],
      followUps: [
        'Take a moment. What do you notice in your body?',
        'Does this remind you of anything?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'What thoughts just went through your mind?',
      category: QuestionCategory.CLARIFICATION,
      targetEmotions: ['surprise'],
      conditions: [ClinicalCondition.ANXIETY],
      followUps: [
        'How intense was that thought?',
        'Where did that thought lead you?'
      ],
      avoidWhen: [],
      llmRephrased: false
    }
  ],

  neutral: [
    {
      id: generateId(),
      text: 'What would you like to focus on in our time today?',
      category: QuestionCategory.OPENING,
      targetEmotions: ['neutral'],
      conditions: [],
      followUps: [
        'What feels most pressing right now?',
        'Is there something on your mind we haven\'t addressed?'
      ],
      avoidWhen: ['mid_session'],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'How have things been since we last met?',
      category: QuestionCategory.OPENING,
      targetEmotions: ['neutral'],
      conditions: [],
      followUps: [
        'Any significant changes or events?',
        'How did you handle any challenges that came up?'
      ],
      avoidWhen: ['mid_session', 'crisis_mode'],
      minSessionTime: 0,
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Is there anything you\'ve been holding back that you\'d like to share?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['neutral'],
      conditions: [],
      followUps: [
        'What makes it hard to bring that up?',
        'How does it feel to say that out loud?'
      ],
      avoidWhen: ['first_5_minutes'],
      minSessionTime: 300,
      llmRephrased: false
    }
  ]
};

// ============================================================================
// QUESTIONS BY CONDITION
// ============================================================================

export const CONDITION_QUESTIONS: Record<ClinicalCondition, TherapeuticQuestion[]> = {
  depression: [
    {
      id: generateId(),
      text: 'How has your sleep been this past week?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad', 'neutral'],
      conditions: [ClinicalCondition.DEPRESSION],
      followUps: [
        'Are you sleeping more or less than usual?',
        'How do you feel when you wake up?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Have you noticed any changes in your appetite or eating?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad', 'neutral'],
      conditions: [ClinicalCondition.DEPRESSION],
      followUps: [
        'Are you eating more or less than usual?',
        'Do you find yourself comfort eating or losing interest in food?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'What activities have you been doing for enjoyment lately?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad', 'neutral'],
      conditions: [ClinicalCondition.DEPRESSION],
      followUps: [
        'Have those activities felt as enjoyable as they used to?',
        'What gets in the way of doing things you enjoy?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'How would you describe your energy levels?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad', 'neutral'],
      conditions: [ClinicalCondition.DEPRESSION],
      followUps: [
        'What time of day is hardest for you?',
        'What helps when your energy is low?'
      ],
      avoidWhen: [],
      llmRephrased: false
    }
  ],

  anxiety: [
    {
      id: generateId(),
      text: 'What has been worrying you the most lately?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['surprise', 'neutral'],
      conditions: [ClinicalCondition.ANXIETY],
      followUps: [
        'How often do these worries come up?',
        'What do you do when the worry becomes intense?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Have you noticed any physical symptoms when you\'re anxious?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['surprise', 'neutral'],
      conditions: [ClinicalCondition.ANXIETY],
      followUps: [
        'Where do you feel it in your body?',
        'What helps calm those physical sensations?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Are there situations you\'ve been avoiding because of anxiety?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['surprise', 'neutral'],
      conditions: [ClinicalCondition.ANXIETY],
      followUps: [
        'How has that avoidance affected your life?',
        'What would it take to face one of those situations?'
      ],
      avoidWhen: [],
      llmRephrased: false
    }
  ],

  ptsd: [
    {
      id: generateId(),
      text: 'Have you noticed any triggers this week?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['surprise', 'sad'],
      conditions: [ClinicalCondition.PTSD],
      followUps: [
        'What happened when you encountered that trigger?',
        'How did you manage in that moment?'
      ],
      avoidWhen: ['first_5_minutes'],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'How safe do you feel in your current environment?',
      category: QuestionCategory.SAFETY,
      targetEmotions: ['surprise', 'sad', 'neutral'],
      conditions: [ClinicalCondition.PTSD],
      followUps: [
        'What would help you feel safer?',
        'Are there times when you feel more safe than others?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Have you been having any intrusive memories or flashbacks?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['surprise', 'sad'],
      conditions: [ClinicalCondition.PTSD],
      followUps: [
        'What brings you back to the present when that happens?',
        'How have you been managing those experiences?'
      ],
      avoidWhen: ['first_5_minutes'],
      llmRephrased: false
    }
  ],

  bipolar: [
    {
      id: generateId(),
      text: 'How would you describe your mood over the past week?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['happy', 'sad', 'neutral'],
      conditions: [ClinicalCondition.BIPOLAR],
      followUps: [
        'Have there been any significant shifts?',
        'What pattern do you notice in your moods?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'How has your sleep pattern been?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['happy', 'neutral'],
      conditions: [ClinicalCondition.BIPOLAR],
      followUps: [
        'Have you felt like you need less sleep than usual?',
        'Are you waking up earlier than normal?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Have you felt unusually energetic or had racing thoughts?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['happy', 'surprise'],
      conditions: [ClinicalCondition.BIPOLAR],
      followUps: [
        'How long has this energy lasted?',
        'Have you made any impulsive decisions lately?'
      ],
      avoidWhen: [],
      llmRephrased: false
    }
  ],

  grief: [
    {
      id: generateId(),
      text: 'How has your grief been showing up for you lately?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad', 'neutral'],
      conditions: [ClinicalCondition.GRIEF],
      followUps: [
        'Are there particular times when it feels more intense?',
        'What helps you get through those difficult moments?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'What memories have been coming up for you?',
      category: QuestionCategory.EXPLORATION,
      targetEmotions: ['sad', 'happy'],
      conditions: [ClinicalCondition.GRIEF],
      followUps: [
        'How does it feel to think about those memories?',
        'Are there memories you want to share?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Who has been supporting you through this?',
      category: QuestionCategory.COPING,
      targetEmotions: ['sad', 'neutral'],
      conditions: [ClinicalCondition.GRIEF],
      followUps: [
        'How has that support felt?',
        'What kind of support do you need most right now?'
      ],
      avoidWhen: [],
      llmRephrased: false
    }
  ],

  crisis: [
    {
      id: generateId(),
      text: 'I want to check in - are you having any thoughts of hurting yourself?',
      category: QuestionCategory.SAFETY,
      targetEmotions: ['sad'],
      conditions: [ClinicalCondition.CRISIS],
      followUps: [
        'Can you tell me more about those thoughts?',
        'Do you have a plan?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'On a scale of 1-10, how safe do you feel right now?',
      category: QuestionCategory.SAFETY,
      targetEmotions: ['sad', 'neutral'],
      conditions: [ClinicalCondition.CRISIS],
      followUps: [
        'What would help you feel safer?',
        'What\'s keeping you at that number and not lower?'
      ],
      avoidWhen: [],
      llmRephrased: false
    },
    {
      id: generateId(),
      text: 'Who can you reach out to tonight if you need support?',
      category: QuestionCategory.SAFETY,
      targetEmotions: ['sad', 'neutral'],
      conditions: [ClinicalCondition.CRISIS],
      followUps: [
        'Do you have their number accessible?',
        'What would make it easier to reach out?'
      ],
      avoidWhen: [],
      llmRephrased: false
    }
  ]
};

// ============================================================================
// QUESTION BANK CLASS
// ============================================================================

export interface QuestionBankConfig {
  /** Minimum session time before certain questions (seconds) */
  defaultMinSessionTime: number;
  /** Enable LLM rephrasing of questions */
  enableLLMRephrasing: boolean;
  /** Topics already discussed this session (for avoidance) */
  discussedTopics: string[];
}

const DEFAULT_CONFIG: QuestionBankConfig = {
  defaultMinSessionTime: 60,
  enableLLMRephrasing: true,
  discussedTopics: []
};

export class QuestionBank {
  private config: QuestionBankConfig;
  private usedQuestionIds: Set<string> = new Set();

  constructor(config: Partial<QuestionBankConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get questions appropriate for the current emotion.
   */
  getQuestionsForEmotion(
    emotion: EmotionLabel,
    confidence: number,
    sessionContext: {
      sessionTimeSeconds: number;
      isInCrisis: boolean;
      recentTopics: string[];
    }
  ): TherapeuticQuestion[] {
    const questions = EMOTION_QUESTIONS[emotion] || [];

    return questions.filter(q => {
      // Check minimum session time
      if (q.minSessionTime && sessionContext.sessionTimeSeconds < q.minSessionTime) {
        return false;
      }

      // Check avoidance conditions
      if (sessionContext.isInCrisis && q.avoidWhen.includes('crisis_mode')) {
        return false;
      }

      if (sessionContext.sessionTimeSeconds < 300 && q.avoidWhen.includes('first_5_minutes')) {
        return false;
      }

      if (sessionContext.sessionTimeSeconds > 600 && q.avoidWhen.includes('mid_session')) {
        return false;
      }

      // Check if topic was recently discussed
      if (q.avoidWhen.includes('topic_recently_discussed')) {
        // Simple heuristic - check if question keywords overlap with recent topics
        const questionWords = q.text.toLowerCase().split(/\s+/);
        const hasOverlap = sessionContext.recentTopics.some(topic =>
          questionWords.some(word => topic.toLowerCase().includes(word))
        );
        if (hasOverlap) return false;
      }

      // Avoid repeating questions
      if (this.usedQuestionIds.has(q.id)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get questions for a specific clinical condition.
   */
  getQuestionsForCondition(
    condition: ClinicalCondition,
    sessionContext?: {
      sessionTimeSeconds: number;
      isInCrisis: boolean;
    }
  ): TherapeuticQuestion[] {
    const questions = CONDITION_QUESTIONS[condition] || [];

    if (!sessionContext) return questions;

    return questions.filter(q => {
      if (q.minSessionTime && sessionContext.sessionTimeSeconds < q.minSessionTime) {
        return false;
      }
      if (this.usedQuestionIds.has(q.id)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get questions based on detected patterns.
   */
  getQuestionsForPatterns(
    patterns: PatternMatch[],
    sessionContext: {
      sessionTimeSeconds: number;
      isInCrisis: boolean;
      recentTopics: string[];
    }
  ): TherapeuticQuestion[] {
    const allQuestions: TherapeuticQuestion[] = [];

    for (const match of patterns) {
      const conditionQuestions = this.getQuestionsForCondition(
        match.pattern.condition,
        sessionContext
      );

      // Prioritize questions based on pattern confidence
      for (const q of conditionQuestions) {
        if (!allQuestions.find(existing => existing.id === q.id)) {
          allQuestions.push(q);
        }
      }
    }

    return allQuestions;
  }

  /**
   * Get follow-up questions based on previous topic and emotion shift.
   */
  getFollowUpQuestions(
    previousTopic: string,
    emotionShift?: { from: EmotionLabel; to: EmotionLabel }
  ): TherapeuticQuestion[] {
    const followUps: TherapeuticQuestion[] = [];

    // If there was an emotion shift, get questions for the new emotion
    if (emotionShift && emotionShift.from !== emotionShift.to) {
      const shiftQuestions = EMOTION_QUESTIONS[emotionShift.to] || [];

      // Add a transition-aware question
      followUps.push({
        id: generateId(),
        text: `I noticed a shift in how you seem to be feeling. What just came up for you?`,
        category: QuestionCategory.EMOTION_PROBE,
        targetEmotions: [emotionShift.to],
        conditions: [],
        followUps: [],
        avoidWhen: [],
        llmRephrased: false
      });

      followUps.push(...shiftQuestions.slice(0, 2));
    }

    return followUps;
  }

  /**
   * Get opening questions for session start.
   */
  getOpeningQuestions(): TherapeuticQuestion[] {
    return [
      ...EMOTION_QUESTIONS.neutral.filter(q => q.category === QuestionCategory.OPENING),
      {
        id: generateId(),
        text: 'Before we begin, how are you arriving today?',
        category: QuestionCategory.OPENING,
        targetEmotions: ['neutral'],
        conditions: [],
        followUps: ['What\'s present for you right now?'],
        avoidWhen: [],
        llmRephrased: false
      }
    ];
  }

  /**
   * Get closing questions for session end.
   */
  getClosingQuestions(): TherapeuticQuestion[] {
    return [
      {
        id: generateId(),
        text: 'As we wrap up, what are you taking away from our session today?',
        category: QuestionCategory.CLOSING,
        targetEmotions: ['neutral', 'happy'],
        conditions: [],
        followUps: [],
        avoidWhen: ['crisis_mode'],
        llmRephrased: false
      },
      {
        id: generateId(),
        text: 'Is there anything we didn\'t get to that you\'d like to address next time?',
        category: QuestionCategory.CLOSING,
        targetEmotions: ['neutral'],
        conditions: [],
        followUps: [],
        avoidWhen: [],
        llmRephrased: false
      },
      {
        id: generateId(),
        text: 'What\'s one thing you can do for yourself between now and our next session?',
        category: QuestionCategory.CLOSING,
        targetEmotions: ['neutral', 'happy'],
        conditions: [],
        followUps: [],
        avoidWhen: ['crisis_mode'],
        llmRephrased: false
      }
    ];
  }

  /**
   * Get safety-focused questions (for elevated risk).
   */
  getSafetyQuestions(): TherapeuticQuestion[] {
    return CONDITION_QUESTIONS.crisis.filter(q => q.category === QuestionCategory.SAFETY);
  }

  /**
   * Mark a question as used (to avoid repetition).
   */
  markQuestionUsed(questionId: string): void {
    this.usedQuestionIds.add(questionId);
  }

  /**
   * Reset used questions (e.g., for new session).
   */
  resetUsedQuestions(): void {
    this.usedQuestionIds.clear();
  }

  /**
   * Update discussed topics.
   */
  updateDiscussedTopics(topics: string[]): void {
    this.config.discussedTopics = topics;
  }

  /**
   * Get all questions as a flat array.
   */
  getAllQuestions(): TherapeuticQuestion[] {
    const all: TherapeuticQuestion[] = [];

    for (const questions of Object.values(EMOTION_QUESTIONS)) {
      all.push(...questions);
    }

    for (const questions of Object.values(CONDITION_QUESTIONS)) {
      for (const q of questions) {
        if (!all.find(existing => existing.id === q.id)) {
          all.push(q);
        }
      }
    }

    return all;
  }
}

// ============================================================================
// LLM REPHRASING HELPERS
// ============================================================================

/**
 * Template for LLM to rephrase questions naturally.
 */
export function createRephrasingPrompt(
  question: TherapeuticQuestion,
  context: {
    patientName?: string;
    currentEmotion: EmotionLabel;
    sessionContext: string;
  }
): string {
  return `You are helping a therapist phrase a question naturally for their patient.

Original question: "${question.text}"

Context:
- Patient appears to be feeling: ${context.currentEmotion}
- Session context: ${context.sessionContext}
${context.patientName ? `- Patient's name: ${context.patientName}` : ''}

Rephrase this question to sound natural, warm, and therapeutically appropriate.
Keep the same intent and clinical purpose.
Output ONLY the rephrased question, nothing else.`;
}

/**
 * Categories with their descriptions.
 */
export const CATEGORY_DESCRIPTIONS: Record<QuestionCategory, string> = {
  [QuestionCategory.OPENING]: 'Questions to begin the session and establish rapport',
  [QuestionCategory.EXPLORATION]: 'Questions to explore thoughts, feelings, and experiences',
  [QuestionCategory.CLARIFICATION]: 'Questions to understand specific aspects more deeply',
  [QuestionCategory.EMOTION_PROBE]: 'Questions to explore emotional experiences',
  [QuestionCategory.COPING]: 'Questions about coping strategies and resources',
  [QuestionCategory.SAFETY]: 'Questions to assess safety and risk',
  [QuestionCategory.CLOSING]: 'Questions to wrap up the session'
};
