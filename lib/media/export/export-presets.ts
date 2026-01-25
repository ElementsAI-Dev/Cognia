/**
 * Export Preset System
 *
 * Provides pre-configured export settings for various platforms and use cases:
 * - Social media (YouTube, TikTok, Instagram, Twitter)
 * - Web optimization
 * - Professional quality
 * - Custom presets
 */

import { nanoid } from 'nanoid';
import type { VideoExportOptions } from '../workers/worker-types';

/**
 * Preset category
 */
export type PresetCategory = 'social' | 'web' | 'professional' | 'archive' | 'custom';

/**
 * Preset quality level
 */
export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Export preset definition
 */
export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  icon?: string;
  options: VideoExportOptions;
  estimatedFileSizePerMinute?: number; // in MB
  isBuiltIn: boolean;
  isDefault?: boolean;
}

/**
 * Platform-specific presets
 */
export interface PlatformPreset extends ExportPreset {
  platform: string;
  maxDuration?: number; // in seconds
  maxFileSize?: number; // in MB
  aspectRatios?: { width: number; height: number }[];
}

/**
 * Social media presets
 */
const SOCIAL_PRESETS: PlatformPreset[] = [
  {
    id: 'youtube-1080p',
    name: 'YouTube 1080p',
    description: 'Optimized for YouTube with 1080p resolution',
    category: 'social',
    platform: 'YouTube',
    icon: 'youtube',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 18,
      bitrate: 12_000_000,
      audioCodec: 'aac',
      audioBitrate: 192_000,
      audioChannels: 2,
      audioSampleRate: 48000,
    },
    estimatedFileSizePerMinute: 90,
    isBuiltIn: true,
    isDefault: true,
    maxDuration: 43200, // 12 hours
    aspectRatios: [
      { width: 16, height: 9 },
      { width: 9, height: 16 },
      { width: 1, height: 1 },
    ],
  },
  {
    id: 'youtube-4k',
    name: 'YouTube 4K',
    description: 'Ultra HD quality for YouTube',
    category: 'social',
    platform: 'YouTube',
    icon: 'youtube',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 3840, height: 2160 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 15,
      bitrate: 40_000_000,
      audioCodec: 'aac',
      audioBitrate: 320_000,
      audioChannels: 2,
      audioSampleRate: 48000,
    },
    estimatedFileSizePerMinute: 300,
    isBuiltIn: true,
    maxDuration: 43200,
    aspectRatios: [{ width: 16, height: 9 }],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Vertical video optimized for TikTok',
    category: 'social',
    platform: 'TikTok',
    icon: 'tiktok',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1080, height: 1920 },
      frameRate: 30,
      bitrateMode: 'vbr',
      bitrate: 8_000_000,
      audioCodec: 'aac',
      audioBitrate: 128_000,
      audioChannels: 2,
      audioSampleRate: 44100,
    },
    estimatedFileSizePerMinute: 60,
    isBuiltIn: true,
    maxDuration: 600, // 10 minutes
    maxFileSize: 287, // MB
    aspectRatios: [{ width: 9, height: 16 }],
  },
  {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    description: 'Optimized for Instagram Reels',
    category: 'social',
    platform: 'Instagram',
    icon: 'instagram',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1080, height: 1920 },
      frameRate: 30,
      bitrateMode: 'vbr',
      bitrate: 6_000_000,
      audioCodec: 'aac',
      audioBitrate: 128_000,
      audioChannels: 2,
      audioSampleRate: 44100,
    },
    estimatedFileSizePerMinute: 45,
    isBuiltIn: true,
    maxDuration: 90,
    aspectRatios: [{ width: 9, height: 16 }],
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    description: 'Optimized for Instagram Stories',
    category: 'social',
    platform: 'Instagram',
    icon: 'instagram',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1080, height: 1920 },
      frameRate: 30,
      bitrateMode: 'vbr',
      bitrate: 5_000_000,
      audioCodec: 'aac',
      audioBitrate: 128_000,
      audioChannels: 2,
      audioSampleRate: 44100,
    },
    estimatedFileSizePerMinute: 38,
    isBuiltIn: true,
    maxDuration: 60,
    aspectRatios: [{ width: 9, height: 16 }],
  },
  {
    id: 'instagram-feed',
    name: 'Instagram Feed',
    description: 'Square video for Instagram feed',
    category: 'social',
    platform: 'Instagram',
    icon: 'instagram',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1080, height: 1080 },
      frameRate: 30,
      bitrateMode: 'vbr',
      bitrate: 5_000_000,
      audioCodec: 'aac',
      audioBitrate: 128_000,
      audioChannels: 2,
      audioSampleRate: 44100,
    },
    estimatedFileSizePerMinute: 38,
    isBuiltIn: true,
    maxDuration: 60,
    aspectRatios: [{ width: 1, height: 1 }],
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    description: 'Optimized for Twitter/X video',
    category: 'social',
    platform: 'Twitter',
    icon: 'twitter',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1280, height: 720 },
      frameRate: 30,
      bitrateMode: 'vbr',
      bitrate: 5_000_000,
      audioCodec: 'aac',
      audioBitrate: 128_000,
      audioChannels: 2,
      audioSampleRate: 44100,
    },
    estimatedFileSizePerMinute: 38,
    isBuiltIn: true,
    maxDuration: 140,
    maxFileSize: 512, // MB
    aspectRatios: [
      { width: 16, height: 9 },
      { width: 1, height: 1 },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Professional video for LinkedIn',
    category: 'social',
    platform: 'LinkedIn',
    icon: 'linkedin',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrateMode: 'vbr',
      bitrate: 8_000_000,
      audioCodec: 'aac',
      audioBitrate: 192_000,
      audioChannels: 2,
      audioSampleRate: 48000,
    },
    estimatedFileSizePerMinute: 60,
    isBuiltIn: true,
    maxDuration: 600,
    maxFileSize: 5120, // 5GB
    aspectRatios: [{ width: 16, height: 9 }],
  },
];

/**
 * Web optimization presets
 */
const WEB_PRESETS: ExportPreset[] = [
  {
    id: 'web-720p',
    name: 'Web 720p',
    description: 'Fast loading web video at 720p',
    category: 'web',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1280, height: 720 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 23,
      bitrate: 4_000_000,
      audioCodec: 'aac',
      audioBitrate: 128_000,
      audioChannels: 2,
      audioSampleRate: 44100,
    },
    estimatedFileSizePerMinute: 30,
    isBuiltIn: true,
  },
  {
    id: 'web-1080p',
    name: 'Web 1080p',
    description: 'High quality web video',
    category: 'web',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 20,
      bitrate: 8_000_000,
      audioCodec: 'aac',
      audioBitrate: 192_000,
      audioChannels: 2,
      audioSampleRate: 48000,
    },
    estimatedFileSizePerMinute: 60,
    isBuiltIn: true,
  },
  {
    id: 'web-webm-vp9',
    name: 'WebM VP9',
    description: 'Modern browser-optimized format',
    category: 'web',
    options: {
      format: 'webm',
      codec: 'vp9',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 31,
      bitrate: 6_000_000,
      audioCodec: 'opus',
      audioBitrate: 128_000,
      audioChannels: 2,
      audioSampleRate: 48000,
    },
    estimatedFileSizePerMinute: 45,
    isBuiltIn: true,
  },
  {
    id: 'web-gif-preview',
    name: 'GIF Preview',
    description: 'Low-res GIF for previews',
    category: 'web',
    options: {
      format: 'gif',
      codec: 'h264',
      resolution: { width: 480, height: 270 },
      frameRate: 15,
      bitrateMode: 'vbr',
      bitrate: 1_000_000,
      audioCodec: 'aac',
      audioBitrate: 0,
      audioChannels: 0,
      audioSampleRate: 0,
    },
    estimatedFileSizePerMinute: 20,
    isBuiltIn: true,
  },
];

/**
 * Professional presets
 */
const PROFESSIONAL_PRESETS: ExportPreset[] = [
  {
    id: 'pro-1080p-high',
    name: 'Professional 1080p',
    description: 'High quality 1080p for professional use',
    category: 'professional',
    options: {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 15,
      bitrate: 20_000_000,
      audioCodec: 'aac',
      audioBitrate: 320_000,
      audioChannels: 2,
      audioSampleRate: 48000,
      twoPass: true,
    },
    estimatedFileSizePerMinute: 150,
    isBuiltIn: true,
  },
  {
    id: 'pro-4k',
    name: 'Professional 4K',
    description: 'Ultra HD professional quality',
    category: 'professional',
    options: {
      format: 'mp4',
      codec: 'h265',
      resolution: { width: 3840, height: 2160 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 18,
      bitrate: 50_000_000,
      audioCodec: 'aac',
      audioBitrate: 320_000,
      audioChannels: 2,
      audioSampleRate: 48000,
      twoPass: true,
    },
    estimatedFileSizePerMinute: 375,
    isBuiltIn: true,
  },
  {
    id: 'pro-prores-422',
    name: 'ProRes 422',
    description: 'Apple ProRes for editing',
    category: 'professional',
    options: {
      format: 'mov',
      codec: 'prores',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrateMode: 'cbr',
      bitrate: 147_000_000,
      audioCodec: 'pcm',
      audioBitrate: 1_536_000,
      audioChannels: 2,
      audioSampleRate: 48000,
    },
    estimatedFileSizePerMinute: 1100,
    isBuiltIn: true,
  },
];

/**
 * Archive presets
 */
const ARCHIVE_PRESETS: ExportPreset[] = [
  {
    id: 'archive-lossless',
    name: 'Lossless Archive',
    description: 'Maximum quality for archival',
    category: 'archive',
    options: {
      format: 'mkv',
      codec: 'h265',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 0,
      bitrate: 100_000_000,
      audioCodec: 'flac',
      audioBitrate: 1_411_000,
      audioChannels: 2,
      audioSampleRate: 48000,
    },
    estimatedFileSizePerMinute: 750,
    isBuiltIn: true,
  },
  {
    id: 'archive-av1',
    name: 'AV1 Archive',
    description: 'Modern codec with excellent compression',
    category: 'archive',
    options: {
      format: 'mkv',
      codec: 'av1',
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrateMode: 'crf',
      crf: 23,
      bitrate: 8_000_000,
      audioCodec: 'opus',
      audioBitrate: 192_000,
      audioChannels: 2,
      audioSampleRate: 48000,
    },
    estimatedFileSizePerMinute: 60,
    isBuiltIn: true,
  },
];

/**
 * All built-in presets
 */
const ALL_PRESETS: ExportPreset[] = [
  ...SOCIAL_PRESETS,
  ...WEB_PRESETS,
  ...PROFESSIONAL_PRESETS,
  ...ARCHIVE_PRESETS,
];

/**
 * Export Preset Manager
 */
export class ExportPresetManager {
  private presets: Map<string, ExportPreset> = new Map();
  private customPresets: Map<string, ExportPreset> = new Map();

  constructor() {
    // Load built-in presets
    ALL_PRESETS.forEach((preset) => {
      this.presets.set(preset.id, preset);
    });
  }

  /**
   * Get all presets
   */
  public getAllPresets(): ExportPreset[] {
    return [
      ...Array.from(this.presets.values()),
      ...Array.from(this.customPresets.values()),
    ];
  }

  /**
   * Get presets by category
   */
  public getByCategory(category: PresetCategory): ExportPreset[] {
    return this.getAllPresets().filter((p) => p.category === category);
  }

  /**
   * Get preset by ID
   */
  public getById(id: string): ExportPreset | undefined {
    return this.presets.get(id) || this.customPresets.get(id);
  }

  /**
   * Get default preset
   */
  public getDefaultPreset(): ExportPreset {
    const defaultPreset = this.getAllPresets().find((p) => p.isDefault);
    return defaultPreset || ALL_PRESETS[0];
  }

  /**
   * Get platform presets
   */
  public getPlatformPresets(platform: string): PlatformPreset[] {
    return SOCIAL_PRESETS.filter(
      (p) => p.platform.toLowerCase() === platform.toLowerCase()
    );
  }

  /**
   * Create custom preset
   */
  public createCustomPreset(
    name: string,
    options: VideoExportOptions,
    description?: string
  ): ExportPreset {
    const preset: ExportPreset = {
      id: `custom_${nanoid()}`,
      name,
      description: description || 'Custom export preset',
      category: 'custom',
      options,
      isBuiltIn: false,
    };

    this.customPresets.set(preset.id, preset);
    return preset;
  }

  /**
   * Update custom preset
   */
  public updateCustomPreset(
    id: string,
    updates: Partial<Omit<ExportPreset, 'id' | 'isBuiltIn'>>
  ): ExportPreset | null {
    const preset = this.customPresets.get(id);
    if (!preset) return null;

    const updated = { ...preset, ...updates };
    this.customPresets.set(id, updated);
    return updated;
  }

  /**
   * Delete custom preset
   */
  public deleteCustomPreset(id: string): boolean {
    return this.customPresets.delete(id);
  }

  /**
   * Clone preset as custom
   */
  public cloneAsCustom(
    presetId: string,
    newName: string,
    modifications?: Partial<VideoExportOptions>
  ): ExportPreset | null {
    const original = this.getById(presetId);
    if (!original) return null;

    const newOptions = { ...original.options, ...modifications };
    return this.createCustomPreset(
      newName,
      newOptions,
      `Based on ${original.name}`
    );
  }

  /**
   * Validate preset for platform
   */
  public validateForPlatform(
    presetId: string,
    videoDuration: number
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const preset = this.getById(presetId) as PlatformPreset | undefined;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!preset) {
      return { valid: false, errors: ['Preset not found'], warnings: [] };
    }

    // Check duration limits
    if (preset.maxDuration && videoDuration > preset.maxDuration) {
      errors.push(
        `Video exceeds maximum duration of ${preset.maxDuration}s for ${preset.platform || preset.name}`
      );
    }

    // Check file size estimate
    if (preset.maxFileSize && preset.estimatedFileSizePerMinute) {
      const estimatedSize =
        (videoDuration / 60) * preset.estimatedFileSizePerMinute;
      if (estimatedSize > preset.maxFileSize) {
        warnings.push(
          `Estimated file size (${Math.round(estimatedSize)}MB) may exceed platform limit (${preset.maxFileSize}MB)`
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Get recommended presets for duration
   */
  public getRecommendedPresets(
    videoDuration: number,
    preferredQuality?: QualityLevel
  ): ExportPreset[] {
    return this.getAllPresets().filter((preset) => {
      const platformPreset = preset as PlatformPreset;

      // Filter by duration limit
      if (platformPreset.maxDuration && videoDuration > platformPreset.maxDuration) {
        return false;
      }

      // Filter by quality preference
      if (preferredQuality) {
        const resolution = preset.options.resolution;
        if (!resolution) return true;

        switch (preferredQuality) {
          case 'low':
            return resolution.height <= 480;
          case 'medium':
            return resolution.height <= 720;
          case 'high':
            return resolution.height <= 1080;
          case 'ultra':
            return resolution.height >= 1080;
        }
      }

      return true;
    });
  }

  /**
   * Estimate file size
   */
  public estimateFileSize(presetId: string, durationSeconds: number): number {
    const preset = this.getById(presetId);
    if (!preset) return 0;

    if (preset.estimatedFileSizePerMinute) {
      return (durationSeconds / 60) * preset.estimatedFileSizePerMinute;
    }

    // Fallback calculation based on bitrate
    if (preset.options.bitrate) {
      return (preset.options.bitrate * durationSeconds) / 8 / 1_000_000;
    }

    return 0;
  }

  /**
   * Search presets
   */
  public search(query: string): ExportPreset[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPresets().filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        (p as PlatformPreset).platform?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get categories with counts
   */
  public getCategories(): { category: PresetCategory; count: number }[] {
    const categories = new Map<PresetCategory, number>();

    this.getAllPresets().forEach((p) => {
      categories.set(p.category, (categories.get(p.category) || 0) + 1);
    });

    return Array.from(categories.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }

  /**
   * Export presets to JSON
   */
  public exportCustomPresets(): ExportPreset[] {
    return Array.from(this.customPresets.values());
  }

  /**
   * Import presets from JSON
   */
  public importCustomPresets(presets: ExportPreset[]): number {
    let imported = 0;
    presets.forEach((preset) => {
      if (!preset.isBuiltIn) {
        this.customPresets.set(preset.id, { ...preset, isBuiltIn: false });
        imported++;
      }
    });
    return imported;
  }
}

// Singleton instance
let presetManagerInstance: ExportPresetManager | null = null;

/**
 * Get the export preset manager instance
 */
export function getExportPresetManager(): ExportPresetManager {
  if (!presetManagerInstance) {
    presetManagerInstance = new ExportPresetManager();
  }
  return presetManagerInstance;
}

/**
 * Get all preset categories
 */
export function getPresetCategories(): PresetCategory[] {
  return ['social', 'web', 'professional', 'archive', 'custom'];
}

/**
 * Quick helper to get export options for a platform
 */
export function getExportOptionsForPlatform(
  platform: string
): VideoExportOptions | null {
  const manager = getExportPresetManager();
  const presets = manager.getPlatformPresets(platform);
  return presets.length > 0 ? presets[0].options : null;
}
