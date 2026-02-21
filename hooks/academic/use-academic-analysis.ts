/**
 * useAcademicAnalysis - Hook for paper analysis and PPT generation
 *
 * Handles AI analysis, guided learning, prompt building, and PPT generation
 */

'use client';

import { useCallback, useState } from 'react';
import { useAcademicStore } from '@/stores/academic';
import { useLearningStore } from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';
import { useA2UI } from '@/hooks/a2ui/use-a2ui';
import type {
  Paper,
  LibraryPaper,
  PaperAnalysisType,
  PaperToPPTOptions,
  PaperPPTOutlineItem,
} from '@/types/academic';
import {
  executeAcademicAnalysis,
  type AcademicAnalysisInput,
  type AcademicAnalysisResult,
} from '@/lib/ai/tools/academic-analysis-tool';
import {
  executePaperToPPT,
  executePaperToPPTOutline,
} from '@/lib/ai/tools/academic-ppt-tool';
import { createAnalysisPanelSurface } from '@/lib/a2ui/academic-templates';
import type { PPTPresentation } from '@/types/workflow';

export interface UseAcademicAnalysisOptions {
  enableA2UI?: boolean;
}

export interface UseAcademicAnalysisReturn {
  // Enhanced analysis
  analyzePaperWithAI: (
    paper: Paper | LibraryPaper,
    analysisType: PaperAnalysisType
  ) => Promise<AcademicAnalysisResult>;
  lastAnalysisResult: AcademicAnalysisResult | null;
  isAnalyzing: boolean;

  // Combined actions
  analyzeAndDisplay: (
    paper: Paper | LibraryPaper,
    analysisType: PaperAnalysisType
  ) => Promise<string | null>;

  // A2UI integration
  createAnalysisUI: (
    paper: Paper,
    analysisType: PaperAnalysisType,
    content: string
  ) => string | null;

  // Analysis actions
  analyzePaper: (paperId: string, analysisType: PaperAnalysisType) => Promise<string>;
  startGuidedLearning: (paperId: string) => void;

  // PPT Generation
  generatePresentationFromPaper: (
    papers: Paper[],
    options?: Partial<Omit<PaperToPPTOptions, 'papers'>>
  ) => Promise<{
    success: boolean;
    presentation?: PPTPresentation;
    outline?: PaperPPTOutlineItem[];
    error?: string;
  }>;
  generatePPTOutline: (
    papers: Paper[],
    options?: Partial<Omit<PaperToPPTOptions, 'papers'>>
  ) => Promise<{
    success: boolean;
    outline?: PaperPPTOutlineItem[];
    error?: string;
  }>;
  isGeneratingPPT: boolean;
}

export function useAcademicAnalysis(
  options: UseAcademicAnalysisOptions = {}
): UseAcademicAnalysisReturn {
  const { enableA2UI = true } = options;

  const academicStore = useAcademicStore();
  const learningStore = useLearningStore();
  const sessionStore = useSessionStore();
  const a2ui = useA2UI();

  const [lastAnalysisResult, setLastAnalysisResult] = useState<AcademicAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

  const createAnalysisUI = useCallback(
    (paper: Paper, analysisType: PaperAnalysisType, content: string): string | null => {
      if (!enableA2UI) return null;
      const { surfaceId, messages } = createAnalysisPanelSurface(
        { title: paper.title, abstract: paper.abstract },
        analysisType,
        content
      );
      a2ui.processMessages(messages);
      return surfaceId;
    },
    [enableA2UI, a2ui]
  );

  const analyzePaperWithAI = useCallback(
    async (
      paper: Paper | LibraryPaper,
      analysisType: PaperAnalysisType
    ): Promise<AcademicAnalysisResult> => {
      setIsAnalyzing(true);
      try {
        const input: AcademicAnalysisInput = {
          paperTitle: paper.title,
          paperAbstract: paper.abstract,
          analysisType,
          depth: 'standard',
          language: 'en',
        };
        const result = await executeAcademicAnalysis(input);
        setLastAnalysisResult(result);
        return result;
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const analyzeAndDisplay = useCallback(
    async (
      paper: Paper | LibraryPaper,
      analysisType: PaperAnalysisType
    ): Promise<string | null> => {
      const result = await analyzePaperWithAI(paper, analysisType);
      if (result.success) {
        return createAnalysisUI(paper, analysisType, result.analysis);
      }
      return null;
    },
    [analyzePaperWithAI, createAnalysisUI]
  );

  const analyzePaper = useCallback(
    async (paperId: string, analysisType: PaperAnalysisType) => {
      const paper = academicStore.library.papers[paperId];
      if (!paper) {
        throw new Error('Paper not found in library');
      }
      const analysisPrompt = buildAnalysisPrompt(paper, analysisType);
      return analysisPrompt;
    },
    [academicStore.library.papers]
  );

  const startGuidedLearning = useCallback(
    (paperId: string) => {
      const paper = academicStore.library.papers[paperId];
      if (!paper) return;

      const activeSessionId = sessionStore.activeSessionId;
      if (!activeSessionId) return;

      learningStore.startLearningSession(activeSessionId, {
        topic: paper.title,
        backgroundKnowledge: paper.abstract || '',
        learningGoals: [
          'Understand the main contributions',
          'Identify key methodology',
          'Evaluate the findings',
        ],
      });
    },
    [academicStore.library.papers, sessionStore.activeSessionId, learningStore]
  );

  const generatePresentationFromPaper = useCallback(
    async (
      papers: Paper[],
      pptOptions?: Partial<Omit<PaperToPPTOptions, 'papers'>>
    ) => {
      setIsGeneratingPPT(true);
      try {
        const input = {
          papers: papers.map(p => ({
            id: p.id,
            title: p.title,
            abstract: p.abstract,
            authors: p.authors,
            year: p.year,
            venue: p.venue,
          })),
          style: pptOptions?.style || 'academic',
          slideCount: pptOptions?.slideCount || 15,
          audienceLevel: pptOptions?.audienceLevel || 'graduate',
          language: pptOptions?.language || 'en',
          includeSections: pptOptions?.includeSections,
          generateImages: pptOptions?.generateImages ?? true,
          imageStyle: pptOptions?.imageStyle || 'diagram',
          includeNotes: pptOptions?.includeNotes ?? true,
          includeCitations: pptOptions?.includeCitations ?? true,
          includeReferences: pptOptions?.includeReferences ?? true,
          customInstructions: pptOptions?.customInstructions,
        };
        const result = await executePaperToPPT(input);
        return result;
      } finally {
        setIsGeneratingPPT(false);
      }
    },
    []
  );

  const generatePPTOutline = useCallback(
    async (
      papers: Paper[],
      pptOptions?: Partial<Omit<PaperToPPTOptions, 'papers'>>
    ) => {
      setIsGeneratingPPT(true);
      try {
        const input = {
          papers: papers.map(p => ({
            id: p.id,
            title: p.title,
            abstract: p.abstract,
            authors: p.authors,
            year: p.year,
            venue: p.venue,
          })),
          style: pptOptions?.style || 'academic',
          slideCount: pptOptions?.slideCount || 15,
          audienceLevel: pptOptions?.audienceLevel || 'graduate',
          language: pptOptions?.language || 'en',
          includeSections: pptOptions?.includeSections,
          generateImages: pptOptions?.generateImages ?? true,
          imageStyle: pptOptions?.imageStyle || 'diagram',
          includeNotes: pptOptions?.includeNotes ?? true,
          includeCitations: pptOptions?.includeCitations ?? true,
          includeReferences: pptOptions?.includeReferences ?? true,
          customInstructions: pptOptions?.customInstructions,
        };
        const result = await executePaperToPPTOutline(input);
        return result;
      } finally {
        setIsGeneratingPPT(false);
      }
    },
    []
  );

  return {
    analyzePaperWithAI,
    lastAnalysisResult,
    isAnalyzing,
    analyzeAndDisplay,
    createAnalysisUI,
    analyzePaper,
    startGuidedLearning,
    generatePresentationFromPaper,
    generatePPTOutline,
    isGeneratingPPT,
  };
}

// Helper function to build analysis prompts
function buildAnalysisPrompt(paper: LibraryPaper, analysisType: PaperAnalysisType): string {
  const { title, abstract, authors } = paper;
  const authorNames = authors.map((a: { name: string }) => a.name).join(', ');

  const baseContext = `
Paper: "${title}"
Authors: ${authorNames}
${abstract ? `Abstract: ${abstract}` : ''}
`;

  const prompts: Record<PaperAnalysisType, string> = {
    summary: `${baseContext}\n\nPlease provide a comprehensive summary of this paper, including the main contributions, methodology, and key findings.`,
    'key-insights': `${baseContext}\n\nIdentify and explain the key insights and takeaways from this paper.`,
    methodology: `${baseContext}\n\nAnalyze and explain the methodology used in this paper in detail.`,
    findings: `${baseContext}\n\nSummarize the main findings and results presented in this paper.`,
    limitations: `${baseContext}\n\nIdentify and discuss the limitations mentioned or implied in this paper.`,
    'future-work': `${baseContext}\n\nWhat future work directions does this paper suggest or imply?`,
    'related-work': `${baseContext}\n\nDiscuss how this paper relates to and builds upon previous work in the field.`,
    'technical-details': `${baseContext}\n\nExplain the technical details and implementation aspects of this paper.`,
    comparison: `${baseContext}\n\nCompare this paper's approach with other methods in the field.`,
    critique: `${baseContext}\n\nProvide a critical analysis of this paper, discussing both strengths and weaknesses.`,
    eli5: `${baseContext}\n\nExplain this paper in simple terms that a non-expert could understand.`,
    custom: baseContext,
  };

  return prompts[analysisType] || baseContext;
}
