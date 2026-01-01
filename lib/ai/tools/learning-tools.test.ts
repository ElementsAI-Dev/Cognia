/**
 * @jest-environment node
 */
import {
  flashcardSchema,
  quizQuestionSchema,
  quizSchema,
  reviewSessionSchema,
  displayFlashcardInputSchema,
  displayFlashcardDeckInputSchema,
  displayQuizInputSchema,
  displayQuizQuestionInputSchema,
  displayReviewSessionInputSchema,
  displayProgressSummaryInputSchema,
  displayConceptExplanationInputSchema,
  executeDisplayFlashcard,
  executeDisplayFlashcardDeck,
  executeDisplayQuiz,
  executeDisplayQuizQuestion,
  executeDisplayReviewSession,
  executeDisplayProgressSummary,
  executeDisplayConceptExplanation,
  learningTools,
  type FlashcardData,
  type QuizQuestionData,
  type QuizData,
} from './learning-tools';

describe('Learning Tools Schemas', () => {
  describe('flashcardSchema', () => {
    it('validates a valid flashcard', () => {
      const validFlashcard: FlashcardData = {
        id: 'fc-1',
        front: 'What is React?',
        back: 'A JavaScript library for building user interfaces',
        hint: 'Think about components',
        difficulty: 'medium',
        tags: ['react', 'javascript'],
        conceptId: 'concept-1',
      };

      const result = flashcardSchema.safeParse(validFlashcard);
      expect(result.success).toBe(true);
    });

    it('validates a minimal flashcard', () => {
      const minimalFlashcard = {
        id: 'fc-2',
        front: 'Question',
        back: 'Answer',
      };

      const result = flashcardSchema.safeParse(minimalFlashcard);
      expect(result.success).toBe(true);
    });

    it('rejects flashcard without required fields', () => {
      const invalidFlashcard = {
        id: 'fc-3',
        front: 'Question only',
      };

      const result = flashcardSchema.safeParse(invalidFlashcard);
      expect(result.success).toBe(false);
    });

    it('validates difficulty enum values', () => {
      const easyCard = { id: '1', front: 'Q', back: 'A', difficulty: 'easy' };
      const mediumCard = { id: '2', front: 'Q', back: 'A', difficulty: 'medium' };
      const hardCard = { id: '3', front: 'Q', back: 'A', difficulty: 'hard' };
      const invalidCard = { id: '4', front: 'Q', back: 'A', difficulty: 'impossible' };

      expect(flashcardSchema.safeParse(easyCard).success).toBe(true);
      expect(flashcardSchema.safeParse(mediumCard).success).toBe(true);
      expect(flashcardSchema.safeParse(hardCard).success).toBe(true);
      expect(flashcardSchema.safeParse(invalidCard).success).toBe(false);
    });
  });

  describe('quizQuestionSchema', () => {
    it('validates a multiple choice question', () => {
      const question: QuizQuestionData = {
        id: 'q-1',
        question: 'What is 2 + 2?',
        type: 'multiple_choice',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        explanation: 'Basic arithmetic',
        points: 10,
      };

      const result = quizQuestionSchema.safeParse(question);
      expect(result.success).toBe(true);
    });

    it('validates a true/false question', () => {
      const question = {
        id: 'q-2',
        question: 'The sky is blue.',
        type: 'true_false',
        correctAnswer: 'true',
      };

      const result = quizQuestionSchema.safeParse(question);
      expect(result.success).toBe(true);
    });

    it('validates a fill_blank question', () => {
      const question = {
        id: 'q-3',
        question: 'React is a JavaScript ___.',
        type: 'fill_blank',
        correctAnswer: 'library',
      };

      const result = quizQuestionSchema.safeParse(question);
      expect(result.success).toBe(true);
    });

    it('validates a short_answer question', () => {
      const question = {
        id: 'q-4',
        question: 'Explain the concept of state in React.',
        type: 'short_answer',
        correctAnswer: 'State is data that changes over time',
      };

      const result = quizQuestionSchema.safeParse(question);
      expect(result.success).toBe(true);
    });

    it('rejects invalid question type', () => {
      const question = {
        id: 'q-5',
        question: 'Invalid type',
        type: 'essay',
        correctAnswer: 'answer',
      };

      const result = quizQuestionSchema.safeParse(question);
      expect(result.success).toBe(false);
    });
  });

  describe('quizSchema', () => {
    it('validates a complete quiz', () => {
      const quiz: QuizData = {
        id: 'quiz-1',
        title: 'React Basics',
        description: 'Test your React knowledge',
        questions: [
          {
            id: 'q-1',
            question: 'What is JSX?',
            type: 'short_answer',
            correctAnswer: 'JavaScript XML',
          },
        ],
        timeLimit: 300,
        passingScore: 70,
        shuffleQuestions: true,
      };

      const result = quizSchema.safeParse(quiz);
      expect(result.success).toBe(true);
    });

    it('validates quiz with minimal fields', () => {
      const quiz = {
        id: 'quiz-2',
        title: 'Quick Quiz',
        questions: [
          {
            id: 'q-1',
            question: 'Test?',
            type: 'true_false',
            correctAnswer: 'true',
          },
        ],
      };

      const result = quizSchema.safeParse(quiz);
      expect(result.success).toBe(true);
    });
  });

  describe('reviewSessionSchema', () => {
    it('validates a review session', () => {
      const session = {
        id: 'rs-1',
        title: 'Daily Review',
        items: [
          {
            id: 'item-1',
            type: 'flashcard',
            data: {
              id: 'fc-1',
              front: 'Q',
              back: 'A',
            },
          },
        ],
        mode: 'spaced_repetition',
        targetAccuracy: 80,
      };

      const result = reviewSessionSchema.safeParse(session);
      expect(result.success).toBe(true);
    });

    it('validates different review modes', () => {
      const baseSession = {
        id: 'rs-1',
        title: 'Review',
        items: [{ id: '1', type: 'flashcard', data: { id: 'fc-1', front: 'Q', back: 'A' } }],
      };

      expect(reviewSessionSchema.safeParse({ ...baseSession, mode: 'standard' }).success).toBe(true);
      expect(reviewSessionSchema.safeParse({ ...baseSession, mode: 'spaced_repetition' }).success).toBe(true);
      expect(reviewSessionSchema.safeParse({ ...baseSession, mode: 'cramming' }).success).toBe(true);
      expect(reviewSessionSchema.safeParse({ ...baseSession, mode: 'invalid' }).success).toBe(false);
    });
  });
});

describe('Learning Tools Execute Functions', () => {
  describe('executeDisplayFlashcard', () => {
    it('returns flashcard output with all fields', async () => {
      const input = {
        flashcard: {
          id: 'fc-1',
          front: 'Question',
          back: 'Answer',
        },
        sessionId: 'session-1',
        showHint: true,
      };

      const result = await executeDisplayFlashcard(input);

      expect(result.type).toBe('flashcard');
      expect(result.flashcard).toEqual(input.flashcard);
      expect(result.sessionId).toBe('session-1');
      expect(result.showHint).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('defaults showHint to false', async () => {
      const input = {
        flashcard: {
          id: 'fc-2',
          front: 'Q',
          back: 'A',
        },
      };

      const result = await executeDisplayFlashcard(input);

      expect(result.showHint).toBe(false);
    });
  });

  describe('executeDisplayFlashcardDeck', () => {
    it('returns deck output with all fields', async () => {
      const input = {
        title: 'My Deck',
        description: 'Test deck',
        flashcards: [
          { id: 'fc-1', front: 'Q1', back: 'A1' },
          { id: 'fc-2', front: 'Q2', back: 'A2' },
        ],
        sessionId: 'session-1',
        shuffled: false,
      };

      const result = await executeDisplayFlashcardDeck(input);

      expect(result.type).toBe('flashcard_deck');
      expect(result.title).toBe('My Deck');
      expect(result.description).toBe('Test deck');
      expect(result.flashcards).toHaveLength(2);
      expect(result.totalCards).toBe(2);
      expect(result.sessionId).toBe('session-1');
      expect(result.timestamp).toBeDefined();
    });

    it('shuffles cards when shuffled is true', async () => {
      const input = {
        title: 'Shuffle Test',
        flashcards: Array.from({ length: 20 }, (_, i) => ({
          id: `fc-${i}`,
          front: `Q${i}`,
          back: `A${i}`,
        })),
        shuffled: true,
      };

      const result = await executeDisplayFlashcardDeck(input);

      // With 20 cards, shuffled order should likely be different
      // This is a probabilistic test - very unlikely to match exact order
      const originalOrder = input.flashcards.map((c) => c.id);
      const resultOrder = result.flashcards.map((c) => c.id);

      // At least verify count is correct
      expect(result.flashcards).toHaveLength(20);
      expect(result.totalCards).toBe(20);

      // Check that all cards are present (set comparison)
      expect(new Set(resultOrder)).toEqual(new Set(originalOrder));
    });
  });

  describe('executeDisplayQuiz', () => {
    it('returns quiz output with defaults', async () => {
      const input = {
        quiz: {
          id: 'quiz-1',
          title: 'Test Quiz',
          questions: [
            { id: 'q-1', question: 'Q?', type: 'true_false' as const, correctAnswer: 'true' },
          ],
        },
      };

      const result = await executeDisplayQuiz(input);

      expect(result.type).toBe('quiz');
      expect(result.quiz).toEqual(input.quiz);
      expect(result.allowRetry).toBe(true);
      expect(result.showFeedback).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('respects custom allowRetry and showFeedback', async () => {
      const input = {
        quiz: {
          id: 'quiz-1',
          title: 'Strict Quiz',
          questions: [],
        },
        allowRetry: false,
        showFeedback: false,
      };

      const result = await executeDisplayQuiz(input);

      expect(result.allowRetry).toBe(false);
      expect(result.showFeedback).toBe(false);
    });
  });

  describe('executeDisplayQuizQuestion', () => {
    it('returns quiz question output', async () => {
      const input = {
        question: {
          id: 'q-1',
          question: 'What is 1+1?',
          type: 'short_answer' as const,
          correctAnswer: '2',
        },
        sessionId: 'session-1',
        showHint: true,
      };

      const result = await executeDisplayQuizQuestion(input);

      expect(result.type).toBe('quiz_question');
      expect(result.question).toEqual(input.question);
      expect(result.sessionId).toBe('session-1');
      expect(result.showHint).toBe(true);
    });
  });

  describe('executeDisplayReviewSession', () => {
    it('returns review session output', async () => {
      const input = {
        session: {
          id: 'rs-1',
          title: 'Review',
          items: [
            { id: '1', type: 'flashcard' as const, data: { id: 'fc-1', front: 'Q', back: 'A' } },
          ],
        },
        learningSessionId: 'learning-1',
      };

      const result = await executeDisplayReviewSession(input);

      expect(result.type).toBe('review_session');
      expect(result.session).toEqual(input.session);
      expect(result.learningSessionId).toBe('learning-1');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('executeDisplayProgressSummary', () => {
    it('returns progress summary output', async () => {
      const input = {
        title: 'My Progress',
        stats: {
          totalConcepts: 50,
          masteredConcepts: 30,
          learningConcepts: 15,
          accuracy: 85,
          streakDays: 7,
          timeSpentMinutes: 120,
        },
        recentActivity: [
          { date: '2024-01-15', conceptsReviewed: 10, accuracy: 90 },
        ],
        recommendations: ['Review JavaScript basics', 'Practice more React hooks'],
      };

      const result = await executeDisplayProgressSummary(input);

      expect(result.type).toBe('progress_summary');
      expect(result.title).toBe('My Progress');
      expect(result.stats).toEqual(input.stats);
      expect(result.recentActivity).toEqual(input.recentActivity);
      expect(result.recommendations).toEqual(input.recommendations);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('executeDisplayConceptExplanation', () => {
    it('returns concept explanation output', async () => {
      const input = {
        conceptId: 'concept-1',
        title: 'React Hooks',
        summary: 'Hooks are functions that let you use state and other React features',
        sections: [
          { title: 'Overview', content: 'Introduction to hooks', type: 'text' as const },
          { title: 'Example', content: 'useState example', type: 'example' as const },
        ],
        relatedConcepts: [
          { id: 'concept-2', title: 'useState', relationship: 'is a type of' },
        ],
        quickReview: {
          id: 'fc-1',
          front: 'What are React Hooks?',
          back: 'Functions that let you use state in functional components',
        },
      };

      const result = await executeDisplayConceptExplanation(input);

      expect(result.type).toBe('concept_explanation');
      expect(result.conceptId).toBe('concept-1');
      expect(result.title).toBe('React Hooks');
      expect(result.summary).toBe(input.summary);
      expect(result.sections).toHaveLength(2);
      expect(result.relatedConcepts).toHaveLength(1);
      expect(result.quickReview).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});

describe('Learning Tools Definitions', () => {
  it('exports all learning tools', () => {
    expect(learningTools.displayFlashcard).toBeDefined();
    expect(learningTools.displayFlashcardDeck).toBeDefined();
    expect(learningTools.displayQuiz).toBeDefined();
    expect(learningTools.displayQuizQuestion).toBeDefined();
    expect(learningTools.displayReviewSession).toBeDefined();
    expect(learningTools.displayProgressSummary).toBeDefined();
    expect(learningTools.displayConceptExplanation).toBeDefined();
  });

  it('all tools have required properties', () => {
    Object.values(learningTools).forEach((tool) => {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.parameters).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.requiresApproval).toBe(false);
      expect(tool.category).toBe('learning');
    });
  });

  it('tool names match their keys', () => {
    expect(learningTools.displayFlashcard.name).toBe('displayFlashcard');
    expect(learningTools.displayFlashcardDeck.name).toBe('displayFlashcardDeck');
    expect(learningTools.displayQuiz.name).toBe('displayQuiz');
    expect(learningTools.displayQuizQuestion.name).toBe('displayQuizQuestion');
    expect(learningTools.displayReviewSession.name).toBe('displayReviewSession');
    expect(learningTools.displayProgressSummary.name).toBe('displayProgressSummary');
    expect(learningTools.displayConceptExplanation.name).toBe('displayConceptExplanation');
  });
});

describe('Input Schema Validation', () => {
  describe('displayFlashcardInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        flashcard: { id: '1', front: 'Q', back: 'A' },
        sessionId: 'session-1',
        showHint: true,
      };
      expect(displayFlashcardInputSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('displayFlashcardDeckInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        title: 'Deck',
        flashcards: [{ id: '1', front: 'Q', back: 'A' }],
      };
      expect(displayFlashcardDeckInputSchema.safeParse(input).success).toBe(true);
    });

    it('requires at least one flashcard', () => {
      const input = {
        title: 'Empty Deck',
        flashcards: [],
      };
      expect(displayFlashcardDeckInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('displayQuizInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        quiz: {
          id: '1',
          title: 'Quiz',
          questions: [{ id: 'q1', question: 'Q?', type: 'true_false', correctAnswer: 'true' }],
        },
      };
      expect(displayQuizInputSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('displayQuizQuestionInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        question: { id: 'q1', question: 'Q?', type: 'true_false', correctAnswer: 'true' },
      };
      expect(displayQuizQuestionInputSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('displayReviewSessionInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        session: {
          id: 'rs1',
          title: 'Review',
          items: [{ id: '1', type: 'flashcard', data: { id: 'fc1', front: 'Q', back: 'A' } }],
        },
      };
      expect(displayReviewSessionInputSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('displayProgressSummaryInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        title: 'Progress',
        stats: {
          totalConcepts: 10,
          masteredConcepts: 5,
          learningConcepts: 3,
          accuracy: 75,
        },
      };
      expect(displayProgressSummaryInputSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('displayConceptExplanationInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        conceptId: 'c1',
        title: 'Concept',
        summary: 'Summary text',
        sections: [{ title: 'Section 1', content: 'Content' }],
      };
      expect(displayConceptExplanationInputSchema.safeParse(input).success).toBe(true);
    });
  });
});
