// Mock for @qdrant/js-client-rest ESM module
class QdrantClient {
  constructor(config) {
    this.config = config;
  }

  async getCollections() {
    return { collections: [] };
  }

  async createCollection() {
    return { result: true };
  }

  async deleteCollection() {
    return { result: true };
  }

  async upsert() {
    return { result: { operation_id: 1, status: 'completed' } };
  }

  async search() {
    return [];
  }

  async scroll() {
    return { points: [], next_page_offset: null };
  }

  async delete() {
    return { result: { operation_id: 1, status: 'completed' } };
  }

  async getCollection() {
    return { result: { vectors_count: 0, points_count: 0 } };
  }
}

class QdrantClientConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QdrantClientConfigError';
  }
}

class QdrantClientResourceExhaustedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QdrantClientResourceExhaustedError';
  }
}

class QdrantClientTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QdrantClientTimeoutError';
  }
}

class QdrantClientUnexpectedResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QdrantClientUnexpectedResponseError';
  }
}

module.exports = {
  QdrantClient,
  QdrantClientConfigError,
  QdrantClientResourceExhaustedError,
  QdrantClientTimeoutError,
  QdrantClientUnexpectedResponseError,
};
