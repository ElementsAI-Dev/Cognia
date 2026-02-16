/**
 * Image Studio Constants
 * Shared constants for the Image Studio feature
 */

import type { ImageSize } from '@/lib/ai';
import type { FilterPreset } from '@/types/media/image-studio';

// ============================================================================
// Prompt Templates
// ============================================================================

export interface PromptTemplate {
  label: string;
  prompt: string;
  category: 'nature' | 'portrait' | 'art' | 'genre' | 'commercial';
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Nature & Landscape
  { label: 'Landscape', prompt: 'A beautiful mountain landscape at sunset with dramatic clouds and a lake reflection', category: 'nature' },
  { label: 'Nature', prompt: 'Macro photography of a dewdrop on a flower petal with morning light', category: 'nature' },
  { label: 'Ocean', prompt: 'Dramatic ocean waves crashing on rocky cliffs at golden hour', category: 'nature' },
  { label: 'Forest', prompt: 'Misty ancient forest with sunbeams filtering through tall trees', category: 'nature' },
  // People & Portrait
  { label: 'Portrait', prompt: 'A professional portrait photo with soft studio lighting and bokeh background', category: 'portrait' },
  { label: 'Fashion', prompt: 'High fashion editorial photography with dramatic lighting and elegant pose', category: 'portrait' },
  // Art & Design
  { label: 'Abstract', prompt: 'Abstract geometric art with vibrant colors and flowing shapes', category: 'art' },
  { label: 'Architecture', prompt: 'Modern minimalist architecture with clean lines and natural light', category: 'art' },
  { label: 'Interior', prompt: 'Cozy modern interior design with warm lighting and plants', category: 'art' },
  // Genre
  { label: 'Sci-Fi', prompt: 'Futuristic cyberpunk cityscape with neon lights and flying vehicles', category: 'genre' },
  { label: 'Fantasy', prompt: 'Magical enchanted forest with glowing mushrooms and fairy lights', category: 'genre' },
  { label: 'Steampunk', prompt: 'Victorian steampunk machinery with brass gears and steam pipes', category: 'genre' },
  // Commercial
  { label: 'Product', prompt: 'Professional product photography on white background with soft shadows', category: 'commercial' },
  { label: 'Food', prompt: 'Gourmet food photography with beautiful plating and natural lighting', category: 'commercial' },
  { label: 'Logo', prompt: 'Modern minimalist logo design on clean background', category: 'commercial' },
];

// ============================================================================
// Style Presets
// ============================================================================

export interface StylePreset {
  label: string;
  value: string;
  short: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  { label: 'Photo', value: 'photorealistic, high detail, 8k resolution, professional photography', short: '📷' },
  { label: 'Digital', value: 'digital art, vibrant colors, detailed illustration', short: '🎨' },
  { label: 'Oil', value: 'oil painting style, textured brushstrokes, artistic, masterpiece', short: '🖼️' },
  { label: 'Watercolor', value: 'watercolor painting, soft edges, flowing colors, artistic', short: '💧' },
  { label: 'Anime', value: 'anime style, manga art, detailed linework, studio ghibli', short: '🎌' },
  { label: 'Minimal', value: 'minimalist design, clean lines, simple shapes, modern', short: '◻️' },
  { label: '3D', value: '3D render, octane render, cinema 4d, realistic lighting, unreal engine', short: '🔮' },
  { label: 'Sketch', value: 'pencil sketch, hand drawn, artistic illustration, detailed', short: '✏️' },
  { label: 'Vintage', value: 'vintage photography, film grain, retro colors, nostalgic', short: '📜' },
  { label: 'Neon', value: 'neon lights, cyberpunk, glowing, dark background, vibrant', short: '💜' },
];

// ============================================================================
// Aspect Ratios
// ============================================================================

export interface AspectRatioPreset {
  label: string;
  size: ImageSize;
  icon: string;
}

export const ASPECT_RATIOS: AspectRatioPreset[] = [
  { label: '1:1', size: '1024x1024' as ImageSize, icon: '⬜' },
  { label: '9:16', size: '1024x1792' as ImageSize, icon: '📱' },
  { label: '16:9', size: '1792x1024' as ImageSize, icon: '🖥️' },
];

// ============================================================================
// Zoom Levels
// ============================================================================

export interface ZoomLevel {
  label: string;
  cols: number;
  size: number;
}

export const ZOOM_LEVELS: ZoomLevel[] = [
  { label: 'XS', cols: 6, size: 80 },
  { label: 'S', cols: 5, size: 120 },
  { label: 'M', cols: 4, size: 160 },
  { label: 'L', cols: 3, size: 200 },
  { label: 'XL', cols: 2, size: 280 },
];

// ============================================================================
// Filter Presets (shared by ImageAdjustments and FiltersGallery)
// ============================================================================

export const FILTER_PRESETS: FilterPreset[] = [
  // Basic
  { id: 'none', name: 'Original', category: 'basic', adjustments: {} },
  { id: 'vivid', name: 'Vivid', category: 'basic', adjustments: { saturation: 30, contrast: 15 }, description: 'Enhanced colors' },
  { id: 'warm', name: 'Warm', category: 'basic', adjustments: { hue: 15, saturation: 10, brightness: 5 }, description: 'Warm tones' },
  { id: 'cool', name: 'Cool', category: 'basic', adjustments: { hue: -20, saturation: -10, brightness: -5 }, description: 'Cool tones' },
  { id: 'bright', name: 'Bright', category: 'basic', adjustments: { brightness: 20, contrast: 10 }, description: 'Brighter image' },
  { id: 'contrast', name: 'High Contrast', category: 'basic', adjustments: { contrast: 40, brightness: -5 }, description: 'Dramatic contrast' },

  // Vintage
  { id: 'sepia', name: 'Sepia', category: 'vintage', adjustments: { saturation: -50, hue: 30, brightness: 10 }, description: 'Classic sepia tone' },
  { id: 'faded', name: 'Faded', category: 'vintage', adjustments: { contrast: -30, saturation: -30, brightness: 20 }, description: 'Washed out look' },
  { id: 'retro', name: 'Retro', category: 'vintage', adjustments: { saturation: -20, contrast: 20, hue: 10 }, description: '70s style' },
  { id: 'film', name: 'Film', category: 'vintage', adjustments: { contrast: 15, saturation: -15, brightness: 5 }, description: 'Analog film look' },
  { id: 'polaroid', name: 'Polaroid', category: 'vintage', adjustments: { contrast: -10, saturation: 20, brightness: 15, hue: -5 }, description: 'Instant photo style' },

  // Cinematic
  { id: 'dramatic', name: 'Dramatic', category: 'cinematic', adjustments: { contrast: 40, saturation: 20, brightness: -15 }, description: 'Bold and dramatic' },
  { id: 'teal-orange', name: 'Teal & Orange', category: 'cinematic', adjustments: { hue: -15, saturation: 30, contrast: 20 }, description: 'Hollywood style' },
  { id: 'noir', name: 'Noir', category: 'cinematic', adjustments: { contrast: 50, brightness: -20, saturation: -80 }, description: 'Dark and moody' },
  { id: 'golden', name: 'Golden Hour', category: 'cinematic', adjustments: { hue: 20, saturation: 25, brightness: 10 }, description: 'Warm golden light' },
  { id: 'cold-blue', name: 'Cold Blue', category: 'cinematic', adjustments: { hue: -30, saturation: 15, contrast: 20, brightness: -10 }, description: 'Cold cinematic' },

  // Artistic
  { id: 'pop', name: 'Pop Art', category: 'artistic', adjustments: { saturation: 70, contrast: 40 }, description: 'Bold pop colors' },
  { id: 'soft', name: 'Soft', category: 'artistic', adjustments: { contrast: -20, blur: 1, saturation: -15 }, description: 'Soft dreamy look' },
  { id: 'sharp', name: 'Sharp', category: 'artistic', adjustments: { sharpen: 50, contrast: 10 }, description: 'Enhanced details' },
  { id: 'muted', name: 'Muted', category: 'artistic', adjustments: { saturation: -40, contrast: -10 }, description: 'Subtle colors' },
  { id: 'punch', name: 'Punch', category: 'artistic', adjustments: { saturation: 40, contrast: 30, sharpen: 20 }, description: 'Extra punch' },

  // Black & White
  { id: 'bw', name: 'B&W', category: 'black-white', adjustments: { saturation: -100 }, description: 'Classic black & white' },
  { id: 'bw-high', name: 'B&W High Contrast', category: 'black-white', adjustments: { saturation: -100, contrast: 50 }, description: 'Bold B&W' },
  { id: 'bw-soft', name: 'B&W Soft', category: 'black-white', adjustments: { saturation: -100, contrast: -20, brightness: 10 }, description: 'Soft B&W' },
  { id: 'bw-grain', name: 'B&W Film', category: 'black-white', adjustments: { saturation: -100, contrast: 30, sharpen: 30 }, description: 'Grainy film look' },
];

/** Subset of presets for the quick-access adjustments panel */
export const QUICK_FILTER_PRESETS: FilterPreset[] = FILTER_PRESETS.filter(
  (p) => ['none', 'vivid', 'warm', 'cool', 'bw', 'sepia', 'contrast', 'soft', 'dramatic', 'faded', 'sharp', 'muted'].includes(p.id)
);

export const FILTER_CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic',
  vintage: 'Vintage',
  cinematic: 'Cinematic',
  artistic: 'Artistic',
  'black-white': 'B&W',
};
