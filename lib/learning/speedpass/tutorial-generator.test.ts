/**
 * Tutorial Generator Tests
 */

import {
  generateQuickSummary,
  extractKeyPoints,
  getDifficultyLabel,
  generateMemoryTips,
  identifyCommonMistakes,
  generateTutorial,
  optimizeSectionOrder,
  estimateCompletionTime,
  getNextSection,
  calculateProgress,
} from './tutorial-generator';
import {
  createMockKnowledgePoint,
  createMockQuestion,
  createMockChapter,
  createMockTextbook,
  createMockTutorial,
  createMockTutorialSection,
} from './test-helpers';

describe('tutorial-generator', () => {
  describe('generateQuickSummary', () => {
    it('should return existing summary if available', () => {
      const kp = createMockKnowledgePoint({ summary: 'Existing summary' });
      expect(generateQuickSummary(kp)).toBe('Existing summary');
    });

    it('should extract first paragraph as summary', () => {
      const kp = createMockKnowledgePoint({
        summary: undefined,
        content: 'First paragraph.\n\nSecond paragraph.',
      });
      expect(generateQuickSummary(kp)).toBe('First paragraph.');
    });

    it('should replace formulas with placeholder', () => {
      const kp = createMockKnowledgePoint({
        summary: undefined,
        content: 'The equation $E=mc^2$ is famous.',
      });
      const summary = generateQuickSummary(kp);
      expect(summary).toContain('[公式]');
      expect(summary).not.toContain('E=mc^2');
    });

    it('should truncate long content', () => {
      const kp = createMockKnowledgePoint({
        summary: undefined,
        content: 'A'.repeat(300),
      });
      const summary = generateQuickSummary(kp);
      expect(summary.length).toBeLessThanOrEqual(200);
    });
  });

  describe('extractKeyPoints', () => {
    it('should extract numbered points', () => {
      const content = '1. First point\n2. Second point\n3. Third point';
      const keyPoints = extractKeyPoints(content);
      expect(keyPoints).toContain('First point');
      expect(keyPoints).toContain('Second point');
    });

    it('should extract bullet points', () => {
      const content = '• Point one\n• Point two';
      const keyPoints = extractKeyPoints(content);
      expect(keyPoints).toContain('Point one');
    });

    it('should fallback to sentences when no structure found', () => {
      const content = 'First sentence. Second sentence. Third sentence.';
      const keyPoints = extractKeyPoints(content);
      expect(keyPoints.length).toBeLessThanOrEqual(3);
    });

    it('should limit to 5 key points', () => {
      const content = Array.from({ length: 10 }, (_, i) => `${i + 1}. Point ${i + 1}`).join('\n');
      const keyPoints = extractKeyPoints(content);
      expect(keyPoints.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getDifficultyLabel', () => {
    it('should return easy for low difficulty', () => {
      expect(getDifficultyLabel(0.1)).toBe('easy');
      expect(getDifficultyLabel(0.32)).toBe('easy');
    });

    it('should return medium for mid difficulty', () => {
      expect(getDifficultyLabel(0.4)).toBe('medium');
      expect(getDifficultyLabel(0.5)).toBe('medium');
    });

    it('should return hard for high difficulty', () => {
      expect(getDifficultyLabel(0.7)).toBe('hard');
      expect(getDifficultyLabel(0.9)).toBe('hard');
    });
  });

  describe('generateMemoryTips', () => {
    it('should include formula tips for formula type', () => {
      const kp = createMockKnowledgePoint({
        type: 'formula',
        formulas: ['x^2'],
      });
      const tips = generateMemoryTips(kp);
      expect(tips.some(t => t.includes('公式'))).toBe(true);
    });

    it('should generate type-specific tips for definition', () => {
      const kp = createMockKnowledgePoint({ type: 'definition' });
      const tips = generateMemoryTips(kp);
      expect(tips.some(t => t.includes('定义') || t.includes('关键词'))).toBe(true);
    });

    it('should generate type-specific tips for theorem', () => {
      const kp = createMockKnowledgePoint({ type: 'theorem' });
      const tips = generateMemoryTips(kp);
      expect(tips.some(t => t.includes('定理') || t.includes('条件'))).toBe(true);
    });

    it('should limit tips to 3', () => {
      const kp = createMockKnowledgePoint({ type: 'method', formulas: ['a', 'b', 'c'] });
      const tips = generateMemoryTips(kp);
      expect(tips.length).toBeLessThanOrEqual(3);
    });
  });

  describe('identifyCommonMistakes', () => {
    it('should identify mistakes for definition type', () => {
      const kp = createMockKnowledgePoint({ type: 'definition' });
      const mistakes = identifyCommonMistakes(kp);
      expect(mistakes.some(m => m.includes('混淆') || m.includes('定义'))).toBe(true);
    });

    it('should identify mistakes for theorem type', () => {
      const kp = createMockKnowledgePoint({ type: 'theorem' });
      const mistakes = identifyCommonMistakes(kp);
      expect(mistakes.some(m => m.includes('条件') || m.includes('定理'))).toBe(true);
    });

    it('should identify mistakes for formula type', () => {
      const kp = createMockKnowledgePoint({ type: 'formula' });
      const mistakes = identifyCommonMistakes(kp);
      expect(mistakes.some(m => m.includes('公式') || m.includes('符号'))).toBe(true);
    });

    it('should limit mistakes to 3', () => {
      const kp = createMockKnowledgePoint({ type: 'formula' });
      const mistakes = identifyCommonMistakes(kp);
      expect(mistakes.length).toBeLessThanOrEqual(3);
    });
  });

  describe('generateTutorial', () => {
    it('should generate tutorial with correct structure', () => {
      const input = {
        textbook: createMockTextbook(),
        chapters: [createMockChapter()],
        knowledgePoints: [
          createMockKnowledgePoint({ id: 'kp1', importance: 'critical' }),
          createMockKnowledgePoint({ id: 'kp2', importance: 'high' }),
        ],
        questions: [createMockQuestion()],
        mode: 'speed' as const,
        userId: 'user1',
        courseId: 'course1',
      };

      const result = generateTutorial(input);

      expect(result.tutorial.id).toMatch(/^tutorial_\d+$/);
      expect(result.tutorial.mode).toBe('speed');
      expect(result.tutorial.userId).toBe('user1');
      expect(result.stats.sectionsCount).toBeGreaterThan(0);
    });

    it('should filter by importance based on mode', () => {
      const input = {
        textbook: createMockTextbook(),
        chapters: [createMockChapter()],
        knowledgePoints: [
          createMockKnowledgePoint({ id: 'kp1', importance: 'critical' }),
          createMockKnowledgePoint({ id: 'kp2', importance: 'low' }),
        ],
        questions: [],
        mode: 'extreme' as const,
        userId: 'user1',
        courseId: 'course1',
      };

      const result = generateTutorial(input);

      // Extreme mode only includes critical
      expect(result.tutorial.sections.every(s => 
        input.knowledgePoints.find(kp => kp.id === s.knowledgePointId)?.importance === 'critical'
      )).toBe(true);
    });

    it('should create tutorial with teacherKeyPointIds array', () => {
      const input = {
        textbook: createMockTextbook(),
        chapters: [createMockChapter()],
        knowledgePoints: [
          createMockKnowledgePoint({ id: 'kp1', importance: 'critical' }),
          createMockKnowledgePoint({ id: 'kp2', importance: 'high' }),
        ],
        questions: [],
        mode: 'speed' as const,
        teacherKeyPointIds: ['kp2'],
        userId: 'user1',
        courseId: 'course1',
      };

      const result = generateTutorial(input);

      // Verify tutorial has teacherKeyPointIds property
      expect(result.tutorial).toHaveProperty('teacherKeyPointIds');
      expect(Array.isArray(result.tutorial.teacherKeyPointIds)).toBe(true);
    });
  });

  describe('optimizeSectionOrder', () => {
    it('should sort by importance', () => {
      const sections = [
        createMockTutorialSection({ id: 's1', orderIndex: 0, importanceLevel: 'supplementary' }),
        createMockTutorialSection({ id: 's2', orderIndex: 1, importanceLevel: 'critical' }),
        createMockTutorialSection({ id: 's3', orderIndex: 2, importanceLevel: 'important' }),
      ];

      const optimized = optimizeSectionOrder(sections);

      expect(optimized[0].importanceLevel).toBe('critical');
      expect(optimized[1].importanceLevel).toBe('important');
    });

    it('should maintain order within same importance', () => {
      const sections = [
        createMockTutorialSection({ id: 's1', orderIndex: 0, importanceLevel: 'critical' }),
        createMockTutorialSection({ id: 's2', orderIndex: 1, importanceLevel: 'critical' }),
      ];

      const optimized = optimizeSectionOrder(sections);

      expect(optimized[0].orderIndex).toBeLessThan(optimized[1].orderIndex);
    });
  });

  describe('estimateCompletionTime', () => {
    it('should calculate remaining time', () => {
      const tutorial = createMockTutorial({
        sections: [
          createMockTutorialSection({ id: 's1', estimatedMinutes: 10 }),
          createMockTutorialSection({ id: 's2', estimatedMinutes: 15 }),
          createMockTutorialSection({ id: 's3', estimatedMinutes: 20 }),
        ],
        completedSectionIds: ['s1'],
      });

      const time = estimateCompletionTime(tutorial);

      expect(time).toBe(35); // s2 + s3
    });

    it('should apply pace multiplier', () => {
      const tutorial = createMockTutorial({
        sections: [createMockTutorialSection({ estimatedMinutes: 10 })],
        completedSectionIds: [],
      });

      expect(estimateCompletionTime(tutorial, 1.5)).toBe(15);
      expect(estimateCompletionTime(tutorial, 0.5)).toBe(5);
    });

    it('should return 0 for completed tutorial', () => {
      const tutorial = createMockTutorial({
        sections: [createMockTutorialSection({ id: 's1' })],
        completedSectionIds: ['s1'],
      });

      expect(estimateCompletionTime(tutorial)).toBe(0);
    });
  });

  describe('getNextSection', () => {
    it('should return current section if set', () => {
      const tutorial = createMockTutorial({
        sections: [
          createMockTutorialSection({ id: 's1' }),
          createMockTutorialSection({ id: 's2' }),
        ],
        currentSectionId: 's2',
        completedSectionIds: [],
      });

      const next = getNextSection(tutorial);

      expect(next?.id).toBe('s2');
    });

    it('should return first incomplete section', () => {
      const tutorial = createMockTutorial({
        sections: [
          createMockTutorialSection({ id: 's1' }),
          createMockTutorialSection({ id: 's2' }),
        ],
        currentSectionId: undefined,
        completedSectionIds: ['s1'],
      });

      const next = getNextSection(tutorial);

      expect(next?.id).toBe('s2');
    });

    it('should return undefined for completed tutorial', () => {
      const tutorial = createMockTutorial({
        sections: [createMockTutorialSection({ id: 's1' })],
        currentSectionId: undefined,
        completedSectionIds: ['s1'],
      });

      const next = getNextSection(tutorial);

      expect(next).toBeUndefined();
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress percentage', () => {
      const tutorial = createMockTutorial({
        sections: [
          createMockTutorialSection({ id: 's1' }),
          createMockTutorialSection({ id: 's2' }),
          createMockTutorialSection({ id: 's3' }),
          createMockTutorialSection({ id: 's4' }),
        ],
        completedSectionIds: ['s1', 's2'],
      });

      expect(calculateProgress(tutorial)).toBe(50);
    });

    it('should return 0 for empty sections', () => {
      const tutorial = createMockTutorial({
        sections: [],
        completedSectionIds: [],
      });

      expect(calculateProgress(tutorial)).toBe(0);
    });

    it('should return 100 for completed tutorial', () => {
      const tutorial = createMockTutorial({
        sections: [
          createMockTutorialSection({ id: 's1' }),
          createMockTutorialSection({ id: 's2' }),
        ],
        completedSectionIds: ['s1', 's2'],
      });

      expect(calculateProgress(tutorial)).toBe(100);
    });
  });
});
