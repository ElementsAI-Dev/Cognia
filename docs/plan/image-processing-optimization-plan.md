# Image Processing System Optimization Plan

## Document Information

- **Project**: Cognia AI Chat Application
- **Module**: Image Studio / Image Processing
- **Created**: 2025-01-25
- **Status**: Planning
- **Priority**: High

---

## Executive Summary

Cognia currently has a comprehensive image processing system with multiple editing modes, but there are significant opportunities for optimization, new features, and improved user experience. This plan focuses on:

1. **Performance Optimization**: GPU acceleration, Web Workers, efficient algorithms
2. **New Processing Features**: AI-powered background removal, advanced filters, retouching tools
3. **Batch Processing**: Multi-image operations, bulk edits, batch export
4. **Improved UX**: Better preview, undo/redo, keyboard shortcuts, drag-drop
5. **Format Support**: HEIC/HEIF support, AVIF, WebP2, RAW formats
6. **AI Integration**: Smart filters, auto-enhancement, object detection
7. **Cross-Platform**: Desktop vs web feature parity

---

## Current State Analysis

### Existing Architecture

**State Management**: `stores/media/image-studio-store.ts`
- Zustand store with localStorage persistence
- 799 lines of code
- Manages images, adjustments, layers, history, settings

**Core Hook**: `hooks/image-studio/use-image-editor.ts`
- 802 lines of code
- Comprehensive image editor with:
  - Image loading (URL, File, Blob)
  - Transform operations (rotate, flip, resize, crop)
  - Adjustments (brightness, contrast, saturation, hue, blur, sharpen)
  - Filter system with plugin registry
  - History management (undo/redo)
  - View controls (zoom, pan)
  - Export (PNG, JPEG, WebP)

**Components** (`components/image-studio/`):
- `image-editor-panel.tsx` - Main panel with 8 editing modes
- `image-cropper.tsx` - 776 lines, crop/rotate/flip
- `image-adjustments.tsx` - 617 lines, adjustments panel
- `image-upscaler.tsx` - Upscaling (2x, 4x)
- `background-remover.tsx` - 743 lines, basic edge detection
- `filters-gallery.tsx` - 547 lines, 24 filter presets
- `text-overlay.tsx` - Text and watermark tools
- `drawing-tools.tsx` - Shape annotations
- `layers-panel.tsx` - Layer management
- `history-panel.tsx` - History visualization
- `image-comparison.tsx` - Before/after comparison

**Image Generation**: `lib/ai/media/image-generation.ts`
- 799 lines
- OpenAI DALL-E (dall-e-3, dall-e-2, gpt-image-1)
- Google Imagen (placeholder implementation)
- Stability AI (partial implementation)
- PPT slide image generation

**Types**: `types/media/image-studio.ts`
- 186 lines
- Cropper, adjustments, upscaler, background, batch, editor modes
- Text overlay, drawing, comparison, layers, history types

### Strengths

1. **Comprehensive Type System**: Well-defined types for all operations
2. **Zustand State Management**: Persistent state with actions
3. **Modular Architecture**: Separate components for each editing mode
4. **Filter Plugin System**: Extensible via media registry
5. **History Management**: Undo/redo with 100-operation limit
6. **Multiple Export Formats**: PNG, JPEG, WebP support

### Limitations & Pain Points

1. **Performance Issues**:
   - All image processing runs on main thread
   - No Web Worker support for heavy operations
   - No GPU acceleration (WebGL/WebGPU)
   - Large images cause UI freeze
   - No progressive loading

2. **Feature Gaps**:
   - Background removal is basic (edge detection only)
   - No AI-powered enhancement
   - No object selection/removal
   - Limited retouching tools
   - No histogram/levels adjustment
   - No curves tool
   - No HSL specific adjustment
   - No noise reduction

3. **Format Support**:
   - No HEIC/HEIF support (iPhone default format)
   - No AVIF support
   - No RAW format support (CR3, NEF, ARW, etc.)
   - Limited WebP2 support

4. **Batch Processing**:
   - Batch export exists but limited
   - No batch editing
   - No preset application across multiple images

5. **UX Issues**:
   - Limited keyboard shortcuts
   - No drag-drop reordering for layers
   - No multi-select for layers
   - No preview split view
   - History panel is basic
   - No full-screen mode

6. **Cross-Platform**:
   - Some features desktop-only
   - No platform-specific optimizations
   - No native file dialogs on desktop

7. **Code Quality**:
   - Duplicate code in adjustment processing
   - Type duplication between store and types
   - Limited error handling
   - No comprehensive test coverage

---

## Development Plan

### Phase 1: Performance Foundation (Priority: Critical)

#### 1.1 Web Worker Integration

**Files to Create**:
- `lib/ai/media/workers/image-worker.ts` - Web Worker for image processing
- `lib/ai/media/workers/worker-types.ts` - Worker message types
- `hooks/image-studio/use-worker-processor.ts` - Worker hook

**Design**:
```typescript
// Worker message types
interface WorkerMessage {
  id: string;
  type: 'load' | 'adjust' | 'filter' | 'transform' | 'export';
  payload: WorkerPayload;
  transferables?: Transferable[];
}

interface WorkerResponse {
  id: string;
  type: 'success' | 'error' | 'progress';
  data?: ImageData | Uint8ClampedArray;
  error?: string;
  progress?: number;
}
```

**Implementation**:
- Move heavy operations to Web Worker
- Operations: adjustments, filters, transforms, export
- Progress reporting for long operations
- Transferable objects for zero-copy

**Files to Modify**:
- `components/image-studio/image-adjustments.tsx`
- `components/image-studio/filters-gallery.tsx`
- `hooks/image-studio/use-image-editor.ts`

#### 1.2 WebGL Acceleration

**Files to Create**:
- `lib/ai/media/webgl/gl-context.ts` - WebGL context management
- `lib/ai/media/webgl/gl-shaders.ts` - Shader programs
- `lib/ai/media/webgl/gl-processor.ts` - WebGL-based processing
- `hooks/image-studio/use-gl-acceleration.ts` - WebGL hook

**Shaders to Implement**:
- Adjustments (brightness, contrast, saturation, hue)
- Blur (Gaussian)
- Sharpen (convolution)
- Color correction (curves, levels)

**Design**:
```typescript
interface GLProcessor {
  initialize(canvas: HTMLCanvasElement): boolean;
  process(image: WebGLTexture, params: ProcessParams): Promise<WebGLTexture>;
  cleanup(): void;
}
```

**Benefits**:
- 10-50x faster for pixel manipulation
- GPU parallelization
- Non-blocking main thread

#### 1.3 Progressive Image Loading

**Files to Create**:
- `lib/ai/media/progressive-loader.ts` - Progressive image decoder
- `components/image-studio/progressive-image.tsx` - Progressive image component

**Implementation**:
- Load low-res preview first
- Progressive refinement
- Blurhash placeholder
- Lazy loading for large images

---

### Phase 2: Advanced Processing Features (Priority: High)

#### 2.1 AI-Powered Background Removal

**Files to Create**:
- `lib/ai/media/background-removal/ai-bg-removal.ts` - AI-based removal
- `lib/ai/media/background-removal/selfie-segmentation.ts` - Selfie segmentation
- `lib/ai/media/background-removal/matte-refine.ts` - Edge refinement

**Options**:
1. **MediaPipe Selfie Segmentation** (Client-side, Fast)
2. **Remove.bg API** (Cloud, Accurate)
3. **TensorFlow.js BodyPix** (Client-side, Medium)

**Design**:
```typescript
interface BackgroundRemovalOptions {
  method: 'mediapipe' | 'removebg' | 'tensorflow' | 'basic';
  edgeSmoothness: number; // 0-100
  hairDetail: number; // 0-100
}

interface BackgroundRemovalResult {
  mask: ImageData;
  foreground: ImageData;
  confidence: number;
}
```

**Files to Modify**:
- `components/image-studio/background-remover.tsx`

#### 2.2 Object Selection & Removal

**Files to Create**:
- `lib/ai/media/object-detection.ts` - Object detection utilities
- `lib/ai/media/object-selection.ts` - Selection tools
- `components/image-studio/object-selector.tsx` - Object selector UI
- `components/image-studio/content-aware-fill.tsx` - Content-aware fill

**Features**:
- Magic wand tool
- Quick selection tool
- Lasso tool
- Object detection (YOLO via TensorFlow.js)
- Content-aware fill for object removal

#### 2.3 Advanced Adjustments

**Files to Create**:
- `lib/ai/media/adjustments/levels.ts` - Levels adjustment
- `lib/ai/media/adjustments/curves.ts` - Curves tool
- `lib/ai/media/adjustments/hsl.ts` - HSL specific adjustment
- `lib/ai/media/adjustments/color-balance.ts` - Color balance
- `lib/ai/media/adjustments/vibrance.ts` - Vibrance & saturation
- `components/image-studio/advanced-adjustments.tsx`

**New Adjustments**:
- Levels (input, output, gamma)
- Curves (RGB and per-channel)
- HSL (hue, saturation, lightness sliders)
- Color balance (shadows, midtones, highlights)
- Vibrance (smart saturation)
- Exposure (highlights, shadows, whites, blacks)
- Temperature & tint
- Split toning
- Color grading wheels

#### 2.4 Noise Reduction & Sharpening

**Files to Create**:
- `lib/ai/media/noise/noise-reduction.ts` - Noise reduction algorithms
- `lib/ai/media/noise/smart-sharpen.ts` - Smart sharpening
- `components/image-studio/noise-reduction-panel.tsx`

**Algorithms**:
- Median filter (salt-and-pepper noise)
- Bilateral filter (edge-preserving smoothing)
- Non-local means (advanced denoising)
- Unsharp mask (sharpening)
- Smart sharpen (edge-aware sharpening)
- High-pass filter (detail extraction)

---

### Phase 3: Batch Processing (Priority: High)

#### 3.1 Batch Editing System

**Files to Create**:
- `stores/media/batch-edit-store.ts` - Batch editing state
- `lib/ai/media/batch/batch-processor.ts` - Batch processing engine
- `hooks/image-studio/use-batch-edit.ts` - Batch edit hook
- `components/image-studio/batch-edit-panel.tsx` - Batch UI

**Features**:
- Select multiple images
- Apply operations to all selected
- Preview with first image
- Progress tracking
- Error handling per image
- Save operation as preset

**Design**:
```typescript
interface BatchOperation {
  id: string;
  type: 'adjust' | 'transform' | 'filter' | 'remove-bg';
  params: Record<string, unknown>;
}

interface BatchEditState {
  selectedImageIds: string[];
  operations: BatchOperation[];
  isProcessing: boolean;
  progress: number;
  results: Map<string, BatchOperationResult>;
}
```

#### 3.2 Enhanced Batch Export

**Files to Modify**:
- `components/image-studio/batch-export-dialog.tsx`

**New Features**:
- Custom naming patterns
- Format conversion
- Size presets (social media, print)
- Watermark application
- Metadata handling
- Compression settings
- Folder structure creation

---

### Phase 4: Format Support (Priority: Medium)

#### 4.1 HEIC/HEIF Support

**Files to Create**:
- `lib/ai/media/codecs/heic-decoder.ts` - HEIC decoding
- `lib/ai/media/codecs/heif-parser.ts` - HEIF parsing

**Implementation**:
- Use `heic2any` library for conversion
- Decode in Web Worker
- Preserve metadata (EXIF, orientation)
- Handle multi-image HEIF containers

#### 4.2 AVIF Support

**Files to Create**:
- `lib/ai/media/codecs/avif-decoder.ts` - AVIF decoding
- `lib/ai/media/codecs/avif-encoder.ts` - AVIF encoding

**Implementation**:
- Check browser support
- Fallback for unsupported browsers
- Quality/compression options

#### 4.3 RAW Format Support

**Files to Create**:
- `lib/ai/media/codecs/raw-parser.ts` - RAW format parsing
- `lib/ai/media/codecs/raw-develop.ts` - RAW development

**Supported Formats**:
- Canon: CR3, CR2
- Nikon: NEF
- Sony: ARW
- Adobe: DNG
- Fujifilm: RAF

**Implementation**:
- Use `rawloader.js` or similar
- Basic RAW development
- White balance presets
- Exposure compensation

---

### Phase 5: AI Integration (Priority: Medium)

#### 5.1 Smart Filters & Effects

**Files to Create**:
- `lib/ai/media/ai/smart-filter.ts` - AI-powered filters
- `lib/ai/media/ai/style-transfer.ts` - Style transfer
- `components/image-studio/ai-filters-gallery.tsx`

**AI Filters**:
- Auto-enhance (analyze image, apply optimal adjustments)
- Scene recognition (apply preset based on scene type)
- Face detection (skin smoothing, teeth whitening)
- Sky replacement
- Style transfer (artistic styles)

#### 5.2 Auto-Enhancement

**Files to Create**:
- `lib/ai/media/ai/auto-enhance.ts` - Auto enhancement engine
- `components/image-studio/auto-enhance-panel.tsx`

**Analysis**:
- Histogram analysis
- Exposure detection (under/over exposed)
- White balance detection
- Skin tone detection
- Scene classification (portrait, landscape, food, etc.)

**Adjustments**:
- Auto exposure
- Auto contrast
- Auto white balance
- Smart saturation
- Vibrance boost

---

### Phase 6: Improved UX (Priority: High)

#### 6.1 Enhanced Preview System

**Files to Create**:
- `components/image-studio/preview-controls.tsx` - Preview controls
- `components/image-studio/split-view.tsx` - Split before/after
- `components/image-studio/loupe-view.tsx` - Loupe zoom

**Features**:
- Split view (horizontal/vertical slider)
- Side-by-side comparison
- Toggle between original and edited
- Loupe (100% zoom preview on hover)
- Full-screen mode
- Zoom to fit / 100% / fill

#### 6.2 Keyboard Shortcuts

**Files to Create**:
- `lib/ai/media/shortcuts/shortcut-registry.ts` - Shortcut registry
- `hooks/image-studio/use-shortcuts.ts` - Shortcut hook
- `components/image-studio/shortcuts-help.tsx` - Help dialog

**Shortcuts**:
- Ctrl+Z: Undo
- Ctrl+Y / Ctrl+Shift+Z: Redo
- Ctrl+S: Save
- Ctrl+E: Export
- Ctrl+R: Rotate right
- Ctrl+Shift+R: Rotate left
- Ctrl+]: Zoom in
- Ctrl+[: Zoom out
- Ctrl+0: Reset zoom
- Ctrl+1: 100% zoom
- Ctrl+F: Fit to view
- [: Decrease adjustment
- ]: Increase adjustment
- Delete: Remove layer/mask
- Ctrl+D: Deselect
- Ctrl+A: Select all
- Ctrl+C: Copy
- Ctrl+V: Paste
- Ctrl+X: Cut

#### 6.3 Layer Management Improvements

**Files to Modify**:
- `components/image-studio/layers-panel.tsx`

**New Features**:
- Drag-drop reordering
- Multi-select (Ctrl+click)
- Group layers
- Layer masks
- Adjustment layers
- Blend modes (multiply, screen, overlay, etc.)
- Opacity per layer
- Lock layer
- Hide/show layer toggle

#### 6.4 Enhanced History Panel

**Files to Modify**:
- `components/image-studio/history-panel.tsx`

**Improvements**:
- Thumbnail previews for each state
- Grouped operations
- Clear history after save
- Branch history (alternate timelines)
- History snapshot (named states)
- Export history as preset

---

### Phase 7: Code Quality & Testing (Priority: High)

#### 7.1 Type Consolidation

**Files to Modify**:
- `types/media/image-studio.ts`
- `stores/media/image-studio-store.ts`

**Actions**:
- Remove duplicate types
- Create shared type module
- Consolidate adjustment types
- Unified operation types

#### 7.2 Error Handling

**Files to Create**:
- `lib/ai/media/errors/error-handler.ts` - Centralized error handling
- `lib/ai/media/errors/error-types.ts` - Error type definitions
- `components/image-studio/error-boundary.tsx` - Error boundary

**Design**:
```typescript
interface ImageProcessingError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

type ErrorCode =
  | 'INVALID_IMAGE_FORMAT'
  | 'IMAGE_TOO_LARGE'
  | 'INSUFFICIENT_MEMORY'
  | 'PROCESSING_FAILED'
  | 'EXPORT_FAILED';
```

#### 7.3 Test Coverage

**Files to Create**:
- `lib/ai/media/workers/image-worker.test.ts`
- `lib/ai/media/webgl/gl-processor.test.ts`
- `lib/ai/media/adjustments/levels.test.ts`
- `lib/ai/media/adjustments/curves.test.ts`
- `lib/ai/media/noise/noise-reduction.test.ts`
- `lib/ai/media/ai/smart-filter.test.ts`
- `hooks/image-studio/use-worker-processor.test.ts`
- `hooks/image-studio/use-batch-edit.test.ts`
- `components/image-studio/object-selector.test.tsx`
- `components/image-studio/split-view.test.tsx`

**Test Scenarios**:
- Unit tests for each algorithm
- Integration tests for worker communication
- Component tests for UI interactions
- E2E tests for complete workflows
- Performance benchmarks

---

### Phase 8: Cross-Platform Optimization (Priority: Medium)

#### 8.1 Platform Detection

**Files to Create**:
- `lib/media/platform/capabilities.ts` - Platform capability detection

**Design**:
```typescript
interface PlatformCapabilities {
  isDesktop: boolean;
  isWeb: boolean;
  platform: 'windows' | 'macos' | 'linux' | 'web';

  // Worker support
  supportsWebWorker: boolean;
  supportsWebGL: boolean;
  supportsWebGL2: boolean;
  supportsWebGPU: boolean;
  supportsOffscreenCanvas: boolean;

  // Format support
  supportsHEIC: boolean;
  supportsAVIF: boolean;
  supportsWebP2: boolean;

  // Native features
  hasNativeFileDialog: boolean;
  hasNativeClipboard: boolean;
}
```

#### 8.2 Feature Flags

**Files to Modify**:
- `stores/settings/settings-store.ts`

**Add to Settings**:
```typescript
interface ImageProcessingSettings {
  // Performance
  useWebWorker: boolean;
  useWebGL: boolean;
  workerCount: number;

  // Quality
  defaultExportQuality: number;
  thumbnailQuality: number;
  previewSize: number;

  // Features
  enableAI: boolean;
  enableBackgroundRemoval: boolean;
  enableObjectDetection: boolean;

  // Format preferences
  preferredFormat: 'png' | 'jpeg' | 'webp' | 'avif';
  heicCompatibilityMode: 'convert' | 'original';
}
```

#### 8.3 Desktop-Specific Features

**Files to Create**:
- `lib/media/native/file-dialog.ts` - Native file dialog
- `lib/media/native/clipboard.ts` - Native clipboard integration
- `hooks/image-studio/use-native-dialogs.ts` - Native dialogs hook

**Features**:
- Native file picker (Tauri)
- Native save dialog
- Native clipboard for images
- System notifications for long operations

---

## Implementation Order

### Sprint 1: Performance Foundation (Week 1-3)
1. Web Worker implementation for adjustments
2. WebGL context and shaders
3. Progressive loading for images
4. Benchmark current vs new performance

### Sprint 2: Background Removal & Objects (Week 3-5)
1. MediaPipe integration for selfie segmentation
2. Remove.bg API integration
3. Object detection with TensorFlow.js
4. Content-aware fill implementation

### Sprint 3: Advanced Adjustments (Week 5-7)
1. Levels adjustment
2. Curves tool
3. HSL adjustment
4. Noise reduction & smart sharpen

### Sprint 4: Batch Processing (Week 7-9)
1. Batch editing system
2. Enhanced batch export
3. Batch preset saving
4. Progress tracking UI

### Sprint 5: Format Support (Week 9-11)
1. HEIC/HEIF support
2. AVIF support
3. RAW format parsing (basic)
4. Format conversion utilities

### Sprint 6: AI Integration (Week 11-13)
1. Smart filter system
2. Auto-enhancement
3. Scene recognition
4. Style transfer (basic)

### Sprint 7: UX Improvements (Week 13-15)
1. Enhanced preview (split view, loupe)
2. Keyboard shortcuts system
3. Layer management improvements
4. Enhanced history panel

### Sprint 8: Polish & Testing (Week 15-17)
1. Type consolidation
2. Error handling
3. Test coverage
4. Documentation
5. Cross-platform testing

---

## Technical Specifications

### Web Worker Architecture

**New File**: `lib/ai/media/workers/image-worker.ts`

```typescript
/// <reference lib="webworker" />

interface WorkerMessage {
  id: string;
  type: 'load' | 'adjust' | 'filter' | 'transform' | 'export';
  payload: {
    imageData?: ImageData;
    adjustments?: ImageAdjustments;
    filter?: FilterDefinition;
    transform?: TransformOptions;
    exportOptions?: ExportOptions;
  };
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'adjust':
        return processAdjustment(id, payload);
      case 'filter':
        return processFilter(id, payload);
      case 'transform':
        return processTransform(id, payload);
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

function processAdjustment(id: string, payload: WorkerMessage['payload']) {
  const { imageData, adjustments } = payload;
  if (!imageData || !adjustments) throw new Error('Missing required parameters');

  // Apply adjustments
  const result = applyAdjustments(imageData, adjustments);

  self.postMessage({
    id,
    type: 'success',
    data: result,
  }, [result.data.buffer]);
}
```

### WebGL Processor Interface

**New File**: `lib/ai/media/webgl/gl-processor.ts`

```typescript
export interface GLProcessorOptions {
  canvas: HTMLCanvasElement;
  contextType?: 'webgl' | 'webgl2';
  precision?: 'lowp' | 'mediump' | 'highp';
}

export interface GLAdjustmentParams {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  // ... other adjustments
}

export class GLProcessor {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private programs: Map<string, WebGLProgram>;
  private textures: Map<string, WebGLTexture>;

  constructor(options: GLProcessorOptions) {
    this.gl = options.canvas.getContext(
      options.contextType || 'webgl2',
      {
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
      }
    ) || options.canvas.getContext('webgl');

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    this.programs = new Map();
    this.textures = new Map();
  }

  initialize(): boolean {
    // Compile shaders
    // Set up textures
    // Create framebuffers
    return true;
  }

  process(
    sourceImage: HTMLImageElement | ImageData,
    params: GLAdjustmentParams
  ): ImageData {
    // Create texture from source
    // Apply shaders
    // Read pixels
    // Return ImageData
  }

  cleanup(): void {
    // Delete programs
    // Delete textures
    // Delete framebuffers
  }
}
```

### Batch Processing State

**New File**: `stores/media/batch-edit-store.ts`

```typescript
interface BatchEditState {
  // Selection
  selectedImageIds: string[];

  // Operations queue
  operations: BatchOperation[];

  // Processing state
  isProcessing: boolean;
  currentOperation: number;
  progress: number;

  // Results
  results: Map<string, ProcessedImage>;
  errors: Map<string, Error>;

  // Presets
  presets: BatchPreset[];

  // Actions
  selectImages: (ids: string[]) => void;
  addOperation: (operation: BatchOperation) => void;
  removeOperation: (index: number) => void;
  clearOperations: () => void;
  startProcessing: () => Promise<void>;
  cancelProcessing: () => void;
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  exportResults: (options: BatchExportOptions) => Promise<void>;
}

export const useBatchEditStore = create<BatchEditState>()(
  persist(
    (set, get) => ({
      selectedImageIds: [],
      operations: [],
      isProcessing: false,
      currentOperation: 0,
      progress: 0,
      results: new Map(),
      errors: new Map(),
      presets: [],

      selectImages: (ids) => set({ selectedImageIds: ids }),
      // ... other actions
    }),
    {
      name: 'batch-edit-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        presets: state.presets,
      }),
    }
  )
);
```

---

## Configuration & Settings

### Image Processing Settings

**Modified**: `stores/settings/settings-store.ts`

```typescript
interface ImageProcessingSettings {
  // Performance
  useWebWorker: boolean;
  useWebGL: boolean;
  workerCount: number;
  maxImageSize: number; // pixels
  thumbnailQuality: number;

  // Quality
  defaultExportQuality: number;
  jpegQuality: number;
  webpQuality: number;
  pngCompressionLevel: number;

  // Features
  enableAI: boolean;
  enableBackgroundRemoval: boolean;
  enableObjectDetection: boolean;
  enableSmartFilters: boolean;

  // Format preferences
  preferredImportFormat: 'original' | 'png' | 'webp';
  preferredExportFormat: 'png' | 'jpeg' | 'webp';
  heicCompatibilityMode: 'convert' | 'original';

  // UI preferences
  defaultEditorMode: EditorMode;
  showGrid: boolean;
  showRulers: boolean;
  autoSave: boolean;
  autoSaveInterval: number;

  // Advanced
  preserveMetadata: boolean;
  embedColorProfile: boolean;
  colorProfile: 'srgb' | 'display-p3' | 'adobergb';
}
```

---

## Performance Targets

### Benchmarks

| Operation | Current (Target) | After Optimization | Target |
|------------|------------------|-------------------|--------|
| Load 4K image | ~2000ms | <500ms | <500ms |
| Apply adjustments | ~1500ms | <200ms | <100ms |
| Apply filter | ~1000ms | <150ms | <50ms |
| Rotate 90° | ~800ms | <100ms | <50ms |
| Background removal | ~5000ms | <1000ms | <500ms |
| Batch export (10 images) | ~15000ms | <5000ms | <3000ms |

### Memory Targets

| Image Size | Memory Before | Memory After | Target |
|------------|---------------|--------------|--------|
| 4K image | ~50MB | ~25MB | <30MB |
| 8K image | ~200MB | ~100MB | <120MB |
| Batch (10 images) | ~500MB | ~200MB | <250MB |

---

## Testing Strategy

### Unit Tests

**Files to Create**:
- `lib/ai/media/workers/image-worker.test.ts`
- `lib/ai/media/webgl/gl-processor.test.ts`
- `lib/ai/media/adjustments/levels.test.ts`
- `lib/ai/media/adjustments/curves.test.ts`
- `lib/ai/media/noise/noise-reduction.test.ts`
- `lib/ai/media/ai/smart-filter.test.ts`

### Integration Tests

**Files to Create**:
- `hooks/image-studio/use-worker-processor.test.ts`
- `hooks/image-studio/use-batch-edit.test.ts`
- `lib/ai/media/batch/batch-processor.test.ts`

### Component Tests

**Files to Create**:
- `components/image-studio/object-selector.test.tsx`
- `components/image-studio/split-view.test.tsx`
- `components/image-studio/batch-edit-panel.test.tsx`
- `components/image-studio/advanced-adjustments.test.tsx`

### E2E Tests

**Files to Create**:
- `e2e/image-studio/workflow.spec.ts`
- `e2e/image-studio/batch-processing.spec.ts`
- `e2e/image-studio/export.spec.ts`

---

## Dependencies

### External Packages

- `heic2any` - HEIC to JPEG/PNG conversion
- `@mediapipe/selfie_segmentation` - Selfie segmentation
- `@tensorflow-models/coco-ssd` - Object detection
- `rawloader.js` - RAW format parsing
- `comlink` - Web Worker communication
- `webgl-worker` - WebGL in workers

### Internal Dependencies

- `types/media/image-studio` - Image types
- `stores/media/image-studio-store` - Image state
- `stores/media/batch-edit-store` - Batch state (new)
- `lib/plugin/api/media-api` - Filter registry

---

## Migration Path

### Backward Compatibility

1. **Keep existing components**: Add new features alongside
2. **Feature flags**: Allow users to opt-in to new features
3. **Progressive enhancement**: Detect capabilities and enable features
4. **Fallbacks**: Provide fallbacks for unsupported features

### Rollback Plan

1. **Settings controls**: Disable experimental features
2. **Version tracking**: Track which edits were made with which version
3. **Compatibility mode**: Render old edits correctly
4. **Safe defaults**: Default to stable features

---

## Success Metrics

### Performance

1. Image operations <500ms for 4K images
2. UI never freezes (60fps maintained)
3. Memory usage <300MB for batch processing

### Quality

1. AI background removal >90% accuracy
2. Auto-enhancement improves perceived quality
3. Export quality matches professional tools

### Adoption

1. Batch editing usage >20% of multi-image workflows
2. AI features used in >30% of sessions
3. Keyboard shortcuts adoption >15%

---

## Open Questions

1. **WebGL in Workers**: WebGL in Web Workers is not widely supported
   - Option A: Use OffscreenCanvas where available
   - Option B: Keep WebGL on main thread, other ops in worker
   - Option C: Use WebGPU (when available)

2. **AI Model Size**: MediaPipe models are large (~10MB)
   - Lazy load models
   - Compress models
   - Use model sharding

3. **RAW Format Support**: Full RAW support is complex
   - Start with basic support (preview, simple edits)
   - Use external service for full RAW development
   - Partner with existing RAW processors

4. **HEIC Patent**: HEIC has patent considerations
   - Use heic2any (handles licensing)
   - Offer as opt-in feature
   - Consider AVIF as alternative

---

## Appendix: File Inventory

### Files to Create

```
lib/ai/media/workers/
  image-worker.ts
  worker-types.ts

lib/ai/media/webgl/
  gl-context.ts
  gl-shaders.ts
  gl-processor.ts

lib/ai/media/background-removal/
  ai-bg-removal.ts
  selfie-segmentation.ts
  matte-refine.ts

lib/ai/media/object-detection.ts
lib/ai/media/object-selection.ts
lib/ai/media/content-aware-fill.ts

lib/ai/media/adjustments/
  levels.ts
  curves.ts
  hsl.ts
  color-balance.ts
  vibrance.ts
  exposure.ts

lib/ai/media/noise/
  noise-reduction.ts
  smart-sharpen.ts

lib/ai/media/batch/
  batch-processor.ts
  batch-operations.ts

lib/ai/media/ai/
  smart-filter.ts
  style-transfer.ts
  auto-enhance.ts
  scene-recognition.ts

lib/ai/media/codecs/
  heic-decoder.ts
  heif-parser.ts
  avif-decoder.ts
  avif-encoder.ts
  raw-parser.ts
  raw-develop.ts

lib/ai/media/
  progressive-loader.ts
  shortcuts/shortcut-registry.ts
  errors/error-handler.ts
  errors/error-types.ts

lib/media/platform/capabilities.ts
lib/media/native/file-dialog.ts
lib/media/native/clipboard.ts

hooks/image-studio/
  use-worker-processor.ts
  use-gl-acceleration.ts
  use-batch-edit.ts
  use-shortcuts.ts
  use-native-dialogs.ts

stores/media/
  batch-edit-store.ts

components/image-studio/
  object-selector.tsx
  content-aware-fill.tsx
  advanced-adjustments.tsx
  noise-reduction-panel.tsx
  ai-filters-gallery.tsx
  auto-enhance-panel.tsx
  split-view.tsx
  loupe-view.tsx
  preview-controls.tsx
  shortcuts-help.tsx
  batch-edit-panel.tsx
  progressive-image.tsx
  error-boundary.tsx
```

### Files to Modify

```
components/image-studio/background-remover.tsx
components/image-studio/filters-gallery.tsx
components/image-studio/image-adjustments.tsx
components/image-studio/image-cropper.tsx
components/image-studio/image-editor-panel.tsx
components/image-studio/layers-panel.tsx
components/image-studio/history-panel.tsx
components/image-studio/batch-export-dialog.tsx

hooks/image-studio/use-image-editor.ts
hooks/image-studio/use-image-editor-shortcuts.ts

stores/media/image-studio-store.ts
stores/settings/settings-store.ts

types/media/image-studio.ts

lib/ai/media/image-generation.ts
lib/ai/media/image-utils.ts
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-25
**Status**: Ready for Review
