/**
 * Tests for Document Store
 */

import { act } from '@testing-library/react';
import { useDocumentStore } from './document-store';
import type { DocumentMetadata } from '@/types/document';

// Helper to create valid metadata
const createMetadata = (overrides: Partial<DocumentMetadata> = {}): DocumentMetadata => ({
  size: 100,
  lineCount: 10,
  wordCount: 50,
  ...overrides,
});

describe('useDocumentStore', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documents: [],
      versions: {},
      selectedDocumentId: null,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useDocumentStore.getState();
      expect(state.documents).toEqual([]);
      expect(state.versions).toEqual({});
      expect(state.selectedDocumentId).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('addDocument', () => {
    it('should add document', () => {
      let doc;
      act(() => {
        doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Hello World',
          metadata: createMetadata(),
        });
      });

      const state = useDocumentStore.getState();
      expect(state.documents).toHaveLength(1);
      expect(doc!.filename).toBe('test.txt');
      expect(doc!.version).toBe(1);
      expect(doc!.isIndexed).toBe(false);
    });
  });

  describe('updateDocument', () => {
    it('should update document and increment version', () => {
      let doc;
      act(() => {
        doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Original',
          metadata: createMetadata(),
        });
      });

      act(() => {
        useDocumentStore.getState().updateDocument(doc!.id, { content: 'Updated' });
      });

      const updated = useDocumentStore.getState().documents[0];
      expect(updated.content).toBe('Updated');
      expect(updated.version).toBe(2);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and its versions', () => {
      let doc;
      act(() => {
        doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Test',
          metadata: createMetadata(),
        });
        useDocumentStore.getState().saveVersion(doc!.id);
        useDocumentStore.getState().selectDocument(doc!.id);
      });

      act(() => {
        useDocumentStore.getState().deleteDocument(doc!.id);
      });

      expect(useDocumentStore.getState().documents).toHaveLength(0);
      expect(useDocumentStore.getState().versions[doc!.id]).toBeUndefined();
      expect(useDocumentStore.getState().selectedDocumentId).toBeNull();
    });
  });

  describe('bulk operations', () => {
    it('should add multiple documents', () => {
      let docs;
      act(() => {
        docs = useDocumentStore.getState().addDocuments([
          { filename: 'a.txt', type: 'text', content: 'A', metadata: createMetadata() },
          { filename: 'b.txt', type: 'text', content: 'B', metadata: createMetadata() },
        ]);
      });

      expect(docs).toHaveLength(2);
      expect(useDocumentStore.getState().documents).toHaveLength(2);
    });

    it('should delete multiple documents', () => {
      act(() => {
        useDocumentStore.getState().addDocuments([
          { filename: 'a.txt', type: 'text', content: 'A', metadata: createMetadata() },
          { filename: 'b.txt', type: 'text', content: 'B', metadata: createMetadata() },
          { filename: 'c.txt', type: 'text', content: 'C', metadata: createMetadata() },
        ]);
      });

      const ids = useDocumentStore
        .getState()
        .documents.slice(0, 2)
        .map((d) => d.id);

      act(() => {
        useDocumentStore.getState().deleteDocuments(ids);
      });

      expect(useDocumentStore.getState().documents).toHaveLength(1);
    });

    it('should clear all documents', () => {
      act(() => {
        useDocumentStore.getState().addDocuments([
          { filename: 'a.txt', type: 'text', content: 'A', metadata: createMetadata() },
          { filename: 'b.txt', type: 'text', content: 'B', metadata: createMetadata() },
        ]);
      });

      act(() => {
        useDocumentStore.getState().clearAllDocuments();
      });

      const state = useDocumentStore.getState();
      expect(state.documents).toHaveLength(0);
      expect(state.versions).toEqual({});
    });
  });

  describe('version management', () => {
    let docId: string;

    beforeEach(() => {
      act(() => {
        const doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Initial',
          metadata: createMetadata(),
        });
        docId = doc.id;
      });
    });

    it('should save version', () => {
      act(() => {
        useDocumentStore.getState().saveVersion(docId);
      });

      const versions = useDocumentStore.getState().getVersions(docId);
      expect(versions).toHaveLength(1);
      expect(versions[0].content).toBe('Initial');
    });

    it('should restore version', () => {
      act(() => {
        useDocumentStore.getState().saveVersion(docId);
        useDocumentStore.getState().updateDocument(docId, { content: 'Modified' });
      });

      const versionId = useDocumentStore.getState().getVersions(docId)[0].id;

      act(() => {
        useDocumentStore.getState().restoreVersion(docId, versionId);
      });

      expect(useDocumentStore.getState().documents[0].content).toBe('Initial');
    });
  });

  describe('selection', () => {
    it('should select document', () => {
      let doc;
      act(() => {
        doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Test',
          metadata: createMetadata(),
        });
      });

      act(() => {
        useDocumentStore.getState().selectDocument(doc!.id);
      });

      expect(useDocumentStore.getState().selectedDocumentId).toBe(doc!.id);
      expect(useDocumentStore.getState().getSelectedDocument()?.id).toBe(doc!.id);
    });
  });

  describe('filtering and search', () => {
    beforeEach(() => {
      act(() => {
        const doc1 = useDocumentStore.getState().addDocument({
          filename: 'code.ts',
          type: 'code',
          content: 'TypeScript code',
          projectId: 'project-1',
          metadata: createMetadata(),
        });
        useDocumentStore.getState().markAsIndexed(doc1.id, 'collection-1');

        useDocumentStore.getState().addDocument({
          filename: 'readme.md',
          type: 'markdown',
          content: 'Documentation',
          projectId: 'project-1',
          metadata: createMetadata(),
        });

        useDocumentStore.getState().addDocument({
          filename: 'other.txt',
          type: 'text',
          content: 'Other project',
          projectId: 'project-2',
          metadata: createMetadata(),
        });
      });
    });

    it('should filter by type', () => {
      const results = useDocumentStore.getState().filterDocuments({ type: 'code' });
      expect(results).toHaveLength(1);
    });

    it('should filter by projectId', () => {
      const results = useDocumentStore.getState().filterDocuments({ projectId: 'project-1' });
      expect(results).toHaveLength(2);
    });

    it('should filter by isIndexed', () => {
      const indexed = useDocumentStore.getState().filterDocuments({ isIndexed: true });
      expect(indexed).toHaveLength(1);
    });

    it('should filter by search query', () => {
      const results = useDocumentStore.getState().filterDocuments({ searchQuery: 'TypeScript' });
      expect(results).toHaveLength(1);
    });

    it('should search documents', () => {
      const results = useDocumentStore.getState().searchDocuments('Documentation');
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('readme.md');
    });
  });

  describe('indexing status', () => {
    it('should mark as indexed', () => {
      let doc;
      act(() => {
        doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Test',
          metadata: createMetadata(),
        });
      });

      act(() => {
        useDocumentStore.getState().markAsIndexed(doc!.id, 'collection-1');
      });

      const updated = useDocumentStore.getState().documents[0];
      expect(updated.isIndexed).toBe(true);
      expect(updated.collectionId).toBe('collection-1');
    });

    it('should mark as not indexed', () => {
      let doc;
      act(() => {
        doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Test',
          metadata: createMetadata(),
        });
        useDocumentStore.getState().markAsIndexed(doc!.id, 'collection-1');
      });

      act(() => {
        useDocumentStore.getState().markAsNotIndexed(doc!.id);
      });

      const updated = useDocumentStore.getState().documents[0];
      expect(updated.isIndexed).toBe(false);
      expect(updated.collectionId).toBeUndefined();
    });
  });

  describe('project association', () => {
    it('should assign to project', () => {
      let doc;
      act(() => {
        doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Test',
          metadata: createMetadata(),
        });
      });

      act(() => {
        useDocumentStore.getState().assignToProject(doc!.id, 'project-1');
      });

      expect(useDocumentStore.getState().documents[0].projectId).toBe('project-1');
    });

    it('should remove from project', () => {
      let doc;
      act(() => {
        doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Test',
          projectId: 'project-1',
          metadata: createMetadata(),
        });
      });

      act(() => {
        useDocumentStore.getState().removeFromProject(doc!.id);
      });

      expect(useDocumentStore.getState().documents[0].projectId).toBeUndefined();
    });

    it('should get documents by project', () => {
      act(() => {
        useDocumentStore.getState().addDocument({
          filename: 'a.txt',
          type: 'text',
          content: 'A',
          projectId: 'project-1',
          metadata: createMetadata(),
        });
        useDocumentStore.getState().addDocument({
          filename: 'b.txt',
          type: 'text',
          content: 'B',
          projectId: 'project-2',
          metadata: createMetadata(),
        });
      });

      const docs = useDocumentStore.getState().getDocumentsByProject('project-1');
      expect(docs).toHaveLength(1);
    });
  });

  describe('state management', () => {
    it('should set loading', () => {
      act(() => {
        useDocumentStore.getState().setLoading(true);
      });
      expect(useDocumentStore.getState().isLoading).toBe(true);
    });

    it('should set error', () => {
      act(() => {
        useDocumentStore.getState().setError('Test error');
      });
      expect(useDocumentStore.getState().error).toBe('Test error');
    });
  });

  describe('partialize (localStorage content exclusion)', () => {
    it('should exclude content and embeddableContent from partialize output', () => {
      act(() => {
        useDocumentStore.getState().addDocument({
          filename: 'large.pdf',
          type: 'pdf',
          content: 'A'.repeat(10000),
          embeddableContent: 'B'.repeat(5000),
          metadata: createMetadata({ size: 10000 }),
        });
      });

      // Access the persist API to get the partialized state
      const persistApi = (useDocumentStore as unknown as { persist: { getOptions: () => { partialize: (state: ReturnType<typeof useDocumentStore.getState>) => unknown } } }).persist;
      const options = persistApi.getOptions();
      const partialized = options.partialize(useDocumentStore.getState()) as { documents: Array<Record<string, unknown>> };

      // Content should be excluded
      expect(partialized.documents[0]).not.toHaveProperty('content');
      expect(partialized.documents[0]).not.toHaveProperty('embeddableContent');
      // But contentLength should be preserved
      expect(partialized.documents[0].contentLength).toBe(10000);
      // Other fields should still be present
      expect(partialized.documents[0].filename).toBe('large.pdf');
      expect(partialized.documents[0].type).toBe('pdf');
    });

    it('should exclude version content from partialize output', () => {
      let docId: string;
      act(() => {
        const doc = useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'Version content here',
          metadata: createMetadata(),
        });
        docId = doc.id;
        useDocumentStore.getState().saveVersion(docId);
      });

      const persistApi = (useDocumentStore as unknown as { persist: { getOptions: () => { partialize: (state: ReturnType<typeof useDocumentStore.getState>) => unknown } } }).persist;
      const options = persistApi.getOptions();
      const partialized = options.partialize(useDocumentStore.getState()) as { versions: Record<string, Array<Record<string, unknown>>> };

      const versions = Object.values(partialized.versions)[0];
      expect(versions[0]).not.toHaveProperty('content');
      expect(versions[0].documentId).toBeDefined();
    });

    it('should serialize dates as ISO strings in partialize output', () => {
      act(() => {
        useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: 'original',
          metadata: createMetadata(),
        });
      });

      const persistApi = (useDocumentStore as unknown as { persist: { getOptions: () => { partialize: (state: ReturnType<typeof useDocumentStore.getState>) => unknown } } }).persist;
      const options = persistApi.getOptions();
      const partialized = options.partialize(useDocumentStore.getState()) as { documents: Array<Record<string, unknown>> };

      // Dates should be serialized as ISO strings for JSON storage
      expect(typeof partialized.documents[0].createdAt).toBe('string');
      expect(typeof partialized.documents[0].updatedAt).toBe('string');
    });

    it('should handle documents with undefined content gracefully in partialize', () => {
      act(() => {
        useDocumentStore.getState().addDocument({
          filename: 'test.txt',
          type: 'text',
          content: '',
          metadata: createMetadata(),
        });
      });

      const persistApi = (useDocumentStore as unknown as { persist: { getOptions: () => { partialize: (state: ReturnType<typeof useDocumentStore.getState>) => unknown } } }).persist;
      const options = persistApi.getOptions();
      const partialized = options.partialize(useDocumentStore.getState()) as { documents: Array<Record<string, unknown>> };

      expect(partialized.documents[0].contentLength).toBe(0);
    });
  });

  describe('type re-exports from @/types/document', () => {
    it('should export StoredDocument type', () => {
      act(() => {
        const doc = useDocumentStore.getState().addDocument({
          filename: 'typed.txt',
          type: 'text',
          content: 'typed',
          metadata: createMetadata(),
        });
        // StoredDocument should have all required fields
        expect(doc.id).toBeDefined();
        expect(doc.filename).toBe('typed.txt');
        expect(doc.type).toBe('text');
        expect(doc.version).toBe(1);
        expect(doc.isIndexed).toBe(false);
        expect(doc.createdAt).toBeInstanceOf(Date);
        expect(doc.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should export DocumentVersion type via saveVersion/getVersions', () => {
      let docId: string;
      act(() => {
        const doc = useDocumentStore.getState().addDocument({
          filename: 'ver.txt',
          type: 'text',
          content: 'v1',
          metadata: createMetadata(),
        });
        docId = doc.id;
        useDocumentStore.getState().saveVersion(docId);
      });

      const versions = useDocumentStore.getState().getVersions(docId!);
      expect(versions).toHaveLength(1);
      expect(versions[0].id).toBeDefined();
      expect(versions[0].documentId).toBe(docId!);
      expect(versions[0].version).toBe(1);
      expect(versions[0].content).toBe('v1');
      expect(versions[0].createdAt).toBeInstanceOf(Date);
    });

    it('should export DocumentFilter type via filterDocuments', () => {
      act(() => {
        useDocumentStore.getState().addDocument({
          filename: 'a.md',
          type: 'markdown',
          content: 'md',
          projectId: 'p1',
          metadata: createMetadata(),
        });
      });

      // DocumentFilter with all fields
      const results = useDocumentStore.getState().filterDocuments({
        type: 'markdown',
        projectId: 'p1',
        isIndexed: false,
        searchQuery: 'md',
      });
      expect(results).toHaveLength(1);
    });
  });
});
