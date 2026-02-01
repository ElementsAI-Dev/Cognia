/**
 * Knowledge Matcher Tests
 */

import knowledgeMatcher from './knowledge-matcher';
import type { TextbookKnowledgePoint } from '@/types/learning/speedpass';

// ============================================================================
// Test Data
// ============================================================================

const mockKnowledgePoints: TextbookKnowledgePoint[] = [
  {
    id: 'kp-1',
    textbookId: 'tb-1',
    chapterId: 'ch-1',
    title: '牛顿第一定律',
    content: '物体在不受外力作用时，保持静止或匀速直线运动状态',
    summary: '惯性定律',
    type: 'concept',
    importance: 'critical',
    difficulty: 0.5,
    pageNumber: 10,
    extractionConfidence: 0.9,
    verified: true,
    tags: ['力学', '牛顿定律'],
  },
  {
    id: 'kp-2',
    textbookId: 'tb-1',
    chapterId: 'ch-1',
    title: '牛顿第二定律',
    content: 'F=ma，力等于质量乘以加速度',
    summary: '力与加速度的关系',
    type: 'formula',
    importance: 'critical',
    difficulty: 0.6,
    formulas: ['F=ma'],
    pageNumber: 15,
    extractionConfidence: 0.95,
    verified: true,
    tags: ['力学', '牛顿定律', '公式'],
  },
  {
    id: 'kp-3',
    textbookId: 'tb-1',
    chapterId: 'ch-2',
    title: '能量守恒定律',
    content: '能量既不能创造也不能消灭，只能从一种形式转化为另一种形式',
    type: 'concept',
    importance: 'high',
    difficulty: 0.7,
    pageNumber: 50,
    extractionConfidence: 0.85,
    verified: true,
    tags: ['能量', '守恒定律'],
  },
];

const mockTeacherNotes = '牛顿定律是力学的基础，必考内容；F=ma公式的应用；能量守恒在实际问题中的应用';

// ============================================================================
// Tests
// ============================================================================

describe('knowledgeMatcher', () => {
  describe('matchKeyPoint', () => {
    it('should match a single key point text against knowledge points', () => {
      const result = knowledgeMatcher.matchKeyPoint(
        '牛顿定律是力学的基础',
        mockKnowledgePoints
      );

      expect(result).toBeDefined();
      expect(result.originalText).toBe('牛顿定律是力学的基础');
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should return matches sorted by score', () => {
      const result = knowledgeMatcher.matchKeyPoint(
        '牛顿定律',
        mockKnowledgePoints
      );

      if (result.matches.length > 1) {
        for (let i = 1; i < result.matches.length; i++) {
          expect(result.matches[i - 1].matchScore).toBeGreaterThanOrEqual(
            result.matches[i].matchScore
          );
        }
      }
    });

    it('should include match reasons', () => {
      const result = knowledgeMatcher.matchKeyPoint(
        '牛顿第一定律',
        mockKnowledgePoints
      );

      if (result.matches.length > 0) {
        expect(result.matches[0].matchReasons).toBeDefined();
        expect(Array.isArray(result.matches[0].matchReasons)).toBe(true);
      }
    });

    it('should have confidence score', () => {
      const result = knowledgeMatcher.matchKeyPoint(
        '牛顿定律',
        mockKnowledgePoints
      );

      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('matchTeacherKeyPoints', () => {
    it('should match multiple key point texts', () => {
      const results = knowledgeMatcher.matchTeacherKeyPoints(
        mockTeacherNotes,
        mockKnowledgePoints
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return results for each key point', () => {
      const results = knowledgeMatcher.matchTeacherKeyPoints(
        mockTeacherNotes,
        mockKnowledgePoints
      );

      // Each result should have matches array
      results.forEach((r) => {
        expect(r.originalText).toBeDefined();
        expect(r.matches).toBeDefined();
      });
    });

    it('should handle empty key points string', () => {
      const results = knowledgeMatcher.matchTeacherKeyPoints(
        '',
        mockKnowledgePoints
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    });

    it('should handle empty knowledge points array', () => {
      const results = knowledgeMatcher.matchTeacherKeyPoints(
        mockTeacherNotes,
        []
      );

      expect(results).toBeDefined();
      results.forEach((r) => {
        expect(r.matches.length).toBe(0);
      });
    });
  });

  describe('getMatchedKnowledgePointIds', () => {
    it('should return a Map of knowledge point IDs to scores', () => {
      const matches = knowledgeMatcher.matchTeacherKeyPoints(
        mockTeacherNotes,
        mockKnowledgePoints
      );

      const ids = knowledgeMatcher.getMatchedKnowledgePointIds(matches);

      expect(ids).toBeInstanceOf(Map);
    });

    it('should contain unique IDs', () => {
      const matches = knowledgeMatcher.matchTeacherKeyPoints(
        mockTeacherNotes,
        mockKnowledgePoints
      );

      const ids = knowledgeMatcher.getMatchedKnowledgePointIds(matches);
      const idArray = Array.from(ids.keys());
      const uniqueIds = [...new Set(idArray)];

      expect(idArray.length).toBe(uniqueIds.length);
    });

    it('should have scores between 0 and 1', () => {
      const matches = knowledgeMatcher.matchTeacherKeyPoints(
        mockTeacherNotes,
        mockKnowledgePoints
      );

      const ids = knowledgeMatcher.getMatchedKnowledgePointIds(matches);

      ids.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('filterKnowledgePointsByMatch', () => {
    it('should filter knowledge points based on match scores', () => {
      const matches = knowledgeMatcher.matchTeacherKeyPoints(
        mockTeacherNotes,
        mockKnowledgePoints
      );
      const matchScores = knowledgeMatcher.getMatchedKnowledgePointIds(matches);

      const filtered = knowledgeMatcher.filterKnowledgePointsByMatch(
        mockKnowledgePoints,
        matchScores
      );

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(mockKnowledgePoints.length);
    });

    it('should return empty array when no matches', () => {
      const emptyScores = new Map<string, number>();

      const filtered = knowledgeMatcher.filterKnowledgePointsByMatch(
        mockKnowledgePoints,
        emptyScores
      );

      expect(filtered.length).toBe(0);
    });

    it('should sort by match score descending', () => {
      const matches = knowledgeMatcher.matchTeacherKeyPoints(
        '牛顿定律',
        mockKnowledgePoints
      );
      const matchScores = knowledgeMatcher.getMatchedKnowledgePointIds(matches);

      const filtered = knowledgeMatcher.filterKnowledgePointsByMatch(
        mockKnowledgePoints,
        matchScores
      );

      if (filtered.length > 1) {
        for (let i = 1; i < filtered.length; i++) {
          const prevScore = matchScores.get(filtered[i - 1].id) || 0;
          const currScore = matchScores.get(filtered[i].id) || 0;
          expect(prevScore).toBeGreaterThanOrEqual(currScore);
        }
      }
    });
  });
});

describe('text matching', () => {
  it('should handle Chinese text', () => {
    const result = knowledgeMatcher.matchKeyPoint(
      '牛顿第一定律 惯性',
      mockKnowledgePoints
    );

    expect(result).toBeDefined();
    expect(result.originalText).toBe('牛顿第一定律 惯性');
  });

  it('should handle mixed Chinese and English', () => {
    const result = knowledgeMatcher.matchKeyPoint(
      'F=ma 公式',
      mockKnowledgePoints
    );

    expect(result).toBeDefined();
  });

  it('should handle empty text gracefully', () => {
    const result = knowledgeMatcher.matchKeyPoint('', mockKnowledgePoints);

    expect(result).toBeDefined();
    expect(result.originalText).toBe('');
  });
});
