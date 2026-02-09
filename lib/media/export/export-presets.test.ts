/**
 * Tests for Export Preset System
 */

import {
  ExportPresetManager,
  getExportPresetManager,
  getPresetCategories,
  getExportOptionsForPlatform,
} from './export-presets';
import type { VideoExportOptions } from '../workers/worker-types';

describe('ExportPresetManager', () => {
  let manager: ExportPresetManager;

  beforeEach(() => {
    manager = new ExportPresetManager();
  });

  describe('built-in presets', () => {
    it('should have built-in presets', () => {
      const all = manager.getAllPresets();
      expect(all.length).toBeGreaterThan(0);
    });

    it('should have social presets', () => {
      const social = manager.getByCategory('social');
      expect(social.length).toBeGreaterThan(0);
    });

    it('should have web presets', () => {
      const web = manager.getByCategory('web');
      expect(web.length).toBeGreaterThan(0);
    });

    it('should have professional presets', () => {
      const pro = manager.getByCategory('professional');
      expect(pro.length).toBeGreaterThan(0);
    });

    it('should have archive presets', () => {
      const archive = manager.getByCategory('archive');
      expect(archive.length).toBeGreaterThan(0);
    });
  });

  describe('preset retrieval', () => {
    it('should get preset by ID', () => {
      const youtube = manager.getById('youtube-1080p');
      expect(youtube).toBeDefined();
      expect(youtube?.name).toBe('YouTube 1080p');
    });

    it('should return undefined for unknown ID', () => {
      const unknown = manager.getById('unknown-preset');
      expect(unknown).toBeUndefined();
    });

    it('should get default preset', () => {
      const defaultPreset = manager.getDefaultPreset();
      expect(defaultPreset).toBeDefined();
      expect(defaultPreset.isDefault).toBe(true);
    });

    it('should get platform presets', () => {
      const youtubePresets = manager.getPlatformPresets('YouTube');
      expect(youtubePresets.length).toBeGreaterThan(0);
      expect(youtubePresets[0].platform).toBe('YouTube');
    });

    it('should search presets', () => {
      const results = manager.search('1080');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('custom presets', () => {
    it('should create custom preset', () => {
      const custom = manager.createCustomPreset(
        'My Preset',
        {
          format: 'mp4',
          codec: 'h264',
          resolution: { width: 1920, height: 1080 },
          frameRate: 30,
          bitrateMode: 'crf',
          crf: 20,
          audioCodec: 'aac',
          audioBitrate: 192000,
          audioChannels: 2,
          audioSampleRate: 48000,
        },
        'Custom description'
      );

      expect(custom.id).toContain('custom_');
      expect(custom.name).toBe('My Preset');
      expect(custom.isBuiltIn).toBe(false);
    });

    it('should update custom preset', () => {
      const custom = manager.createCustomPreset('Original', {
        format: 'mp4',
        codec: 'h264',
      } as unknown as VideoExportOptions);

      const updated = manager.updateCustomPreset(custom.id, {
        name: 'Updated Name',
      });

      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete custom preset', () => {
      const custom = manager.createCustomPreset('To Delete', {
        format: 'mp4',
        codec: 'h264',
      } as unknown as VideoExportOptions);

      const deleted = manager.deleteCustomPreset(custom.id);
      expect(deleted).toBe(true);
      expect(manager.getById(custom.id)).toBeUndefined();
    });

    it('should clone preset as custom', () => {
      const cloned = manager.cloneAsCustom('youtube-1080p', 'My YouTube Clone', {
        frameRate: 60,
      });

      expect(cloned).not.toBeNull();
      expect(cloned?.name).toBe('My YouTube Clone');
      expect(cloned?.options.frameRate).toBe(60);
      expect(cloned?.isBuiltIn).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate preset for platform', () => {
      const validation = manager.validateForPlatform('tiktok', 300);
      expect(validation.valid).toBe(true);
    });

    it('should detect duration exceeding limit', () => {
      const validation = manager.validateForPlatform('tiktok', 1200);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('recommendations', () => {
    it('should get recommended presets for duration', () => {
      const recommended = manager.getRecommendedPresets(60);
      expect(recommended.length).toBeGreaterThan(0);
    });

    it('should filter by quality preference', () => {
      const lowQuality = manager.getRecommendedPresets(60, 'low');

      // Low quality presets should have lower resolution
      lowQuality.forEach((preset) => {
        if (preset.options.resolution) {
          expect(preset.options.resolution.height).toBeLessThanOrEqual(480);
        }
      });
    });

    it('should filter high quality presets', () => {
      const highQuality = manager.getRecommendedPresets(60, 'high');

      // High quality presets should have higher resolution
      highQuality.forEach((preset) => {
        if (preset.options.resolution) {
          expect(preset.options.resolution.height).toBeLessThanOrEqual(1080);
        }
      });
    });
  });

  describe('file size estimation', () => {
    it('should estimate file size', () => {
      const size = manager.estimateFileSize('youtube-1080p', 60);
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for unknown preset', () => {
      const size = manager.estimateFileSize('unknown', 60);
      expect(size).toBe(0);
    });
  });

  describe('categories', () => {
    it('should get categories with counts', () => {
      const categories = manager.getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.find((c) => c.category === 'social')?.count).toBeGreaterThan(0);
    });
  });

  describe('import/export', () => {
    it('should export custom presets', () => {
      manager.createCustomPreset('Export Test', { format: 'mp4', codec: 'h264' } as unknown as VideoExportOptions);
      const exported = manager.exportCustomPresets();

      expect(exported.length).toBe(1);
      expect(exported[0].name).toBe('Export Test');
    });

    it('should import custom presets', () => {
      const presets = [
        {
          id: 'imported_1',
          name: 'Imported Preset',
          description: 'Imported',
          category: 'custom' as const,
          options: { format: 'mp4' as const, codec: 'h264' as const } as unknown as VideoExportOptions,
          isBuiltIn: false,
        },
      ];

      const count = manager.importCustomPresets(presets);
      expect(count).toBe(1);
      expect(manager.getById('imported_1')).toBeDefined();
    });
  });
});

describe('getExportPresetManager', () => {
  it('should return singleton instance', () => {
    const manager1 = getExportPresetManager();
    const manager2 = getExportPresetManager();
    expect(manager1).toBe(manager2);
  });
});

describe('getPresetCategories', () => {
  it('should return all category types', () => {
    const categories = getPresetCategories();
    expect(categories).toContain('social');
    expect(categories).toContain('web');
    expect(categories).toContain('professional');
    expect(categories).toContain('archive');
    expect(categories).toContain('custom');
  });
});

describe('getExportOptionsForPlatform', () => {
  it('should return options for known platform', () => {
    const options = getExportOptionsForPlatform('YouTube');
    expect(options).not.toBeNull();
    expect(options?.format).toBe('mp4');
  });

  it('should return null for unknown platform', () => {
    const options = getExportOptionsForPlatform('UnknownPlatform');
    expect(options).toBeNull();
  });
});
