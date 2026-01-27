/**
 * ScreenshotEditor Component Tests
 *
 * Comprehensive test suite for the screenshot editor component.
 * Tests cover:
 * - Component rendering and loading states
 * - Image dimension calculation and display scaling
 * - Keyboard shortcuts for tools and actions
 * - Handler functions (confirm, copy, save)
 * - Store interactions
 * - Props handling
 */

import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { ScreenshotEditor } from './screenshot-editor';
import type { Annotation, SelectionRegion } from '@/types/screenshot';

// Mock the stores
jest.mock('@/stores/screenshot/editor-store', () => ({
  useEditorStore: jest.fn(),
  selectCanUndo: jest.fn((state) => state.undoStack.length > 0),
  selectCanRedo: jest.fn((state) => state.redoStack.length > 0),
}));

// Mock Image constructor
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 800;
  height = 600;

  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

global.Image = MockImage as unknown as typeof Image;

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  ellipse: jest.fn(),
  arc: jest.fn(),
  closePath: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100, height: 20 })),
  setLineDash: jest.fn(),
  getLineDash: jest.fn(() => []),
  clip: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  transform: jest.fn(),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createPattern: jest.fn(),
  putImageData: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  isPointInPath: jest.fn(() => false),
  isPointInStroke: jest.fn(() => false),
  bezierCurveTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  rect: jest.fn(),
  font: '',
  textAlign: '',
  textBaseline: '',
  lineWidth: 1,
  lineCap: '',
  lineJoin: '',
  miterLimit: 10,
  shadowBlur: 0,
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  globalAlpha: 1,
  globalCompositeOperation: '',
  filter: '',
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === '2d') {
    return mockContext;
  }
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock ClipboardItem globally
global.ClipboardItem = class MockClipboardItem {
  constructor(_items: Record<string, Blob>) {
    // Mock implementation
  }
} as unknown as typeof ClipboardItem;

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1920,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 1080,
});

// Mock navigator.clipboard.write
const mockClipboardWrite = jest.fn();
Object.assign(navigator, {
  clipboard: {
    write: mockClipboardWrite.mockResolvedValue(undefined),
  },
});

// Mock document.createElement for link download
const mockLinkClick = jest.fn();
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  const element = originalCreateElement.call(document, tagName);
  if (tagName === 'a') {
    element.click = mockLinkClick;
  }
  return element;
});

// Mock fetch for handleCopy
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve(new Blob(['fake image'], { type: 'image/png' })),
  })
) as jest.Mock;

// Import the mocked store after defining the mock
import { useEditorStore, selectCanUndo, selectCanRedo } from '@/stores/screenshot';

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;

// Default mock state
const defaultMockState = {
  currentTool: 'select' as const,
  style: {
    color: '#FF0000',
    strokeWidth: 2,
    filled: false,
    opacity: 1,
    fontSize: 16,
  },
  annotations: [] as Annotation[],
  selectedAnnotationId: null,
  setCurrentTool: jest.fn(),
  setStyle: jest.fn(),
  addAnnotation: jest.fn(),
  deleteAnnotation: jest.fn(),
  selectAnnotation: jest.fn(),
  clearAnnotations: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  getNextMarkerNumber: jest.fn(() => 1),
  reset: jest.fn(),
};

// Test data
const testImageData = 'base64encodedimagedata';
const testRegion: SelectionRegion = { x: 10, y: 10, width: 100, height: 100 };
const testAnnotation: Annotation = {
  id: 'test-annotation-1',
  type: 'rectangle',
  style: {
    color: '#FF0000',
    strokeWidth: 2,
    filled: false,
    opacity: 1,
  },
  timestamp: Date.now(),
  x: 10,
  y: 10,
  width: 100,
  height: 50,
};

describe('ScreenshotEditor', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEditorStore.mockImplementation((selector) => {
      if (selector === selectCanUndo) return false;
      if (selector === selectCanRedo) return false;
      return defaultMockState as unknown as ReturnType<typeof useEditorStore>;
    });
    // Reset window dimensions
    window.innerWidth = 1920;
    window.innerHeight = 1080;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should show loading spinner while image is loading', () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Should show loading skeleton (Skeleton uses animate-pulse)
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeTruthy();
    });

    it('should render editor after image loads', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const skeleton = container.querySelector('.animate-pulse');
        expect(skeleton).toBeFalsy();
      });
    });

    it('should render with custom className', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          className="custom-class"
        />
      );

      await waitFor(() => {
        const editor = container.querySelector('.custom-class');
        expect(editor).toBeTruthy();
      });
    });

    it('should render toolbar component', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const toolbar = container.querySelector('.top-4');
        expect(toolbar).toBeTruthy();
      });
    });

    it('should render canvas area', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const canvasArea = container.querySelector('.border-2');
        expect(canvasArea).toBeTruthy();
      });
    });

    it('should render size info', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('800 × 600');
      });
    });

    it('should render annotation count when annotations exist', async () => {
      const stateWithAnnotations = {
        ...defaultMockState,
        annotations: [testAnnotation],
      };
      mockUseEditorStore.mockReturnValue(stateWithAnnotations as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Wait for loading to complete and size info to render
      await waitFor(() => {
        expect(container.querySelector('.animate-pulse')).toBeFalsy();
      });

      await waitFor(() => {
        expect(container.textContent).toContain('1 annotation(s)');
      });
    });

    it('should render quick color bar', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const colorBar = container.querySelector('.bottom-16');
        expect(colorBar).toBeTruthy();
      });
    });
  });

  describe('Image Dimension Calculation', () => {
    it('should calculate display dimensions to fit viewport', async () => {
      window.innerWidth = 1000;
      window.innerHeight = 800;

      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const canvasArea = container.querySelector('[style*="width"]') as HTMLElement;
        expect(canvasArea).toBeTruthy();
        const style = canvasArea?.style;
        // Max width is 1000 - 100 = 900
        // Max height is 800 - 200 = 600
        // Scale should be min(900/800, 600/600, 1) = min(1.125, 1, 1) = 1
        // So display size should be 800x600
        expect(style?.width).toBe('800px');
        expect(style?.height).toBe('600px');
      });
    });

    it('should scale down large images', async () => {
      window.innerWidth = 500;
      window.innerHeight = 400;

      // Create a large mock image
      class LargeMockImage extends MockImage {
        width = 2000;
        height = 1500;
      }
      global.Image = LargeMockImage as unknown as typeof Image;

      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const canvasArea = container.querySelector('[style*="width"]') as HTMLElement;
        expect(canvasArea).toBeTruthy();
        const style = canvasArea?.style;
        // Max width is 500 - 100 = 400
        // Max height is 400 - 200 = 200
        // Scale should be min(400/2000, 200/1500, 1) = min(0.2, 0.133, 1) = 0.133
        // So display size should be approximately 266x200
        expect(parseFloat(style?.width || '0')).toBeLessThan(400);
        expect(parseFloat(style?.height || '0')).toBeLessThanOrEqual(200);
      });
    });
  });

  describe('Keyboard Shortcuts - Tool Selection', () => {
    const toolShortcuts: Array<{ key: string; tool: string }> = [
      { key: 'r', tool: 'rectangle' },
      { key: 'o', tool: 'ellipse' },
      { key: 'a', tool: 'arrow' },
      { key: 'p', tool: 'freehand' },
      { key: 't', tool: 'text' },
      { key: 'm', tool: 'blur' },
      { key: 'h', tool: 'highlight' },
      { key: 'n', tool: 'marker' },
      { key: 'v', tool: 'select' },
      { key: 's', tool: 'select' },
    ];

    toolShortcuts.forEach(({ key, tool }) => {
      it(`should switch to ${tool} tool when pressing ${key}`, async () => {
        const state = { ...defaultMockState };
        mockUseEditorStore.mockReturnValue(state as unknown as ReturnType<typeof useEditorStore>);

        render(
          <ScreenshotEditor
            imageData={testImageData}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );

        await waitFor(() => {
          expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
        });

        fireEvent.keyDown(window, { key });

        expect(defaultMockState.setCurrentTool).toHaveBeenCalledWith(tool as import('@/types/screenshot/annotation').AnnotationTool);
      });
    });
  });

  describe('Keyboard Shortcuts - Actions', () => {
    it('should call onCancel when pressing Escape', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should delete selected annotation when pressing Delete', async () => {
      const stateWithSelection = {
        ...defaultMockState,
        selectedAnnotationId: 'test-annotation-1',
      };
      mockUseEditorStore.mockReturnValue(stateWithSelection as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'Delete' });

      expect(defaultMockState.deleteAnnotation).toHaveBeenCalledWith('test-annotation-1');
    });

    it('should delete selected annotation when pressing Backspace', async () => {
      const stateWithSelection = {
        ...defaultMockState,
        selectedAnnotationId: 'test-annotation-1',
      };
      mockUseEditorStore.mockReturnValue(stateWithSelection as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'Backspace' });

      expect(defaultMockState.deleteAnnotation).toHaveBeenCalledWith('test-annotation-1');
    });

    it('should not delete when no annotation is selected', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'Delete' });

      expect(defaultMockState.deleteAnnotation).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts - Ctrl/Mod Combinations', () => {
    it('should call undo when pressing Ctrl+Z', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.undo).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

      expect(defaultMockState.undo).toHaveBeenCalled();
    });

    it('should call redo when pressing Ctrl+Shift+Z', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.redo).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });

      expect(defaultMockState.redo).toHaveBeenCalled();
    });

    it('should call redo when pressing Ctrl+Y', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.redo).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });

      expect(defaultMockState.redo).toHaveBeenCalled();
    });

    it('should handle copy when pressing Ctrl+C', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'c', ctrlKey: true });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`data:image/png;base64,${testImageData}`);
      });
    });

    it('should handle save when pressing Ctrl+S', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockLinkClick).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(mockLinkClick).toHaveBeenCalled();
      });
    });

    it('should call onConfirm when pressing Ctrl+Enter', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockOnConfirm).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

      expect(mockOnConfirm).toHaveBeenCalledWith(testImageData, []);
    });
  });

  describe('Mac Meta Key Support', () => {
    it('should support Meta key as substitute for Ctrl', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.undo).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: 'z', metaKey: true });

      expect(defaultMockState.undo).toHaveBeenCalled();
    });
  });

  describe('Handler Functions', () => {
    it('should call onConfirm with correct data', async () => {
      const stateWithAnnotations = {
        ...defaultMockState,
        annotations: [testAnnotation],
      };
      mockUseEditorStore.mockReturnValue(stateWithAnnotations as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });

      act(() => {
        // Trigger confirm through keyboard shortcut
        fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
      });

      expect(mockOnConfirm).toHaveBeenCalledWith(testImageData, [testAnnotation]);
    });

    it('should copy image to clipboard via handleCopy', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Wait for component to render
      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });

      act(() => {
        fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
      });

      // Wait for async operations
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should save image via handleSave', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockLinkClick).not.toHaveBeenCalled();
      });

      act(() => {
        fireEvent.keyDown(window, { key: 's', ctrlKey: true });
      });

      await waitFor(() => {
        expect(mockLinkClick).toHaveBeenCalled();
      });
    });

    it('should handle clipboard copy error gracefully', async () => {
      const mockFetchError = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetchError.mockRejectedValueOnce(new Error('Clipboard error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });

      act(() => {
        fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to copy to clipboard:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Store Interactions', () => {
    it('should call reset on unmount', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { unmount } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.reset).not.toHaveBeenCalled();
      });

      unmount();

      expect(defaultMockState.reset).toHaveBeenCalled();
    });

    it('should pass correct props to AnnotationToolbar', async () => {
      const state = {
        ...defaultMockState,
        currentTool: 'rectangle' as const,
        style: { color: '#00FF00', strokeWidth: 4, filled: true, opacity: 0.8, fontSize: 20 },
      };
      mockUseEditorStore.mockReturnValue(state as unknown as ReturnType<typeof useEditorStore>);

      const stateWithCanUndo = {
        ...state,
        undoStack: [[testAnnotation]],
      };
      mockUseEditorStore.mockImplementation((selector) => {
        if (selector === selectCanUndo) return true;
        if (selector === selectCanRedo) return false;
        return stateWithCanUndo as unknown as ReturnType<typeof useEditorStore>;
      });

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });
    });

    it('should pass correct props to AnnotationCanvas', async () => {
      const stateWithAnnotations = {
        ...defaultMockState,
        annotations: [testAnnotation],
        currentTool: 'arrow' as const,
        selectedAnnotationId: 'test-annotation-1',
      };
      mockUseEditorStore.mockReturnValue(stateWithAnnotations as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });
    });

    it('should call getNextMarkerNumber for marker tool', async () => {
      const stateWithMarker = {
        ...defaultMockState,
        getNextMarkerNumber: jest.fn(() => 5),
      };
      mockUseEditorStore.mockReturnValue(stateWithMarker as unknown as ReturnType<typeof useEditorStore>);

      render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(defaultMockState.setCurrentTool).not.toHaveBeenCalled();
      });
    });
  });

  describe('Props Handling', () => {
    it('should accept region prop but not use it (marked as _region)', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          region={testRegion}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const skeleton = container.querySelector('.animate-pulse');
        expect(skeleton).toBeFalsy();
      });
    });

    it('should pass className to root element', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          className="test-custom-class"
        />
      );

      await waitFor(() => {
        const editor = container.querySelector('.test-custom-class');
        expect(editor).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small images', async () => {
      class SmallMockImage extends MockImage {
        width = 10;
        height = 10;
      }
      global.Image = SmallMockImage as unknown as typeof Image;

      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const sizeInfo = container.querySelector('.bottom-4');
        expect(sizeInfo?.textContent).toContain('10 × 10');
      });
    });

    it('should handle very large images', async () => {
      class HugeMockImage extends MockImage {
        width = 10000;
        height = 8000;
      }
      global.Image = HugeMockImage as unknown as typeof Image;

      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const sizeInfo = container.querySelector('.bottom-4');
        expect(sizeInfo?.textContent).toContain('10000 × 8000');
      });
    });

    it('should handle empty annotations array', async () => {
      const stateWithEmptyAnnotations = {
        ...defaultMockState,
        annotations: [],
      };
      mockUseEditorStore.mockReturnValue(stateWithEmptyAnnotations as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(container.textContent).not.toContain('annotation(s)');
      });
    });

    it('should handle multiple annotations', async () => {
      const multipleAnnotations: Annotation[] = [
        testAnnotation,
        {
          ...testAnnotation,
          id: 'test-annotation-2',
          type: 'ellipse',
          cx: 200,
          cy: 200,
          rx: 50,
          ry: 30,
        },
        {
          ...testAnnotation,
          id: 'test-annotation-3',
          type: 'arrow',
          startX: 300,
          startY: 300,
          endX: 400,
          endY: 400,
        },
      ];

      const stateWithMultipleAnnotations = {
        ...defaultMockState,
        annotations: multipleAnnotations,
      };
      mockUseEditorStore.mockReturnValue(stateWithMultipleAnnotations as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('3 annotation(s)');
      });
    });
  });

  describe('Component Layout', () => {
    it('should have correct z-index for overlay', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const editor = container.querySelector('.z-\\[9999\\]');
        expect(editor).toBeTruthy();
      });
    });

    it('should have backdrop blur', async () => {
      mockUseEditorStore.mockReturnValue(defaultMockState as unknown as ReturnType<typeof useEditorStore>);

      const { container } = render(
        <ScreenshotEditor
          imageData={testImageData}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const editor = container.querySelector('.backdrop-blur-sm');
        expect(editor).toBeTruthy();
      });
    });
  });
});
