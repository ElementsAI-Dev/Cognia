/**
 * Unit tests for useAcademicAnalysis hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAcademicAnalysis } from './use-academic-analysis';
import { useAcademicStore } from '@/stores/academic';
import { useLearningStore } from '@/stores/learning';
import { useSessionStore } from '@/stores/chat';
import { useA2UI } from '@/hooks/a2ui/use-a2ui';
import * as analysisTool from '@/lib/ai/tools/academic-analysis-tool';
import * as pptTool from '@/lib/ai/tools/academic-ppt-tool';
import * as academicTemplates from '@/lib/a2ui/academic-templates';
import type { Paper, LibraryPaper } from '@/types/academic';

// Mock dependencies
jest.mock('@/stores/academic', () => ({
  useAcademicStore: jest.fn(),
}));

jest.mock('@/stores/learning', () => ({
  useLearningStore: jest.fn(),
}));

jest.mock('@/stores/chat', () => ({
  useSessionStore: jest.fn(),
}));

jest.mock('@/hooks/a2ui/use-a2ui', () => ({
  useA2UI: jest.fn(),
}));

jest.mock('@/lib/ai/tools/academic-analysis-tool', () => ({
  executeAcademicAnalysis: jest.fn(),
}));

jest.mock('@/lib/ai/tools/academic-ppt-tool', () => ({
  executePaperToPPT: jest.fn(),
  executePaperToPPTOutline: jest.fn(),
}));

jest.mock('@/lib/a2ui/academic-templates', () => ({
  createAnalysisPanelSurface: jest.fn(),
}));

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const mockUseAcademicStore = useAcademicStore as jest.MockedFunction<typeof useAcademicStore>;
const mockUseLearningStore = useLearningStore as jest.MockedFunction<typeof useLearningStore>;
const mockUseSessionStore = useSessionStore as jest.MockedFunction<typeof useSessionStore>;
const mockUseA2UI = useA2UI as jest.MockedFunction<typeof useA2UI>;

const createMockPaper = (id: string): Paper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}`,
  abstract: 'Test abstract for paper',
  authors: [{ name: 'Test Author' }],
  year: 2023,
  urls: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
});

const createMockLibraryPaper = (id: string): LibraryPaper => ({
  ...createMockPaper(id),
  libraryId: `lib-${id}`,
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
});

const mockA2UI = {
  processMessages: jest.fn(),
  surfaces: {},
  clearSurface: jest.fn(),
  clearAllSurfaces: jest.fn(),
};

const mockLearningStore = {
  startLearningSession: jest.fn(),
};

const mockSessionStore = {
  activeSessionId: 'session-1',
};

const createMockAcademicStore = (overrides = {}) => ({
  library: { papers: {}, collections: {}, selectedPaperId: null, selectedCollectionId: null, selectedPaperIds: [], viewMode: 'list' as const, sortBy: 'added_at', sortOrder: 'desc' as const, analysisHistory: {} },
  saveAnalysisResult: jest.fn(),
  getAnalysisHistory: jest.fn().mockReturnValue([]),
  ...overrides,
});

describe('useAcademicAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAcademicStore.mockReturnValue(createMockAcademicStore() as never);
    mockUseLearningStore.mockReturnValue(mockLearningStore as never);
    mockUseSessionStore.mockReturnValue(mockSessionStore as never);
    mockUseA2UI.mockReturnValue(mockA2UI as never);
  });

  describe('Initial state', () => {
    it('should have no last analysis result', () => {
      const { result } = renderHook(() => useAcademicAnalysis());

      expect(result.current.lastAnalysisResult).toBeNull();
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.isGeneratingPPT).toBe(false);
    });

    it('should expose all analysis functions', () => {
      const { result } = renderHook(() => useAcademicAnalysis());

      expect(typeof result.current.analyzePaperWithAI).toBe('function');
      expect(typeof result.current.analyzeAndDisplay).toBe('function');
      expect(typeof result.current.createAnalysisUI).toBe('function');
      expect(typeof result.current.analyzePaper).toBe('function');
      expect(typeof result.current.startGuidedLearning).toBe('function');
      expect(typeof result.current.generatePresentationFromPaper).toBe('function');
      expect(typeof result.current.generatePPTOutline).toBe('function');
    });
  });

  describe('AI analysis', () => {
    it('should analyze paper with AI', async () => {
      const mockResult = { success: true, analysis: 'Analysis content', analysisType: 'summary' };
      (analysisTool.executeAcademicAnalysis as jest.Mock).mockResolvedValueOnce(mockResult);

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      let analysisResult;
      await act(async () => {
        analysisResult = await result.current.analyzePaperWithAI(paper, 'summary');
      });

      expect(analysisTool.executeAcademicAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          paperTitle: paper.title,
          paperAbstract: paper.abstract,
          analysisType: 'summary',
          depth: 'standard',
          language: 'en',
        })
      );
      expect(analysisResult).toEqual(mockResult);
      expect(result.current.lastAnalysisResult).toEqual(mockResult);
      expect(result.current.isAnalyzing).toBe(false);
    });

    it('should set isAnalyzing during analysis', async () => {
      let resolveAnalysis: (value: unknown) => void;
      const analysisPromise = new Promise((resolve) => { resolveAnalysis = resolve; });
      (analysisTool.executeAcademicAnalysis as jest.Mock).mockReturnValueOnce(analysisPromise);

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      let analyzePromise: Promise<unknown>;
      act(() => {
        analyzePromise = result.current.analyzePaperWithAI(paper, 'summary');
      });

      // isAnalyzing should be true during execution
      expect(result.current.isAnalyzing).toBe(true);

      await act(async () => {
        resolveAnalysis!({ success: true, analysis: 'Done' });
        await analyzePromise!;
      });

      expect(result.current.isAnalyzing).toBe(false);
    });

    it('should reset isAnalyzing on error', async () => {
      (analysisTool.executeAcademicAnalysis as jest.Mock).mockRejectedValueOnce(new Error('AI Error'));

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      await expect(
        act(async () => {
          await result.current.analyzePaperWithAI(paper, 'summary');
        })
      ).rejects.toThrow('AI Error');

      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('A2UI integration', () => {
    it('should create analysis UI when enabled', () => {
      (academicTemplates.createAnalysisPanelSurface as jest.Mock).mockReturnValue({
        surfaceId: 'analysis-1',
        messages: [{ type: 'analysis' }],
      });

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis({ enableA2UI: true }));

      let surfaceId;
      act(() => {
        surfaceId = result.current.createAnalysisUI(paper, 'summary', 'Analysis content');
      });

      expect(surfaceId).toBe('analysis-1');
      expect(mockA2UI.processMessages).toHaveBeenCalled();
    });

    it('should return null when A2UI is disabled', () => {
      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis({ enableA2UI: false }));

      let surfaceId;
      act(() => {
        surfaceId = result.current.createAnalysisUI(paper, 'summary', 'Analysis content');
      });

      expect(surfaceId).toBeNull();
      expect(mockA2UI.processMessages).not.toHaveBeenCalled();
    });
  });

  describe('analyzeAndDisplay', () => {
    it('should analyze and create UI for successful results', async () => {
      const mockAnalysis = { success: true, analysis: 'Summary content', analysisType: 'summary' };
      (analysisTool.executeAcademicAnalysis as jest.Mock).mockResolvedValueOnce(mockAnalysis);
      (academicTemplates.createAnalysisPanelSurface as jest.Mock).mockReturnValue({
        surfaceId: 'surface-1',
        messages: [{ type: 'analysis' }],
      });

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis({ enableA2UI: true }));

      let surfaceId;
      await act(async () => {
        surfaceId = await result.current.analyzeAndDisplay(paper, 'summary');
      });

      expect(surfaceId).toBe('surface-1');
    });

    it('should return null for failed analysis', async () => {
      const mockAnalysis = { success: false, analysis: '', error: 'Failed' };
      (analysisTool.executeAcademicAnalysis as jest.Mock).mockResolvedValueOnce(mockAnalysis);

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      let surfaceId;
      await act(async () => {
        surfaceId = await result.current.analyzeAndDisplay(paper, 'summary');
      });

      expect(surfaceId).toBeNull();
    });
  });

  describe('analyzePaper (prompt building)', () => {
    it('should build analysis prompt for library paper', async () => {
      const paper = createMockLibraryPaper('1');
      mockUseAcademicStore.mockReturnValue(createMockAcademicStore({
        library: { papers: { '1': paper }, collections: {}, selectedPaperId: null, selectedCollectionId: null, selectedPaperIds: [], viewMode: 'list', sortBy: 'added_at', sortOrder: 'desc', analysisHistory: {} },
      }) as never);

      const { result } = renderHook(() => useAcademicAnalysis());

      let prompt;
      await act(async () => {
        prompt = await result.current.analyzePaper('1', 'summary');
      });

      expect(prompt).toContain('Test Paper 1');
      expect(prompt).toContain('Test Author');
      expect(prompt).toContain('summary');
    });

    it('should throw for non-existent paper', async () => {
      const { result } = renderHook(() => useAcademicAnalysis());

      await expect(
        act(async () => {
          await result.current.analyzePaper('non-existent', 'summary');
        })
      ).rejects.toThrow('Paper not found in library');
    });
  });

  describe('Guided learning', () => {
    it('should start guided learning for paper', () => {
      const paper = createMockLibraryPaper('1');
      mockUseAcademicStore.mockReturnValue(createMockAcademicStore({
        library: { papers: { '1': paper }, collections: {}, selectedPaperId: null, selectedCollectionId: null, selectedPaperIds: [], viewMode: 'list', sortBy: 'added_at', sortOrder: 'desc', analysisHistory: {} },
      }) as never);

      const { result } = renderHook(() => useAcademicAnalysis());

      act(() => {
        result.current.startGuidedLearning('1');
      });

      expect(mockLearningStore.startLearningSession).toHaveBeenCalledWith('session-1', {
        topic: paper.title,
        backgroundKnowledge: paper.abstract,
        learningGoals: expect.arrayContaining([
          'Understand the main contributions',
          'Identify key methodology',
          'Evaluate the findings',
        ]),
      });
    });

    it('should not start learning for non-existent paper', () => {
      const { result } = renderHook(() => useAcademicAnalysis());

      act(() => {
        result.current.startGuidedLearning('non-existent');
      });

      expect(mockLearningStore.startLearningSession).not.toHaveBeenCalled();
    });

    it('should not start learning without active session', () => {
      mockUseSessionStore.mockReturnValue({ activeSessionId: null } as never);

      const paper = createMockLibraryPaper('1');
      mockUseAcademicStore.mockReturnValue(createMockAcademicStore({
        library: { papers: { '1': paper }, collections: {}, selectedPaperId: null, selectedCollectionId: null, selectedPaperIds: [], viewMode: 'list', sortBy: 'added_at', sortOrder: 'desc', analysisHistory: {} },
      }) as never);

      const { result } = renderHook(() => useAcademicAnalysis());

      act(() => {
        result.current.startGuidedLearning('1');
      });

      expect(mockLearningStore.startLearningSession).not.toHaveBeenCalled();
    });
  });

  describe('PPT generation', () => {
    it('should generate presentation from paper', async () => {
      const mockPPTResult = {
        success: true,
        presentation: { slides: [], metadata: { paperIds: ['1'] } },
      };
      (pptTool.executePaperToPPT as jest.Mock).mockReturnValue(mockPPTResult);

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      let pptResult;
      await act(async () => {
        pptResult = await result.current.generatePresentationFromPaper([paper]);
      });

      expect(pptTool.executePaperToPPT).toHaveBeenCalledWith(
        expect.objectContaining({
          papers: expect.arrayContaining([
            expect.objectContaining({ id: '1', title: paper.title }),
          ]),
          style: 'academic',
          slideCount: 15,
          audienceLevel: 'graduate',
        })
      );
      expect(pptResult).toEqual(mockPPTResult);
      expect(result.current.isGeneratingPPT).toBe(false);
    });

    it('should generate PPT outline', async () => {
      const mockOutline = {
        success: true,
        outline: [{ title: 'Introduction', slides: 3 }],
      };
      (pptTool.executePaperToPPTOutline as jest.Mock).mockReturnValue(mockOutline);

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      let outlineResult;
      await act(async () => {
        outlineResult = await result.current.generatePPTOutline([paper]);
      });

      expect(pptTool.executePaperToPPTOutline).toHaveBeenCalled();
      expect(outlineResult).toEqual(mockOutline);
    });

    it('should accept custom PPT options', async () => {
      const mockPPTResult = { success: true, presentation: { slides: [] } };
      (pptTool.executePaperToPPT as jest.Mock).mockReturnValue(mockPPTResult);

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      await act(async () => {
        await result.current.generatePresentationFromPaper([paper], {
          style: 'conference',
          slideCount: 10,
          audienceLevel: 'expert',
          language: 'zh',
        });
      });

      expect(pptTool.executePaperToPPT).toHaveBeenCalledWith(
        expect.objectContaining({
          style: 'conference',
          slideCount: 10,
          audienceLevel: 'expert',
          language: 'zh',
        })
      );
    });

    it('should reset isGeneratingPPT after completion', async () => {
      (pptTool.executePaperToPPT as jest.Mock).mockReturnValue({ success: true });

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      await act(async () => {
        await result.current.generatePresentationFromPaper([paper]);
      });

      expect(result.current.isGeneratingPPT).toBe(false);
    });

    it('should reset isGeneratingPPT on error', async () => {
      (pptTool.executePaperToPPT as jest.Mock).mockImplementation(() => {
        throw new Error('PPT generation failed');
      });

      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicAnalysis());

      await expect(
        act(async () => {
          await result.current.generatePresentationFromPaper([paper]);
        })
      ).rejects.toThrow('PPT generation failed');

      expect(result.current.isGeneratingPPT).toBe(false);
    });
  });
});
