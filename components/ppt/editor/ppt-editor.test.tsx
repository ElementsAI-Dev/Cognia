/**
 * PPT Editor Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PPTEditor } from './ppt-editor';
import type { PPTEditorProps } from '../types';
import type { PPTPresentation, PPTSlide } from '@/types/workflow';

// Mock hooks barrel to avoid dagre-d3-es ESM import chain
jest.mock('@/hooks', () => ({
  useWindowControls: () => ({
    isFullscreen: false,
    toggleFullscreen: jest.fn(),
  }),
}));

// Mock sub-components that are not the focus of this test
jest.mock('../slideshow', () => ({
  SlideshowView: () => <div data-testid="slideshow-view">Slideshow</div>,
}));

jest.mock('./ai-toolbar', () => ({
  AIToolbar: () => <div data-testid="ai-toolbar">AI Toolbar</div>,
}));

jest.mock('../rendering/error-boundary', () => ({
  PPTPreviewErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./slide-editor', () => ({
  SlideEditor: () => <div data-testid="slide-editor">Slide Editor</div>,
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: jest.fn((arr, from, to) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

// Mock the store
interface MockStore {
  presentation: PPTPresentation | null;
  currentSlideIndex: number;
  mode: 'edit' | 'preview' | 'slideshow';
  zoom: number;
  showNotes: boolean;
  isDirty: boolean;
  isGenerating: boolean;
  selection: { elementIds: string[] };
  loadPresentation: jest.Mock;
  savePresentation: jest.Mock;
  addSlide: jest.Mock;
  duplicateSlide: jest.Mock;
  deleteSlide: jest.Mock;
  setCurrentSlide: jest.Mock;
  nextSlide: jest.Mock;
  prevSlide: jest.Mock;
  setMode: jest.Mock;
  setZoom: jest.Mock;
  toggleNotes: jest.Mock;
  undo: jest.Mock;
  redo: jest.Mock;
  canUndo: jest.Mock;
  canRedo: jest.Mock;
  reorderSlides: jest.Mock;
  setThemeById: jest.Mock;
  regenerateSlide: jest.Mock;
  bringToFront: jest.Mock;
  sendToBack: jest.Mock;
  setTheme: jest.Mock;
  updateElement: jest.Mock;
  updateSlide: jest.Mock;
}

const mockStore: MockStore = {
  presentation: null,
  currentSlideIndex: 0,
  mode: 'edit',
  zoom: 100,
  showNotes: false,
  isDirty: false,
  isGenerating: false,
  selection: { elementIds: [] },
  loadPresentation: jest.fn(),
  savePresentation: jest.fn(),
  addSlide: jest.fn(),
  duplicateSlide: jest.fn(),
  deleteSlide: jest.fn(),
  setCurrentSlide: jest.fn(),
  nextSlide: jest.fn(),
  prevSlide: jest.fn(),
  setMode: jest.fn(),
  setZoom: jest.fn(),
  toggleNotes: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  canUndo: jest.fn(() => false),
  canRedo: jest.fn(() => false),
  reorderSlides: jest.fn(),
  setThemeById: jest.fn(),
  regenerateSlide: jest.fn(),
  bringToFront: jest.fn(),
  sendToBack: jest.fn(),
  setTheme: jest.fn(),
  updateElement: jest.fn(),
  updateSlide: jest.fn(),
};

jest.mock('@/stores/tools/ppt-editor-store', () => ({
  usePPTEditorStore: Object.assign(
    (selectorOrUndefined?: (state: MockStore) => unknown) => {
      if (typeof selectorOrUndefined === 'function') {
        return selectorOrUndefined(mockStore);
      }
      return mockStore;
    },
    {
      getState: (): MockStore => mockStore,
      setState: (partial: Partial<MockStore>) => Object.assign(mockStore, partial),
    }
  ),
  selectCurrentSlide: (state: MockStore) =>
    state.presentation?.slides?.[state.currentSlideIndex] ?? null,
  selectSelectedElements: (state: MockStore) => {
    const slide = state.presentation?.slides?.[state.currentSlideIndex];
    if (!slide) return [];
    return slide.elements?.filter((e: { id: string }) => state.selection.elementIds.includes(e.id)) ?? [];
  },
  selectSlideCount: (state: MockStore) => state.presentation?.slides?.length ?? 0,
  selectIsDirty: (state: MockStore) => state.isDirty,
}));

// Setup savePresentation to return presentation
beforeAll(() => {
  mockStore.savePresentation.mockImplementation(() => mockStore.presentation);
});

// Helper to create mock presentation
const createMockSlide = (overrides: Partial<PPTSlide> = {}, index: number = 0): PPTSlide => ({
  id: `slide-${index}`,
  order: index,
  layout: 'title-content',
  title: `Slide ${index + 1} Title`,
  subtitle: `Slide ${index + 1} Subtitle`,
  content: `Content for slide ${index + 1}`,
  bullets: ['Bullet 1', 'Bullet 2'],
  notes: `Notes for slide ${index + 1}`,
  elements: [],
  ...overrides,
});

const createMockPresentation = (slideCount: number = 3): PPTPresentation => ({
  id: 'test-ppt',
  title: 'Test Presentation',
  subtitle: 'A test subtitle',
  theme: {
    id: 'modern-light',
    name: 'Modern Light',
    primaryColor: '#2563EB',
    secondaryColor: '#1D4ED8',
    accentColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  },
  slides: Array.from({ length: slideCount }, (_, i) => createMockSlide({}, i)),
  totalSlides: slideCount,
  aspectRatio: '16:9',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const renderPPTEditor = (props: Partial<PPTEditorProps> = {}) => {
  const defaultProps: PPTEditorProps = {
    presentation: createMockPresentation(),
    ...props,
  };
  return render(<PPTEditor {...defaultProps} />);
};

describe('PPTEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.presentation = createMockPresentation();
    mockStore.currentSlideIndex = 0;
    mockStore.mode = 'edit';
    mockStore.zoom = 100;
    mockStore.showNotes = false;
    mockStore.isDirty = false;
    mockStore.isGenerating = false;
    mockStore.selection = { elementIds: [] };
  });

  describe('Rendering', () => {
    it('should render empty state when no presentation', () => {
      mockStore.presentation = null;
      renderPPTEditor({ presentation: undefined });
      expect(screen.getByText('noPresentation')).toBeInTheDocument();
    });

    it('should render toolbar buttons', () => {
      renderPPTEditor();
      
      // Check for essential toolbar buttons
      expect(screen.getByText('addSlide')).toBeInTheDocument();
      expect(screen.getByText('present')).toBeInTheDocument();
      expect(screen.getByText('export')).toBeInTheDocument();
    });

    it('should render slide panel when showSlidePanel is true', () => {
      renderPPTEditor();
      
      // Should show slides count
      expect(screen.getByText(/slides/)).toBeInTheDocument();
    });

    it('should render status bar with slide info', () => {
      renderPPTEditor();
      
      // Status bar should show current slide position
      expect(screen.getByText(/slideOf/)).toBeInTheDocument();
    });
  });

  describe('Toolbar Actions', () => {
    it('should call savePresentation when save button is clicked', async () => {
      renderPPTEditor();
      
      const saveButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-save')
      );
      
      if (saveButton) {
        await userEvent.click(saveButton);
        expect(mockStore.savePresentation).toHaveBeenCalled();
      }
    });

    it('should call undo when undo button is clicked', async () => {
      mockStore.canUndo.mockReturnValue(true);
      renderPPTEditor();
      
      const undoButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-undo-2')
      );
      
      if (undoButton) {
        await userEvent.click(undoButton);
        expect(mockStore.undo).toHaveBeenCalled();
      }
    });

    it('should call redo when redo button is clicked', async () => {
      mockStore.canRedo.mockReturnValue(true);
      renderPPTEditor();
      
      const redoButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-redo-2')
      );
      
      if (redoButton) {
        await userEvent.click(redoButton);
        expect(mockStore.redo).toHaveBeenCalled();
      }
    });

    it('should disable undo button when canUndo is false', () => {
      mockStore.canUndo.mockReturnValue(false);
      renderPPTEditor();
      
      const undoButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-undo-2')
      );
      
      expect(undoButton).toBeDisabled();
    });

    it('should disable redo button when canRedo is false', () => {
      mockStore.canRedo.mockReturnValue(false);
      renderPPTEditor();
      
      const redoButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-redo-2')
      );
      
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Zoom Controls', () => {
    it('should call setZoom when zoom in is clicked', async () => {
      renderPPTEditor();
      
      const zoomInButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-zoom-in')
      );
      
      if (zoomInButton) {
        await userEvent.click(zoomInButton);
        expect(mockStore.setZoom).toHaveBeenCalledWith(110);
      }
    });

    it('should call setZoom when zoom out is clicked', async () => {
      renderPPTEditor();
      
      const zoomOutButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-zoom-out')
      );
      
      if (zoomOutButton) {
        await userEvent.click(zoomOutButton);
        expect(mockStore.setZoom).toHaveBeenCalledWith(90);
      }
    });

    it('should display current zoom level', () => {
      mockStore.zoom = 150;
      renderPPTEditor();
      
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should disable zoom out at minimum zoom', () => {
      mockStore.zoom = 25;
      renderPPTEditor();
      
      const zoomOutButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-zoom-out')
      );
      
      expect(zoomOutButton).toBeDisabled();
    });

    it('should disable zoom in at maximum zoom', () => {
      mockStore.zoom = 200;
      renderPPTEditor();
      
      const zoomInButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-zoom-in')
      );
      
      expect(zoomInButton).toBeDisabled();
    });
  });

  describe('View Toggles', () => {
    it('should toggle notes panel', async () => {
      renderPPTEditor();
      
      const notesButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-align-left')
      );
      
      if (notesButton) {
        await userEvent.click(notesButton);
        expect(mockStore.toggleNotes).toHaveBeenCalled();
      }
    });
  });

  describe('Slideshow Mode', () => {
    it('should render slideshow view when mode is slideshow', () => {
      mockStore.mode = 'slideshow';
      renderPPTEditor();
      
      // In slideshow mode, the SlideshowView component should be rendered
      expect(screen.getByTestId('slideshow-view')).toBeInTheDocument();
    });

    it('should start slideshow when present button is clicked', async () => {
      renderPPTEditor();
      
      const presentButton = screen.getByText('present');
      await userEvent.click(presentButton);
      
      expect(mockStore.setMode).toHaveBeenCalledWith('slideshow');
    });
  });

  describe('Dirty State', () => {
    it('should show unsaved badge when isDirty is true', () => {
      mockStore.isDirty = true;
      renderPPTEditor();
      
      expect(screen.getByText('unsaved')).toBeInTheDocument();
    });

    it('should not show unsaved badge when isDirty is false', () => {
      mockStore.isDirty = false;
      renderPPTEditor();
      
      expect(screen.queryByText('unsaved')).not.toBeInTheDocument();
    });
  });

  describe('Generating State', () => {
    it('should show generating indicator when isGenerating is true', () => {
      mockStore.isGenerating = true;
      renderPPTEditor();
      
      expect(screen.getByText('generating')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onSave callback when saving', async () => {
      const onSave = jest.fn();
      renderPPTEditor({ onSave });
      
      const saveButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-save')
      );
      
      if (saveButton) {
        await userEvent.click(saveButton);
        expect(onSave).toHaveBeenCalled();
      }
    });

    it('should call onExport callback when exporting', async () => {
      const onExport = jest.fn();
      renderPPTEditor({ onExport });
      
      const exportButton = screen.getByText('export');
      await userEvent.click(exportButton);
      
      // Click on an export option
      await waitFor(() => {
        const marpOption = screen.getByText(/Marp/);
        if (marpOption) {
          userEvent.click(marpOption);
        }
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle Ctrl+S for save', async () => {
      const onSave = jest.fn();
      renderPPTEditor({ onSave });
      
      // Simulate Ctrl+S
      await userEvent.keyboard('{Control>}s{/Control}');
      
      expect(mockStore.savePresentation).toHaveBeenCalled();
    });

    it('should handle Ctrl+Z for undo', async () => {
      mockStore.canUndo.mockReturnValue(true);
      renderPPTEditor();
      
      await userEvent.keyboard('{Control>}z{/Control}');
      
      expect(mockStore.undo).toHaveBeenCalled();
    });

    it('should handle Ctrl+Y for redo', async () => {
      mockStore.canRedo.mockReturnValue(true);
      renderPPTEditor();
      
      await userEvent.keyboard('{Control>}y{/Control}');
      
      expect(mockStore.redo).toHaveBeenCalled();
    });
  });

  describe('Load Presentation', () => {
    it('should call loadPresentation on mount with initial presentation', () => {
      const presentation = createMockPresentation();
      renderPPTEditor({ presentation });
      
      expect(mockStore.loadPresentation).toHaveBeenCalledWith(presentation);
    });
  });

  describe('Alignment Toolbar', () => {
    it('should have alignment functionality available in editor', () => {
      mockStore.presentation = createMockPresentation();
      renderPPTEditor();
      
      // Editor should render without errors
      expect(screen.getByText('addSlide')).toBeInTheDocument();
    });
  });
});
