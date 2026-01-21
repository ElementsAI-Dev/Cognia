/**
 * Learning Type Detector Tests
 * 
 * Tests for the learning type detection algorithm that determines
 * whether user's intent is short-term (quick) or long-term (journey) learning.
 */

import {
  detectLearningType,
  isLongTermSubject,
  getSuggestedMilestones,
  formatLearningDuration,
  formatLearningDurationEn,
} from './learning-type-detector';

describe('Learning Type Detector', () => {
  describe('detectLearningType', () => {
    describe('Quick Learning Detection', () => {
      it('should detect quick learning for simple questions', () => {
        const result = detectLearningType('什么是递归？');
        expect(result.detectedType).toBe('quick');
        expect(result.confidence).toBeGreaterThan(40);
      });

      it('should detect quick learning for "how to" questions', () => {
        const result = detectLearningType('How to fix this bug?');
        expect(result.detectedType).toBe('quick');
      });

      it('should detect quick learning for error-related questions', () => {
        const result = detectLearningType('报错 undefined is not a function');
        expect(result.detectedType).toBe('quick');
        expect(result.category).toBe('problem-solving');
      });

      it('should detect quick learning for immediate needs', () => {
        const result = detectLearningType('Help me quickly understand this concept');
        expect(result.detectedType).toBe('quick');
      });

      it('should detect quick learning for comparison questions', () => {
        const result = detectLearningType('What is the difference between let and const?');
        expect(result.detectedType).toBe('quick');
        expect(result.category).toBe('concept');
      });
    });

    describe('Journey Learning Detection', () => {
      it('should detect journey learning for programming language study', () => {
        const result = detectLearningType('系统学习 Python');
        expect(result.detectedType).toBe('journey');
        expect(result.category).toBe('language');
        expect(result.suggestedDuration).toBeDefined();
      });

      it('should detect journey learning for "from scratch" phrases', () => {
        const result = detectLearningType('从零开始学习 JavaScript');
        expect(result.detectedType).toBe('journey');
      });

      it('should detect journey learning for framework study', () => {
        const result = detectLearningType('I want to master React');
        expect(result.detectedType).toBe('journey');
        expect(result.category).toBe('framework');
      });

      it('should detect journey learning for comprehensive study', () => {
        const result = detectLearningType('深入学习机器学习');
        expect(result.detectedType).toBe('journey');
        expect(result.category).toBe('domain');
      });

      it('should detect journey learning with duration keywords', () => {
        const result = detectLearningType('I want to learn TypeScript over the next few months');
        expect(result.detectedType).toBe('journey');
      });

      it('should suggest appropriate duration for language learning', () => {
        const result = detectLearningType('系统学习 Rust 编程语言');
        expect(result.detectedType).toBe('journey');
        expect(result.suggestedDuration).toBe('months');
      });
    });

    describe('Context-aware Detection', () => {
      it('should consider background knowledge in detection', () => {
        const result = detectLearningType('学习 React', {
          backgroundKnowledge: '我已经有 JavaScript 基础',
        });
        expect(result.detectedType).toBe('journey');
      });

      it('should consider goals in detection', () => {
        const result = detectLearningType('TypeScript', {
          goals: ['掌握类型系统', '能够独立开发项目'],
        });
        expect(result.detectedType).toBe('journey');
      });

      it('should lean towards journey if user has existing path', () => {
        const result = detectLearningType('继续学习', {
          hasExistingPath: true,
        });
        expect(result.detectedType).toBe('journey');
        expect(result.confidence).toBeGreaterThanOrEqual(70);
      });
    });

    describe('Category Detection', () => {
      it('should detect concept category', () => {
        const result = detectLearningType('什么是闭包的概念');
        expect(result.category).toBe('concept');
      });

      it('should detect problem-solving category', () => {
        const result = detectLearningType('解决这个 bug 问题');
        expect(result.category).toBe('problem-solving');
      });

      it('should detect language category', () => {
        const result = detectLearningType('学习 Python 编程');
        expect(result.category).toBe('language');
      });

      it('should detect framework category', () => {
        const result = detectLearningType('学习 Vue.js 框架');
        expect(result.category).toBe('framework');
      });

      it('should detect domain category', () => {
        const result = detectLearningType('深度学习和人工智能');
        expect(result.category).toBe('domain');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty topic', () => {
        const result = detectLearningType('');
        expect(result.detectedType).toBe('quick');
        expect(result.confidence).toBe(40);
      });

      it('should handle short topic without clear indicators', () => {
        const result = detectLearningType('CSS');
        expect(result.detectedType).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });

      it('should handle mixed signals', () => {
        const result = detectLearningType('快速学习 Python 入门');
        // Should still lean towards journey due to language keyword
        expect(result.detectedType).toBeDefined();
      });
    });
  });

  describe('isLongTermSubject', () => {
    it('should return true for programming languages', () => {
      expect(isLongTermSubject('python')).toBe(true);
      expect(isLongTermSubject('JavaScript')).toBe(true);
      expect(isLongTermSubject('Rust')).toBe(true);
    });

    it('should return true for frameworks', () => {
      expect(isLongTermSubject('React')).toBe(true);
      expect(isLongTermSubject('vue')).toBe(true);
      expect(isLongTermSubject('Django')).toBe(true);
    });

    it('should return true for domain knowledge', () => {
      expect(isLongTermSubject('machine learning')).toBe(true);
      expect(isLongTermSubject('data science')).toBe(true);
    });

    it('should return false for non-matching topics', () => {
      expect(isLongTermSubject('hello world')).toBe(false);
      expect(isLongTermSubject('what is')).toBe(false);
    });
  });

  describe('getSuggestedMilestones', () => {
    it('should return milestones for language category', () => {
      const milestones = getSuggestedMilestones('language', 'Python');
      expect(milestones).toBeInstanceOf(Array);
      expect(milestones.length).toBeGreaterThan(0);
      expect(milestones[0]).toContain('基础');
    });

    it('should return milestones for framework category', () => {
      const milestones = getSuggestedMilestones('framework', 'React');
      expect(milestones).toBeInstanceOf(Array);
      expect(milestones.length).toBeGreaterThan(0);
    });

    it('should return milestones for project category', () => {
      const milestones = getSuggestedMilestones('project', 'Web App');
      expect(milestones).toBeInstanceOf(Array);
      expect(milestones.some(m => m.includes('需求'))).toBe(true);
    });

    it('should return default milestones for other category', () => {
      const milestones = getSuggestedMilestones('other', 'Something');
      expect(milestones).toBeInstanceOf(Array);
      expect(milestones.length).toBeGreaterThan(0);
    });
  });

  describe('formatLearningDuration', () => {
    it('should format days duration in Chinese', () => {
      expect(formatLearningDuration('days')).toBe('1-7 天');
    });

    it('should format weeks duration in Chinese', () => {
      expect(formatLearningDuration('weeks')).toBe('1-4 周');
    });

    it('should format months duration in Chinese', () => {
      expect(formatLearningDuration('months')).toBe('1-6 个月');
    });

    it('should format long-term duration in Chinese', () => {
      expect(formatLearningDuration('long-term')).toBe('6+ 个月');
    });
  });

  describe('formatLearningDurationEn', () => {
    it('should format days duration in English', () => {
      expect(formatLearningDurationEn('days')).toBe('1-7 days');
    });

    it('should format weeks duration in English', () => {
      expect(formatLearningDurationEn('weeks')).toBe('1-4 weeks');
    });

    it('should format months duration in English', () => {
      expect(formatLearningDurationEn('months')).toBe('1-6 months');
    });

    it('should format long-term duration in English', () => {
      expect(formatLearningDurationEn('long-term')).toBe('6+ months');
    });
  });
});
