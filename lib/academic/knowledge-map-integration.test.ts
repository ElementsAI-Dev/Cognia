/**
 * Unit tests for Knowledge Map Integration Module
 */

import {
  generateKnowledgeMapFromSelection,
  generateKnowledgeMapFromPDFFile,
  generateKnowledgeMapWithAI,
  generateMindMapFromKnowledgeMap,
  generateMindMapFromContent,
  hasKnowledgeMapForSource,
  getKnowledgeMapForSource,
  createKnowledgeMapHandler,
  exportKnowledgeMapToJSON,
  importKnowledgeMapFromJSON,
} from './knowledge-map-integration';
import { useKnowledgeMapStore } from '@/stores/academic/knowledge-map-store';
import type { KnowledgeMap } from '@/types/learning/knowledge-map';

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

describe('Knowledge Map Integration', () => {
  const mockStore = {
    knowledgeMaps: {} as Record<string, KnowledgeMap>,
    generateFromContent: jest.fn(),
    createKnowledgeMap: jest.fn(),
    generateMindMap: jest.fn(),
    setActiveKnowledgeMap: jest.fn(),
    exportToCodemap: jest.fn(),
    importFromCodemap: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.knowledgeMaps = {};
    (useKnowledgeMapStore.getState as jest.Mock).mockReturnValue(mockStore);
  });

  describe('generateKnowledgeMapFromSelection', () => {
    it('should generate knowledge map from selected text', async () => {
      const mockKnowledgeMap = createTestKnowledgeMap({ id: 'selection-km' });
      mockStore.generateFromContent.mockResolvedValueOnce(mockKnowledgeMap);

      const result = await generateKnowledgeMapFromSelection('Selected text content');

      expect(mockStore.generateFromContent).toHaveBeenCalledWith(
        'Selected text content',
        'Knowledge Map from Selection'
      );
      expect(result).toEqual(mockKnowledgeMap);
    });

    it('should use custom title when provided', async () => {
      const mockKnowledgeMap = createTestKnowledgeMap();
      mockStore.generateFromContent.mockResolvedValueOnce(mockKnowledgeMap);

      await generateKnowledgeMapFromSelection('Text', 'Custom Title');

      expect(mockStore.generateFromContent).toHaveBeenCalledWith('Text', 'Custom Title');
    });

    it('should return null on error', async () => {
      mockStore.generateFromContent.mockRejectedValueOnce(new Error('Generation failed'));

      const result = await generateKnowledgeMapFromSelection('Text');

      expect(result).toBeNull();
    });
  });

  describe('generateKnowledgeMapFromPDFFile', () => {
    it('should extract PDF and generate knowledge map', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const _mockKnowledgeMap = createTestKnowledgeMap({ id: 'pdf-km' });

      (invoke as jest.Mock).mockResolvedValueOnce({
        success: true,
        elements: [],
        metadata: { pageCount: 5 },
      });

      // The function will call extractPDFContent which invokes the backend
      const result = await generateKnowledgeMapFromPDFFile('/path/to/file.pdf');

      expect(invoke).toHaveBeenCalled();
      expect(result.success).toBeDefined();
    });

    it('should handle extraction errors', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      (invoke as jest.Mock).mockRejectedValueOnce(new Error('Extraction failed'));

      const result = await generateKnowledgeMapFromPDFFile('/invalid/path.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateKnowledgeMapWithAI', () => {
    it('should create AI-assisted knowledge map', async () => {
      const mockKnowledgeMap = createTestKnowledgeMap({ id: 'ai-km' });
      mockStore.createKnowledgeMap.mockResolvedValueOnce(mockKnowledgeMap);

      const request = {
        title: 'AI Generated',
        content: 'Content to analyze',
        mode: 'DETAILED' as const,
      };

      const result = await generateKnowledgeMapWithAI(request);

      expect(mockStore.createKnowledgeMap).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockKnowledgeMap);
    });

    it('should return null on error', async () => {
      mockStore.createKnowledgeMap.mockRejectedValueOnce(new Error('AI error'));

      const result = await generateKnowledgeMapWithAI({
        title: 'Test',
        mode: 'FAST',
      });

      expect(result).toBeNull();
    });
  });

  describe('generateMindMapFromKnowledgeMap', () => {
    it('should generate mind map from knowledge map ID', async () => {
      const mockMindMap = {
        nodes: [],
        edges: [],
        rootId: 'root',
        layout: 'radial' as const,
      };
      mockStore.generateMindMap.mockResolvedValueOnce(mockMindMap);

      const result = await generateMindMapFromKnowledgeMap('km-1');

      expect(mockStore.generateMindMap).toHaveBeenCalledWith({
        knowledgeMapId: 'km-1',
        title: 'Mind Map',
        layout: 'radial',
      });
      expect(result).toEqual(mockMindMap);
    });

    it('should use custom layout when provided', async () => {
      mockStore.generateMindMap.mockResolvedValueOnce({});

      await generateMindMapFromKnowledgeMap('km-1', 'tree');

      expect(mockStore.generateMindMap).toHaveBeenCalledWith({
        knowledgeMapId: 'km-1',
        title: 'Mind Map',
        layout: 'tree',
      });
    });
  });

  describe('generateMindMapFromContent', () => {
    it('should generate mind map directly from content', async () => {
      const mockMindMap = {
        nodes: [],
        edges: [],
        rootId: 'root',
        layout: 'radial' as const,
      };
      mockStore.generateMindMap.mockResolvedValueOnce(mockMindMap);

      const result = await generateMindMapFromContent('Content', 'Title');

      expect(mockStore.generateMindMap).toHaveBeenCalledWith({
        content: 'Content',
        title: 'Title',
        layout: 'radial',
      });
      expect(result).toEqual(mockMindMap);
    });
  });

  describe('hasKnowledgeMapForSource', () => {
    it('should return true if knowledge map exists for source', () => {
      const km = createTestKnowledgeMap({
        id: 'km-1',
        metadata: {
          generationSource: 'pdf-extraction',
          generationTimestamp: new Date().toISOString(),
          mode: 'FAST',
          pdfPath: '/path/to/file.pdf',
        },
      });
      mockStore.knowledgeMaps = { 'km-1': km };

      const result = hasKnowledgeMapForSource('/path/to/file.pdf');

      expect(result).toBe(true);
    });

    it('should return false if no knowledge map exists for source', () => {
      mockStore.knowledgeMaps = {};

      const result = hasKnowledgeMapForSource('/path/to/file.pdf');

      expect(result).toBe(false);
    });
  });

  describe('getKnowledgeMapForSource', () => {
    it('should return knowledge map for source', () => {
      const km = createTestKnowledgeMap({
        id: 'km-1',
        metadata: {
          generationSource: 'pdf-extraction',
          generationTimestamp: new Date().toISOString(),
          mode: 'FAST',
          pdfPath: '/path/to/file.pdf',
        },
      });
      mockStore.knowledgeMaps = { 'km-1': km };

      const result = getKnowledgeMapForSource('/path/to/file.pdf');

      expect(result).toEqual(km);
    });

    it('should return null if not found', () => {
      mockStore.knowledgeMaps = {};

      const result = getKnowledgeMapForSource('/path/to/file.pdf');

      expect(result).toBeNull();
    });
  });

  describe('createKnowledgeMapHandler', () => {
    it('should create handler function', () => {
      const handler = createKnowledgeMapHandler();

      expect(typeof handler).toBe('function');
    });

    it('should call onSuccess when generation succeeds', async () => {
      const mockKnowledgeMap = createTestKnowledgeMap();
      mockStore.generateFromContent.mockResolvedValueOnce(mockKnowledgeMap);
      
      const onSuccess = jest.fn();
      const handler = createKnowledgeMapHandler(onSuccess);

      await handler('Selected text');

      expect(onSuccess).toHaveBeenCalledWith(mockKnowledgeMap);
    });

    it('should not call onSuccess when generation returns null', async () => {
      mockStore.generateFromContent.mockResolvedValueOnce(null);
      
      const onSuccess = jest.fn();
      const handler = createKnowledgeMapHandler(onSuccess);

      await handler('Selected text');

      // onSuccess should not be called when result is null
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('exportKnowledgeMapToJSON', () => {
    it('should export knowledge map to JSON string', () => {
      mockStore.exportToCodemap.mockReturnValueOnce('{"title": "Test"}');

      const result = exportKnowledgeMapToJSON('km-1');

      expect(mockStore.exportToCodemap).toHaveBeenCalledWith('km-1');
      expect(result).toBe('{"title": "Test"}');
    });
  });

  describe('importKnowledgeMapFromJSON', () => {
    it('should import knowledge map from JSON string', async () => {
      const mockKnowledgeMap = createTestKnowledgeMap({ id: 'imported-km' });
      mockStore.knowledgeMaps = { 'imported-km': mockKnowledgeMap };
      mockStore.importFromCodemap.mockResolvedValueOnce(undefined);

      const result = await importKnowledgeMapFromJSON('{"title": "Imported"}');

      expect(mockStore.importFromCodemap).toHaveBeenCalledWith('{"title": "Imported"}');
      expect(result).toEqual(mockKnowledgeMap);
    });

    it('should return null on import error', async () => {
      mockStore.importFromCodemap.mockRejectedValueOnce(new Error('Import failed'));

      const result = await importKnowledgeMapFromJSON('invalid json');

      expect(result).toBeNull();
    });
  });
});
