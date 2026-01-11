/**
 * Tests for Background Assets
 */

import {
  saveBackgroundImageAsset,
  getBackgroundImageAssetBlob,
  deleteBackgroundImageAsset,
} from './background-assets';

// Mock db
jest.mock('@/lib/db/schema', () => ({
  db: {
    assets: {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn().mockReturnValue('test-id-123'),
}));

const mockDb = jest.requireMock('@/lib/db/schema').db;

describe('background-assets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveBackgroundImageAsset', () => {
    it('should save background image to db', async () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      const result = await saveBackgroundImageAsset(file);

      expect(result.assetId).toBe('bg-test-id-123');
      expect(mockDb.assets.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'bg-test-id-123',
          kind: 'background-image',
          blob: file,
          mimeType: 'image/jpeg',
          filename: 'test.jpg',
        })
      );
    });

    it('should use default mime type for files without type', async () => {
      const file = new File(['test'], 'test.bin');
      Object.defineProperty(file, 'type', { value: '' });

      await saveBackgroundImageAsset(file);

      expect(mockDb.assets.put).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: 'application/octet-stream',
        })
      );
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });

      await saveBackgroundImageAsset(file);

      const putCall = mockDb.assets.put.mock.calls[0][0];
      expect(putCall.createdAt).toBeInstanceOf(Date);
      expect(putCall.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getBackgroundImageAssetBlob', () => {
    it('should return blob for valid background image asset', async () => {
      const mockBlob = new Blob(['image data'], { type: 'image/jpeg' });
      mockDb.assets.get.mockResolvedValue({
        id: 'bg-123',
        kind: 'background-image',
        blob: mockBlob,
      });

      const result = await getBackgroundImageAssetBlob('bg-123');

      expect(result).toBe(mockBlob);
    });

    it('should return null for non-existent asset', async () => {
      mockDb.assets.get.mockResolvedValue(undefined);

      const result = await getBackgroundImageAssetBlob('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for non-background-image asset', async () => {
      mockDb.assets.get.mockResolvedValue({
        id: 'asset-123',
        kind: 'other-kind',
        blob: new Blob(['data']),
      });

      const result = await getBackgroundImageAssetBlob('asset-123');

      expect(result).toBeNull();
    });
  });

  describe('deleteBackgroundImageAsset', () => {
    it('should delete asset from db', async () => {
      await deleteBackgroundImageAsset('bg-123');

      expect(mockDb.assets.delete).toHaveBeenCalledWith('bg-123');
    });
  });
});
