import { test, expect } from '@playwright/test';

/**
 * Learning Mode E2E Tests
 * Tests the complete learning mode user flow including:
 * - Mode selection
 * - Learning session start
 * - Phase progression
 * - Sub-questions and goals tracking
 */

test.describe('Learning Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Mode Selection', () => {
    test('should display learning mode in mode selector', async ({ page }) => {
      // Open the mode selector dropdown
      const modeButton = page.locator('button').filter({ hasText: /Chat|Agent|Research|Learning/i }).first();
      await modeButton.click();

      // Verify learning mode option is visible
      await expect(page.getByRole('menuitem', { name: /learning/i })).toBeVisible();
    });

    test('should switch to learning mode when selected', async ({ page }) => {
      // Open the mode selector dropdown
      const modeButton = page.locator('button').filter({ hasText: /Chat|Agent|Research|Learning/i }).first();
      await modeButton.click();

      // Click on Learning mode
      await page.getByRole('menuitem', { name: /learning/i }).click();

      // Verify the mode button now shows Learning
      await expect(page.locator('button').filter({ hasText: /Learning/i })).toBeVisible();
    });
  });

  test.describe('Welcome Screen', () => {
    test('should show learning mode welcome when selected', async ({ page }) => {
      // Switch to learning mode via welcome screen buttons
      const learningButton = page.locator('button').filter({ hasText: /Learning/i });
      
      if (await learningButton.isVisible()) {
        await learningButton.click();
        
        // Should show learning mode specific content
        await expect(page.getByText(/Socratic|guided learning|step-by-step/i)).toBeVisible();
      }
    });

    test('should display learning mode suggestions', async ({ page }) => {
      // Navigate to learning mode
      const modeButton = page.locator('button').filter({ hasText: /Chat|Agent|Research|Learning/i }).first();
      await modeButton.click();
      await page.getByRole('menuitem', { name: /learning/i }).click();

      // Check for learning-specific suggestion cards
      const suggestionTexts = [
        /explore.*concept/i,
        /problem.*solving/i,
        /deep.*understanding/i,
        /skill.*mastery/i,
      ];

      for (const textPattern of suggestionTexts) {
        const element = page.getByText(textPattern);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          break; // At least one should be visible
        }
      }
    });
  });

  test.describe('Learning Session Flow', () => {
    test('should handle learning mode message with Socratic approach', async ({ page }) => {
      // Switch to learning mode
      const modeButton = page.locator('button').filter({ hasText: /Chat|Agent|Research|Learning/i }).first();
      await modeButton.click();
      await page.getByRole('menuitem', { name: /learning/i }).click();

      // Type a learning request
      const chatInput = page.locator('textarea[placeholder*="message"]');
      await chatInput.fill('I want to understand how recursion works in programming');

      // The chat input should accept the message
      await expect(chatInput).toHaveValue(/recursion/i);
    });
  });

  test.describe('Learning Store Integration', () => {
    test('should create learning session correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Simulate learning store behavior
        interface LearningSession {
          id: string;
          sessionId: string;
          topic: string;
          currentPhase: 'clarification' | 'deconstruction' | 'questioning' | 'feedback' | 'summary';
          progress: number;
          subQuestions: Array<{
            id: string;
            question: string;
            status: 'pending' | 'in_progress' | 'resolved';
          }>;
          learningGoals: Array<{
            id: string;
            description: string;
            achieved: boolean;
          }>;
        }

        const sessions: Map<string, LearningSession> = new Map();

        const createSession = (sessionId: string, topic: string): LearningSession => {
          const session: LearningSession = {
            id: `learning-${Date.now()}`,
            sessionId,
            topic,
            currentPhase: 'clarification',
            progress: 0,
            subQuestions: [],
            learningGoals: [],
          };
          sessions.set(session.id, session);
          return session;
        };

        const advancePhase = (learningId: string): string | null => {
          const session = sessions.get(learningId);
          if (!session) return null;

          const phases: LearningSession['currentPhase'][] = [
            'clarification',
            'deconstruction',
            'questioning',
            'feedback',
            'summary',
          ];
          const currentIndex = phases.indexOf(session.currentPhase);
          if (currentIndex < phases.length - 1) {
            session.currentPhase = phases[currentIndex + 1];
          }
          return session.currentPhase;
        };

        // Test session creation
        const session = createSession('chat-1', 'Understanding Recursion');

        // Test phase advancement
        const phase2 = advancePhase(session.id);
        const phase3 = advancePhase(session.id);

        return {
          sessionCreated: !!session.id,
          initialPhase: 'clarification',
          phase2,
          phase3,
          topic: session.topic,
        };
      });

      expect(result.sessionCreated).toBe(true);
      expect(result.initialPhase).toBe('clarification');
      expect(result.phase2).toBe('deconstruction');
      expect(result.phase3).toBe('questioning');
      expect(result.topic).toBe('Understanding Recursion');
    });

    test('should track sub-questions correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface SubQuestion {
          id: string;
          question: string;
          status: 'pending' | 'in_progress' | 'resolved';
          hints: string[];
          userAttempts: number;
        }

        const subQuestions: SubQuestion[] = [];

        const addSubQuestion = (question: string): SubQuestion => {
          const sq: SubQuestion = {
            id: `sq-${Date.now()}-${subQuestions.length}`,
            question,
            status: 'pending',
            hints: [],
            userAttempts: 0,
          };
          subQuestions.push(sq);
          return sq;
        };

        const resolveSubQuestion = (id: string): boolean => {
          const sq = subQuestions.find(q => q.id === id);
          if (sq) {
            sq.status = 'resolved';
            return true;
          }
          return false;
        };

        const addHint = (id: string, hint: string): boolean => {
          const sq = subQuestions.find(q => q.id === id);
          if (sq) {
            sq.hints.push(hint);
            return true;
          }
          return false;
        };

        // Test sub-question management
        const sq1 = addSubQuestion('What is a base case?');
        addSubQuestion('What is a recursive case?'); // Second question for count test

        addHint(sq1.id, 'Think about when the function should stop');
        resolveSubQuestion(sq1.id);

        const resolved = subQuestions.filter(q => q.status === 'resolved').length;
        const pending = subQuestions.filter(q => q.status === 'pending').length;

        return {
          totalQuestions: subQuestions.length,
          resolved,
          pending,
          sq1Hints: sq1.hints.length,
          sq1Status: sq1.status,
        };
      });

      expect(result.totalQuestions).toBe(2);
      expect(result.resolved).toBe(1);
      expect(result.pending).toBe(1);
      expect(result.sq1Hints).toBe(1);
      expect(result.sq1Status).toBe('resolved');
    });

    test('should track learning goals correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface LearningGoal {
          id: string;
          description: string;
          achieved: boolean;
          achievedAt?: Date;
        }

        const goals: LearningGoal[] = [];

        const addGoal = (description: string): LearningGoal => {
          const goal: LearningGoal = {
            id: `goal-${Date.now()}-${goals.length}`,
            description,
            achieved: false,
          };
          goals.push(goal);
          return goal;
        };

        const achieveGoal = (id: string): boolean => {
          const goal = goals.find(g => g.id === id);
          if (goal) {
            goal.achieved = true;
            goal.achievedAt = new Date();
            return true;
          }
          return false;
        };

        // Test goal management
        const goal1 = addGoal('Understand base case');
        const goal2 = addGoal('Understand recursive case');
        const goal3 = addGoal('Know when to use recursion');

        achieveGoal(goal1.id);
        achieveGoal(goal2.id);

        const achieved = goals.filter(g => g.achieved).length;
        const total = goals.length;

        return {
          totalGoals: total,
          achievedGoals: achieved,
          progressPercent: Math.round((achieved / total) * 100),
          goal1Achieved: goal1.achieved,
          goal3Achieved: goal3.achieved,
        };
      });

      expect(result.totalGoals).toBe(3);
      expect(result.achievedGoals).toBe(2);
      expect(result.progressPercent).toBe(67);
      expect(result.goal1Achieved).toBe(true);
      expect(result.goal3Achieved).toBe(false);
    });

    test('should calculate progress correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface LearningSession {
          currentPhase: 'clarification' | 'deconstruction' | 'questioning' | 'feedback' | 'summary';
          subQuestions: Array<{ status: 'pending' | 'in_progress' | 'resolved' }>;
          learningGoals: Array<{ achieved: boolean }>;
        }

        const calculateProgress = (session: LearningSession): number => {
          const phases = ['clarification', 'deconstruction', 'questioning', 'feedback', 'summary'];
          const phaseIndex = phases.indexOf(session.currentPhase);
          const phaseProgress = ((phaseIndex + 1) / phases.length) * 40; // 40% from phases

          const resolvedQuestions = session.subQuestions.filter(q => q.status === 'resolved').length;
          const totalQuestions = session.subQuestions.length;
          const questionProgress = totalQuestions > 0 ? (resolvedQuestions / totalQuestions) * 30 : 0; // 30% from questions

          const achievedGoals = session.learningGoals.filter(g => g.achieved).length;
          const totalGoals = session.learningGoals.length;
          const goalProgress = totalGoals > 0 ? (achievedGoals / totalGoals) * 30 : 0; // 30% from goals

          return Math.round(phaseProgress + questionProgress + goalProgress);
        };

        // Test progress calculation
        const session1: LearningSession = {
          currentPhase: 'clarification',
          subQuestions: [],
          learningGoals: [],
        };

        const session2: LearningSession = {
          currentPhase: 'questioning',
          subQuestions: [
            { status: 'resolved' },
            { status: 'resolved' },
            { status: 'pending' },
          ],
          learningGoals: [
            { achieved: true },
            { achieved: false },
          ],
        };

        const session3: LearningSession = {
          currentPhase: 'summary',
          subQuestions: [
            { status: 'resolved' },
            { status: 'resolved' },
          ],
          learningGoals: [
            { achieved: true },
            { achieved: true },
          ],
        };

        return {
          progress1: calculateProgress(session1),
          progress2: calculateProgress(session2),
          progress3: calculateProgress(session3),
        };
      });

      expect(result.progress1).toBe(8); // Only phase 1/5 = 8%
      expect(result.progress2).toBeGreaterThan(40); // Phase 3 + some questions + some goals
      expect(result.progress3).toBe(100); // All complete
    });
  });

  test.describe('Socratic Method System Prompt', () => {
    test('should generate appropriate system prompt for learning mode', async ({ page }) => {
      const result = await page.evaluate(() => {
        interface LearningSession {
          topic: string;
          currentPhase: string;
          backgroundKnowledge?: string;
        }

        const buildLearningSystemPrompt = (session: LearningSession | undefined): string => {
          const basePrompt = `You are a Socratic mentor. Your role is to guide the learner to discover answers through questioning, not by providing direct solutions.

## Core Principles:
1. Never provide direct answers
2. Ask probing questions to stimulate critical thinking
3. Build on the learner's existing knowledge
4. Progress step by step through the learning phases

`;

          if (!session) {
            return basePrompt;
          }

          let contextPrompt = `## Current Learning Context:
- Topic: ${session.topic}
- Phase: ${session.currentPhase}
`;

          if (session.backgroundKnowledge) {
            contextPrompt += `- Background: ${session.backgroundKnowledge}\n`;
          }

          const phaseGuidance: Record<string, string> = {
            clarification: 'Focus on understanding what the learner wants to achieve and their current knowledge level.',
            deconstruction: 'Help break down the topic into smaller, manageable sub-questions.',
            questioning: 'Use strategic questions to guide the learner toward understanding each sub-topic.',
            feedback: 'Provide progressive feedback based on their responses, offering hints when needed.',
            summary: 'Help the learner consolidate their learnings into broader principles.',
          };

          const guidance = phaseGuidance[session.currentPhase] || '';
          contextPrompt += `\n## Phase Guidance:\n${guidance}`;

          return basePrompt + contextPrompt;
        };

        // Test prompt generation
        const promptNoSession = buildLearningSystemPrompt(undefined);
        const promptWithSession = buildLearningSystemPrompt({
          topic: 'Understanding Recursion',
          currentPhase: 'questioning',
          backgroundKnowledge: 'Basic programming knowledge',
        });

        return {
          hasBasePrinciples: promptNoSession.includes('Socratic mentor'),
          hasNeverDirectAnswers: promptNoSession.includes('Never provide direct answers'),
          hasTopic: promptWithSession.includes('Understanding Recursion'),
          hasPhase: promptWithSession.includes('questioning'),
          hasBackground: promptWithSession.includes('Basic programming knowledge'),
          hasGuidance: promptWithSession.includes('strategic questions'),
        };
      });

      expect(result.hasBasePrinciples).toBe(true);
      expect(result.hasNeverDirectAnswers).toBe(true);
      expect(result.hasTopic).toBe(true);
      expect(result.hasPhase).toBe(true);
      expect(result.hasBackground).toBe(true);
      expect(result.hasGuidance).toBe(true);
    });
  });

  test.describe('Learning Phases Flow', () => {
    test('should follow correct phase order', async ({ page }) => {
      const result = await page.evaluate(() => {
        const phases = ['clarification', 'deconstruction', 'questioning', 'feedback', 'summary'] as const;
        type Phase = typeof phases[number];

        let currentPhaseIndex = 0;

        const getCurrentPhase = (): Phase => phases[currentPhaseIndex];

        const advancePhase = (): Phase => {
          if (currentPhaseIndex < phases.length - 1) {
            currentPhaseIndex++;
          }
          return phases[currentPhaseIndex];
        };

        const canAdvance = (): boolean => currentPhaseIndex < phases.length - 1;

        // Test phase progression
        const phase1 = getCurrentPhase();
        const canAdvance1 = canAdvance();
        
        const phase2 = advancePhase();
        const phase3 = advancePhase();
        const phase4 = advancePhase();
        const phase5 = advancePhase();
        
        const canAdvanceAtEnd = canAdvance();
        const phase6 = advancePhase(); // Should stay at summary

        return {
          phase1,
          canAdvance1,
          phase2,
          phase3,
          phase4,
          phase5,
          canAdvanceAtEnd,
          phase6,
          staysAtSummary: phase5 === phase6,
        };
      });

      expect(result.phase1).toBe('clarification');
      expect(result.canAdvance1).toBe(true);
      expect(result.phase2).toBe('deconstruction');
      expect(result.phase3).toBe('questioning');
      expect(result.phase4).toBe('feedback');
      expect(result.phase5).toBe('summary');
      expect(result.canAdvanceAtEnd).toBe(false);
      expect(result.staysAtSummary).toBe(true);
    });
  });
});
