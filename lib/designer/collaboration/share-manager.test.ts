/**
 * Share Manager Tests
 */

import {
  createShareableDesign,
  updateShareableDesign,
  deleteShareableDesign,
  getShareableDesign,
  createShareLink,
  getShareLinkByToken,
  accessSharedDesign,
  revokeShareLink,
  generateShareUrl,
  parseShareToken,
  getUserSharedDesigns,
  getPublicDesigns,
} from './share-manager';

describe('Share Manager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('createShareableDesign', () => {
    it('should create a shareable design', () => {
      const design = createShareableDesign('const App = () => <div>Test</div>', 'user-1', {
        title: 'Test Design',
        description: 'A test design',
      });

      expect(design.id).toBeDefined();
      expect(design.ownerId).toBe('user-1');
      expect(design.title).toBe('Test Design');
      expect(design.description).toBe('A test design');
      expect(design.code).toBe('const App = () => <div>Test</div>');
      expect(design.isPublic).toBe(false);
    });

    it('should create a public design', () => {
      const design = createShareableDesign('code', 'user-1', {
        isPublic: true,
      });

      expect(design.isPublic).toBe(true);
    });

    it('should set expiration time', () => {
      const design = createShareableDesign('code', 'user-1', {
        expiresIn: 3600000, // 1 hour
      });

      expect(design.expiresAt).toBeDefined();
      expect(design.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('updateShareableDesign', () => {
    it('should update a design', () => {
      const design = createShareableDesign('code', 'user-1', { title: 'Original' });
      
      const updated = updateShareableDesign(design.id, {
        title: 'Updated Title',
        code: 'new code',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.code).toBe('new code');
    });

    it('should return null for non-existent design', () => {
      const result = updateShareableDesign('non-existent', { title: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteShareableDesign', () => {
    it('should delete a design', () => {
      const design = createShareableDesign('code', 'user-1');
      
      const deleted = deleteShareableDesign(design.id);
      expect(deleted).toBe(true);

      const retrieved = getShareableDesign(design.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent design', () => {
      const result = deleteShareableDesign('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Share Links', () => {
    it('should create a share link', () => {
      const design = createShareableDesign('code', 'user-1');
      const link = createShareLink(design.id, 'view');

      expect(link).not.toBeNull();
      expect(link!.designId).toBe(design.id);
      expect(link!.permission).toBe('view');
      expect(link!.token).toBeDefined();
      expect(link!.isActive).toBe(true);
    });

    it('should access design via token', () => {
      const design = createShareableDesign('test code', 'user-1');
      const link = createShareLink(design.id, 'edit');

      const result = accessSharedDesign(link!.token);

      expect(result.success).toBe(true);
      expect(result.design).toBeDefined();
      expect(result.design!.code).toBe('test code');
      expect(result.permission).toBe('edit');
    });

    it('should fail for invalid token', () => {
      const result = accessSharedDesign('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired link');
    });

    it('should revoke a share link', () => {
      const design = createShareableDesign('code', 'user-1');
      const link = createShareLink(design.id);

      const revoked = revokeShareLink(link!.id);
      expect(revoked).toBe(true);

      const result = accessSharedDesign(link!.token);
      expect(result.success).toBe(false);
    });

    it('should track access count', () => {
      const design = createShareableDesign('code', 'user-1');
      const link = createShareLink(design.id);

      accessSharedDesign(link!.token);
      accessSharedDesign(link!.token);

      const updatedLink = getShareLinkByToken(link!.token);
      expect(updatedLink!.accessCount).toBe(2);
    });
  });

  describe('URL utilities', () => {
    it('should generate share URL', () => {
      const url = generateShareUrl('test-token', 'https://example.com');
      expect(url).toBe('https://example.com/designer/shared?token=test-token');
    });

    it('should parse share token from URL', () => {
      const token = parseShareToken('https://example.com/designer/shared?token=abc123');
      expect(token).toBe('abc123');
    });

    it('should return null for invalid URL', () => {
      const token = parseShareToken('not-a-url');
      expect(token).toBeNull();
    });
  });

  describe('Query functions', () => {
    it('should get user shared designs', () => {
      createShareableDesign('code1', 'user-1');
      createShareableDesign('code2', 'user-1');
      createShareableDesign('code3', 'user-2');

      const userDesigns = getUserSharedDesigns('user-1');
      expect(userDesigns).toHaveLength(2);
    });

    it('should get public designs', () => {
      createShareableDesign('code1', 'user-1', { isPublic: true });
      createShareableDesign('code2', 'user-1', { isPublic: false });
      createShareableDesign('code3', 'user-2', { isPublic: true });

      const publicDesigns = getPublicDesigns();
      expect(publicDesigns).toHaveLength(2);
    });
  });
});
