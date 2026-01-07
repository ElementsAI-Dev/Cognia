/**
 * Vector Tests
 *
 * Tests for native vector store API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './utils';
import {
  nativeVectorCreateCollection,
  nativeVectorDeleteCollection,
  nativeVectorListCollections,
  nativeVectorGetCollection,
  nativeVectorUpsertPoints,
  nativeVectorDeletePoints,
  nativeVectorGetPoints,
  nativeVectorSearch,
  nativeVectorDeleteAllPoints,
  nativeVectorStats,
  nativeVectorScrollPoints,
  nativeVectorRenameCollection,
  nativeVectorTruncateCollection,
  nativeVectorExportCollection,
  nativeVectorImportCollection,
  type NativeVectorPoint,
  type NativeCollectionInfo,
  type NativeSearchResult,
  type NativeVectorStats,
  type NativeCollectionImport,
} from './vector';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Vector - Collection Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('nativeVectorCreateCollection', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorCreateCollection('test', 384)).rejects.toThrow('Tauri');
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue(true);
      await nativeVectorCreateCollection('test-collection', 384);
      expect(mockInvoke).toHaveBeenCalledWith('vector_create_collection', {
        payload: {
          name: 'test-collection',
          dimension: 384,
          metadata: undefined,
        },
      });
    });
  });

  describe('nativeVectorDeleteCollection', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorDeleteCollection('test')).rejects.toThrow('Tauri');
    });

    it('should call invoke with name', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await nativeVectorDeleteCollection('test-collection');
      expect(mockInvoke).toHaveBeenCalledWith('vector_delete_collection', {
        name: 'test-collection',
      });
    });
  });

  describe('nativeVectorListCollections', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorListCollections()).rejects.toThrow('Tauri');
    });

    it('should return list of collections', async () => {
      const mockCollections: NativeCollectionInfo[] = [
        { name: 'collection1', dimension: 384, document_count: 100 },
        { name: 'collection2', dimension: 768, document_count: 50 },
      ];
      mockInvoke.mockResolvedValue(mockCollections);

      const result = await nativeVectorListCollections();
      expect(mockInvoke).toHaveBeenCalledWith('vector_list_collections');
      expect(result).toHaveLength(2);
    });
  });

  describe('nativeVectorGetCollection', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorGetCollection('test')).rejects.toThrow('Tauri');
    });

    it('should return collection info', async () => {
      const mockInfo: NativeCollectionInfo = {
        name: 'test',
        dimension: 384,
        document_count: 100,
      };
      mockInvoke.mockResolvedValue(mockInfo);

      const result = await nativeVectorGetCollection('test');
      expect(mockInvoke).toHaveBeenCalledWith('vector_get_collection', { name: 'test' });
      expect(result.document_count).toBe(100);
    });
  });
});

describe('Vector - Point Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('nativeVectorUpsertPoints', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorUpsertPoints('test', [])).rejects.toThrow('Tauri');
    });

    it('should call invoke with points', async () => {
      const points: NativeVectorPoint[] = [
        { id: 'point-1', vector: [0.1, 0.2, 0.3], payload: { text: 'test' } },
        { id: 'point-2', vector: [0.4, 0.5, 0.6], payload: { text: 'test2' } },
      ];
      mockInvoke.mockResolvedValue(undefined);

      await nativeVectorUpsertPoints('test-collection', points);
      expect(mockInvoke).toHaveBeenCalledWith('vector_upsert_points', {
        collection: 'test-collection',
        points,
      });
    });
  });

  describe('nativeVectorDeletePoints', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorDeletePoints('test', ['id1'])).rejects.toThrow('Tauri');
    });

    it('should call invoke with ids', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await nativeVectorDeletePoints('test-collection', ['point-1', 'point-2']);
      expect(mockInvoke).toHaveBeenCalledWith('vector_delete_points', {
        collection: 'test-collection',
        ids: ['point-1', 'point-2'],
      });
    });
  });

  describe('nativeVectorGetPoints', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorGetPoints('test', ['id1'])).rejects.toThrow('Tauri');
    });

    it('should return points', async () => {
      const mockPoints: NativeVectorPoint[] = [
        { id: 'point-1', vector: [0.1, 0.2, 0.3], payload: { text: 'test' } },
      ];
      mockInvoke.mockResolvedValue(mockPoints);

      const result = await nativeVectorGetPoints('test-collection', ['point-1']);
      expect(mockInvoke).toHaveBeenCalledWith('vector_get_points', {
        collection: 'test-collection',
        ids: ['point-1'],
      });
      expect(result).toHaveLength(1);
    });
  });
});

describe('Vector - Search Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('nativeVectorSearch', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorSearch('test', [0.1, 0.2])).rejects.toThrow('Tauri');
    });

    it('should call invoke with search parameters', async () => {
      const mockResults: NativeSearchResult[] = [
        { id: 'point-1', score: 0.95, payload: { text: 'test' } },
        { id: 'point-2', score: 0.85, payload: { text: 'test2' } },
      ];
      mockInvoke.mockResolvedValue({ results: mockResults, total: 2, offset: 0, limit: 10 });

      const result = await nativeVectorSearch('test-collection', [0.1, 0.2, 0.3], { topK: 10 });
      expect(mockInvoke).toHaveBeenCalledWith('vector_search_points', {
        payload: {
          collection: 'test-collection',
          vector: [0.1, 0.2, 0.3],
          top_k: 10,
          score_threshold: undefined,
          offset: undefined,
          limit: undefined,
          filters: undefined,
          filter_mode: undefined,
        },
      });
      expect(result.results).toHaveLength(2);
    });

    it('should include filters and score threshold', async () => {
      mockInvoke.mockResolvedValue({ results: [], total: 0, offset: 0, limit: 5 });

      await nativeVectorSearch('test', [0.1, 0.2], { topK: 5, scoreThreshold: 0.7 });
      expect(mockInvoke).toHaveBeenCalledWith('vector_search_points', {
        payload: {
          collection: 'test',
          vector: [0.1, 0.2],
          top_k: 5,
          score_threshold: 0.7,
          offset: undefined,
          limit: undefined,
          filters: undefined,
          filter_mode: undefined,
        },
      });
    });
  });

  describe('nativeVectorScrollPoints', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorScrollPoints('test')).rejects.toThrow('Tauri');
    });

    it('should call invoke with scroll parameters', async () => {
      mockInvoke.mockResolvedValue({ points: [], total: 0, offset: 0, limit: 100, has_more: false });

      await nativeVectorScrollPoints('test-collection', { limit: 100, offset: 0 });
      expect(mockInvoke).toHaveBeenCalledWith('vector_scroll_points', {
        payload: {
          collection: 'test-collection',
          offset: 0,
          limit: 100,
          filters: undefined,
          filter_mode: undefined,
        },
      });
    });
  });
});

describe('Vector - Management Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('nativeVectorDeleteAllPoints', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorDeleteAllPoints('test')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await nativeVectorDeleteAllPoints('test-collection');
      expect(mockInvoke).toHaveBeenCalledWith('vector_delete_all_points', {
        collection: 'test-collection',
      });
    });
  });

  describe('nativeVectorStats', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorStats()).rejects.toThrow('Tauri');
    });

    it('should return stats', async () => {
      const mockStats: NativeVectorStats = {
        collection_count: 5,
        total_points: 10000,
        storage_path: '/path/to/storage',
        storage_size_bytes: 1073741824,
      };
      mockInvoke.mockResolvedValue(mockStats);

      const result = await nativeVectorStats();
      expect(mockInvoke).toHaveBeenCalledWith('vector_stats');
      expect(result.collection_count).toBe(5);
    });
  });

  describe('nativeVectorRenameCollection', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorRenameCollection('old', 'new')).rejects.toThrow('Tauri');
    });

    it('should call invoke with names', async () => {
      mockInvoke.mockResolvedValue(true);
      await nativeVectorRenameCollection('old-name', 'new-name');
      expect(mockInvoke).toHaveBeenCalledWith('vector_rename_collection', {
        old_name: 'old-name',
        new_name: 'new-name',
      });
    });
  });

  describe('nativeVectorTruncateCollection', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorTruncateCollection('test')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await nativeVectorTruncateCollection('test-collection');
      expect(mockInvoke).toHaveBeenCalledWith('vector_truncate_collection', {
        name: 'test-collection',
      });
    });
  });
});

describe('Vector - Import/Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('nativeVectorExportCollection', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(nativeVectorExportCollection('test')).rejects.toThrow('Tauri');
    });

    it('should return export data', async () => {
      mockInvoke.mockResolvedValue({
        meta: { name: 'test', dimension: 384 },
        points: [],
      });

      const result = await nativeVectorExportCollection('test');
      expect(mockInvoke).toHaveBeenCalledWith('vector_export_collection', { name: 'test' });
      expect(result.meta.name).toBe('test');
    });
  });

  describe('nativeVectorImportCollection', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const data: NativeCollectionImport = { meta: { name: 'test', dimension: 384 }, points: [] };
      await expect(nativeVectorImportCollection(data)).rejects.toThrow('Tauri');
    });

    it('should call invoke with data', async () => {
      const data: NativeCollectionImport = {
        meta: { name: 'test', dimension: 384 },
        points: [{ id: 'p1', vector: [0.1], payload: {} }],
      };
      mockInvoke.mockResolvedValue(true);

      await nativeVectorImportCollection(data);
      expect(mockInvoke).toHaveBeenCalledWith('vector_import_collection', {
        import_data: data,
        overwrite: false,
      });
    });
  });
});

describe('Vector Types', () => {
  it('should have correct NativeVectorPoint structure', () => {
    const point: NativeVectorPoint = {
      id: 'test-id',
      vector: [0.1, 0.2, 0.3, 0.4],
      payload: {
        text: 'sample text',
        metadata: { key: 'value' },
      },
    };

    expect(point.id).toBe('test-id');
    expect(point.vector).toHaveLength(4);
    expect(point.payload?.text).toBe('sample text');
  });

  it('should have correct NativeSearchResult structure', () => {
    const result: NativeSearchResult = {
      id: 'result-id',
      score: 0.95,
      payload: { text: 'found text' },
    };

    expect(result.score).toBe(0.95);
    expect(result.payload).toBeDefined();
  });
});
