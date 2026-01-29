/**
 * Tests for SpeedPass Mode Router
 */

import {
  detectSpeedLearningMode,
  isSpeedLearningIntent,
  getModeDisplayInfo,
} from './mode-router';

describe('detectSpeedLearningMode', () => {
  describe('extreme mode detection', () => {
    it('should detect extreme mode for short time mentions', () => {
      const inputs = [
        '只有1小时复习',
        '我只有2小时',
        '还剩一小时',
        '就半小时',
      ];

      for (const input of inputs) {
        const result = detectSpeedLearningMode(input);
        expect(result.recommendedMode).toBe('extreme');
        expect(result.confidence).toBeGreaterThan(0.2);
      }
    });

    it('should detect extreme mode for urgency keywords', () => {
      const inputs = [
        '明天考试怎么办',
        '马上要考试了',
        '临时抱佛脚',
        '及格就行',
        '快速过关',
      ];

      for (const input of inputs) {
        const result = detectSpeedLearningMode(input);
        expect(result.recommendedMode).toBe('extreme');
        expect(result.detected).toBe(true);
      }
    });

    it('should detect extreme mode in English', () => {
      const result = detectSpeedLearningMode('I only have 1 hour to study');
      expect(result.recommendedMode).toBe('extreme');
      expect(result.detectedTime).toBe(60);
    });
  });

  describe('speed mode detection', () => {
    it('should detect speed mode for moderate time', () => {
      const inputs = [
        '有3小时复习',
        '大概4个小时',
        '两三小时学习',
      ];

      for (const input of inputs) {
        const result = detectSpeedLearningMode(input);
        expect(result.recommendedMode).toBe('speed');
      }
    });

    it('should detect speed mode for moderate keywords', () => {
      const inputs = [
        '目标70分',
        '重点内容',
        '核心知识点',
      ];

      for (const input of inputs) {
        const result = detectSpeedLearningMode(input);
        expect(result.detected).toBe(true);
      }
    });
  });

  describe('comprehensive mode detection', () => {
    it('should detect comprehensive mode for long time', () => {
      const inputs = [
        '有8小时学习',
        '充足的时间',
        '时间充裕',
      ];

      for (const input of inputs) {
        const result = detectSpeedLearningMode(input);
        expect(result.recommendedMode).toBe('comprehensive');
      }
    });

    it('should detect comprehensive mode for high score goals', () => {
      const result1 = detectSpeedLearningMode('全面复习所有内容');
      expect(result1.detected).toBe(true);
      expect(result1.recommendedMode).toBe('comprehensive');
      
      const result2 = detectSpeedLearningMode('目标90分以上');
      expect(result2.detected).toBe(true);
    });
  });

  describe('context-based detection', () => {
    it('should use availableTimeMinutes from context', () => {
      const result = detectSpeedLearningMode('复习一下', {
        availableTimeMinutes: 60,
      });
      expect(result.recommendedMode).toBe('extreme');
      expect(result.confidence).toBe(0.9);
    });

    it('should use preferredMode from context as fallback', () => {
      const result = detectSpeedLearningMode('开始学习', {
        preferredMode: 'comprehensive',
      });
      expect(result.recommendedMode).toBe('comprehensive');
    });
  });

  describe('default behavior', () => {
    it('should default to speed mode when no clear signal', () => {
      const result = detectSpeedLearningMode('学习');
      expect(result.recommendedMode).toBe('speed');
    });
  });
});

describe('isSpeedLearningIntent', () => {
  it('should detect Chinese learning intent', () => {
    expect(isSpeedLearningIntent('帮我复习考试')).toBe(true);
    expect(isSpeedLearningIntent('速过学习')).toBe(true);
    expect(isSpeedLearningIntent('刷题练习')).toBe(true);
  });

  it('should detect English learning intent', () => {
    expect(isSpeedLearningIntent('prepare for exam')).toBe(true);
    expect(isSpeedLearningIntent('speed learning')).toBe(true);
    expect(isSpeedLearningIntent('textbook review')).toBe(true);
  });

  it('should return false for unrelated input', () => {
    expect(isSpeedLearningIntent('hello world')).toBe(false);
    expect(isSpeedLearningIntent('写代码')).toBe(false);
    expect(isSpeedLearningIntent('画一张图')).toBe(false);
  });
});

describe('getModeDisplayInfo', () => {
  it('should return correct info for extreme mode', () => {
    const info = getModeDisplayInfo('extreme');
    expect(info.nameZh).toBe('极速模式');
    expect(info.duration).toBe('1-2h');
    expect(info.color).toBe('red');
  });

  it('should return correct info for speed mode', () => {
    const info = getModeDisplayInfo('speed');
    expect(info.nameZh).toBe('速成模式');
    expect(info.duration).toBe('2-4h');
    expect(info.color).toBe('orange');
  });

  it('should return correct info for comprehensive mode', () => {
    const info = getModeDisplayInfo('comprehensive');
    expect(info.nameZh).toBe('全面模式');
    expect(info.duration).toBe('6-12h');
    expect(info.color).toBe('blue');
  });
});
