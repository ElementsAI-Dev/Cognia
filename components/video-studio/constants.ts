import type {
  VideoStyle,
  VideoResolution,
  VideoAspectRatio,
  VideoDuration,
} from '@/types/media/video';

// Prompt templates for video generation
export const VIDEO_PROMPT_TEMPLATES = [
  { label: 'Nature Timelapse', prompt: 'A beautiful time-lapse of clouds moving over a mountain landscape at sunset', category: 'nature' },
  { label: 'Ocean Waves', prompt: 'Cinematic slow-motion waves crashing on a tropical beach with golden hour lighting', category: 'nature' },
  { label: 'City Life', prompt: 'Bustling city street at night with neon signs and people walking, cinematic', category: 'urban' },
  { label: 'Space Journey', prompt: 'Spacecraft traveling through a colorful nebula with stars in the background', category: 'scifi' },
  { label: 'Wildlife', prompt: 'A majestic lion walking through the African savanna at golden hour', category: 'nature' },
  { label: 'Abstract Flow', prompt: 'Abstract colorful liquid flowing and merging in slow motion', category: 'abstract' },
  { label: 'Product Reveal', prompt: 'Elegant product reveal with dramatic lighting and smooth camera movement', category: 'commercial' },
  { label: 'Anime Scene', prompt: 'Anime character walking through cherry blossom trees, studio ghibli style', category: 'animation' },
] as const;

// Style presets for video
export const VIDEO_STYLE_PRESETS: Array<{ label: string; value: VideoStyle; icon: string; description: string }> = [
  { label: 'Cinematic', value: 'cinematic', icon: '🎬', description: 'Film-like quality with dramatic lighting' },
  { label: 'Documentary', value: 'documentary', icon: '📹', description: 'Natural and realistic footage' },
  { label: 'Animation', value: 'animation', icon: '🎨', description: 'Animated or cartoon style' },
  { label: 'Timelapse', value: 'timelapse', icon: '⏱️', description: 'Accelerated time effect' },
  { label: 'Slow Motion', value: 'slowmotion', icon: '🐌', description: 'Slowed down footage' },
  { label: 'Natural', value: 'natural', icon: '🌿', description: 'Organic, unprocessed look' },
  { label: 'Artistic', value: 'artistic', icon: '🖼️', description: 'Creative and stylized' },
  { label: 'Commercial', value: 'commercial', icon: '📺', description: 'Professional advertising quality' },
];

// Resolution options
export const RESOLUTION_OPTIONS: Array<{ value: VideoResolution; label: string; description: string }> = [
  { value: '480p', label: '480p', description: 'SD - Fastest' },
  { value: '720p', label: '720p', description: 'HD' },
  { value: '1080p', label: '1080p', description: 'Full HD' },
  { value: '4k', label: '4K', description: 'Ultra HD - Slowest' },
];

// Aspect ratio options
export const ASPECT_RATIO_OPTIONS: Array<{ value: VideoAspectRatio; label: string; icon: string }> = [
  { value: '16:9', label: '16:9', icon: '🖥️' },
  { value: '9:16', label: '9:16', icon: '📱' },
  { value: '1:1', label: '1:1', icon: '⬜' },
  { value: '4:3', label: '4:3', icon: '📺' },
  { value: '21:9', label: '21:9', icon: '🎬' },
];

// Duration options
export const DURATION_OPTIONS: Array<{ value: VideoDuration; label: string; seconds: number }> = [
  { value: '5s', label: '5 seconds', seconds: 5 },
  { value: '10s', label: '10 seconds', seconds: 10 },
  { value: '15s', label: '15 seconds', seconds: 15 },
  { value: '20s', label: '20 seconds', seconds: 20 },
  { value: '30s', label: '30 seconds', seconds: 30 },
  { value: '60s', label: '60 seconds', seconds: 60 },
];
