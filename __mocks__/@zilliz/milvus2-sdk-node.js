/**
 * Mock for @zilliz/milvus2-sdk-node
 * Used for testing Milvus vector database integration
 */

const mockCollections = new Map();
const mockData = new Map();

const DataType = {
  None: 0,
  Bool: 1,
  Int8: 2,
  Int16: 3,
  Int32: 4,
  Int64: 5,
  Float: 10,
  Double: 11,
  VarChar: 21,
  Array: 22,
  JSON: 23,
  BinaryVector: 100,
  FloatVector: 101,
  Float16Vector: 102,
  BFloat16Vector: 103,
  SparseFloatVector: 104,
  Int8Vector: 105,
};

class MilvusClient {
  constructor(config) {
    this.config = config;
    this.address = config.address;
    this.token = config.token;
    this.username = config.username;
    this.password = config.password;
    this.ssl = config.ssl;
  }

  async hasCollection({ collection_name }) {
    return { value: mockCollections.has(collection_name) };
  }

  async createCollection({ collection_name, fields, description, enable_dynamic_field }) {
    mockCollections.set(collection_name, {
      name: collection_name,
      fields,
      description,
      enable_dynamic_field,
      created_at: Date.now(),
    });
    mockData.set(collection_name, []);
    return { status: { error_code: 'Success', reason: '' } };
  }

  async dropCollection({ collection_name }) {
    mockCollections.delete(collection_name);
    mockData.delete(collection_name);
    return { status: { error_code: 'Success', reason: '' } };
  }

  async listCollections() {
    return { data: Array.from(mockCollections.keys()) };
  }

  async describeCollection({ collection_name }) {
    const collection = mockCollections.get(collection_name);
    if (!collection) {
      throw new Error(`Collection ${collection_name} not found`);
    }
    return {
      schema: {
        fields: collection.fields.map(f => ({
          ...f,
          type_params: f.dim ? [{ key: 'dim', value: String(f.dim) }] : [],
        })),
        description: collection.description,
      },
      status: { error_code: 'Success', reason: '' },
    };
  }

  async getCollectionStatistics({ collection_name }) {
    const data = mockData.get(collection_name) || [];
    return {
      stats: [{ key: 'row_count', value: String(data.length) }],
    };
  }

  async createIndex({ collection_name, field_name, index_type, metric_type, params }) {
    const collection = mockCollections.get(collection_name);
    if (collection) {
      collection.index = { field_name, index_type, metric_type, params };
    }
    return { status: { error_code: 'Success', reason: '' } };
  }

  async describeIndex({ collection_name, field_name }) {
    const collection = mockCollections.get(collection_name);
    if (collection && collection.index) {
      return {
        index_descriptions: [{
          field_name: collection.index.field_name,
          index_name: `${collection_name}_${field_name}_idx`,
          params: [
            { key: 'index_type', value: collection.index.index_type },
            { key: 'metric_type', value: collection.index.metric_type },
          ],
        }],
      };
    }
    return { index_descriptions: [] };
  }

  async dropIndex({ collection_name, field_name: _field_name }) {
    const collection = mockCollections.get(collection_name);
    if (collection) {
      delete collection.index;
    }
    return { status: { error_code: 'Success', reason: '' } };
  }

  async loadCollection({ collection_name }) {
    const collection = mockCollections.get(collection_name);
    if (collection) {
      collection.loaded = true;
    }
    return { status: { error_code: 'Success', reason: '' } };
  }

  async releaseCollection({ collection_name }) {
    const collection = mockCollections.get(collection_name);
    if (collection) {
      collection.loaded = false;
    }
    return { status: { error_code: 'Success', reason: '' } };
  }

  async getLoadingProgress({ collection_name }) {
    const collection = mockCollections.get(collection_name);
    return { progress: collection?.loaded ? 100 : 0 };
  }

  async insert({ collection_name, data }) {
    const collectionData = mockData.get(collection_name) || [];
    collectionData.push(...data);
    mockData.set(collection_name, collectionData);
    return {
      status: { error_code: 'Success', reason: '' },
      succ_index: data.map((_, i) => i),
      insert_cnt: String(data.length),
    };
  }

  async upsert({ collection_name, data }) {
    const collectionData = mockData.get(collection_name) || [];
    for (const item of data) {
      const existingIndex = collectionData.findIndex(d => d.id === item.id);
      if (existingIndex >= 0) {
        collectionData[existingIndex] = item;
      } else {
        collectionData.push(item);
      }
    }
    mockData.set(collection_name, collectionData);
    return {
      status: { error_code: 'Success', reason: '' },
      succ_index: data.map((_, i) => i),
      upsert_cnt: String(data.length),
    };
  }

  async delete({ collection_name, filter }) {
    const collectionData = mockData.get(collection_name) || [];
    // Simple filter parsing for "id in [...]"
    const match = filter.match(/id in \[(.*)\]/);
    if (match) {
      const ids = match[1].split(',').map(id => id.trim().replace(/"/g, ''));
      const filtered = collectionData.filter(d => !ids.includes(String(d.id)));
      mockData.set(collection_name, filtered);
    }
    return { status: { error_code: 'Success', reason: '' } };
  }

  async search({ collection_name, vector: _vector, limit, filter: _filter, output_fields: _output_fields }) {
    const collectionData = mockData.get(collection_name) || [];
    // Simple cosine similarity mock
    const results = collectionData
      .map(item => ({
        ...item,
        score: Math.random() * 0.5 + 0.5, // Mock score between 0.5 and 1.0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit || 5);

    return { results };
  }

  async hybridSearch({ collection_name, search, rerank: _rerank, limit, filter, output_fields: _output_fields }) {
    // Simplified hybrid search - just use regular search
    return this.search({ collection_name, vector: search[0]?.data?.[0], limit, filter, output_fields: _output_fields });
  }

  async query({ collection_name, filter, output_fields: _output_fields, limit, offset }) {
    const collectionData = mockData.get(collection_name) || [];
    let results = [...collectionData];

    // Simple filter parsing
    if (filter && filter.includes('id in')) {
      const match = filter.match(/id in \[(.*)\]/);
      if (match) {
        const ids = match[1].split(',').map(id => id.trim().replace(/"/g, ''));
        results = results.filter(d => ids.includes(String(d.id)));
      }
    }

    if (offset) {
      results = results.slice(offset);
    }
    if (limit) {
      results = results.slice(0, limit);
    }

    return { data: results };
  }

  async flush({ collection_names: _collection_names }) {
    return { status: { error_code: 'Success', reason: '' } };
  }

  async compact({ collection_name: _collection_name }) {
    return { status: { error_code: 'Success', reason: '' } };
  }

  async createPartition({ collection_name, partition_name }) {
    const collection = mockCollections.get(collection_name);
    if (collection) {
      collection.partitions = collection.partitions || ['_default'];
      if (!collection.partitions.includes(partition_name)) {
        collection.partitions.push(partition_name);
      }
    }
    return { status: { error_code: 'Success', reason: '' } };
  }

  async dropPartition({ collection_name, partition_name }) {
    const collection = mockCollections.get(collection_name);
    if (collection && collection.partitions) {
      collection.partitions = collection.partitions.filter(p => p !== partition_name);
    }
    return { status: { error_code: 'Success', reason: '' } };
  }

  async listPartitions({ collection_name }) {
    const collection = mockCollections.get(collection_name);
    return { partition_names: collection?.partitions || ['_default'] };
  }

  closeConnection() {
    // Mock close connection
  }
}

// Helper to reset mock state between tests
const resetMockState = () => {
  mockCollections.clear();
  mockData.clear();
};

module.exports = {
  MilvusClient,
  DataType,
  resetMockState,
};
