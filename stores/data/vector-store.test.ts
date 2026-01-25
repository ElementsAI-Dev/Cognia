/**
 * Tests for Vector Store
 */

import { act } from '@testing-library/react';
import { useVectorStore } from './vector-store';

describe('useVectorStore', () => {
  beforeEach(() => {
    act(() => {
      useVectorStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useVectorStore.getState();
      expect(state.collections).toEqual([]);
      expect(state.documents).toEqual({});
      expect(state.isInitialized).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.settings.mode).toBe('embedded');
    });
  });

  describe('settings', () => {
    it('should update settings', () => {
      act(() => {
        useVectorStore.getState().updateSettings({
          mode: 'server',
          serverUrl: 'http://custom:8000',
          chunkSize: 500,
        });
      });

      const settings = useVectorStore.getState().settings;
      expect(settings.mode).toBe('server');
      expect(settings.serverUrl).toBe('http://custom:8000');
      expect(settings.chunkSize).toBe(500);
    });

    it('should have default collection name', () => {
      const settings = useVectorStore.getState().settings;
      expect(settings.defaultCollectionName).toBe('default');
    });

    it('should update default collection name', () => {
      act(() => {
        useVectorStore.getState().updateSettings({
          defaultCollectionName: 'my-custom-collection',
        });
      });

      expect(useVectorStore.getState().settings.defaultCollectionName).toBe('my-custom-collection');
    });

    it('should get embedding config', () => {
      const config = useVectorStore.getState().getEmbeddingConfig();
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('text-embedding-3-small');
    });
  });

  describe('collection management', () => {
    it('should add collection', () => {
      let collection;
      act(() => {
        collection = useVectorStore.getState().addCollection({
          name: 'Test Collection',
          description: 'A test collection',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
      });

      const state = useVectorStore.getState();
      expect(state.collections).toHaveLength(1);
      expect(collection!.name).toBe('Test Collection');
      expect(collection!.documentCount).toBe(0);
      expect(state.documents[collection!.id]).toEqual([]);
    });

    it('should update collection', () => {
      let collection;
      act(() => {
        collection = useVectorStore.getState().addCollection({
          name: 'Original',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
      });

      act(() => {
        useVectorStore.getState().updateCollection(collection!.id, { name: 'Updated' });
      });

      expect(useVectorStore.getState().collections[0].name).toBe('Updated');
    });

    it('should delete collection', () => {
      let collection;
      act(() => {
        collection = useVectorStore.getState().addCollection({
          name: 'To Delete',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
      });

      act(() => {
        useVectorStore.getState().deleteCollection(collection!.id);
      });

      expect(useVectorStore.getState().collections).toHaveLength(0);
      expect(useVectorStore.getState().documents[collection!.id]).toBeUndefined();
    });

    it('should get collection by id', () => {
      let collection;
      act(() => {
        collection = useVectorStore.getState().addCollection({
          name: 'Test',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
      });

      expect(useVectorStore.getState().getCollection(collection!.id)).toBeDefined();
      expect(useVectorStore.getState().getCollection('non-existent')).toBeUndefined();
    });

    it('should get collection by name', () => {
      act(() => {
        useVectorStore.getState().addCollection({
          name: 'My Collection',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
      });

      expect(useVectorStore.getState().getCollectionByName('My Collection')).toBeDefined();
      expect(useVectorStore.getState().getCollectionByName('My Collection')?.name).toBe(
        'My Collection'
      );
      expect(useVectorStore.getState().getCollectionByName('Non-existent')).toBeUndefined();
    });

    it('should get collection names', () => {
      act(() => {
        useVectorStore.getState().addCollection({
          name: 'Collection A',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
        useVectorStore.getState().addCollection({
          name: 'Collection B',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
      });

      const names = useVectorStore.getState().getCollectionNames();
      expect(names).toEqual(['Collection A', 'Collection B']);
    });

    it('should return empty array when no collections', () => {
      expect(useVectorStore.getState().getCollectionNames()).toEqual([]);
    });
  });

  describe('document management', () => {
    let collectionId: string;

    beforeEach(() => {
      act(() => {
        const collection = useVectorStore.getState().addCollection({
          name: 'Test',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
        collectionId = collection.id;
      });
    });

    it('should add documents', () => {
      act(() => {
        useVectorStore
          .getState()
          .addDocuments(collectionId, [
            { content: 'Document 1', metadata: { source: 'test' } },
            { content: 'Document 2' },
          ]);
      });

      const docs = useVectorStore.getState().getDocuments(collectionId);
      expect(docs).toHaveLength(2);
      expect(docs[0].content).toBe('Document 1');
      expect(docs[0].metadata).toEqual({ source: 'test' });

      // Check document count updated
      expect(useVectorStore.getState().collections[0].documentCount).toBe(2);
    });

    it('should remove documents', () => {
      act(() => {
        useVectorStore
          .getState()
          .addDocuments(collectionId, [{ content: 'Doc 1' }, { content: 'Doc 2' }]);
      });

      const docId = useVectorStore.getState().getDocuments(collectionId)[0].id;

      act(() => {
        useVectorStore.getState().removeDocuments(collectionId, [docId]);
      });

      expect(useVectorStore.getState().getDocuments(collectionId)).toHaveLength(1);
      expect(useVectorStore.getState().collections[0].documentCount).toBe(1);
    });

    it('should clear documents', () => {
      act(() => {
        useVectorStore
          .getState()
          .addDocuments(collectionId, [{ content: 'Doc 1' }, { content: 'Doc 2' }]);
      });

      act(() => {
        useVectorStore.getState().clearDocuments(collectionId);
      });

      expect(useVectorStore.getState().getDocuments(collectionId)).toHaveLength(0);
      expect(useVectorStore.getState().collections[0].documentCount).toBe(0);
    });
  });

  describe('state management', () => {
    it('should set loading state', () => {
      act(() => {
        useVectorStore.getState().setLoading(true);
      });

      expect(useVectorStore.getState().isLoading).toBe(true);
    });

    it('should set error state', () => {
      act(() => {
        useVectorStore.getState().setError('Test error');
      });

      expect(useVectorStore.getState().error).toBe('Test error');
    });

    it('should set initialized state', () => {
      act(() => {
        useVectorStore.getState().setInitialized(true);
      });

      expect(useVectorStore.getState().isInitialized).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        useVectorStore.getState().addCollection({
          name: 'Test',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
        });
        useVectorStore.getState().setInitialized(true);
        useVectorStore.getState().setError('Error');
      });

      act(() => {
        useVectorStore.getState().reset();
      });

      const state = useVectorStore.getState();
      expect(state.collections).toEqual([]);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
