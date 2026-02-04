/**
 * Tests for Image Export functionality
 */

import {
  getImageExportFormats,
  getSafeCanvasScale,
  estimateImageSize,
} from './image-export';

describe('Image Export', () => {
  describe('getImageExportFormats', () => {
    it('should return all available image formats', () => {
      const formats = getImageExportFormats();
      
      expect(formats).toHaveLength(3);
      expect(formats.map(f => f.value)).toEqual(['png', 'jpg', 'webp']);
    });

    it('should have labels and descriptions for each format', () => {
      const formats = getImageExportFormats();
      
      formats.forEach(format => {
        expect(format.label).toBeTruthy();
        expect(format.description).toBeTruthy();
      });
    });

    it('should have PNG as first option', () => {
      const formats = getImageExportFormats();
      
      expect(formats[0].value).toBe('png');
      expect(formats[0].label).toBe('PNG');
    });
  });

  describe('estimateImageSize', () => {
    it('should estimate size for PNG format', () => {
      const size = estimateImageSize(10, { format: 'png', scale: 1 });
      
      expect(size).toMatch(/\d+(\.\d+)?\s*(B|KB|MB)/);
    });

    it('should estimate smaller size for JPG format', () => {
      const pngSize = estimateImageSize(10, { format: 'png', scale: 1 });
      const jpgSize = estimateImageSize(10, { format: 'jpg', scale: 1 });
      
      // JPG should be smaller than PNG
      const pngBytes = parseSize(pngSize);
      const jpgBytes = parseSize(jpgSize);
      
      expect(jpgBytes).toBeLessThan(pngBytes);
    });

    it('should estimate smaller size for WebP format', () => {
      const pngSize = estimateImageSize(10, { format: 'png', scale: 1 });
      const webpSize = estimateImageSize(10, { format: 'webp', scale: 1 });
      
      const pngBytes = parseSize(pngSize);
      const webpBytes = parseSize(webpSize);
      
      expect(webpBytes).toBeLessThan(pngBytes);
    });

    it('should increase size with higher scale', () => {
      const size1x = estimateImageSize(10, { scale: 1 });
      const size2x = estimateImageSize(10, { scale: 2 });
      
      const bytes1x = parseSize(size1x);
      const bytes2x = parseSize(size2x);
      
      expect(bytes2x).toBeGreaterThan(bytes1x);
    });

    it('should increase size with more messages', () => {
      const size5 = estimateImageSize(5, { scale: 1 });
      const size20 = estimateImageSize(20, { scale: 1 });
      
      const bytes5 = parseSize(size5);
      const bytes20 = parseSize(size20);
      
      expect(bytes20).toBeGreaterThan(bytes5);
    });

    it('should format output correctly', () => {
      // Small size should be in B or KB
      const smallSize = estimateImageSize(1, { scale: 1, format: 'webp' });
      expect(smallSize).toMatch(/^\d+(\.\d+)?\s*(B|KB)$/);
      
      // Large size should be in KB or MB
      const largeSize = estimateImageSize(100, { scale: 3, format: 'png' });
      expect(largeSize).toMatch(/^\d+(\.\d+)?\s*(KB|MB)$/);
    });
  });

  describe('getSafeCanvasScale', () => {
    it('should constrain scale to fit canvas limits', () => {
      const result = getSafeCanvasScale(12000, 12000, 2);
      expect(result.scale).toBeLessThan(2);
      expect(result.constrained).toBe(true);
    });

    it('should keep scale when within limits', () => {
      const result = getSafeCanvasScale(800, 600, 2);
      expect(result.scale).toBe(2);
      expect(result.constrained).toBe(false);
    });
  });
});

// Helper function to parse size string to bytes
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB)$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'B': return value;
    case 'KB': return value * 1024;
    case 'MB': return value * 1024 * 1024;
    default: return 0;
  }
}
