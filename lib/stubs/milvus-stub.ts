/**
 * Browser stub for @zilliz/milvus2-sdk-node
 * This module only works in Node.js/Tauri runtime
 */

export const DataType = {
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

export class MilvusClient {
  constructor(_config: unknown) {
    console.warn('MilvusClient is not available in browser environment');
  }

  async hasCollection(_params: unknown) {
    return { value: false };
  }

  async createCollection(_params: unknown) {
    throw new Error('MilvusClient is not available in browser environment');
  }

  async dropCollection(_params: unknown) {
    throw new Error('MilvusClient is not available in browser environment');
  }

  async listCollections() {
    return { data: [] };
  }

  async describeCollection(_params: unknown) {
    throw new Error('MilvusClient is not available in browser environment');
  }

  async getCollectionStatistics(_params: unknown) {
    return { stats: [] };
  }

  async createIndex(_params: unknown) {
    throw new Error('MilvusClient is not available in browser environment');
  }

  async search(_params: unknown) {
    return { results: [] };
  }

  async insert(_params: unknown) {
    throw new Error('MilvusClient is not available in browser environment');
  }

  async delete(_params: unknown) {
    throw new Error('MilvusClient is not available in browser environment');
  }

  async query(_params: unknown) {
    return { data: [] };
  }

  closeConnection() {
    // No-op in browser
  }
}

const milvusStub = { MilvusClient, DataType };
export default milvusStub;
