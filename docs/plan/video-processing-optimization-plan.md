# Video Processing System Optimization Plan

## Document Information

- **Project**: Cognia AI Chat Application
- **Module**: Video Studio / Video Processing
- **Created**: 2025-01-25
- **Status**: Planning
- **Priority**: High

---

## Executive Summary

Cognia currently has a comprehensive video processing system with AI generation, recording, timeline editing, and subtitle support. This plan focuses on:

1. **Performance Optimization**: Web Workers, WASM, GPU acceleration for video processing
2. **Advanced Editing Features**: Multi-track editing, keyframes, advanced transitions
3. **AI Integration**: Video understanding, auto-editing, smart effects
4. **Format Support**: Additional codecs, HDR, spatial audio
5. **Export Enhancements**: Better compression, presets, streaming formats
6. **Subtitle & Accessibility**: Improved transcription, translation, caption editing
7. **Cross-Platform**: Desktop-native video processing via FFmpeg

---

## Current State Analysis

### Existing Architecture

**State Management**: `stores/media/media-store.ts`
- Zustand store with localStorage persistence
- Manages generated images and videos
- Video records with status tracking (pending, processing, completed, failed)
- Tag-based filtering and organization
- Cost tracking and statistics

**Core Hook**: `hooks/video-studio/use-video-editor.ts`
- 800+ lines of code
- Multi-track timeline management
- Clip manipulation (add, remove, move, split, duplicate, trim)
- Playback controls
- Effects and transitions
- Audio mixing
- Export functionality

**Timeline Hook**: `hooks/video-studio/use-video-timeline.ts`
- 500+ lines of code
- Timeline zoom and pan
- Markers and regions
- Snapping behavior
- Time formatting
- In/out points

**Subtitles Hook**: `hooks/video-studio/use-video-subtitles.ts`
- 600+ lines of code
- Subtitle track management
- Extraction from video
- AI transcription via Whisper
- Import/export in multiple formats
- Search and validation

**Components** (`components/video-studio/`):
- **audio/**: Audio mixer, track controls, waveform visualization
- **common/**: Playback controls, zoom, history, keyboard shortcuts, project settings
- **composition/**: Layer panel, text overlay editor
- **editor/**: Main video editor panel
- **effects/**: Color correction, video effects, transitions
- **export/**: Export dialog, progress tracking, render queue
- **generation/**: AI generation sidebar, job cards
- **management/**: Media library, video details, delete confirmation
- **preview/**: Video preview with controls, preview dialog
- **recording/**: Recording sidebar, studio header
- **timeline/**: Timeline UI, trimmer, subtitle track, speed controls, markers

**Video Generation**: `lib/ai/media/video-generation.ts`
- Google Veo (veo-3, veo-3.1)
- OpenAI Sora (sora-1, sora-turbo)
- Job management and progress tracking

**Subtitle Processing**: `lib/media/video-subtitle.ts`
- FFmpeg integration via Tauri
- Subtitle extraction from videos
- Whisper transcription
- Content analysis

**Plugin API**: `lib/plugin/api/media-api.ts`
- Image processing utilities
- Video processing interface (via Tauri backend)
- Filter/effect/transition registration
- AI processing (upscale, background removal, enhancement)

### Strengths

1. **Modular Architecture**: Well-organized components by functionality
2. **Multi-Track Timeline**: Support for video, audio, text, overlay tracks
3. **Comprehensive Types**: Detailed type definitions for all operations
4. **Plugin System**: Extensible filter/effect/transition registry
5. **Subtitle Support**: Full subtitle extraction, transcription, and editing
6. **AI Generation**: Integrated video generation via multiple providers
7. **Zustand State**: Persistent state with proper actions

### Limitations & Pain Points

1. **Performance Issues**:
   - No Web Worker support for video processing
   - No GPU acceleration (WebGL/WebGPU)
   - Large video files cause UI freeze
   - No progressive loading for video previews
   - Export runs on main thread

2. **Feature Gaps**:
   - No keyframe animation system
   - Limited transition library
   - No advanced color grading (curves, wheels)
   - No motion tracking
   - No stabilization
   - No object tracking/removal
   - No audio visualization in timeline
   - Limited audio effects

3. **Format Support**:
   - Limited codec support (browser-dependent)
   - No HDR video support
   - No spatial audio
   - Limited export format options
   - No adaptive bitrate streaming

4. **Editing Limitations**:
   - Basic trimming only
   - No ripple editing
   - No slip/slide edits
   - No J-cut/L-cut tools
   - No multi-camera editing
   - No masking/rotoscoping

5. **AI Features**:
   - No video understanding/analysis
   - No auto-editing suggestions
   - No smart scene detection
   - No face detection/tracking
   - No content-aware fill for video

6. **Export Issues**:
   - No preset system
   - Limited codec options
   - No compression quality control
   - No batch export
   - No streaming format export (HLS, DASH)

7. **Code Quality**:
   - Some duplicate code between hooks
   - Limited error handling
   - No comprehensive test coverage for video operations
   - Type duplication between store and types

---

## Development Plan

### Phase 1: Performance Foundation (Priority: Critical)

#### 1.1 Web Worker Integration

**Files to Create**:
- `lib/media/workers/video-worker.ts` - Web Worker for video processing
- `lib/media/workers/worker-types.ts` - Worker message types
- `lib/media/workers/video-codec-worker.ts` - Codec operations in worker
- `hooks/video-studio/use-worker-processor.ts` - Worker hook

**Design**:
```typescript
interface VideoWorkerMessage {
  id: string;
  type: 'decode' | 'encode' | 'transform' | 'filter' | 'export';
  payload: {
    videoData?: Uint8Array;
    operations?: VideoOperation[];
    filter?: VideoFilter;
    exportOptions?: VideoExportOptions;
  };
}

interface VideoWorkerResponse {
  id: string;
  type: 'success' | 'error' | 'progress';
  data?: Uint8Array | VideoMetadata;
  progress?: number;
  error?: string;
}
```

**Implementation**:
- Move heavy operations to Web Worker
- Operations: frame extraction, filtering, encoding
- Progress reporting for long operations
- Transferable objects for zero-copy

**Files to Modify**:
- `hooks/video-studio/use-video-editor.ts`
- `components/video-studio/export/export-progress.tsx`

#### 1.2 WASM Codecs

**Files to Create**:
- `lib/media/codecs/wasm-codecs.ts` - WASM codec loader
- `lib/media/codecs/ffmpeg-wasm.ts` - FFmpeg WASM wrapper
- `hooks/video-studio/use-wasm-codecs.ts` - WASM codec hook

**Implementation**:
- Integrate FFmpeg.wasm for encoding/decoding
- Support for H.264, H.265, VP9, AV1
- Browser codec detection and fallback
- Progressive loading

**Benefits**:
- Cross-platform codec support
- Better compression
- More format options

#### 1.3 GPU Acceleration

**Files to Create**:
- `lib/media/webgl/video-processor.ts` - WebGL video processor
- `lib/media/webgl/video-shaders.ts` - Video processing shaders
- `lib/media/webgl/frame-buffer.ts` - Frame buffer management
- `hooks/video-studio/use-gpu-acceleration.ts` - GPU acceleration hook

**Shaders to Implement**:
- Color correction (brightness, contrast, saturation)
- Blur and sharpen
- Color grading wheels
- Transition rendering

**Benefits**:
- 10-50x faster for pixel operations
- Parallel frame processing
- Non-blocking main thread

#### 1.4 Progressive Video Loading

**Files to Create**:
- `lib/media/progressive/progressive-video.ts` - Progressive video loader
- `components/video-studio/preview/progressive-video-preview.tsx`

**Implementation**:
- Load low-res preview first
- Progressive refinement
- Thumbnail generation for timeline
- Lazy loading for large videos

---

### Phase 2: Advanced Editing Features (Priority: High)

#### 2.1 Keyframe Animation System

**Files to Create**:
- `lib/media/keyframes/keyframe-system.ts` - Keyframe core system
- `lib/media/keyframes/keyframe-interpolation.ts` - Interpolation algorithms
- `lib/media/keyframes/keyframe-editor.ts` - Keyframe editing utilities
- `components/video-studio/timeline/keyframe-track.tsx`
- `components/video-studio/timeline/keyframe-editor.tsx`

**Design**:
```typescript
interface Keyframe {
  id: string;
  time: number; // milliseconds
  value: number | Vector2 | Vector3 | Color;
  easing: EasingFunction;
  interpolation: 'linear' | 'bezier' | 'step' | 'spline';
}

interface KeyframeTrack {
  id: string;
  property: string; // e.g., 'opacity', 'position.x', 'scale'
  keyframes: Keyframe[];
  isEnabled: boolean;
}

interface AnimationLayer {
  id: string;
  name: string;
  tracks: KeyframeTrack[];
  startTime: number;
  duration: number;
}
```

**Features**:
- Multi-property keyframing
- Bezier curve editor
- Easing functions (ease-in, ease-out, elastic, bounce)
- Copy/paste keyframes
- Keyframe snapping

#### 2.2 Advanced Transitions

**Files to Create**:
- `lib/media/transitions/transition-library.ts` - Transition library
- `lib/media/transitions/custom-transition.ts` - Custom transition builder
- `components/video-studio/transitions/transition-gallery.tsx`
- `components/video-studio/transitions/transition-preview.tsx`

**New Transitions**:
- 3D transitions (cube, flip, page curl)
- Lens transitions (wipe, iris, zoom)
- Distortion transitions (ripple, shockwave, pixelate)
- Blend transitions (additive, subtractive, difference)
- Mask transitions (gradient, shape, path)

#### 2.3 Advanced Color Grading

**Files to Create**:
- `lib/media/color/curves.ts` - Curves adjustment
- `lib/media/color/color-wheels.ts` - Color grading wheels
- `lib/media/color/luts.ts` - LUT application
- `lib/media color/hsl-wheel.ts` - HSL color wheel
- `lib/media/color/scopes.ts` - Video scopes (histogram, waveform, vectorscope)
- `components/video-studio/effects/curves-panel.tsx`
- `components/video-studio/effects/color-wheels.tsx`
- `components/video-studio/effects/video-scopes.tsx`

**Features**:
- Curves (RGB and per-channel)
- Color wheels (lift, gamma, gain)
- LUT support (.cube, .3dl)
- Video scopes for color analysis
- Shot matching

#### 2.4 Motion Tracking & Stabilization

**Files to Create**:
- `lib/media/motion/motion-tracker.ts` - Motion tracking
- `lib/media/motion/stabilizer.ts` - Video stabilization
- `components/video-studio/effects/motion-tracking-panel.tsx`

**Implementation**:
- Feature point tracking
- Optical flow
- Stabilization algorithms
- Tracking data export

#### 2.5 Ripple Editing Tools

**Files to Create**:
- `lib/media/editing/ripple-edit.ts` - Ripple editing logic
- `lib/media/editing/slip-edit.ts` - Slip/slide editing
- `lib/media/editing/roll-edit.ts` - Roll editing
- `components/video-studio/timeline/advanced-edit-tools.tsx`

**Features**:
- Ripple delete/insert
- Slip edit (trim in/out point)
- Slide edit (move clip, shift others)
- Roll edit (adjust edit point)

---

### Phase 3: AI Integration (Priority: High)

#### 3.1 Video Understanding

**Files to Create**:
- `lib/media/ai/video-analyzer.ts` - Video analysis
- `lib/media/ai/scene-detection.ts` - Scene detection
- `lib/media/ai/shot-detection.ts` - Shot boundary detection
- `components/video-studio/ai/video-analysis-panel.tsx`

**Features**:
- Scene classification (indoor, outdoor, landscape, etc.)
- Shot detection (cuts, fades, dissolves)
- Motion detection
- Face detection and tracking
- Object detection
- Color palette extraction

#### 3.2 Auto-Editing

**Files to Create**:
- `lib/media/ai/auto-editor.ts` - Auto editing engine
- `lib/media/ai/story-mode.ts` - Story mode editing
- `components/video-studio/ai/auto-edit-panel.tsx`

**Features**:
- Highlight reel generation
- Auto-trim to music beat
- Story mode (template-based editing)
- Smart montage creation
- Auto-color matching

#### 3.3 Smart Effects

**Files to Create**:
- `lib/media/ai/smart-effects.ts` - AI-powered effects
- `lib/media/ai/style-transfer.ts` - Style transfer for video
- `lib/media/ai/sky-replacement.ts` - Sky replacement
- `components/video-studio/ai/smart-effects-gallery.tsx`

**Effects**:
- Portrait mode (background blur)
- Sky replacement
- Style transfer (artistic styles)
- Colorization (B&W to color)
- Super resolution (upscaling)

---

### Phase 4: Format & Codec Support (Priority: Medium)

#### 4.1 Extended Codec Support

**Files to Create**:
- `lib/media/codecs/codec-detection.ts` - Codec capability detection
- `lib/media/codecs/h265-encoder.ts` - H.265 encoding
- `lib/media/codecs/av1-encoder.ts` - AV1 encoding
- `lib/media/codecs/vp9-encoder.ts` - VP9 encoding

**Implementation**:
- Detect browser codec support
- Fallback to software encoding
- Hardware acceleration detection
- Codec comparison UI

#### 4.2 HDR Video Support

**Files to Create**:
- `lib/media/hdr/hdr-handler.ts` - HDR video handling
- `lib/media/hdr/hdr-tone-mapping.ts` - HDR to SDR tone mapping
- `lib/media/hdr/hdr-metadata.ts` - HDR metadata parser

**Features**:
- HDR10/HLG support
- Tone mapping for SDR displays
- HDR metadata preservation
- HDR comparison view

#### 4.3 Spatial Audio

**Files to Create**:
- `lib/media/audio/spatial-audio.ts` - Spatial audio processing
- `lib/media/audio/audio-visualization.ts` - Audio visualization
- `components/video-studio/audio/spatial-audio-panel.tsx`
- `components/video-studio/audio/audio-visualizer.tsx`

**Features**:
- 3D audio positioning
- Ambisonics support
- Audio visualization in timeline
- Waveform and spectrum views

---

### Phase 5: Export Enhancements (Priority: High)

#### 5.1 Export Preset System

**Files to Create**:
- `lib/media/export/export-presets.ts` - Export preset definitions
- `lib/media/export/preset-manager.ts` - Preset management
- `components/video-studio/export/preset-gallery.tsx`
- `components/video-studio/export/preset-editor.tsx`

**Presets**:
- Social media (YouTube, Instagram, TikTok, Twitter)
- Web (MP4, WebM)
- Professional (ProRes, DNxHD)
- Device (iPhone, Android, TV)
- Custom presets

#### 5.2 Advanced Export Options

**Files to Create**:
- `lib/media/export/advanced-export.ts` - Advanced export options
- `components/video-studio/export/advanced-export-dialog.tsx`

**Options**:
- Codec selection
- Bitrate control (CBR, VBR, CRF)
- Two-pass encoding
- Resolution scaling
- Frame rate conversion
- Audio codec and bitrate
- Metadata embedding
- Thumbnail generation

#### 5.3 Batch Export

**Files to Modify**:
- `components/video-studio/export/render-queue.tsx`

**New Features**:
- Queue multiple exports
- Priority settings
- Pause/resume/cancel
- Export progress notification
- Automatic file naming
- Export to multiple formats simultaneously

#### 5.4 Streaming Format Export

**Files to Create**:
- `lib/media/export/hls-export.ts` - HLS export
- `lib/media/export/dash-export.ts` - DASH export
- `components/video-studio/export/streaming-export-dialog.tsx`

**Features**:
- Adaptive bitrate streaming
- Segment generation
- Manifest file creation
- Multi-quality encoding

---

### Phase 6: Subtitle & Accessibility (Priority: Medium)

#### 6.1 Advanced Caption Editing

**Files to Modify**:
- `hooks/video-studio/use-video-subtitles.ts`
- `components/video-studio/timeline/video-subtitle-track.tsx`

**New Features**:
- Visual subtitle editor
- Drag to adjust timing
- Live preview in video
- Caption positioning
- Styling (font, color, background)
- Speaker identification

#### 6.2 Auto-Translation

**Files to Create**:
- `lib/media/subtitles/subtitle-translator.ts` - Subtitle translation
- `components/video-studio/subtitles/translation-panel.tsx`

**Implementation**:
- AI-powered translation
- Multi-language support
- Preserve timing
- Review and edit translated text

#### 6.3 Accessibility Features

**Files to Create**:
- `lib/media/accessibility/audio-description.ts` - Audio description tools
- `components/video-studio/accessibility/ad-editor.tsx`

**Features**:
- Audio description track
- Sign language video overlay
- High contrast mode
- Font size scaling

---

### Phase 7: Cross-Platform Optimization (Priority: Medium)

#### 7.1 Native Video Processing

**Files to Modify**:
- `src-tauri/src/commands/video-processing.rs` (or create)

**Implementation**:
- FFmpeg integration for encoding/decoding
- Hardware acceleration (NVENC, QuickSync, VAAPI)
- Faster than browser-based processing
- Support for more formats

#### 7.2 Platform Detection

**Files to Create**:
- `lib/media/platform/video-capabilities.ts` - Video capability detection

**Design**:
```typescript
interface VideoCapabilities {
  isDesktop: boolean;
  platform: 'windows' | 'macos' | 'linux' | 'web';

  // Codec support
  supportsH264: boolean;
  supportsH265: boolean;
  supportsVP9: boolean;
  supportsAV1: boolean;

  // Hardware acceleration
  hasHardwareAcceleration: boolean;
  accelerationType: 'nvenc' | 'quicksync' | 'vaapi' | 'videotoolbox' | null;

  // Worker support
  supportsWebWorker: boolean;
  supportsWebGL: boolean;
  supportsWebGL2: boolean;
  supportsWebGPU: boolean;
  supportsOffscreenCanvas: boolean;

  // Feature detection
  maxVideoDimensions: { width: number; height: number };
  maxFrameRate: number;
  maxBitrate: number;
}
```

#### 7.3 Feature Flags

**Files to Modify**:
- `stores/settings/settings-store.ts`

**Add to Settings**:
```typescript
interface VideoProcessingSettings {
  // Performance
  useWebWorker: boolean;
  useWasmCodecs: boolean;
  useGpuAcceleration: boolean;
  workerCount: number;

  // Quality
  defaultExportQuality: number;
  previewQuality: number;
  thumbnailQuality: number;

  // Features
  enableAI: boolean;
  enableMotionTracking: boolean;
  enableHDR: boolean;
  enableSpatialAudio: boolean;

  // Format preferences
  preferredExportFormat: 'mp4' | 'webm' | 'mov';
  preferredCodec: 'h264' | 'h265' | 'vp9' | 'av1';
}
```

---

### Phase 8: Code Quality & Testing (Priority: High)

#### 8.1 Type Consolidation

**Files to Modify**:
- `types/media/video.ts`
- `types/video-studio/types.ts`
- `stores/media/media-store.ts`

**Actions**:
- Remove duplicate types
- Create shared type module
- Consolidate operation types
- Unified export types

#### 8.2 Error Handling

**Files to Create**:
- `lib/media/errors/video-error-handler.ts` - Centralized error handling
- `lib/media/errors/video-error-types.ts` - Error type definitions
- `components/video-studio/error-boundary.tsx` - Error boundary

**Design**:
```typescript
interface VideoProcessingError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

type VideoErrorCode =
  | 'INVALID_VIDEO_FORMAT'
  | 'VIDEO_TOO_LARGE'
  | 'INSUFFICIENT_MEMORY'
  | 'CODEC_NOT_SUPPORTED'
  | 'PROCESSING_FAILED'
  | 'EXPORT_FAILED'
  | 'TRANSCODE_ERROR';
```

#### 8.3 Test Coverage

**Files to Create**:
- `lib/media/workers/video-worker.test.ts`
- `lib/media/keyframes/keyframe-system.test.ts`
- `lib/media/transitions/transition-library.test.ts`
- `lib/media/color/curves.test.ts`
- `lib/media/ai/video-analyzer.test.ts`
- `hooks/video-studio/use-worker-processor.test.ts`
- `hooks/video-studio/use-video-editor-integration.test.ts`
- `components/video-studio/timeline/video-timeline-integration.test.tsx`
- `components/video-studio/export/export-dialog-integration.test.tsx`

**Test Scenarios**:
- Unit tests for each algorithm
- Integration tests for worker communication
- Component tests for UI interactions
- E2E tests for complete workflows
- Performance benchmarks

---

## Implementation Order

### Sprint 1: Performance Foundation (Week 1-3)
1. Web Worker implementation for frame processing
2. WASM codec integration (FFmpeg.wasm)
3. WebGL context and video shaders
4. Progressive loading for video previews
5. Benchmark current vs new performance

### Sprint 2: Keyframes & Transitions (Week 3-5)
1. Keyframe system implementation
2. Keyframe editor UI
3. Advanced transition library
4. Transition preview system
5. Keyframe interpolation algorithms

### Sprint 3: Advanced Color & Motion (Week 5-7)
1. Curves adjustment
2. Color grading wheels
3. Video scopes
4. Motion tracking
5. Video stabilization

### Sprint 4: AI Integration (Week 7-9)
1. Video understanding (scene detection, shot detection)
2. Auto-editing engine
3. Smart effects (style transfer, sky replacement)
4. Face detection and tracking
5. Auto-color matching

### Sprint 5: Export Enhancements (Week 9-11)
1. Export preset system
2. Advanced export options
3. Batch export improvements
4. Streaming format export (HLS, DASH)
5. Hardware acceleration for export

### Sprint 6: Format & Subtitles (Week 11-13)
1. Extended codec support (H.265, AV1, VP9)
2. HDR video support
3. Spatial audio
4. Advanced caption editing
5. Auto-translation

### Sprint 7: Editing Tools (Week 13-15)
1. Ripple editing tools
2. Slip/slide/roll editing
3. Multi-camera editing
4. Advanced trimming tools
5. Timeline improvements

### Sprint 8: Polish & Testing (Week 15-17)
1. Type consolidation
2. Error handling
3. Test coverage
4. Documentation
5. Cross-platform testing

---

## Technical Specifications

### Web Worker Architecture

**New File**: `lib/media/workers/video-worker.ts`

```typescript
/// <reference lib="webworker" />

interface VideoWorkerMessage {
  id: string;
  type: 'decode' | 'encode' | 'transform' | 'filter' | 'export';
  payload: {
    videoData?: Uint8Array;
    frameData?: ImageData;
    operations?: VideoOperation[];
    filter?: VideoFilter;
    exportOptions?: VideoExportOptions;
  };
  transferables?: Transferable[];
}

self.onmessage = (e: MessageEvent<VideoWorkerMessage>) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'decode':
        return processDecode(id, payload);
      case 'encode':
        return processEncode(id, payload);
      case 'transform':
        return processTransform(id, payload);
      case 'filter':
        return processFilter(id, payload);
      case 'export':
        return processExport(id, payload);
      default:
        throw new Error(`Unknown worker message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

function processFilter(id: string, payload: VideoWorkerMessage['payload']) {
  const { frameData, filter } = payload;
  if (!frameData || !filter) throw new Error('Missing required parameters');

  // Apply filter to frame
  const result = applyVideoFilter(frameData, filter);

  self.postMessage({
    id,
    type: 'success',
    data: result,
  }, [result.data.buffer]);
}
```

### Keyframe System

**New File**: `lib/media/keyframes/keyframe-system.ts`

```typescript
export interface Keyframe {
  id: string;
  time: number;
  value: KeyframeValue;
  easing: EasingFunction;
  interpolation: InterpolationType;
}

export type KeyframeValue =
  | number
  | { x: number; y: number }  // Vector2
  | { x: number; y: number; z: number }  // Vector3
  | { r: number; g: number; b: number; a?: number };  // Color

export type InterpolationType =
  | 'linear'
  | 'bezier'
  | 'step'
  | 'spline';

export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'elastic'
  | 'bounce';

export interface KeyframeTrack {
  id: string;
  property: string;
  keyframes: Keyframe[];
  isEnabled: boolean;
}

export class KeyframeSystem {
  private tracks: Map<string, KeyframeTrack> = new Map();

  addTrack(track: KeyframeTrack): void {
    this.tracks.set(track.id, track);
  }

  removeTrack(trackId: string): void {
    this.tracks.delete(trackId);
  }

  addKeyframe(trackId: string, keyframe: Keyframe): void {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error(`Track not found: ${trackId}`);

    const existingIndex = track.keyframes.findIndex(k => k.time === keyframe.time);
    if (existingIndex >= 0) {
      track.keyframes[existingIndex] = keyframe;
    } else {
      track.keyframes.push(keyframe);
      track.keyframes.sort((a, b) => a.time - b.time);
    }
  }

  getValue(trackId: string, time: number): KeyframeValue | null {
    const track = this.tracks.get(trackId);
    if (!track || !track.isEnabled || track.keyframes.length === 0) {
      return null;
    }

    // Find surrounding keyframes
    let prevKeyframe: Keyframe | null = null;
    let nextKeyframe: Keyframe | null = null;

    for (const keyframe of track.keyframes) {
      if (keyframe.time <= time) {
        prevKeyframe = keyframe;
      } else {
        nextKeyframe = keyframe;
        break;
      }
    }

    // Interpolate
    if (prevKeyframe && nextKeyframe) {
      return this.interpolate(
        prevKeyframe,
        nextKeyframe,
        (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time)
      );
    }

    return prevKeyframe?.value ?? nextKeyframe?.value ?? null;
  }

  private interpolate(
    from: Keyframe,
    to: Keyframe,
    progress: number
  ): KeyframeValue {
    // Apply easing
    const easedProgress = this.applyEasing(progress, from.easing);

    // Apply interpolation
    switch (from.interpolation) {
      case 'linear':
        return this.linearInterpolate(from.value, to.value, easedProgress);
      case 'bezier':
        return this.bezierInterpolate(from.value, to.value, easedProgress);
      case 'step':
        return from.value;
      case 'spline':
        return this.splineInterpolate(from.value, to.value, easedProgress);
    }
  }

  private applyEasing(t: number, easing: EasingFunction): number {
    // Easing function implementations
    const easingFunctions: Record<EasingFunction, (t: number) => number> = {
      'linear': t => t,
      'ease-in': t => t * t,
      'ease-out': t => t * (2 - t),
      'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      // ... more easing functions
    };

    return (easingFunctions[easing] || easingFunctions['linear'])(t);
  }

  private linearInterpolate(from: KeyframeValue, to: KeyframeValue, t: number): KeyframeValue {
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * t;
    }
    // Handle vector and color types
    return from;
  }

  // ... other interpolation methods
}
```

### Export Preset System

**New File**: `lib/media/export/export-presets.ts`

```typescript
export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'web' | 'professional' | 'device' | 'custom';
  icon: string;

  // Video settings
  format: 'mp4' | 'webm' | 'mov' | 'avi';
  codec: 'h264' | 'h265' | 'vp9' | 'av1' | 'prores' | 'dnxhd';
  resolution: { width: number; height: number };
  frameRate: number;
  bitrateMode: 'cbr' | 'vbr' | 'crf';
  bitrate?: number;
  crf?: number;

  // Audio settings
  audioCodec: 'aac' | 'opus' | 'mp3' | 'pcm';
  audioBitrate: number;
  audioChannels: 1 | 2 | 6;
  audioSampleRate: number;

  // Other settings
  twoPass: boolean;
  hardwareAcceleration: boolean;
  preserveMetadata: boolean;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube-1080p',
    name: 'YouTube 1080p',
    description: 'Best quality for YouTube uploads',
    category: 'social',
    icon: '📺',

    format: 'mp4',
    codec: 'h264',
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    bitrateMode: 'vbr',
    bitrate: 8000000,

    audioCodec: 'aac',
    audioBitrate: 320000,
    audioChannels: 2,
    audioSampleRate: 48000,

    twoPass: true,
    hardwareAcceleration: true,
    preserveMetadata: true,
  },
  {
    id: 'instagram-reel',
    name: 'Instagram Reel',
    description: 'Optimized for Instagram Reels',
    category: 'social',
    icon: '📱',

    format: 'mp4',
    codec: 'h264',
    resolution: { width: 1080, height: 1920 },
    frameRate: 30,
    bitrateMode: 'cbr',
    bitrate: 5000000,

    audioCodec: 'aac',
    audioBitrate: 128000,
    audioChannels: 2,
    audioSampleRate: 44100,

    twoPass: false,
    hardwareAcceleration: true,
    preserveMetadata: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Optimized for TikTok uploads',
    category: 'social',
    icon: '🎵',

    format: 'mp4',
    codec: 'h264',
    resolution: { width: 1080, height: 1920 },
    frameRate: 30,
    bitrateMode: 'cbr',
    bitrate: 4000000,

    audioCodec: 'aac',
    audioBitrate: 128000,
    audioChannels: 2,
    audioSampleRate: 44100,

    twoPass: false,
    hardwareAcceleration: true,
    preserveMetadata: false,
  },
  // ... more presets
];

export class PresetManager {
  private presets: Map<string, ExportPreset> = new Map();
  private customPresets: Map<string, ExportPreset> = new Map();

  constructor() {
    EXPORT_PRESETS.forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  getPreset(id: string): ExportPreset | undefined {
    return this.presets.get(id) || this.customPresets.get(id);
  }

  getPresetsByCategory(category: ExportPreset['category']): ExportPreset[] {
    const allPresets = Array.from(this.presets.values());
    return allPresets.filter(preset => preset.category === category);
  }

  createCustomPreset(preset: ExportPreset): void {
    this.customPresets.set(preset.id, preset);
  }

  deleteCustomPreset(id: string): void {
    this.customPresets.delete(id);
  }

  exportPresets(): string {
    const data = {
      custom: Array.from(this.customPresets.values()),
    };
    return JSON.stringify(data, null, 2);
  }

  importPresets(json: string): void {
    const data = JSON.parse(json);
    if (data.custom) {
      data.custom.forEach((preset: ExportPreset) => {
        this.customPresets.set(preset.id, preset);
      });
    }
  }
}
```

---

## Configuration & Settings

### Video Processing Settings

**Modified**: `stores/settings/settings-store.ts`

```typescript
interface VideoProcessingSettings {
  // Performance
  useWebWorker: boolean;
  useWasmCodecs: boolean;
  useGpuAcceleration: boolean;
  workerCount: number;
  maxVideoSize: number; // pixels
  thumbnailQuality: number;

  // Quality
  defaultExportQuality: number;
  h264Quality: number;
  h265Quality: number;
  webpQuality: number;

  // Features
  enableAI: boolean;
  enableMotionTracking: boolean;
  enableKeyframes: boolean;
  enableHDR: boolean;
  enableSpatialAudio: boolean;

  // Format preferences
  preferredImportFormat: 'mp4' | 'webm' | 'mov';
  preferredExportFormat: 'mp4' | 'webm' | 'mov';
  preferredCodec: 'h264' | 'h265' | 'vp9' | 'av1';

  // UI preferences
  defaultTimelineZoom: number;
  showWaveform: boolean;
  showKeyframes: boolean;
  autoSave: boolean;
  autoSaveInterval: number;

  // Advanced
  preserveMetadata: boolean;
  embedColorProfile: boolean;
  colorProfile: 'srgb' | 'display-p3' | 'rec2020';
}
```

---

## Performance Targets

### Benchmarks

| Operation | Current | After Optimization | Target |
|------------|---------|-------------------|--------|
| Load 1080p video | ~1000ms | <300ms | <200ms |
| Extract frame | ~200ms | <50ms | <30ms |
| Apply filter | ~500ms | <100ms | <50ms |
| Export 1min video | ~30000ms | <10000ms | <5000ms |
| Keyframe render | ~100ms | <30ms | <16ms (60fps) |
| Transition render | ~300ms | <80ms | <33ms (30fps) |

### Memory Targets

| Video Size | Memory Before | Memory After | Target |
|------------|---------------|--------------|--------|
| 1080p 1min | ~200MB | ~100MB | <120MB |
| 4K 1min | ~800MB | ~400MB | <500MB |
| Batch (5 videos) | ~2GB | ~800MB | <1GB |

---

## Testing Strategy

### Unit Tests

**Files to Create**:
- `lib/media/workers/video-worker.test.ts`
- `lib/media/keyframes/keyframe-system.test.ts`
- `lib/media/transitions/transition-library.test.ts`
- `lib/media/color/curves.test.ts`
- `lib/media/ai/video-analyzer.test.ts`

### Integration Tests

**Files to Create**:
- `hooks/video-studio/use-worker-processor.test.ts`
- `hooks/video-studio/use-video-editor-integration.test.ts`
- `lib/media/export/preset-manager.test.ts`

### Component Tests

**Files to Create**:
- `components/video-studio/timeline/keyframe-editor.test.tsx`
- `components/video-studio/export/export-dialog-integration.test.tsx`
- `components/video-studio/ai/auto-edit-panel.test.tsx`

### E2E Tests

**Files to Create**:
- `e2e/video-studio/workflow.spec.ts`
- `e2e/video-studio/export.spec.ts`
- `e2e/video-studio/keyframes.spec.ts`

---

## Dependencies

### External Packages

- `ffmpeg.wasm` - FFmpeg WASM for browser encoding/decoding
- `comlink` - Web Worker communication
- `tracking.js` - Motion tracking
- `clmtrackr` - Face tracking
- `matterjs` - Physics for animations
- `opentype.js` - Font handling for subtitles

### Internal Dependencies

- `types/media/video` - Video types
- `types/video-studio/types` - Video studio types
- `stores/media/media-store` - Video state
- `lib/plugin/api/media-api` - Video processing API

---

## Success Metrics

### Performance
1. Video operations <500ms for 1080p videos
2. UI never freezes (60fps maintained)
3. Memory usage <1GB for multi-track projects

### Quality
1. Export quality matches professional tools
2. Keyframe animation is smooth (60fps)
3. Color grading is accurate

### Adoption
1. Keyframe usage >30% of animation projects
2. Auto-editing usage >20% of social media exports
3. Export preset usage >40% of exports

---

## Open Questions

1. **WebGPU Adoption**: WebGPU is still emerging
   - Option A: Use WebGL as fallback
   - Option B: Wait for broader WebGPU support
   - Option C: Progressive enhancement

2. **WASM Performance**: FFmpeg.wasm can be slow
   - Option A: Use native FFmpeg via Tauri
   - Option B: Optimize WASM settings
   - Option C: Hybrid approach

3. **AI Model Size**: Video understanding models are large
   - Option A: Server-side processing
   - Option B: Client-side with lazy loading
   - Option C: Hybrid approach

4. **Format Licensing**: Some codecs have licensing considerations
   - H.265: Patents (expiring soon)
   - AAC: Patents (expired)
   - Consider AV1 as royalty-free alternative

---

## Appendix: File Inventory

### Files to Create

```
lib/media/workers/
  video-worker.ts
  worker-types.ts
  video-codec-worker.ts

lib/media/codecs/
  wasm-codecs.ts
  ffmpeg-wasm.ts
  h265-encoder.ts
  av1-encoder.ts
  vp9-encoder.ts
  codec-detection.ts

lib/media/webgl/
  video-processor.ts
  video-shaders.ts
  frame-buffer.ts

lib/media/progressive/
  progressive-video.ts

lib/media/keyframes/
  keyframe-system.ts
  keyframe-interpolation.ts
  keyframe-editor.ts

lib/media/transitions/
  transition-library.ts
  custom-transition.ts
  3d-transitions.ts
  lens-transitions.ts
  distortion-transitions.ts

lib/media/color/
  curves.ts
  color-wheels.ts
  luts.ts
  hsl-wheel.ts
  scopes.ts

lib/media/motion/
  motion-tracker.ts
  stabilizer.ts

lib/media/editing/
  ripple-edit.ts
  slip-edit.ts
  roll-edit.ts

lib/media/ai/
  video-analyzer.ts
  scene-detection.ts
  shot-detection.ts
  auto-editor.ts
  story-mode.ts
  smart-effects.ts
  style-transfer.ts
  sky-replacement.ts

lib/media/hdr/
  hdr-handler.ts
  hdr-tone-mapping.ts
  hdr-metadata.ts

lib/media/audio/
  spatial-audio.ts
  audio-visualization.ts

lib/media/export/
  export-presets.ts
  preset-manager.ts
  advanced-export.ts
  hls-export.ts
  dash-export.ts

lib/media/subtitles/
  subtitle-translator.ts

lib/media/accessibility/
  audio-description.ts

lib/media/platform/
  video-capabilities.ts

lib/media/errors/
  video-error-handler.ts
  video-error-types.ts

hooks/video-studio/
  use-worker-processor.ts
  use-wasm-codecs.ts
  use-gpu-acceleration.ts

components/video-studio/timeline/
  keyframe-track.tsx
  keyframe-editor.tsx
  advanced-edit-tools.tsx

components/video-studio/transitions/
  transition-gallery.tsx
  transition-preview.tsx

components/video-studio/effects/
  curves-panel.tsx
  color-wheels.tsx
  video-scopes.tsx
  motion-tracking-panel.tsx

components/video-studio/ai/
  video-analysis-panel.tsx
  auto-edit-panel.tsx
  smart-effects-gallery.tsx

components/video-studio/export/
  preset-gallery.tsx
  preset-editor.tsx
  advanced-export-dialog.tsx
  streaming-export-dialog.tsx

components/video-studio/audio/
  spatial-audio-panel.tsx
  audio-visualizer.tsx

components/video-studio/subtitles/
  translation-panel.tsx
  advanced-caption-editor.tsx

components/video-studio/accessibility/
  ad-editor.tsx

components/video-studio/preview/
  progressive-video-preview.tsx

components/video-studio/
  error-boundary.tsx
```

### Files to Modify

```
hooks/video-studio/use-video-editor.ts
hooks/video-studio/use-video-timeline.ts
hooks/video-studio/use-video-subtitles.ts

stores/media/media-store.ts
stores/settings/settings-store.ts

types/media/video.ts
types/video-studio/types.ts

components/video-studio/timeline/video-timeline.tsx
components/video-studio/timeline/video-subtitle-track.tsx
components/video-studio/effects/color-correction-panel.tsx
components/video-studio/export/export-dialog.tsx
components/video-studio/export/render-queue.tsx
components/video-studio/export/export-progress.tsx
components/video-studio/preview/video-preview.tsx

lib/plugin/api/media-api.ts
lib/media/video-subtitle.ts
lib/ai/media/video-generation.ts
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-25
**Status**: Ready for Review
