/**
 * Browser stub for @pinecone-database/pinecone
 * This module uses Node.js fs/path and only works in server environments.
 * At runtime in Tauri, the actual module is dynamically imported.
 */

import { loggers } from '@/lib/logger';

const log = loggers.app;

const notAvailable = () => {
  throw new Error('Pinecone is not available in browser environment');
};

export class Pinecone {
  constructor(_config?: unknown) {
    log.warn('Pinecone is not available in browser environment');
  }

  index(_name: string) {
    return new PineconeIndex();
  }

  async listIndexes() {
    return { indexes: [] };
  }

  async createIndex(_params: unknown) {
    notAvailable();
  }

  async describeIndex(_name: string) {
    return {
      name: '',
      dimension: 0,
      metric: 'cosine',
      host: '',
      status: { ready: false, state: 'unknown' },
    };
  }

  async configureIndex(_name: string, _options: unknown) {
    notAvailable();
  }

  async deleteIndex(_name: string) {
    notAvailable();
  }
}

class PineconeIndex {
  namespace(_ns: string) {
    return this;
  }

  async upsert(_vectors: unknown[]) {
    notAvailable();
  }

  async query(_params: unknown) {
    return { matches: [] };
  }

  async deleteMany(_ids: string[]) {
    notAvailable();
  }

  async deleteAll() {
    notAvailable();
  }

  async fetch(_ids: string[]) {
    return { records: {} };
  }

  async describeIndexStats() {
    return { totalRecordCount: 0, dimension: 0, namespaces: {} };
  }
}

export type Index<T = unknown> = PineconeIndex & { __meta?: T };
export type RecordMetadata = Record<string, unknown>;

const pineconeStub = { Pinecone };
export default pineconeStub;
