/**
 * Tests for Video Worker helper functions
 * Note: Web Workers cannot be tested directly, so we test the utility functions
 */

import type { VideoMetadata } from './worker-types';

// Since video-worker.ts runs in a Worker context, we extract testable logic
// These tests verify the data structures and types

describe('Video Worker Types', () => {
  describe('VideoMetadata', () => {
    it('should have correct structure', () => {
      const metadata: VideoMetadata = {
        width: 1920,
        height: 1080,
        duration: 120.5,
        frameRate: 30,
        codec: 'h264',
        bitrate: 5000000,
        hasAudio: true,
        fileSize: 15000000,
        mimeType: 'video/mp4',
      };

      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.duration).toBe(120.5);
      expect(metadata.frameRate).toBe(30);
      expect(metadata.codec).toBe('h264');
      expect(metadata.bitrate).toBe(5000000);
      expect(metadata.hasAudio).toBe(true);
      expect(metadata.fileSize).toBe(15000000);
      expect(metadata.mimeType).toBe('video/mp4');
    });

    it('should allow optional audio metadata', () => {
      const metadata: VideoMetadata = {
        width: 1280,
        height: 720,
        duration: 60,
        frameRate: 24,
        codec: 'h264',
        bitrate: 2000000,
        hasAudio: false,
        fileSize: 5000000,
        mimeType: 'video/mp4',
      };

      expect(metadata.hasAudio).toBe(false);
    });
  });
});

describe('MP4 Metadata Parsing Logic', () => {
  describe('MIME type detection', () => {
    // Test the MIME type detection logic
    const detectMimeType = (buffer: ArrayBuffer): string => {
      const view = new Uint8Array(buffer);
      
      // Check for common video file signatures
      if (view.length >= 12) {
        // MP4/MOV: ftyp box
        if (view[4] === 0x66 && view[5] === 0x74 && view[6] === 0x79 && view[7] === 0x70) {
          const brand = String.fromCharCode(view[8], view[9], view[10], view[11]);
          if (brand.startsWith('qt')) return 'video/quicktime';
          if (brand === 'M4V ') return 'video/x-m4v';
          return 'video/mp4';
        }
        
        // WebM
        if (view[0] === 0x1a && view[1] === 0x45 && view[2] === 0xdf && view[3] === 0xa3) {
          return 'video/webm';
        }
        
        // AVI
        if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) {
          return 'video/x-msvideo';
        }
      }
      
      return 'video/mp4';
    };

    it('should detect MP4 format', () => {
      // MP4 ftyp box with 'isom' brand
      const mp4Buffer = new Uint8Array([
        0x00, 0x00, 0x00, 0x18, // box size
        0x66, 0x74, 0x79, 0x70, // 'ftyp'
        0x69, 0x73, 0x6f, 0x6d, // 'isom'
      ]).buffer;

      expect(detectMimeType(mp4Buffer)).toBe('video/mp4');
    });

    it('should detect QuickTime format', () => {
      // MOV ftyp box with 'qt  ' brand
      const movBuffer = new Uint8Array([
        0x00, 0x00, 0x00, 0x18,
        0x66, 0x74, 0x79, 0x70,
        0x71, 0x74, 0x20, 0x20, // 'qt  '
      ]).buffer;

      expect(detectMimeType(movBuffer)).toBe('video/quicktime');
    });

    it('should detect WebM format', () => {
      // WebM EBML header
      const webmBuffer = new Uint8Array([
        0x1a, 0x45, 0xdf, 0xa3,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]).buffer;

      expect(detectMimeType(webmBuffer)).toBe('video/webm');
    });

    it('should detect AVI format', () => {
      // AVI RIFF header
      const aviBuffer = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // 'RIFF'
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]).buffer;

      expect(detectMimeType(aviBuffer)).toBe('video/x-msvideo');
    });

    it('should default to video/mp4 for unknown format', () => {
      const unknownBuffer = new Uint8Array([
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]).buffer;

      expect(detectMimeType(unknownBuffer)).toBe('video/mp4');
    });
  });

  describe('Bitrate calculation', () => {
    it('should calculate bitrate from file size and duration', () => {
      const fileSize = 10_000_000; // 10 MB
      const duration = 60; // 60 seconds
      
      const bitrate = (fileSize * 8) / duration;
      
      expect(bitrate).toBeCloseTo(1_333_333, 0);
    });

    it('should handle zero duration gracefully', () => {
      const fileSize = 10_000_000;
      const duration = 0;
      
      const safeDuration = Math.max(duration, 1);
      const bitrate = (fileSize * 8) / safeDuration;
      
      expect(bitrate).toBe(80_000_000);
    });
  });
});

describe('Thumbnail Generation Logic', () => {
  describe('Aspect ratio calculation', () => {
    const calculateThumbnailDimensions = (
      sourceWidth: number,
      sourceHeight: number,
      targetWidth: number,
      targetHeight: number
    ): { width: number; height: number } => {
      const aspectRatio = sourceWidth / sourceHeight;
      let finalWidth = targetWidth;
      let finalHeight = targetHeight;

      if (targetWidth / targetHeight > aspectRatio) {
        finalWidth = Math.round(targetHeight * aspectRatio);
      } else {
        finalHeight = Math.round(targetWidth / aspectRatio);
      }

      return { width: finalWidth, height: finalHeight };
    };

    it('should maintain aspect ratio for 16:9 video', () => {
      const result = calculateThumbnailDimensions(1920, 1080, 160, 90);
      expect(result.width).toBe(160);
      expect(result.height).toBe(90);
    });

    it('should maintain aspect ratio for 4:3 video', () => {
      const result = calculateThumbnailDimensions(1440, 1080, 160, 90);
      expect(result.width).toBe(120);
      expect(result.height).toBe(90);
    });

    it('should maintain aspect ratio for wide video', () => {
      const result = calculateThumbnailDimensions(2560, 1080, 160, 90);
      expect(result.width).toBe(160);
      expect(result.height).toBe(68);
    });

    it('should maintain aspect ratio for vertical video', () => {
      const result = calculateThumbnailDimensions(1080, 1920, 160, 90);
      expect(result.width).toBe(51);
      expect(result.height).toBe(90);
    });
  });
});

describe('Video Quality Analysis Logic', () => {
  describe('Brightness calculation', () => {
    it('should calculate luminance correctly', () => {
      // Test RGB to luminance conversion (BT.601)
      const calculateLuminance = (r: number, g: number, b: number): number => {
        return 0.299 * r + 0.587 * g + 0.114 * b;
      };

      // White pixel
      expect(calculateLuminance(255, 255, 255)).toBeCloseTo(255, 0);
      
      // Black pixel
      expect(calculateLuminance(0, 0, 0)).toBe(0);
      
      // Pure red
      expect(calculateLuminance(255, 0, 0)).toBeCloseTo(76.245, 1);
      
      // Pure green
      expect(calculateLuminance(0, 255, 0)).toBeCloseTo(149.685, 1);
      
      // Pure blue
      expect(calculateLuminance(0, 0, 255)).toBeCloseTo(29.07, 1);
    });
  });

  describe('Normalized brightness', () => {
    it('should normalize brightness to 0-1 range', () => {
      const normalizeBrightness = (totalLuminance: number, pixelCount: number): number => {
        return totalLuminance / pixelCount / 255;
      };

      // All white image (10x10 = 100 pixels)
      expect(normalizeBrightness(255 * 100, 100)).toBe(1);
      
      // All black image
      expect(normalizeBrightness(0, 100)).toBe(0);
      
      // 50% gray
      expect(normalizeBrightness(127.5 * 100, 100)).toBeCloseTo(0.5, 1);
    });
  });
});
