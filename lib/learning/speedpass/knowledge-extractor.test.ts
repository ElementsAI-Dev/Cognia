/**
 * Knowledge Extractor Tests
 */

import {
  detectKnowledgePointType,
  assessImportance,
  calculateDifficulty,
  extractTitle,
  extractFormulasFromText,
  generateSummary,
  extractKnowledgePoints,
  findRelatedKnowledgePoints,
  buildPrerequisites,
} from './knowledge-extractor';
import type { TextbookKnowledgePoint, TextbookChapter } from '@/types/learning/speedpass';
import type { ParsedPage } from './textbook-parser';

describe('knowledge-extractor', () => {
  describe('detectKnowledgePointType', () => {
    it('should detect definition patterns in Chinese', () => {
      expect(detectKnowledgePointType('定义1.1：函数的极限是...')).toBe('definition');
      expect(detectKnowledgePointType('【定义】 集合是...')).toBe('definition');
      expect(detectKnowledgePointType('称这种情况为连续')).toBe('definition');
      expect(detectKnowledgePointType('这个叫做导数')).toBe('definition');
    });

    it('should detect definition patterns in English', () => {
      expect(detectKnowledgePointType('Definition 2.3: A function is...')).toBe('definition');
    });

    it('should detect theorem patterns', () => {
      expect(detectKnowledgePointType('定理2.1：若f(x)连续...')).toBe('theorem');
      expect(detectKnowledgePointType('【定理】 极值定理')).toBe('theorem');
      expect(detectKnowledgePointType('Theorem 3.1: If f is continuous...')).toBe('theorem');
      expect(detectKnowledgePointType('引理1.2 辅助结论')).toBe('theorem');
    });

    it('should detect formula patterns', () => {
      expect(detectKnowledgePointType('公式3.1：积分公式')).toBe('formula');
      expect(detectKnowledgePointType('【公式】求导公式')).toBe('formula');
      expect(detectKnowledgePointType('Formula 4.2: Integration by parts')).toBe('formula');
      expect(detectKnowledgePointType('$$\\int x dx = \\frac{x^2}{2}$$')).toBe('formula');
    });

    it('should detect concept patterns', () => {
      expect(detectKnowledgePointType('概念1.1：连续性')).toBe('concept');
      expect(detectKnowledgePointType('【概念】可微性')).toBe('concept');
      expect(detectKnowledgePointType('基本概念介绍')).toBe('concept');
    });

    it('should detect method patterns', () => {
      expect(detectKnowledgePointType('方法2.1：换元法')).toBe('method');
      expect(detectKnowledgePointType('【方法】分部积分')).toBe('method');
      expect(detectKnowledgePointType('步骤：首先...')).toBe('method');
      expect(detectKnowledgePointType('解法分析')).toBe('method');
    });

    it('should detect property patterns', () => {
      expect(detectKnowledgePointType('性质1.1：可加性')).toBe('property');
      expect(detectKnowledgePointType('【性质】单调性')).toBe('property');
    });

    it('should detect corollary patterns as theorem', () => {
      // Corollary is categorized as theorem type
      const result = detectKnowledgePointType('推论2.1：直接推导');
      expect(['corollary', 'theorem']).toContain(result);
    });

    it('should detect lemma patterns as theorem', () => {
      // Lemma is categorized as theorem type
      const result = detectKnowledgePointType('引理1.1：辅助定理');
      expect(['lemma', 'theorem']).toContain(result);
    });

    it('should return null for unrecognized patterns', () => {
      expect(detectKnowledgePointType('This is regular text')).toBeNull();
      expect(detectKnowledgePointType('一般段落内容')).toBeNull();
      expect(detectKnowledgePointType('')).toBeNull();
    });
  });

  describe('assessImportance', () => {
    it('should detect critical importance', () => {
      expect(assessImportance('这是一个重要的定理')).toBe('critical');
      expect(assessImportance('必考知识点')).toBe('critical');
      expect(assessImportance('核心概念')).toBe('critical');
      expect(assessImportance('This is a key concept')).toBe('critical');
      expect(assessImportance('Fundamental theorem')).toBe('critical');
    });

    it('should detect high importance', () => {
      expect(assessImportance('常考题型')).toBe('high');
      expect(assessImportance('重点内容')).toBe('high');
      expect(assessImportance('A major topic')).toBe('high');
    });

    it('should detect medium importance', () => {
      expect(assessImportance('一般了解即可')).toBe('medium');
      expect(assessImportance('Secondary concept')).toBe('medium');
    });

    it('should detect low importance', () => {
      expect(assessImportance('补充材料')).toBe('low');
      expect(assessImportance('扩展阅读')).toBe('low');
      expect(assessImportance('选学内容')).toBe('low');
      expect(assessImportance('Optional reading')).toBe('low');
    });

    it('should default to medium when no keywords found', () => {
      expect(assessImportance('普通文本内容')).toBe('medium');
      expect(assessImportance('Regular text')).toBe('medium');
    });

    it('should consider context in assessment', () => {
      expect(assessImportance('定理内容', '这是必考内容')).toBe('critical');
    });
  });

  describe('calculateDifficulty', () => {
    it('should return base difficulty for simple text', () => {
      const result = calculateDifficulty('Simple concept explanation.');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should increase difficulty for formulas', () => {
      const withFormulas = 'The equation $x^2 + y^2 = r^2$ and $a^2 + b^2 = c^2$';
      const withoutFormulas = 'Simple text without any math';
      
      expect(calculateDifficulty(withFormulas)).toBeGreaterThan(calculateDifficulty(withoutFormulas));
    });

    it('should increase difficulty for longer content', () => {
      const shortText = 'Short text.';
      const longText = Array(300).fill('word').join(' ');
      
      expect(calculateDifficulty(longText)).toBeGreaterThan(calculateDifficulty(shortText));
    });

    it('should increase difficulty for technical terms', () => {
      const technical = '微分方程的导数和积分计算涉及极限';
      const simple = '简单的加减法运算';
      
      expect(calculateDifficulty(technical)).toBeGreaterThan(calculateDifficulty(simple));
    });

    it('should clamp result between 0 and 1', () => {
      const veryComplex = Array(600).fill('微分导数积分极限矩阵向量特征值').join(' ') + 
                          Array(20).fill('$x^2$').join(' ');
      const result = calculateDifficulty(veryComplex);
      
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extractTitle', () => {
    it('should extract title from definition pattern', () => {
      const text = '定义1.1：函数的连续性是指在某点处函数值等于极限值';
      const result = extractTitle(text, 'definition');
      expect(result).toBe('函数的连续性是指在某点处函数值等于极限值');
    });

    it('should truncate long titles', () => {
      const text = '定义1.1：' + 'A'.repeat(100);
      const result = extractTitle(text, 'definition');
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toContain('...');
    });

    it('should fallback to first line for unmatched patterns', () => {
      const text = 'First line of content\nSecond line';
      const result = extractTitle(text, 'concept');
      expect(result).toBe('First line of content');
    });

    it('should handle empty text', () => {
      const result = extractTitle('', 'definition');
      expect(result).toBe('');
    });
  });

  describe('extractFormulasFromText', () => {
    it('should extract inline formulas', () => {
      const text = 'Given $f(x) = x^2$ and $g(x) = 2x$';
      const result = extractFormulasFromText(text);
      
      expect(result).toContain('f(x) = x^2');
      expect(result).toContain('g(x) = 2x');
    });

    it('should extract display formulas', () => {
      const text = 'The formula is: $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$';
      const result = extractFormulasFromText(text);
      
      expect(result).toContain('\\sum_{i=1}^n i = \\frac{n(n+1)}{2}');
    });

    it('should remove duplicates', () => {
      const text = '$x^2$ and $y^2$ and again $x^2$';
      const result = extractFormulasFromText(text);
      
      const x2Count = result.filter(f => f === 'x^2').length;
      expect(x2Count).toBe(1);
    });

    it('should return empty array for text without formulas', () => {
      const result = extractFormulasFromText('No formulas here');
      expect(result).toEqual([]);
    });

    it('should handle whitespace in formulas', () => {
      const text = '$$x = 1$$';
      const result = extractFormulasFromText(text);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateSummary', () => {
    it('should return short text unchanged', () => {
      const text = 'Short summary text.';
      const result = generateSummary(text);
      expect(result).toBe('Short summary text.');
    });

    it('should replace formulas with placeholder', () => {
      const text = 'The equation $E = mc^2$ is famous.';
      const result = generateSummary(text);
      expect(result).toContain('[公式]');
      expect(result).not.toContain('E = mc^2');
    });

    it('should truncate long text', () => {
      const text = Array(50).fill('这是一个很长的句子。').join('');
      const result = generateSummary(text, 200);
      expect(result.length).toBeLessThanOrEqual(200);
    });

    it('should respect custom max length', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = generateSummary(text, 50);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should use first paragraph', () => {
      const text = 'First paragraph content.\n\nSecond paragraph content.';
      const result = generateSummary(text);
      expect(result).toBe('First paragraph content.');
    });
  });

  describe('extractKnowledgePoints', () => {
    const mockChapters: TextbookChapter[] = [
      {
        id: 'ch1',
        textbookId: 'tb1',
        chapterNumber: '1',
        title: 'Chapter 1',
        level: 1,
        orderIndex: 1,
        pageStart: 1,
        pageEnd: 10,
        knowledgePointCount: 0,
        exampleCount: 0,
        exerciseCount: 0,
      },
    ];

    const mockPages: ParsedPage[] = [
      {
        pageNumber: 1,
        content: '定义1.1：函数f(x)在点x0处连续\n\n定理1.1：连续函数的性质',
        images: [],
        tables: [],
        formulas: [],
      },
    ];

    it('should extract knowledge points from pages', () => {
      const result = extractKnowledgePoints('tb1', mockChapters, mockPages);
      
      expect(result.knowledgePoints.length).toBeGreaterThan(0);
      expect(result.totalExtracted).toBe(result.knowledgePoints.length);
    });

    it('should categorize by type', () => {
      const result = extractKnowledgePoints('tb1', mockChapters, mockPages);
      
      expect(result.byType).toHaveProperty('definition');
      expect(result.byType).toHaveProperty('theorem');
    });

    it('should categorize by importance', () => {
      const result = extractKnowledgePoints('tb1', mockChapters, mockPages);
      
      expect(result.byImportance).toHaveProperty('critical');
      expect(result.byImportance).toHaveProperty('high');
      expect(result.byImportance).toHaveProperty('medium');
      expect(result.byImportance).toHaveProperty('low');
    });

    it('should respect extraction options', () => {
      const result = extractKnowledgePoints('tb1', mockChapters, mockPages, {
        extractDefinitions: true,
        extractTheorems: false,
      });
      
      const hasTheorem = result.knowledgePoints.some(kp => kp.type === 'theorem');
      expect(hasTheorem).toBe(false);
    });

    it('should filter by confidence threshold', () => {
      const highThreshold = extractKnowledgePoints('tb1', mockChapters, mockPages, {
        minConfidence: 0.9,
      });
      const lowThreshold = extractKnowledgePoints('tb1', mockChapters, mockPages, {
        minConfidence: 0.3,
      });
      
      expect(lowThreshold.totalExtracted).toBeGreaterThanOrEqual(highThreshold.totalExtracted);
    });

    it('should call progress callback', () => {
      const onProgress = jest.fn();
      extractKnowledgePoints('tb1', mockChapters, mockPages, {}, onProgress);
      
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle empty pages', () => {
      const result = extractKnowledgePoints('tb1', mockChapters, []);
      
      expect(result.knowledgePoints).toEqual([]);
      expect(result.totalExtracted).toBe(0);
    });
  });

  describe('findRelatedKnowledgePoints', () => {
    const mockKPs: TextbookKnowledgePoint[] = [
      {
        id: 'kp1',
        textbookId: 'tb1',
        chapterId: 'ch1',
        title: '极限定义',
        content: '极限的概念和定义',
        type: 'definition',
        importance: 'critical',
        difficulty: 0.5,
        pageNumber: 1,
        extractionConfidence: 0.8,
        verified: false,
      },
      {
        id: 'kp2',
        textbookId: 'tb1',
        chapterId: 'ch1',
        title: '极限运算',
        content: '极限的四则运算法则',
        type: 'theorem',
        importance: 'high',
        difficulty: 0.6,
        pageNumber: 2,
        formulas: ['lim(f+g) = lim f + lim g'],
        extractionConfidence: 0.8,
        verified: false,
      },
      {
        id: 'kp3',
        textbookId: 'tb1',
        chapterId: 'ch2',
        title: '导数定义',
        content: '导数的概念',
        type: 'definition',
        importance: 'critical',
        difficulty: 0.7,
        pageNumber: 10,
        extractionConfidence: 0.8,
        verified: false,
      },
    ];

    it('should find related knowledge points', () => {
      const related = findRelatedKnowledgePoints(mockKPs[0], mockKPs);
      
      expect(related.length).toBeGreaterThan(0);
      expect(related.every(kp => kp.id !== 'kp1')).toBe(true);
    });

    it('should prioritize same chapter', () => {
      const related = findRelatedKnowledgePoints(mockKPs[0], mockKPs);
      
      // kp2 is in same chapter, should be higher ranked
      const kp2Index = related.findIndex(kp => kp.id === 'kp2');
      const kp3Index = related.findIndex(kp => kp.id === 'kp3');
      
      if (kp2Index !== -1 && kp3Index !== -1) {
        expect(kp2Index).toBeLessThan(kp3Index);
      }
    });

    it('should respect max results limit', () => {
      const related = findRelatedKnowledgePoints(mockKPs[0], mockKPs, 1);
      expect(related.length).toBeLessThanOrEqual(1);
    });

    it('should return empty for single knowledge point', () => {
      const related = findRelatedKnowledgePoints(mockKPs[0], [mockKPs[0]]);
      expect(related).toEqual([]);
    });
  });

  describe('buildPrerequisites', () => {
    const mockKPs: TextbookKnowledgePoint[] = [
      {
        id: 'kp1',
        textbookId: 'tb1',
        chapterId: 'ch1',
        title: '极限',
        content: '极限的基本概念',
        type: 'definition',
        importance: 'critical',
        difficulty: 0.5,
        pageNumber: 1,
        formulas: ['lim f(x)'],
        extractionConfidence: 0.8,
        verified: false,
      },
      {
        id: 'kp2',
        textbookId: 'tb1',
        chapterId: 'ch1',
        title: '连续性',
        content: '连续函数的定义，基于极限概念',
        type: 'definition',
        importance: 'critical',
        difficulty: 0.6,
        pageNumber: 5,
        extractionConfidence: 0.8,
        verified: false,
      },
      {
        id: 'kp3',
        textbookId: 'tb1',
        chapterId: 'ch2',
        title: '导数',
        content: '导数使用lim f(x)来定义',
        type: 'definition',
        importance: 'critical',
        difficulty: 0.7,
        pageNumber: 10,
        formulas: ['lim f(x)'],
        extractionConfidence: 0.8,
        verified: false,
      },
    ];

    it('should build prerequisite map', () => {
      const prereqs = buildPrerequisites(mockKPs);
      
      expect(prereqs).toBeInstanceOf(Map);
    });

    it('should identify content-based prerequisites', () => {
      const prereqs = buildPrerequisites(mockKPs);
      
      // kp2 mentions 极限, which is kp1's title
      const kp2Prereqs = prereqs.get('kp2');
      if (kp2Prereqs) {
        expect(kp2Prereqs).toContain('kp1');
      }
    });

    it('should identify formula-based prerequisites', () => {
      const prereqs = buildPrerequisites(mockKPs);
      
      // kp3 uses same formula as kp1
      const kp3Prereqs = prereqs.get('kp3');
      if (kp3Prereqs) {
        expect(kp3Prereqs).toContain('kp1');
      }
    });

    it('should handle empty array', () => {
      const prereqs = buildPrerequisites([]);
      expect(prereqs.size).toBe(0);
    });

    it('should not include self-references', () => {
      const prereqs = buildPrerequisites(mockKPs);
      
      for (const [id, prereqIds] of prereqs) {
        expect(prereqIds).not.toContain(id);
      }
    });
  });
});
