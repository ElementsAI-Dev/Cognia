// Mock for chromadb
const mockCollection = {
  add: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  upsert: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockResolvedValue({
    ids: [[]],
    documents: [[]],
    metadatas: [[]],
    distances: [[]],
  }),
  get: jest.fn().mockResolvedValue({
    ids: [],
    documents: [],
    metadatas: [],
    embeddings: [],
  }),
  count: jest.fn().mockResolvedValue(0),
  peek: jest.fn().mockResolvedValue({
    ids: [],
    documents: [],
    metadatas: [],
  }),
};

const ChromaClient = jest.fn().mockImplementation(() => ({
  getOrCreateCollection: jest.fn().mockResolvedValue(mockCollection),
  deleteCollection: jest.fn().mockResolvedValue(undefined),
  listCollections: jest.fn().mockResolvedValue([]),
  getCollection: jest.fn().mockResolvedValue(mockCollection),
}));

const Collection = jest.fn();

module.exports = {
  ChromaClient,
  Collection,
  // Export mock collection for test access
  __mockCollection: mockCollection,
};
