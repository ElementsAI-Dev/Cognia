/**
 * Tests for Document Repository
 */

import 'fake-indexeddb/auto';
import { db } from '../schema';
import { documentRepository } from './document-repository';

describe('documentRepository', () => {
  beforeEach(async () => {
    await db.documents.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates a document with required fields', async () => {
      const doc = await documentRepository.create({
        filename: 'test.md',
        type: 'markdown',
        content: '# Test Document',
      });

      expect(doc.id).toBeDefined();
      expect(doc.filename).toBe('test.md');
      expect(doc.type).toBe('markdown');
      expect(doc.content).toBe('# Test Document');
      expect(doc.isIndexed).toBe(false);
      expect(doc.version).toBe(1);
    });

    it('creates a document with optional fields', async () => {
      const doc = await documentRepository.create({
        filename: 'test.ts',
        type: 'code',
        content: 'const x = 1;',
        embeddableContent: 'x equals 1',
        metadata: { language: 'typescript' },
        projectId: 'project-1',
        collectionId: 'collection-1',
      });

      expect(doc.embeddableContent).toBe('x equals 1');
      expect(doc.metadata.language).toBe('typescript');
      expect(doc.projectId).toBe('project-1');
      expect(doc.collectionId).toBe('collection-1');
    });
  });

  describe('getById', () => {
    it('returns document when found', async () => {
      const created = await documentRepository.create({
        filename: 'test.txt',
        type: 'text',
        content: 'Hello',
      });

      const found = await documentRepository.getById(created.id);
      expect(found).toBeDefined();
      expect(found?.filename).toBe('test.txt');
    });

    it('returns undefined when not found', async () => {
      const found = await documentRepository.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns all documents', async () => {
      await documentRepository.create({ filename: 'a.md', type: 'markdown', content: 'A' });
      await documentRepository.create({ filename: 'b.md', type: 'markdown', content: 'B' });

      const all = await documentRepository.getAll();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no documents', async () => {
      const all = await documentRepository.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('updates document content', async () => {
      const created = await documentRepository.create({
        filename: 'test.md',
        type: 'markdown',
        content: 'Original',
      });

      const updated = await documentRepository.update(created.id, {
        content: 'Updated',
      });

      expect(updated?.content).toBe('Updated');
      expect(updated?.version).toBe(2);
    });

    it('returns undefined for non-existent document', async () => {
      const result = await documentRepository.update('non-existent', {
        content: 'Test',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes a document', async () => {
      const created = await documentRepository.create({
        filename: 'test.md',
        type: 'markdown',
        content: 'Test',
      });

      await documentRepository.delete(created.id);
      const found = await documentRepository.getById(created.id);
      expect(found).toBeUndefined();
    });
  });

  describe('getByProjectId', () => {
    it('returns documents for a project', async () => {
      await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'A',
        projectId: 'project-1',
      });
      await documentRepository.create({
        filename: 'b.md',
        type: 'markdown',
        content: 'B',
        projectId: 'project-1',
      });
      await documentRepository.create({
        filename: 'c.md',
        type: 'markdown',
        content: 'C',
        projectId: 'project-2',
      });

      const docs = await documentRepository.getByProjectId('project-1');
      expect(docs).toHaveLength(2);
    });
  });

  describe('getByType', () => {
    it('returns documents of specific type', async () => {
      await documentRepository.create({ filename: 'a.md', type: 'markdown', content: 'A' });
      await documentRepository.create({ filename: 'b.ts', type: 'code', content: 'B' });
      await documentRepository.create({ filename: 'c.md', type: 'markdown', content: 'C' });

      const markdownDocs = await documentRepository.getByType('markdown');
      expect(markdownDocs).toHaveLength(2);
    });
  });

  describe('bulkCreate', () => {
    it('creates multiple documents', async () => {
      const docs = await documentRepository.bulkCreate([
        { filename: 'a.md', type: 'markdown', content: 'A' },
        { filename: 'b.md', type: 'markdown', content: 'B' },
      ]);

      expect(docs).toHaveLength(2);
      expect(docs[0].filename).toBe('a.md');
      expect(docs[1].filename).toBe('b.md');
    });
  });

  describe('searchByContent', () => {
    it('finds documents containing search term', async () => {
      await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'Hello world',
      });
      await documentRepository.create({
        filename: 'b.md',
        type: 'markdown',
        content: 'Goodbye world',
      });
      await documentRepository.create({
        filename: 'c.md',
        type: 'markdown',
        content: 'Something else',
      });

      const results = await documentRepository.searchByContent('world');
      expect(results).toHaveLength(2);
    });
  });

  describe('updateEmbedding', () => {
    it('updates document embedding and marks as indexed', async () => {
      const created = await documentRepository.create({
        filename: 'test.md',
        type: 'markdown',
        content: 'Test',
      });

      await documentRepository.updateEmbedding(created.id, [0.1, 0.2, 0.3]);

      const updated = await documentRepository.getById(created.id);
      expect(updated?.isIndexed).toBe(true);
    });
  });

  describe('getUnindexed', () => {
    it('returns only unindexed documents', async () => {
      const doc1 = await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'A',
      });
      await documentRepository.create({
        filename: 'b.md',
        type: 'markdown',
        content: 'B',
      });

      await documentRepository.markAsIndexed(doc1.id);

      const unindexed = await documentRepository.getUnindexed();
      expect(unindexed).toHaveLength(1);
      expect(unindexed[0].filename).toBe('b.md');
    });
  });

  describe('filter', () => {
    it('filters by multiple criteria', async () => {
      await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'A',
        projectId: 'project-1',
      });
      await documentRepository.create({
        filename: 'b.ts',
        type: 'code',
        content: 'B',
        projectId: 'project-1',
      });
      await documentRepository.create({
        filename: 'c.md',
        type: 'markdown',
        content: 'C',
        projectId: 'project-2',
      });

      const results = await documentRepository.filter({
        type: 'markdown',
        projectId: 'project-1',
      });

      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('a.md');
    });
  });

  describe('getCount', () => {
    it('returns correct count', async () => {
      await documentRepository.create({ filename: 'a.md', type: 'markdown', content: 'A' });
      await documentRepository.create({ filename: 'b.md', type: 'markdown', content: 'B' });

      const count = await documentRepository.getCount();
      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all documents', async () => {
      await documentRepository.create({ filename: 'a.md', type: 'markdown', content: 'A' });
      await documentRepository.create({ filename: 'b.md', type: 'markdown', content: 'B' });

      await documentRepository.clear();

      const count = await documentRepository.getCount();
      expect(count).toBe(0);
    });
  });

  describe('getByCollectionId', () => {
    it('returns documents for a collection', async () => {
      await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'A',
        collectionId: 'collection-1',
      });
      await documentRepository.create({
        filename: 'b.md',
        type: 'markdown',
        content: 'B',
        collectionId: 'collection-1',
      });
      await documentRepository.create({
        filename: 'c.md',
        type: 'markdown',
        content: 'C',
        collectionId: 'collection-2',
      });

      const docs = await documentRepository.getByCollectionId('collection-1');
      expect(docs).toHaveLength(2);
    });
  });

  describe('deleteByProjectId', () => {
    it('deletes all documents for a project', async () => {
      await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'A',
        projectId: 'project-1',
      });
      await documentRepository.create({
        filename: 'b.md',
        type: 'markdown',
        content: 'B',
        projectId: 'project-1',
      });
      await documentRepository.create({
        filename: 'c.md',
        type: 'markdown',
        content: 'C',
        projectId: 'project-2',
      });

      await documentRepository.deleteByProjectId('project-1');

      const project1Docs = await documentRepository.getByProjectId('project-1');
      const project2Docs = await documentRepository.getByProjectId('project-2');

      expect(project1Docs).toHaveLength(0);
      expect(project2Docs).toHaveLength(1);
    });
  });

  describe('deleteByCollectionId', () => {
    it('deletes all documents for a collection', async () => {
      await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'A',
        collectionId: 'collection-1',
      });
      await documentRepository.create({
        filename: 'b.md',
        type: 'markdown',
        content: 'B',
        collectionId: 'collection-2',
      });

      await documentRepository.deleteByCollectionId('collection-1');

      const collection1Docs = await documentRepository.getByCollectionId('collection-1');
      const collection2Docs = await documentRepository.getByCollectionId('collection-2');

      expect(collection1Docs).toHaveLength(0);
      expect(collection2Docs).toHaveLength(1);
    });
  });

  describe('bulkDelete', () => {
    it('deletes multiple documents by IDs', async () => {
      const doc1 = await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'A',
      });
      const doc2 = await documentRepository.create({
        filename: 'b.md',
        type: 'markdown',
        content: 'B',
      });
      const doc3 = await documentRepository.create({
        filename: 'c.md',
        type: 'markdown',
        content: 'C',
      });

      await documentRepository.bulkDelete([doc1.id, doc2.id]);

      const remaining = await documentRepository.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(doc3.id);
    });
  });

  describe('searchByFilename', () => {
    it('finds documents by filename', async () => {
      await documentRepository.create({
        filename: 'readme.md',
        type: 'markdown',
        content: 'README',
      });
      await documentRepository.create({
        filename: 'index.ts',
        type: 'code',
        content: 'export {}',
      });
      await documentRepository.create({
        filename: 'readme-old.md',
        type: 'markdown',
        content: 'Old README',
      });

      const results = await documentRepository.searchByFilename('readme');
      expect(results).toHaveLength(2);
    });

    it('is case insensitive', async () => {
      await documentRepository.create({
        filename: 'README.md',
        type: 'markdown',
        content: 'README',
      });

      const results = await documentRepository.searchByFilename('readme');
      expect(results).toHaveLength(1);
    });
  });

  describe('getWithEmbeddings', () => {
    it('returns only documents with embeddings', async () => {
      await documentRepository.create({
        filename: 'a.md',
        type: 'markdown',
        content: 'A',
        embedding: [0.1, 0.2, 0.3],
      });
      await documentRepository.create({
        filename: 'b.md',
        type: 'markdown',
        content: 'B',
      });

      const withEmbeddings = await documentRepository.getWithEmbeddings();
      expect(withEmbeddings).toHaveLength(1);
      expect(withEmbeddings[0].embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('markAsIndexed', () => {
    it('marks document as indexed', async () => {
      const doc = await documentRepository.create({
        filename: 'test.md',
        type: 'markdown',
        content: 'Test',
      });

      expect(doc.isIndexed).toBe(false);

      await documentRepository.markAsIndexed(doc.id);

      const updated = await documentRepository.getById(doc.id);
      expect(updated?.isIndexed).toBe(true);
    });
  });
});
