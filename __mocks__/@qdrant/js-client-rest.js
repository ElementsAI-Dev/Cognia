// Mock for @qdrant/js-client-rest ESM module
const QdrantClient = jest.fn().mockImplementation((config) => ({
  config,
  getCollections: jest.fn().mockResolvedValue({ collections: [] }),
  createCollection: jest.fn().mockResolvedValue({ result: true }),
  deleteCollection: jest.fn().mockResolvedValue({ result: true }),
  upsert: jest.fn().mockResolvedValue({ result: { operation_id: 1, status: 'completed' } }),
  query: jest.fn().mockResolvedValue({ points: [] }),
  search: jest.fn().mockResolvedValue([]),
  scroll: jest.fn().mockResolvedValue({ points: [], next_page_offset: null }),
  count: jest.fn().mockResolvedValue({ count: 0 }),
  delete: jest.fn().mockResolvedValue({ result: { operation_id: 1, status: 'completed' } }),
  getCollection: jest.fn().mockResolvedValue({
    indexed_vectors_count: 0,
    points_count: 0,
    status: 'green',
    config: {
      params: {
        vectors: { size: 1536, distance: 'Cosine' },
      },
    },
  }),
  retrieve: jest.fn().mockResolvedValue([]),
}));

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
