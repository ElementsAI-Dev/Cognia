/**
 * Data Import Tests
 */

import {
  validateExportData,
  generateChecksum,
  verifyChecksum,
  type ExportData,
} from './data-import';

describe('Data Import Utilities', () => {
  describe('validateExportData', () => {
    it('should validate a valid export data structure', () => {
      const validData: ExportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        sessions: [],
        settings: {},
        artifacts: {},
      };

      const result = validateExportData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null data', () => {
      const result = validateExportData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid data format: expected object');
    });

    it('should reject non-object data', () => {
      const result = validateExportData('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid data format: expected object');
    });

    it('should reject data without version', () => {
      const result = validateExportData({
        exportedAt: new Date().toISOString(),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid version field');
    });

    it('should reject data without exportedAt', () => {
      const result = validateExportData({
        version: '1.0',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid exportedAt field');
    });

    it('should reject invalid sessions type', () => {
      const result = validateExportData({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        sessions: 'not-an-array',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sessions must be an array');
    });

    it('should reject invalid artifacts type', () => {
      const result = validateExportData({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        artifacts: 'not-an-object',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('artifacts must be an object');
    });
  });

  describe('generateChecksum', () => {
    it('should generate a consistent checksum for the same data', () => {
      const data = JSON.stringify({ test: 'data' });
      const checksum1 = generateChecksum(data);
      const checksum2 = generateChecksum(data);
      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksums for different data', () => {
      const data1 = JSON.stringify({ test: 'data1' });
      const data2 = JSON.stringify({ test: 'data2' });
      const checksum1 = generateChecksum(data1);
      const checksum2 = generateChecksum(data2);
      expect(checksum1).not.toBe(checksum2);
    });

    it('should return an 8-character hex string', () => {
      const checksum = generateChecksum('test data');
      expect(checksum).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('verifyChecksum', () => {
    it('should verify a valid checksum', () => {
      const data = JSON.stringify({ test: 'data' });
      const checksum = generateChecksum(data);
      expect(verifyChecksum(data, checksum)).toBe(true);
    });

    it('should reject an invalid checksum', () => {
      const data = JSON.stringify({ test: 'data' });
      expect(verifyChecksum(data, '00000000')).toBe(false);
    });

    it('should reject modified data', () => {
      const originalData = JSON.stringify({ test: 'data' });
      const checksum = generateChecksum(originalData);
      const modifiedData = JSON.stringify({ test: 'modified' });
      expect(verifyChecksum(modifiedData, checksum)).toBe(false);
    });
  });
});
