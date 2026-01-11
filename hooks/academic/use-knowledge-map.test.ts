/**
 * Unit tests for useKnowledgeMap hook
 */

import { act, renderHook } from '@testing-library/react';
import { useKnowledgeMap } from './use-knowledge-map';
import { useKnowledgeMapStore } from '@/stores/academic/knowledge-map-store';
import type {
  KnowledgeMap,
  KnowledgeMapTrace,
  KnowledgeMapNavigationTarget,
} from '@/types/learning/knowledge-map';

// Mock the store
jest.mock('@/stores/academic/knowledge-map-store');

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Helper to create test knowledge map
const createTestKnowledgeMap = (overrides: Partial<KnowledgeMap> = {}): KnowledgeMap => ({
  schemaVersion: 1,
  id: 'test-km',
  stableId: 'stable-test-km',
  metadata: {
    generationSource: 'manual',
    generationTimestamp: new Date().toISOString(),
    mode: 'FAST',
  },
  title: 'Test Knowledge Map',
  description: 'Test description',
  traces: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Helper to create test trace
const createTestTrace = (overrides: Partial<KnowledgeMapTrace> = {}): KnowledgeMapTrace => ({
  id: 'test-trace',
  title: 'Test Trace',
  description: 'Test trace description',
  locations: [],
  traceTextDiagram: '',
  traceGuide: '',
  ...overrides,
});

describe('useKnowledgeMap', () => {
  const mockStore = {
    knowledgeMaps: {} as Record<string, KnowledgeMap>,
    activeKnowledgeMapId: null as string | null,
    annotations: {} as Record<string, unknown[]>,
    navigationHistory: { entries: [] as KnowledgeMapNavigationTarget[], currentIndex: -1 },
    isGenerating: false,
    generationProgress: 0,
    error: null as string | null,
    createKnowledgeMap: jest.fn(),
    updateKnowledgeMap: jest.fn(),
    deleteKnowledgeMap: jest.fn(),
    getKnowledgeMap: jest.fn(),
    setActiveKnowledgeMap: jest.fn(),
    convertPDFToKnowledgeMap: jest.fn(),
    generateFromContent: jest.fn(),
    generateMindMap: jest.fn(),
    updateMindMap: jest.fn(),
    addAnnotation: jest.fn(),
    updateAnnotation: jest.fn(),
    deleteAnnotation: jest.fn(),
    getAnnotationsForKnowledgeMap: jest.fn(),
    navigateTo: jest.fn(),
    navigateBack: jest.fn(),
    navigateForward: jest.fn(),
    navigateToLocation: jest.fn(),
    navigateToPage: jest.fn(),
    canNavigateBack: jest.fn().mockReturnValue(false),
    canNavigateForward: jest.fn().mockReturnValue(false),
    addTrace: jest.fn(),
    updateTrace: jest.fn(),
    deleteTrace: jest.fn(),
    addLocation: jest.fn(),
    updateLocation: jest.fn(),
    deleteLocation: jest.fn(),
    importFromCodemap: jest.fn(),
    exportToCodemap: jest.fn(),
    importFromFile: jest.fn(),
    exportToFile: jest.fn(),
    clearError: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKnowledgeMapStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  describe('State Access', () => {
    it('should return knowledge maps array', () => {
      const testMap = createTestKnowledgeMap({ id: 'km-1' });
      mockStore.knowledgeMaps = { 'km-1': testMap };
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      expect(result.current.knowledgeMaps).toHaveLength(1);
      expect(result.current.knowledgeMaps[0].id).toBe('km-1');
    });

    it('should return active knowledge map', () => {
      const testMap = createTestKnowledgeMap({ id: 'active-km' });
      mockStore.knowledgeMaps = { 'active-km': testMap };
      mockStore.activeKnowledgeMapId = 'active-km';
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      expect(result.current.activeKnowledgeMap?.id).toBe('active-km');
    });

    it('should return null when no active knowledge map', () => {
      mockStore.activeKnowledgeMapId = null;
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      expect(result.current.activeKnowledgeMap).toBeNull();
    });

    it('should return generation state', () => {
      mockStore.isGenerating = true;
      mockStore.generationProgress = 50;
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      expect(result.current.isGenerating).toBe(true);
      expect(result.current.generationProgress).toBe(50);
    });

    it('should return error state', () => {
      mockStore.error = 'Test error';
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      expect(result.current.error).toBe('Test error');
    });
  });

  describe('Knowledge Map CRUD', () => {
    it('should call createKnowledgeMap with request', async () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      const request = {
        title: 'New Map',
        content: 'Test content',
        mode: 'FAST' as const,
      };
      
      await act(async () => {
        await result.current.createKnowledgeMap(request);
      });
      
      expect(mockStore.createKnowledgeMap).toHaveBeenCalledWith(request);
    });

    it('should call updateKnowledgeMap with id and updates', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.updateKnowledgeMap('km-1', { title: 'Updated' });
      });
      
      expect(mockStore.updateKnowledgeMap).toHaveBeenCalledWith('km-1', { title: 'Updated' });
    });

    it('should call deleteKnowledgeMap with id', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.deleteKnowledgeMap('km-1');
      });
      
      expect(mockStore.deleteKnowledgeMap).toHaveBeenCalledWith('km-1');
    });

    it('should call setActiveKnowledgeMap with id', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.setActiveKnowledgeMap('km-1');
      });
      
      expect(mockStore.setActiveKnowledgeMap).toHaveBeenCalledWith('km-1');
    });

    it('should call getKnowledgeMap with id', () => {
      const testMap = createTestKnowledgeMap({ id: 'km-1' });
      mockStore.getKnowledgeMap.mockReturnValue(testMap);
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      const map = result.current.getKnowledgeMap('km-1');
      
      expect(mockStore.getKnowledgeMap).toHaveBeenCalledWith('km-1');
      expect(map?.id).toBe('km-1');
    });
  });

  describe('Content Generation', () => {
    it('should call generateFromContent', async () => {
      const mockMap = createTestKnowledgeMap({ id: 'generated' });
      mockStore.generateFromContent.mockResolvedValue(mockMap);
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      await act(async () => {
        await result.current.generateFromContent('Test content', 'Test Title');
      });
      
      expect(mockStore.generateFromContent).toHaveBeenCalledWith('Test content', 'Test Title');
    });

    it('should call convertPDFToKnowledgeMap', async () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      await act(async () => {
        await result.current.convertPDFToKnowledgeMap('/path/to/file.pdf', { extractFigures: true });
      });
      
      expect(mockStore.convertPDFToKnowledgeMap).toHaveBeenCalledWith('/path/to/file.pdf', { extractFigures: true });
    });
  });

  describe('Mind Map', () => {
    it('should call generateMindMap', async () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      const request = {
        knowledgeMapId: 'km-1',
        title: 'Mind Map',
        layout: 'radial' as const,
      };
      
      await act(async () => {
        await result.current.generateMindMap(request);
      });
      
      expect(mockStore.generateMindMap).toHaveBeenCalledWith(request);
    });

    it('should call updateMindMap', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      const mindMapData = {
        nodes: [],
        edges: [],
        rootId: 'root',
        layout: 'radial' as const,
      };
      
      act(() => {
        result.current.updateMindMap('km-1', mindMapData);
      });
      
      expect(mockStore.updateMindMap).toHaveBeenCalledWith('km-1', mindMapData);
    });
  });

  describe('Annotations', () => {
    it('should call addAnnotation', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      const annotation = {
        knowledgeMapId: 'km-1',
        type: 'highlight' as const,
        content: 'Test',
        locationRef: 'loc-1',
      };
      
      act(() => {
        result.current.addAnnotation(annotation);
      });
      
      expect(mockStore.addAnnotation).toHaveBeenCalledWith(annotation);
    });

    it('should call updateAnnotation', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.updateAnnotation('ann-1', { content: 'Updated' });
      });
      
      expect(mockStore.updateAnnotation).toHaveBeenCalledWith('ann-1', { content: 'Updated' });
    });

    it('should call deleteAnnotation', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.deleteAnnotation('ann-1');
      });
      
      expect(mockStore.deleteAnnotation).toHaveBeenCalledWith('ann-1');
    });
  });

  describe('Navigation', () => {
    it('should call navigateTo', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      const target: KnowledgeMapNavigationTarget = {
        knowledgeMapId: 'km-1',
        traceId: 'trace-1',
      };
      
      act(() => {
        result.current.navigateTo(target);
      });
      
      expect(mockStore.navigateTo).toHaveBeenCalledWith(target);
    });

    it('should call navigateBack', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.navigateBack();
      });
      
      expect(mockStore.navigateBack).toHaveBeenCalled();
    });

    it('should call navigateForward', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.navigateForward();
      });
      
      expect(mockStore.navigateForward).toHaveBeenCalled();
    });

    it('should return canNavigateBack correctly', () => {
      mockStore.canNavigateBack.mockReturnValue(true);
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      expect(result.current.canNavigateBack).toBe(true);
    });

    it('should return canNavigateForward correctly', () => {
      mockStore.canNavigateForward.mockReturnValue(true);
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      expect(result.current.canNavigateForward).toBe(true);
    });
  });

  describe('Trace Management', () => {
    it('should call addTrace with active knowledge map id', () => {
      mockStore.activeKnowledgeMapId = 'active-km';
      const { result } = renderHook(() => useKnowledgeMap());
      
      const trace = createTestTrace({ id: 'new-trace' });
      
      act(() => {
        result.current.addTrace(trace);
      });
      
      expect(mockStore.addTrace).toHaveBeenCalledWith('active-km', trace);
    });

    it('should call updateTrace with active knowledge map id', () => {
      mockStore.activeKnowledgeMapId = 'active-km';
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.updateTrace('trace-1', { title: 'Updated Trace' });
      });
      
      expect(mockStore.updateTrace).toHaveBeenCalledWith('active-km', 'trace-1', { title: 'Updated Trace' });
    });

    it('should call deleteTrace with active knowledge map id', () => {
      mockStore.activeKnowledgeMapId = 'active-km';
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.deleteTrace('trace-1');
      });
      
      expect(mockStore.deleteTrace).toHaveBeenCalledWith('active-km', 'trace-1');
    });

    it('should not call trace functions without active knowledge map', () => {
      mockStore.activeKnowledgeMapId = null;
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.addTrace(createTestTrace());
        result.current.updateTrace('trace-1', { title: 'Test' });
        result.current.deleteTrace('trace-1');
      });
      
      expect(mockStore.addTrace).not.toHaveBeenCalled();
      expect(mockStore.updateTrace).not.toHaveBeenCalled();
      expect(mockStore.deleteTrace).not.toHaveBeenCalled();
    });
  });

  describe('Import/Export', () => {
    it('should call importFromCodemap', async () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      const codemapContent = '{"title": "Test"}';
      
      await act(async () => {
        await result.current.importFromCodemap(codemapContent);
      });
      
      expect(mockStore.importFromCodemap).toHaveBeenCalledWith(codemapContent);
    });

    it('should call exportToCodemap with active knowledge map id', () => {
      mockStore.activeKnowledgeMapId = 'active-km';
      mockStore.exportToCodemap.mockReturnValue('{"title": "Test"}');
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      const exported = result.current.exportToCodemap();
      
      expect(mockStore.exportToCodemap).toHaveBeenCalledWith('active-km');
      expect(exported).toBe('{"title": "Test"}');
    });

    it('should return null for exportToCodemap without active knowledge map', () => {
      mockStore.activeKnowledgeMapId = null;
      
      const { result } = renderHook(() => useKnowledgeMap());
      
      const exported = result.current.exportToCodemap();
      
      expect(mockStore.exportToCodemap).not.toHaveBeenCalled();
      expect(exported).toBeNull();
    });
  });

  describe('Utility', () => {
    it('should call clearError', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.clearError();
      });
      
      expect(mockStore.clearError).toHaveBeenCalled();
    });

    it('should call reset', () => {
      const { result } = renderHook(() => useKnowledgeMap());
      
      act(() => {
        result.current.reset();
      });
      
      expect(mockStore.reset).toHaveBeenCalled();
    });
  });
});
