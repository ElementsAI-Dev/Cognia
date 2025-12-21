/**
 * Document Repository - data access layer for documents
 */

import { db, type DBDocument } from '../schema';
import type { StoredDocument, DocumentFilter, DocumentType } from '@/types/document';
import { nanoid } from 'nanoid';

// Convert DBDocument to StoredDocument
function toStoredDocument(dbDoc: DBDocument): StoredDocument {
  return {
    id: dbDoc.id,
    filename: dbDoc.name,
    type: dbDoc.type as DocumentType,
    content: dbDoc.content,
    embeddableContent: dbDoc.embeddableContent,
    metadata: dbDoc.metadata ? JSON.parse(dbDoc.metadata) : {
      size: dbDoc.content.length,
      lineCount: dbDoc.content.split('\n').length,
      wordCount: dbDoc.content.split(/\s+/).filter(w => w.length > 0).length,
    },
    projectId: dbDoc.projectId,
    collectionId: dbDoc.collectionId,
    isIndexed: dbDoc.isIndexed ?? false,
    version: dbDoc.version ?? 1,
    createdAt: dbDoc.createdAt,
    updatedAt: dbDoc.updatedAt ?? dbDoc.createdAt,
  };
}

// Convert StoredDocument to DBDocument (reserved for future use)
function _toDBDocument(doc: StoredDocument): DBDocument {
  return {
    id: doc.id,
    name: doc.filename,
    type: doc.type,
    content: doc.content,
    embeddableContent: doc.embeddableContent,
    embedding: undefined,
    metadata: JSON.stringify(doc.metadata),
    projectId: doc.projectId,
    collectionId: doc.collectionId,
    isIndexed: doc.isIndexed,
    version: doc.version,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateDocumentInput {
  filename: string;
  type: DocumentType;
  content: string;
  embeddableContent?: string;
  metadata?: Record<string, unknown>;
  projectId?: string;
  collectionId?: string;
  embedding?: number[];
}

export interface UpdateDocumentInput {
  filename?: string;
  content?: string;
  embeddableContent?: string;
  metadata?: Record<string, unknown>;
  projectId?: string;
  collectionId?: string;
  isIndexed?: boolean;
  embedding?: number[];
}

export const documentRepository = {
  /**
   * Get all documents
   */
  async getAll(): Promise<StoredDocument[]> {
    const documents = await db.documents.orderBy('createdAt').reverse().toArray();
    return documents.map(toStoredDocument);
  },

  /**
   * Get a single document by ID
   */
  async getById(id: string): Promise<StoredDocument | undefined> {
    const document = await db.documents.get(id);
    return document ? toStoredDocument(document) : undefined;
  },

  /**
   * Get documents by project ID
   */
  async getByProjectId(projectId: string): Promise<StoredDocument[]> {
    const documents = await db.documents
      .where('projectId')
      .equals(projectId)
      .sortBy('createdAt');
    return documents.map(toStoredDocument);
  },

  /**
   * Get documents by collection ID
   */
  async getByCollectionId(collectionId: string): Promise<StoredDocument[]> {
    const documents = await db.documents
      .where('collectionId')
      .equals(collectionId)
      .sortBy('createdAt');
    return documents.map(toStoredDocument);
  },

  /**
   * Get documents by type
   */
  async getByType(type: DocumentType): Promise<StoredDocument[]> {
    const documents = await db.documents
      .where('type')
      .equals(type)
      .toArray();
    return documents.map(toStoredDocument);
  },

  /**
   * Create a new document
   */
  async create(input: CreateDocumentInput): Promise<StoredDocument> {
    const now = new Date();
    const id = nanoid();

    const dbDocument: DBDocument = {
      id,
      name: input.filename,
      type: input.type,
      content: input.content,
      embeddableContent: input.embeddableContent,
      embedding: input.embedding,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      projectId: input.projectId,
      collectionId: input.collectionId,
      isIndexed: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    await db.documents.add(dbDocument);
    return toStoredDocument(dbDocument);
  },

  /**
   * Update an existing document
   */
  async update(id: string, updates: UpdateDocumentInput): Promise<StoredDocument | undefined> {
    const existing = await db.documents.get(id);
    if (!existing) return undefined;

    const updateData: Partial<DBDocument> = {
      updatedAt: new Date(),
    };

    if (updates.filename !== undefined) updateData.name = updates.filename;
    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.version = (existing.version ?? 1) + 1;
    }
    if (updates.embeddableContent !== undefined) updateData.embeddableContent = updates.embeddableContent;
    if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
    if (updates.projectId !== undefined) updateData.projectId = updates.projectId;
    if (updates.collectionId !== undefined) updateData.collectionId = updates.collectionId;
    if (updates.isIndexed !== undefined) updateData.isIndexed = updates.isIndexed;
    if (updates.embedding !== undefined) updateData.embedding = updates.embedding;

    await db.documents.update(id, updateData);
    const updated = await db.documents.get(id);
    return updated ? toStoredDocument(updated) : undefined;
  },

  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    await db.documents.delete(id);
  },

  /**
   * Delete all documents for a project
   */
  async deleteByProjectId(projectId: string): Promise<void> {
    await db.documents.where('projectId').equals(projectId).delete();
  },

  /**
   * Delete all documents for a collection
   */
  async deleteByCollectionId(collectionId: string): Promise<void> {
    await db.documents.where('collectionId').equals(collectionId).delete();
  },

  /**
   * Bulk create documents
   */
  async bulkCreate(inputs: CreateDocumentInput[]): Promise<StoredDocument[]> {
    const now = new Date();
    const documents: DBDocument[] = inputs.map((input) => ({
      id: nanoid(),
      name: input.filename,
      type: input.type,
      content: input.content,
      embeddableContent: input.embeddableContent,
      embedding: input.embedding,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      projectId: input.projectId,
      collectionId: input.collectionId,
      isIndexed: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }));

    await db.documents.bulkAdd(documents);
    return documents.map(toStoredDocument);
  },

  /**
   * Bulk delete documents by IDs
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await db.documents.bulkDelete(ids);
  },

  /**
   * Get document count
   */
  async getCount(): Promise<number> {
    return db.documents.count();
  },

  /**
   * Get documents with filter
   */
  async filter(filter: DocumentFilter): Promise<StoredDocument[]> {
    let collection = db.documents.toCollection();

    // Apply filters
    if (filter.type) {
      collection = db.documents.where('type').equals(filter.type);
    }

    let results = await collection.toArray();

    // Further filtering in memory for complex conditions
    if (filter.projectId) {
      results = results.filter((doc) => doc.projectId === filter.projectId);
    }
    if (filter.collectionId) {
      results = results.filter((doc) => doc.collectionId === filter.collectionId);
    }
    if (filter.isIndexed !== undefined) {
      results = results.filter((doc) => doc.isIndexed === filter.isIndexed);
    }
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      results = results.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query)
      );
    }

    return results.map(toStoredDocument);
  },

  /**
   * Search documents by content
   */
  async searchByContent(query: string, limit: number = 10): Promise<StoredDocument[]> {
    const lowerQuery = query.toLowerCase();
    const documents = await db.documents
      .filter((doc) => doc.content.toLowerCase().includes(lowerQuery))
      .limit(limit)
      .toArray();

    return documents.map(toStoredDocument);
  },

  /**
   * Search documents by filename
   */
  async searchByFilename(query: string): Promise<StoredDocument[]> {
    const lowerQuery = query.toLowerCase();
    const documents = await db.documents
      .filter((doc) => doc.name.toLowerCase().includes(lowerQuery))
      .toArray();

    return documents.map(toStoredDocument);
  },

  /**
   * Update document embedding
   */
  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    await db.documents.update(id, {
      embedding,
      isIndexed: true,
      updatedAt: new Date(),
    });
  },

  /**
   * Get documents with embeddings for vector search
   */
  async getWithEmbeddings(): Promise<{ id: string; embedding: number[]; content: string }[]> {
    const documents = await db.documents
      .filter((doc) => doc.embedding !== undefined && doc.embedding.length > 0)
      .toArray();

    return documents
      .filter((doc) => doc.embedding)
      .map((doc) => ({
        id: doc.id,
        embedding: doc.embedding!,
        content: doc.content,
      }));
  },

  /**
   * Mark document as indexed
   */
  async markAsIndexed(id: string): Promise<void> {
    await db.documents.update(id, {
      isIndexed: true,
      updatedAt: new Date(),
    });
  },

  /**
   * Get unindexed documents
   */
  async getUnindexed(): Promise<StoredDocument[]> {
    const documents = await db.documents
      .filter((doc) => !doc.isIndexed)
      .toArray();
    return documents.map(toStoredDocument);
  },

  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    await db.documents.clear();
  },
};

export default documentRepository;
