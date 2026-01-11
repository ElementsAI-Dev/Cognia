/**
 * Unit tests for Knowledge Map Store
 */

import { act, renderHook } from '@testing-library/react';
import { useKnowledgeMapStore } from './knowledge-map-store';
import type {
  KnowledgeMap,
  KnowledgeMapTrace,
  KnowledgeMapNavigationTarget,
  KnowledgeAnnotation,
} from '@/types/learning/knowledge-map';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-' + Math.random().toString(36).substr(2, 9),
}));

// Helper to create a valid KnowledgeMap
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

// Helper to create a valid KnowledgeMapTrace
const createTestTrace = (overrides: Partial<KnowledgeMapTrace> = {}): KnowledgeMapTrace => ({
  id: 'test-trace',
  title: 'Test Trace',
  description: 'Test trace description',
  locations: [],
  traceTextDiagram: '',
  traceGuide: '',
  ...overrides,
});

describe('useKnowledgeMapStore', () => {
  beforeEach(() => {
    // Reset the store state directly before each test
    useKnowledgeMapStore.setState({
      knowledgeMaps: {},
      activeKnowledgeMapId: null,
      annotations: {},
      navigationHistory: { entries: [], currentIndex: -1 },
      isGenerating: false,
      generationProgress: 0,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have empty initial state', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      expect(result.current.knowledgeMaps).toEqual({});
      expect(result.current.activeKnowledgeMapId).toBeNull();
      expect(result.current.annotations).toEqual({});
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.generationProgress).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Knowledge Map CRUD', () => {
    it('should create a knowledge map', async () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const mockKnowledgeMap = createTestKnowledgeMap({ id: 'test-km-1' });

      // Mock the invoke to return the knowledge map
      const { invoke } = await import('@tauri-apps/api/core');
      (invoke as jest.Mock).mockResolvedValueOnce(mockKnowledgeMap);

      await act(async () => {
        await result.current.createKnowledgeMap({
          title: 'Test Knowledge Map',
          content: 'Test content',
          mode: 'FAST',
        });
      });

      expect(Object.keys(result.current.knowledgeMaps).length).toBeGreaterThan(0);
    });

    it('should update a knowledge map', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const testMap = createTestKnowledgeMap({ id: 'test-km-2', title: 'Original Title' });

      act(() => {
        result.current.knowledgeMaps['test-km-2'] = testMap;
      });

      act(() => {
        result.current.updateKnowledgeMap('test-km-2', { title: 'Updated Title' });
      });

      expect(result.current.knowledgeMaps['test-km-2']?.title).toBe('Updated Title');
    });

    it('should delete a knowledge map', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const testMap = createTestKnowledgeMap({ id: 'test-km-3', title: 'To Delete' });

      act(() => {
        result.current.knowledgeMaps['test-km-3'] = testMap;
      });

      act(() => {
        result.current.deleteKnowledgeMap('test-km-3');
      });

      expect(result.current.knowledgeMaps['test-km-3']).toBeUndefined();
    });

    it('should set active knowledge map', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      act(() => {
        result.current.setActiveKnowledgeMap('test-km-4');
      });

      expect(result.current.activeKnowledgeMapId).toBe('test-km-4');
    });

    it('should get knowledge map by id', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const testMap = createTestKnowledgeMap({ id: 'test-km-5', title: 'Get Test' });

      act(() => {
        result.current.knowledgeMaps['test-km-5'] = testMap;
      });

      const retrieved = result.current.getKnowledgeMap('test-km-5');
      expect(retrieved?.title).toBe('Get Test');
    });
  });

  describe('Annotation Management', () => {
    it('should add an annotation', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      let annotation: KnowledgeAnnotation | undefined;
      act(() => {
        annotation = result.current.addAnnotation({
          knowledgeMapId: 'test-km-1',
          type: 'highlight',
          content: 'Test annotation',
          locationRef: 'trace-1',
        });
      });

      expect(annotation).toBeDefined();
      expect(annotation?.content).toBe('Test annotation');
      expect(annotation?.type).toBe('highlight');
    });

    it('should update an annotation', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      let annotation: KnowledgeAnnotation | undefined;
      act(() => {
        annotation = result.current.addAnnotation({
          knowledgeMapId: 'test-km-1',
          type: 'note',
          content: 'Original content',
          locationRef: 'trace-1',
        });
      });

      if (annotation) {
        act(() => {
          result.current.updateAnnotation(annotation!.id, { content: 'Updated content' });
        });

        // Get updated annotation
        const allAnnotations = result.current.getAnnotationsForKnowledgeMap('test-km-1');
        const updated = allAnnotations.find(a => a.id === annotation!.id);
        expect(updated?.content).toBe('Updated content');
      }
    });

    it('should delete an annotation', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      let annotation: KnowledgeAnnotation | undefined;
      act(() => {
        annotation = result.current.addAnnotation({
          knowledgeMapId: 'test-km-1',
          type: 'bookmark',
          content: 'To delete',
          locationRef: 'trace-1',
        });
      });

      if (annotation) {
        const annotationId = annotation.id;
        act(() => {
          result.current.deleteAnnotation(annotationId);
        });

        const remaining = result.current.getAnnotationsForKnowledgeMap('test-km-1');
        expect(remaining.find(a => a.id === annotationId)).toBeUndefined();
      }
    });

    it('should get annotations for a knowledge map', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      act(() => {
        result.current.addAnnotation({
          knowledgeMapId: 'test-km-1',
          type: 'highlight',
          content: 'Annotation 1',
          locationRef: 'trace-1',
        });
        result.current.addAnnotation({
          knowledgeMapId: 'test-km-1',
          type: 'note',
          content: 'Annotation 2',
          locationRef: 'trace-2',
        });
        result.current.addAnnotation({
          knowledgeMapId: 'test-km-2',
          type: 'bookmark',
          content: 'Other annotation',
          locationRef: 'trace-3',
        });
      });

      const annotations = result.current.getAnnotationsForKnowledgeMap('test-km-1');
      expect(annotations.length).toBe(2);
    });
  });

  describe('Navigation', () => {
    it('should navigate to a target', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const target: KnowledgeMapNavigationTarget = {
        knowledgeMapId: 'test-km',
        traceId: 'trace-1',
        pageNumber: 1,
      };

      act(() => {
        result.current.navigateTo(target);
      });

      expect(result.current.navigationHistory.currentIndex).toBeGreaterThanOrEqual(0);
    });

    it('should support back and forward navigation', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const target1: KnowledgeMapNavigationTarget = {
        knowledgeMapId: 'test-km-1',
        traceId: 'trace-1',
        pageNumber: 1,
      };

      const target2: KnowledgeMapNavigationTarget = {
        knowledgeMapId: 'test-km-2',
        traceId: 'trace-2',
        pageNumber: 2,
      };

      act(() => {
        result.current.navigateTo(target1);
        result.current.navigateTo(target2);
      });

      const indexAfterTwo = result.current.navigationHistory.currentIndex;

      act(() => {
        result.current.navigateBack();
      });

      expect(result.current.navigationHistory.currentIndex).toBe(indexAfterTwo - 1);

      act(() => {
        result.current.navigateForward();
      });

      expect(result.current.navigationHistory.currentIndex).toBe(indexAfterTwo);
    });
  });

  describe('Trace Management', () => {
    it('should add a trace to a knowledge map', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const testMap = createTestKnowledgeMap({ id: 'test-km-trace', traces: [] });

      act(() => {
        result.current.knowledgeMaps['test-km-trace'] = testMap;
      });

      const newTrace = createTestTrace({ id: 'trace-1', title: 'New Trace' });

      act(() => {
        result.current.addTrace('test-km-trace', newTrace);
      });

      expect(result.current.knowledgeMaps['test-km-trace']?.traces.length).toBe(1);
      expect(result.current.knowledgeMaps['test-km-trace']?.traces[0].title).toBe('New Trace');
    });

    it('should update a trace', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const existingTrace = createTestTrace({ id: 'trace-to-update', title: 'Original Trace' });
      const testMap = createTestKnowledgeMap({ 
        id: 'test-km-trace-update',
        traces: [existingTrace],
      });

      act(() => {
        result.current.knowledgeMaps['test-km-trace-update'] = testMap;
      });

      act(() => {
        result.current.updateTrace('test-km-trace-update', 'trace-to-update', { title: 'Updated Trace' });
      });

      expect(result.current.knowledgeMaps['test-km-trace-update']?.traces[0].title).toBe('Updated Trace');
    });

    it('should delete a trace', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const existingTrace = createTestTrace({ id: 'trace-to-delete', title: 'To Delete' });
      const testMap = createTestKnowledgeMap({ 
        id: 'test-km-trace-delete',
        traces: [existingTrace],
      });

      act(() => {
        result.current.knowledgeMaps['test-km-trace-delete'] = testMap;
      });

      act(() => {
        result.current.deleteTrace('test-km-trace-delete', 'trace-to-delete');
      });

      expect(result.current.knowledgeMaps['test-km-trace-delete']?.traces.length).toBe(0);
    });
  });

  describe('Import/Export', () => {
    it('should import from codemap format', async () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const codemapContent = JSON.stringify({
        schemaVersion: 1,
        id: 'test-codemap',
        stableId: 'stable-test-codemap',
        metadata: {
          generationSource: 'manual',
          generationTimestamp: new Date().toISOString(),
          mode: 'FAST',
        },
        title: 'Imported Codemap',
        description: 'Imported from codemap',
        traces: [createTestTrace({ id: 'trace-1', title: 'Trace 1' })],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await act(async () => {
        await result.current.importFromCodemap(codemapContent);
      });

      const maps = Object.values(result.current.knowledgeMaps);
      expect(maps.some(m => m.title === 'Imported Codemap')).toBe(true);
    });

    it('should export to codemap format', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const testMap = createTestKnowledgeMap({
        id: 'test-km-export',
        title: 'Export Test',
        traces: [createTestTrace({ id: 'trace-1', title: 'Trace 1' })],
      });

      act(() => {
        result.current.knowledgeMaps['test-km-export'] = testMap;
      });

      const exported = result.current.exportToCodemap('test-km-export');
      expect(exported).toBeDefined();
      
      const parsed = JSON.parse(exported!);
      expect(parsed.title).toBe('Export Test');
      expect(parsed.traces.length).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Reset', () => {
    it('should reset the store to initial state', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      // Add some data
      const testMap = createTestKnowledgeMap({ id: 'test-km' });
      act(() => {
        result.current.knowledgeMaps['test-km'] = testMap;
        result.current.setActiveKnowledgeMap('test-km');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.knowledgeMaps).toEqual({});
      expect(result.current.activeKnowledgeMapId).toBeNull();
    });
  });

  describe('Content Generation', () => {
    it('should generate knowledge map from content', async () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const mockKnowledgeMap = createTestKnowledgeMap({
        id: 'generated-km',
        title: 'Generated from Content',
      });

      const { invoke } = await import('@tauri-apps/api/core');
      (invoke as jest.Mock).mockResolvedValueOnce(mockKnowledgeMap);

      await act(async () => {
        await result.current.generateFromContent('# Test Content\n\nThis is test content.', 'Test Title');
      });

      expect(Object.keys(result.current.knowledgeMaps).length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', async () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const mockKnowledgeMap = createTestKnowledgeMap({
        id: 'empty-content-km',
        title: 'Empty Content',
        traces: [],
      });

      const { invoke } = await import('@tauri-apps/api/core');
      (invoke as jest.Mock).mockResolvedValueOnce(mockKnowledgeMap);

      await act(async () => {
        await result.current.generateFromContent('', 'Empty');
      });

      // Should still create a knowledge map, just with no traces
      expect(result.current.knowledgeMaps['empty-content-km']).toBeDefined();
    });

    it('should handle very long content', async () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const longContent = 'A'.repeat(100000);
      const mockKnowledgeMap = createTestKnowledgeMap({
        id: 'long-content-km',
        title: 'Long Content',
      });

      const { invoke } = await import('@tauri-apps/api/core');
      (invoke as jest.Mock).mockResolvedValueOnce(mockKnowledgeMap);

      await act(async () => {
        await result.current.generateFromContent(longContent, 'Long');
      });

      expect(result.current.knowledgeMaps['long-content-km']).toBeDefined();
    });

    it('should handle special characters in title', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const testMap = createTestKnowledgeMap({
        id: 'special-chars-km',
        title: 'Test <script>alert("xss")</script> & "quotes"',
      });

      act(() => {
        result.current.knowledgeMaps['special-chars-km'] = testMap;
      });

      expect(result.current.knowledgeMaps['special-chars-km']?.title).toContain('<script>');
    });

    it('should handle unicode content', async () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const unicodeContent = '# 中文标题\n\n日本語テキスト\n\n한국어 텍스트\n\nΕλληνικά\n\nالعربية';
      const mockKnowledgeMap = createTestKnowledgeMap({
        id: 'unicode-km',
        title: '多语言测试',
      });

      const { invoke } = await import('@tauri-apps/api/core');
      (invoke as jest.Mock).mockResolvedValueOnce(mockKnowledgeMap);

      await act(async () => {
        await result.current.generateFromContent(unicodeContent, '多语言测试');
      });

      expect(result.current.knowledgeMaps['unicode-km']).toBeDefined();
    });

    it('should handle concurrent operations', async () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const mockKnowledgeMap1 = createTestKnowledgeMap({ id: 'concurrent-1' });
      const mockKnowledgeMap2 = createTestKnowledgeMap({ id: 'concurrent-2' });

      const { invoke } = await import('@tauri-apps/api/core');
      (invoke as jest.Mock)
        .mockResolvedValueOnce(mockKnowledgeMap1)
        .mockResolvedValueOnce(mockKnowledgeMap2);

      await act(async () => {
        await Promise.all([
          result.current.generateFromContent('Content 1', 'Title 1'),
          result.current.generateFromContent('Content 2', 'Title 2'),
        ]);
      });

      // Both should be created
      expect(Object.keys(result.current.knowledgeMaps).length).toBeGreaterThanOrEqual(2);
    });

    it('should handle null active knowledge map gracefully', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      act(() => {
        result.current.setActiveKnowledgeMap(null);
      });

      expect(result.current.activeKnowledgeMapId).toBeNull();
      expect(result.current.getKnowledgeMap('non-existent')).toBeNull();
    });

    it('should handle updating non-existent knowledge map', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      act(() => {
        result.current.updateKnowledgeMap('non-existent-id', { title: 'New Title' });
      });

      // Should not throw, just do nothing
      expect(result.current.knowledgeMaps['non-existent-id']).toBeUndefined();
    });

    it('should handle deleting non-existent knowledge map', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      act(() => {
        result.current.deleteKnowledgeMap('non-existent-id');
      });

      // Should not throw
      expect(result.current.knowledgeMaps['non-existent-id']).toBeUndefined();
    });

    it('should preserve other knowledge maps when deleting one', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const map1 = createTestKnowledgeMap({ id: 'keep-km' });
      const map2 = createTestKnowledgeMap({ id: 'delete-km' });

      act(() => {
        result.current.knowledgeMaps['keep-km'] = map1;
        result.current.knowledgeMaps['delete-km'] = map2;
      });

      act(() => {
        result.current.deleteKnowledgeMap('delete-km');
      });

      expect(result.current.knowledgeMaps['keep-km']).toBeDefined();
      expect(result.current.knowledgeMaps['delete-km']).toBeUndefined();
    });

    it('should handle multiple traces in a knowledge map', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const testMap = createTestKnowledgeMap({
        id: 'multi-trace-km',
        traces: [
          createTestTrace({ id: 't1', title: 'Trace 1' }),
          createTestTrace({ id: 't2', title: 'Trace 2' }),
          createTestTrace({ id: 't3', title: 'Trace 3' }),
        ],
      });

      act(() => {
        result.current.knowledgeMaps['multi-trace-km'] = testMap;
      });

      expect(result.current.knowledgeMaps['multi-trace-km']?.traces.length).toBe(3);
    });

    it('should handle deeply nested locations', () => {
      const { result } = renderHook(() => useKnowledgeMapStore());
      
      const traceWithLocations = createTestTrace({
        id: 'deep-trace',
        locations: [
          { id: 'loc1', title: 'Location 1', description: 'Desc 1', pageNumber: 1 },
          { id: 'loc2', title: 'Location 2', description: 'Desc 2', pageNumber: 2 },
          { id: 'loc3', title: 'Location 3', description: 'Desc 3', pageNumber: 3 },
        ],
      });

      const testMap = createTestKnowledgeMap({
        id: 'deep-locations-km',
        traces: [traceWithLocations],
      });

      act(() => {
        result.current.knowledgeMaps['deep-locations-km'] = testMap;
      });

      expect(result.current.knowledgeMaps['deep-locations-km']?.traces[0].locations.length).toBe(3);
    });
  });
});
