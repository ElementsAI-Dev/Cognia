/**
 * Mock for @tauri-apps/plugin-stronghold
 * Used for testing environments where Tauri is not available
 */

// In-memory storage for testing (shared across all clients)
const mockStorage = new Map();
let mockInitialized = false;

// Shared store instance
const sharedStore = {
  async insert(key, data) {
    mockStorage.set(key, data);
  },

  async get(key) {
    return mockStorage.get(key) || null;
  },

  async remove(key) {
    mockStorage.delete(key);
  }
};

class MockClient {
  constructor(name) {
    this.name = name;
  }

  getStore() {
    return sharedStore;
  }
}

class MockStronghold {
  constructor(path, password) {
    this.path = path;
    this.password = password;
    this.clients = new Map();
  }

  async loadClient(name) {
    if (!this.clients.has(name)) {
      throw new Error(`Client ${name} not found`);
    }
    return this.clients.get(name);
  }

  async createClient(name) {
    const client = new MockClient(name);
    this.clients.set(name, client);
    return client;
  }

  async save() {
    // No-op for mock
  }

  static async load(path, password) {
    mockInitialized = true;
    return new MockStronghold(path, password);
  }
}

// Helper functions for testing
const __resetMockStorage = () => {
  mockStorage.clear();
  mockInitialized = false;
};

const __getMockStorage = () => mockStorage;

const __isMockInitialized = () => mockInitialized;

module.exports = {
  Stronghold: MockStronghold,
  Client: MockClient,
  __resetMockStorage,
  __getMockStorage,
  __isMockInitialized,
};
