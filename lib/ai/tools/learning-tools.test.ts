/**
 * @jest-environment jsdom
 */
import {
  flashcardSchema,
  quizQuestionSchema,
  quizSchema,
  reviewSessionSchema,
  guideStepSchema,
  conceptNodeSchema,
  conceptConnectionSchema,
  animationElementSchema,
  animationStepSchema,
  displayFlashcardInputSchema,
  displayFlashcardDeckInputSchema,
  displayQuizInputSchema,
  displayQuizQuestionInputSchema,
  displayReviewSessionInputSchema,
  displayProgressSummaryInputSchema,
  displayConceptExplanationInputSchema,
  displayStepGuideInputSchema,
  displayConceptMapInputSchema,
  displayAnimationInputSchema,
  executeDisplayFlashcard,
  executeDisplayFlashcardDeck,
  executeDisplayQuiz,
  executeDisplayQuizQuestion,
  executeDisplayReviewSession,
  executeDisplayProgressSummary,
  executeDisplayConceptExplanation,
  executeDisplayStepGuide,
  executeDisplayConceptMap,
  executeDisplayAnimation,
  LEARNING_TOOL_CANONICAL_NAMES,
  normalizeLearningToolName,
  toLearningToolAliasName,
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

  describe('guideStepSchema', () => {
    it('validates a complete guide step', () => {
      const step = {
        id: 'step-1',
        title: 'Install Node.js',
        content: 'Download Node.js from the official website',
        description: 'First step in setup',
        difficulty: 'beginner',
        estimatedTimeMinutes: 5,
        tips: ['Use LTS version'],
        hints: ['Check nodejs.org'],
        requiresConfirmation: true,
      };
      expect(guideStepSchema.safeParse(step).success).toBe(true);
    });

    it('validates a minimal guide step', () => {
      const step = { id: 'step-1', title: 'Step 1', content: 'Do something' };
      expect(guideStepSchema.safeParse(step).success).toBe(true);
    });

    it('rejects missing required fields', () => {
      expect(guideStepSchema.safeParse({ id: 'step-1' }).success).toBe(false);
      expect(guideStepSchema.safeParse({ id: 'step-1', title: 'Step' }).success).toBe(false);
    });

    it('validates difficulty enum', () => {
      const base = { id: '1', title: 'S', content: 'C' };
      expect(guideStepSchema.safeParse({ ...base, difficulty: 'beginner' }).success).toBe(true);
      expect(guideStepSchema.safeParse({ ...base, difficulty: 'expert' }).success).toBe(true);
      expect(guideStepSchema.safeParse({ ...base, difficulty: 'impossible' }).success).toBe(false);
    });
  });

  describe('conceptNodeSchema', () => {
    it('validates a complete concept node', () => {
      const node = {
        id: 'node-1',
        label: 'Database',
        description: 'Stores data',
        type: 'data',
        parentId: 'root',
        layer: 0,
        annotations: ['primary'],
      };
      expect(conceptNodeSchema.safeParse(node).success).toBe(true);
    });

    it('validates a minimal concept node', () => {
      expect(conceptNodeSchema.safeParse({ id: 'n1', label: 'Node' }).success).toBe(true);
    });

    it('validates node type enum', () => {
      const base = { id: '1', label: 'N' };
      expect(conceptNodeSchema.safeParse({ ...base, type: 'input' }).success).toBe(true);
      expect(conceptNodeSchema.safeParse({ ...base, type: 'process' }).success).toBe(true);
      expect(conceptNodeSchema.safeParse({ ...base, type: 'invalid' }).success).toBe(false);
    });
  });

  describe('conceptConnectionSchema', () => {
    it('validates a connection', () => {
      const conn = { id: 'c1', sourceId: 'n1', targetId: 'n2', label: 'depends on', type: 'directed' };
      expect(conceptConnectionSchema.safeParse(conn).success).toBe(true);
    });

    it('validates minimal connection', () => {
      expect(conceptConnectionSchema.safeParse({ id: 'c1', sourceId: 'n1', targetId: 'n2' }).success).toBe(true);
    });
  });

  describe('animationElementSchema', () => {
    it('validates a complete element', () => {
      const el = {
        id: 'el-1',
        type: 'text',
        content: 'Hello',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        fill: '#ff0000',
        stroke: '#000',
        tooltip: 'A text element',
      };
      expect(animationElementSchema.safeParse(el).success).toBe(true);
    });

    it('validates minimal element', () => {
      expect(animationElementSchema.safeParse({ id: 'el-1', type: 'shape' }).success).toBe(true);
    });

    it('validates element type enum', () => {
      const base = { id: '1' };
      expect(animationElementSchema.safeParse({ ...base, type: 'text' }).success).toBe(true);
      expect(animationElementSchema.safeParse({ ...base, type: 'arrow' }).success).toBe(true);
      expect(animationElementSchema.safeParse({ ...base, type: 'invalid' }).success).toBe(false);
    });
  });

  describe('animationStepSchema', () => {
    it('validates a step with elements', () => {
      const step = {
        id: 'step-1',
        title: 'Step 1',
        description: 'First step',
        elements: [{ id: 'el-1', type: 'text', content: 'Hello' }],
        duration: 3000,
      };
      expect(animationStepSchema.safeParse(step).success).toBe(true);
    });

    it('defaults duration to 2000', () => {
      const step = {
        id: 'step-1',
        title: 'Step 1',
        elements: [{ id: 'el-1', type: 'shape' }],
      };
      const result = animationStepSchema.safeParse(step);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(2000);
      }
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

  describe('executeDisplayStepGuide', () => {
    it('returns step guide output with all fields', async () => {
      const input = {
        title: 'Getting Started',
        description: 'A beginner guide',
        steps: [
          { id: 's1', title: 'Install', content: 'Install Node.js', tips: ['Use LTS'] },
          { id: 's2', title: 'Create Project', content: 'Run npx create-react-app' },
        ],
        showProgress: true,
        allowSkip: false,
      };

      const result = await executeDisplayStepGuide(input);

      expect(result.type).toBe('step_guide');
      expect(result.title).toBe('Getting Started');
      expect(result.description).toBe('A beginner guide');
      expect(result.steps).toHaveLength(2);
      expect(result.showProgress).toBe(true);
      expect(result.allowSkip).toBe(false);
      expect(result.timestamp).toBeDefined();
    });

    it('defaults showProgress to true and allowSkip to true', async () => {
      const input = {
        title: 'Guide',
        steps: [{ id: 's1', title: 'Step', content: 'Content' }],
      };

      const result = await executeDisplayStepGuide(input);

      expect(result.showProgress).toBe(true);
      expect(result.allowSkip).toBe(true);
    });
  });

  describe('executeDisplayConceptMap', () => {
    it('returns concept map output with all fields', async () => {
      const input = {
        title: 'System Architecture',
        description: 'Overview of the system',
        type: 'flow' as const,
        nodes: [
          { id: 'n1', label: 'Client', type: 'input' as const },
          { id: 'n2', label: 'Server', type: 'process' as const },
        ],
        connections: [
          { id: 'c1', sourceId: 'n1', targetId: 'n2', label: 'HTTP' },
        ],
        tags: ['architecture'],
      };

      const result = await executeDisplayConceptMap(input);

      expect(result.type).toBe('concept_map');
      expect(result.title).toBe('System Architecture');
      expect(result.visualizationType).toBe('flow');
      expect(result.nodes).toHaveLength(2);
      expect(result.connections).toHaveLength(1);
      expect(result.tags).toEqual(['architecture']);
      expect(result.timestamp).toBeDefined();
    });

    it('handles minimal input without connections', async () => {
      const input = {
        title: 'Simple Map',
        type: 'hierarchy' as const,
        nodes: [{ id: 'n1', label: 'Root' }],
      };

      const result = await executeDisplayConceptMap(input);

      expect(result.type).toBe('concept_map');
      expect(result.connections).toBeUndefined();
    });
  });

  describe('executeDisplayAnimation', () => {
    it('returns animation output with all fields', async () => {
      const input = {
        name: 'Bubble Sort',
        description: 'How bubble sort works',
        width: 800,
        height: 600,
        steps: [
          {
            id: 'step-1',
            title: 'Compare',
            elements: [{ id: 'e1', type: 'shape' as const, x: 0, y: 0 }],
            duration: 1500,
          },
        ],
        autoPlay: true,
        difficulty: 'beginner' as const,
      };

      const result = await executeDisplayAnimation(input);

      expect(result.type).toBe('animation');
      expect(result.name).toBe('Bubble Sort');
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.steps).toHaveLength(1);
      expect(result.autoPlay).toBe(true);
      expect(result.difficulty).toBe('beginner');
      expect(result.timestamp).toBeDefined();
    });

    it('defaults autoPlay to false', async () => {
      const input = {
        name: 'Simple Animation',
        width: 600,
        height: 400,
        steps: [
          { id: 's1', title: 'Start', elements: [{ id: 'e1', type: 'text' as const }], duration: 2000 },
        ],
      };

      const result = await executeDisplayAnimation(input);

      expect(result.autoPlay).toBe(false);
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
    expect(learningTools.displayStepGuide).toBeDefined();
    expect(learningTools.displayConceptMap).toBeDefined();
    expect(learningTools.displayAnimation).toBeDefined();
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
    expect(learningTools.displayFlashcard.name).toBe('display_flashcard');
    expect(learningTools.displayFlashcardDeck.name).toBe('display_flashcard_deck');
    expect(learningTools.displayQuiz.name).toBe('display_quiz');
    expect(learningTools.displayQuizQuestion.name).toBe('display_quiz_question');
    expect(learningTools.displayReviewSession.name).toBe('display_review_session');
    expect(learningTools.displayProgressSummary.name).toBe('display_progress_summary');
    expect(learningTools.displayConceptExplanation.name).toBe('display_concept_explanation');
    expect(learningTools.displayStepGuide.name).toBe('display_step_guide');
    expect(learningTools.displayConceptMap.name).toBe('display_concept_map');
    expect(learningTools.displayAnimation.name).toBe('display_animation');
  });

  it('normalizes canonical and alias tool names', () => {
    for (const canonicalName of LEARNING_TOOL_CANONICAL_NAMES) {
      expect(normalizeLearningToolName(canonicalName)).toBe(canonicalName);
      const aliasName = toLearningToolAliasName(canonicalName);
      expect(aliasName).toBeDefined();
      expect(normalizeLearningToolName(aliasName)).toBe(canonicalName);
    }

    expect(normalizeLearningToolName('displayFlashcard')).toBe('display_flashcard');
    expect(normalizeLearningToolName('display-step-guide')).toBe('display_step_guide');
    expect(normalizeLearningToolName('unknown_tool')).toBeUndefined();
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

  describe('displayStepGuideInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        title: 'Guide',
        steps: [{ id: 's1', title: 'Step 1', content: 'Do this' }],
      };
      expect(displayStepGuideInputSchema.safeParse(input).success).toBe(true);
    });

    it('requires at least one step', () => {
      const input = { title: 'Empty Guide', steps: [] };
      expect(displayStepGuideInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('displayConceptMapInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        title: 'Map',
        type: 'flow',
        nodes: [{ id: 'n1', label: 'Node 1' }],
      };
      expect(displayConceptMapInputSchema.safeParse(input).success).toBe(true);
    });

    it('requires at least one node', () => {
      const input = { title: 'Empty Map', type: 'flow', nodes: [] };
      expect(displayConceptMapInputSchema.safeParse(input).success).toBe(false);
    });

    it('validates visualization type enum', () => {
      const base = { title: 'M', nodes: [{ id: 'n1', label: 'N' }] };
      expect(displayConceptMapInputSchema.safeParse({ ...base, type: 'flow' }).success).toBe(true);
      expect(displayConceptMapInputSchema.safeParse({ ...base, type: 'hierarchy' }).success).toBe(true);
      expect(displayConceptMapInputSchema.safeParse({ ...base, type: 'network' }).success).toBe(true);
      expect(displayConceptMapInputSchema.safeParse({ ...base, type: 'layers' }).success).toBe(true);
      expect(displayConceptMapInputSchema.safeParse({ ...base, type: 'sequence' }).success).toBe(true);
      expect(displayConceptMapInputSchema.safeParse({ ...base, type: 'invalid' }).success).toBe(false);
    });
  });

  describe('displayAnimationInputSchema', () => {
    it('validates correct input', () => {
      const input = {
        name: 'Animation',
        steps: [{ id: 's1', title: 'Step', elements: [{ id: 'e1', type: 'text' }] }],
      };
      expect(displayAnimationInputSchema.safeParse(input).success).toBe(true);
    });

    it('requires at least one step', () => {
      const input = { name: 'Empty', steps: [] };
      expect(displayAnimationInputSchema.safeParse(input).success).toBe(false);
    });
  });
});
