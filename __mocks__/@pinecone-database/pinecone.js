// Mock for @pinecone-database/pinecone
const mockIndex = {
  upsert: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockResolvedValue({
    matches: [],
  }),
  deleteMany: jest.fn().mockResolvedValue(undefined),
  deleteAll: jest.fn().mockResolvedValue(undefined),
  fetch: jest.fn().mockResolvedValue({ records: {} }),
  describeIndexStats: jest.fn().mockResolvedValue({
    totalRecordCount: 0,
    dimension: 1536,
    namespaces: {},
  }),
  namespace: jest.fn().mockReturnThis(),
};

const Pinecone = jest.fn().mockImplementation(() => ({
  index: jest.fn().mockReturnValue(mockIndex),
  listIndexes: jest.fn().mockResolvedValue({ indexes: [] }),
  createIndex: jest.fn().mockResolvedValue(undefined),
  describeIndex: jest.fn().mockResolvedValue({
    name: 'test-index',
    dimension: 1536,
    metric: 'cosine',
    host: 'test.pinecone.io',
    status: { ready: true, state: 'Ready' },
  }),
  configureIndex: jest.fn().mockResolvedValue(undefined),
  deleteIndex: jest.fn().mockResolvedValue(undefined),
}));

module.exports = {
  Pinecone,
  // Export mock index for test access
  __mockIndex: mockIndex,
};
