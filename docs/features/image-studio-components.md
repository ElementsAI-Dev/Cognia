# Image Studio Components

This document provides an overview of the Image Studio components, their features, and usage examples.

## Overview

The Image Studio module provides a comprehensive set of components for image editing, manipulation, and enhancement. All components are designed to work together seamlessly and can be used independently or integrated into the main `ImageEditorPanel`.

## Components

### 1. TextOverlay

Add text annotations and watermarks to images with full styling control.

**Features:**
- Multiple text layers
- Font family, size, weight, and style controls
- Color and opacity settings
- Rotation and positioning (drag-and-drop)
- Text alignment (left, center, right)
- Shadow effects with customizable color and blur
- Real-time preview

**Usage:**
```tsx
import { TextOverlay } from '@/components/image-studio';

<TextOverlay
  imageUrl="/path/to/image.jpg"
  onApply={(result) => console.log('Applied:', result.dataUrl)}
  onCancel={() => console.log('Cancelled')}
/>
```

---

### 2. DrawingTools

Annotate images with freehand drawing and shapes.

**Features:**
- Freehand brush drawing
- Highlighter tool
- Shape tools: Rectangle, Circle, Line, Arrow
- Stroke color, width, and opacity
- Fill option for shapes
- Undo/Redo support
- Clear all drawings
- Export to image

**Usage:**
```tsx
import { DrawingTools } from '@/components/image-studio';

<DrawingTools
  imageUrl="/path/to/image.jpg"
  onApply={(result) => console.log('Applied:', result.dataUrl)}
  onCancel={() => console.log('Cancelled')}
/>
```

---

### 3. ImageComparison

Compare two images with multiple visualization modes.

**Features:**
- Horizontal slider comparison
- Vertical slider comparison
- Side-by-side view
- Onion skin overlay (adjustable opacity)
- Toggle between images
- Fullscreen mode
- Custom labels

**Usage:**
```tsx
import { ImageComparison } from '@/components/image-studio';

<ImageComparison
  beforeImage="/path/to/before.jpg"
  afterImage="/path/to/after.jpg"
  beforeLabel="Original"
  afterLabel="Edited"
  initialMode="slider-h"
/>
```

---

### 4. FiltersGallery

Apply preset filters with visual previews.

**Features:**
- 25+ filter presets organized by category
- Categories: Basic, Vintage, Cinematic, Artistic, B&W
- Thumbnail previews for each filter
- Adjustable filter intensity (0-100%)
- Real-time preview on hover
- Click to select and apply

**Usage:**
```tsx
import { FiltersGallery } from '@/components/image-studio';

<FiltersGallery
  imageUrl="/path/to/image.jpg"
  onApply={(result) => {
    console.log('Filter:', result.filter.name);
    console.log('Intensity:', result.intensity);
    console.log('Result:', result.dataUrl);
  }}
  onCancel={() => console.log('Cancelled')}
/>
```

---

### 5. LayersPanel

Manage image layers with full control.

**Features:**
- Layer list with thumbnails
- Visibility toggle (show/hide)
- Lock/unlock layers
- Opacity control (0-100%)
- Blend modes (Normal, Multiply, Screen, Overlay, etc.)
- Drag-and-drop reordering
- Rename layers (double-click)
- Duplicate and delete layers
- Add new layers (Image, Mask, Adjustment)

**Usage:**
```tsx
import { LayersPanel, type Layer } from '@/components/image-studio';

const [layers, setLayers] = useState<Layer[]>([
  { id: '1', name: 'Background', type: 'image', visible: true, locked: false, opacity: 100, blendMode: 'normal', order: 0 }
]);
const [activeLayerId, setActiveLayerId] = useState('1');

<LayersPanel
  layers={layers}
  activeLayerId={activeLayerId}
  onLayerSelect={setActiveLayerId}
  onLayerUpdate={(id, updates) => {
    setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  }}
  onLayerDelete={(id) => setLayers(layers.filter(l => l.id !== id))}
  onLayerDuplicate={(id) => {/* duplicate logic */}}
  onLayerAdd={(type) => {/* add layer logic */}}
  onLayerReorder={(from, to) => {/* reorder logic */}}
/>
```

---

### 6. HistoryPanel

Visual undo/redo timeline.

**Features:**
- Timeline view of all operations
- Visual icons for operation types
- Timestamps with relative time display
- Click to navigate to any state
- Undo/Redo buttons with keyboard shortcuts
- Clear history with confirmation
- Current state indicator

**Usage:**
```tsx
import { HistoryPanel, type HistoryEntry } from '@/components/image-studio';

const [history, setHistory] = useState<HistoryEntry[]>([]);
const [currentIndex, setCurrentIndex] = useState(-1);

<HistoryPanel
  entries={history}
  currentIndex={currentIndex}
  onNavigate={(index) => setCurrentIndex(index)}
  onUndo={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
  onRedo={() => setCurrentIndex(Math.min(history.length - 1, currentIndex + 1))}
  onClear={() => { setHistory([]); setCurrentIndex(-1); }}
  canUndo={currentIndex > 0}
  canRedo={currentIndex < history.length - 1}
/>
```

---

### 7. ImageEditorPanel

Main editor panel that integrates all editing modes.

**Features:**
- Tab-based mode switching
- Integrated modes: Mask, Crop, Adjust, Filters, Text, Draw, Upscale, Remove BG
- Unified save/cancel interface
- Responsive layout

**Usage:**
```tsx
import { ImageEditorPanel, type EditorMode } from '@/components/image-studio';

<ImageEditorPanel
  imageUrl="/path/to/image.jpg"
  initialMode="crop"
  onSave={(result) => {
    console.log('Mode:', result.mode);
    console.log('Result:', result.dataUrl);
  }}
  onCancel={() => console.log('Cancelled')}
/>
```

---

## Keyboard Shortcuts

The image editor supports common keyboard shortcuts:

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Undo | `Ctrl+Z` | `⌘+Z` |
| Redo | `Ctrl+Y` / `Ctrl+Shift+Z` | `⌘+Shift+Z` |
| Save | `Ctrl+S` | `⌘+S` |
| Cancel | `Esc` | `Esc` |
| Zoom In | `Ctrl++` | `⌘++` |
| Zoom Out | `Ctrl+-` | `⌘+-` |
| Reset Zoom | `Ctrl+0` | `⌘+0` |
| Fullscreen | `F11` | `F11` |
| Delete | `Delete` | `Delete` |

Use the `useImageEditorShortcuts` hook to add keyboard shortcuts to custom components:

```tsx
import { useImageEditorShortcuts } from '@/hooks/image-studio';

function MyEditor() {
  useImageEditorShortcuts({
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
    onSave: () => console.log('Save'),
    enabled: true,
  });
  
  return <div>...</div>;
}
```

---

## Types

All component types are exported from `@/components/image-studio` and `@/types`:

```tsx
import type {
  EditorMode,
  TextLayerConfig,
  DrawingShapeConfig,
  DrawingShapeType,
  ComparisonMode,
  LayerConfig,
  LayerType,
  BlendMode,
  HistoryOperationType,
  HistoryEntryConfig,
} from '@/types';
```

---

## Integration with Store

The components can be integrated with the `useImageStudioStore` for state management:

```tsx
import { useImageStudioStore } from '@/stores/media/image-studio-store';

function MyImageEditor() {
  const { currentImage, updateImage } = useImageStudioStore();
  
  return (
    <ImageEditorPanel
      imageUrl={currentImage.url}
      onSave={(result) => updateImage(result.dataUrl)}
    />
  );
}
```
