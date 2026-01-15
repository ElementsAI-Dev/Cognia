/**
 * Tests for milvus-stub.ts
 * Browser stub for @zilliz/milvus2-sdk-node
 */

import { MilvusClient, DataType } from './milvus-stub';

describe('milvus-stub', () => {
  describe('DataType', () => {
    it('should export all data type constants', () => {
      expect(DataType.None).toBe(0);
      expect(DataType.Bool).toBe(1);
      expect(DataType.Int8).toBe(2);
      expect(DataType.Int16).toBe(3);
      expect(DataType.Int32).toBe(4);
      expect(DataType.Int64).toBe(5);
      expect(DataType.Float).toBe(10);
      expect(DataType.Double).toBe(11);
      expect(DataType.VarChar).toBe(21);
      expect(DataType.Array).toBe(22);
      expect(DataType.JSON).toBe(23);
      expect(DataType.BinaryVector).toBe(100);
      expect(DataType.FloatVector).toBe(101);
      expect(DataType.Float16Vector).toBe(102);
      expect(DataType.BFloat16Vector).toBe(103);
      expect(DataType.SparseFloatVector).toBe(104);
      expect(DataType.Int8Vector).toBe(105);
    });
  });

  describe('MilvusClient', () => {
    let client: MilvusClient;

    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation();
      client = new MilvusClient({});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log warning on construction', () => {
      expect(console.warn).toHaveBeenCalledWith(
        'MilvusClient is not available in browser environment'
      );
    });

    describe('hasCollection', () => {
      it('should return false', async () => {
        const result = await client.hasCollection({ collection_name: 'test' });
        expect(result).toEqual({ value: false });
      });
    });

    describe('createCollection', () => {
      it('should throw browser environment error', async () => {
        await expect(client.createCollection({})).rejects.toThrow(
          'MilvusClient is not available in browser environment'
        );
      });
    });

    describe('dropCollection', () => {
      it('should throw browser environment error', async () => {
        await expect(client.dropCollection({})).rejects.toThrow(
          'MilvusClient is not available in browser environment'
        );
      });
    });

    describe('listCollections', () => {
      it('should return empty data array', async () => {
        const result = await client.listCollections();
        expect(result).toEqual({ data: [] });
      });
    });

    describe('describeCollection', () => {
      it('should throw browser environment error', async () => {
        await expect(client.describeCollection({})).rejects.toThrow(
          'MilvusClient is not available in browser environment'
        );
      });
    });

    describe('getCollectionStatistics', () => {
      it('should return empty stats array', async () => {
        const result = await client.getCollectionStatistics({});
        expect(result).toEqual({ stats: [] });
      });
    });

    describe('createIndex', () => {
      it('should throw browser environment error', async () => {
        await expect(client.createIndex({})).rejects.toThrow(
          'MilvusClient is not available in browser environment'
        );
      });
    });

    describe('search', () => {
      it('should return empty results array', async () => {
        const result = await client.search({});
        expect(result).toEqual({ results: [] });
      });
    });

    describe('insert', () => {
      it('should throw browser environment error', async () => {
        await expect(client.insert({})).rejects.toThrow(
          'MilvusClient is not available in browser environment'
        );
      });
    });

    describe('delete', () => {
      it('should throw browser environment error', async () => {
        await expect(client.delete({})).rejects.toThrow(
          'MilvusClient is not available in browser environment'
        );
      });
    });

    describe('query', () => {
      it('should return empty data array', async () => {
        const result = await client.query({});
        expect(result).toEqual({ data: [] });
      });
    });

    describe('closeConnection', () => {
      it('should be a no-op', () => {
        expect(() => client.closeConnection()).not.toThrow();
      });
    });
  });
});
