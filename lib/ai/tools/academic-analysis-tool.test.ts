/**
 * Tests for Academic Analysis Tool
 */

import {
  academicAnalysisTool,
  paperComparisonTool,
  buildAnalysisPrompt,
} from './academic-analysis-tool';

describe('Academic Analysis Tool', () => {
  describe('academicAnalysisTool', () => {
    it('should have correct tool definition', () => {
      expect(academicAnalysisTool.name).toBe('academic_analysis');
      expect(academicAnalysisTool.description).toContain('Analyze academic papers');
      expect(academicAnalysisTool.parameters).toBeDefined();
    });
  });

  describe('paperComparisonTool', () => {
    it('should have correct tool definition', () => {
      expect(paperComparisonTool.name).toBe('paper_comparison');
      expect(paperComparisonTool.description).toContain('Compare');
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should build summary prompt correctly', () => {
      const paper = {
        title: 'Test Paper on Machine Learning',
        abstract: 'This paper presents a novel approach...',
      };

      const prompt = buildAnalysisPrompt(paper, 'summary', 'standard');

      expect(prompt).toContain('Test Paper on Machine Learning');
      expect(prompt).toContain('novel approach');
    });

    it('should build methodology prompt', () => {
      const paper = {
        title: 'Research Paper',
        abstract: 'We propose a new method...',
      };

      const prompt = buildAnalysisPrompt(paper, 'methodology', 'detailed');

      expect(prompt).toContain('Research Paper');
      expect(prompt).toContain('methodology');
    });

    it('should build eli5 prompt', () => {
      const paper = {
        title: 'Complex Technical Paper',
      };

      const prompt = buildAnalysisPrompt(paper, 'eli5', 'brief');

      expect(prompt).toContain('Complex Technical Paper');
      expect(prompt).toContain('ELI5');
    });

    it('should handle custom analysis type', () => {
      const paper = {
        title: 'Custom Analysis Paper',
      };

      const customPrompt = 'Focus on ethical implications';
      const prompt = buildAnalysisPrompt(paper, 'custom', 'standard', customPrompt);

      expect(prompt).toContain('Custom Analysis Paper');
      expect(prompt).toContain('ethical implications');
    });
  });
});
