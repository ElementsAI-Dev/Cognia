/**
 * Tests for Document Storage
 */

import 'fake-indexeddb/auto';
import { db } from '@/lib/db/schema';
import {
  storeDocument,
  storeDocuments,
  updateStoredDocument,
  getStoredDocuments,
  getStoredDocument,
  deleteStoredDocument,
  searchDocuments,
  getStorageStats,
} from './document-storage';

describe('document-storage', () => {
  beforeEach(async () => {
    await db.documents.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('storeDocument', () => {
    it('stores a markdown document', async () => {
      const result = await storeDocument('readme.md', '# Hello World\n\nContent here');

      expect(result.document).toBeDefined();
      expect(result.document.filename).toBe('readme.md');
      expect(result.document.type).toBe('markdown');
      expect(result.processed.type).toBe('markdown');
      expect(result.embeddingGenerated).toBe(false);
    });

    it('stores a code document', async () => {
      const result = await storeDocument('app.ts', 'const x = 1;');

      expect(result.document.type).toBe('code');
      expect(result.processed.metadata.language).toBe('typescript');
    });

    it('stores a JSON document', async () => {
      const result = await storeDocument('config.json', '{"key": "value"}');

      expect(result.document.type).toBe('json');
    });

    it('stores document with project ID', async () => {
      const result = await storeDocument('test.md', '# Test', {
        projectId: 'project-1',
      });

      expect(result.document.projectId).toBe('project-1');
    });

    it('stores document with collection ID', async () => {
      const result = await storeDocument('test.md', '# Test', {
        collectionId: 'collection-1',
      });

      expect(result.document.collectionId).toBe('collection-1');
    });

    it('generates chunks when requested', async () => {
      const longContent = 'word '.repeat(500);
      const result = await storeDocument('large.md', longContent, {
        generateChunks: true,
        chunkingOptions: { chunkSize: 100 },
      });

      expect(result.processed.chunks).toBeDefined();
      expect(result.processed.chunks!.length).toBeGreaterThan(1);
    });
  });

  describe('storeDocuments', () => {
    it('stores multiple documents', async () => {
      const files = [
        { filename: 'a.md', content: '# A' },
        { filename: 'b.md', content: '# B' },
        { filename: 'c.ts', content: 'const c = 3;' },
      ];

      const results = await storeDocuments(files);

      expect(results).toHaveLength(3);
      expect(results[0].document.filename).toBe('a.md');
      expect(results[1].document.filename).toBe('b.md');
      expect(results[2].document.filename).toBe('c.ts');
    });

    it('tracks progress', async () => {
      const files = [
        { filename: 'a.md', content: '# A' },
        { filename: 'b.md', content: '# B' },
      ];

      const progressUpdates: number[] = [];
      await storeDocuments(files, {
        onProgress: (progress) => {
          progressUpdates.push(progress.processed);
        },
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('handles empty array', async () => {
      const results = await storeDocuments([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('updateStoredDocument', () => {
    it('updates document content', async () => {
      const stored = await storeDocument('test.md', '# Original');
      
      const updated = await updateStoredDocument(stored.document.id, '# Updated');

      expect(updated?.content).toBe('# Updated');
      expect(updated?.version).toBe(2);
    });

    it('returns undefined for non-existent document', async () => {
      const result = await updateStoredDocument('non-existent', '# Test');
      expect(result).toBeUndefined();
    });
  });

  describe('getStoredDocuments', () => {
    it('returns all documents without filter', async () => {
      await storeDocument('a.md', '# A');
      await storeDocument('b.md', '# B');

      const docs = await getStoredDocuments();
      expect(docs).toHaveLength(2);
    });

    it('filters by type', async () => {
      await storeDocument('a.md', '# A');
      await storeDocument('b.ts', 'const b = 1;');

      const docs = await getStoredDocuments({ type: 'markdown' });
      expect(docs).toHaveLength(1);
      expect(docs[0].type).toBe('markdown');
    });

    it('filters by project ID', async () => {
      await storeDocument('a.md', '# A', { projectId: 'project-1' });
      await storeDocument('b.md', '# B', { projectId: 'project-2' });

      const docs = await getStoredDocuments({ projectId: 'project-1' });
      expect(docs).toHaveLength(1);
    });
  });

  describe('getStoredDocument', () => {
    it('returns document by ID', async () => {
      const stored = await storeDocument('test.md', '# Test');
      
      const found = await getStoredDocument(stored.document.id);
      expect(found).toBeDefined();
      expect(found?.filename).toBe('test.md');
    });

    it('returns undefined for non-existent ID', async () => {
      const found = await getStoredDocument('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('deleteStoredDocument', () => {
    it('deletes a document', async () => {
      const stored = await storeDocument('test.md', '# Test');
      
      await deleteStoredDocument(stored.document.id);

      const found = await getStoredDocument(stored.document.id);
      expect(found).toBeUndefined();
    });
  });

  describe('searchDocuments', () => {
    it('finds documents by content', async () => {
      await storeDocument('a.md', '# Hello World');
      await storeDocument('b.md', '# Goodbye World');
      await storeDocument('c.md', '# Something Else');

      const results = await searchDocuments('World');
      expect(results).toHaveLength(2);
    });

    it('respects limit option', async () => {
      await storeDocument('a.md', '# Test A');
      await storeDocument('b.md', '# Test B');
      await storeDocument('c.md', '# Test C');

      const results = await searchDocuments('Test', { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('filters by project ID', async () => {
      await storeDocument('a.md', '# Test', { projectId: 'project-1' });
      await storeDocument('b.md', '# Test', { projectId: 'project-2' });

      const results = await searchDocuments('Test', { projectId: 'project-1' });
      expect(results).toHaveLength(1);
    });

    it('filters by type', async () => {
      await storeDocument('a.md', '# Test');
      await storeDocument('b.ts', '// Test');

      const results = await searchDocuments('Test', { type: 'markdown' });
      expect(results).toHaveLength(1);
    });
  });

  describe('getStorageStats', () => {
    it('returns correct statistics', async () => {
      await storeDocument('a.md', '# Markdown');
      await storeDocument('b.md', '# Another');
      await storeDocument('c.ts', 'const x = 1;');

      const stats = await getStorageStats();

      expect(stats.totalDocuments).toBe(3);
      expect(stats.byType['markdown']).toBe(2);
      expect(stats.byType['code']).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('returns zeros for empty storage', async () => {
      const stats = await getStorageStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.indexedDocuments).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });
});
