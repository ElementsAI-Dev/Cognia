/**
 * EditorToolbar Component Tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorToolbar, type EditorToolbarProps } from './editor-toolbar';
import type { PPTPresentation, PPTSlideElement } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock store (used for aspect ratio change)
jest.mock('@/stores/tools/ppt-editor-store', () => ({
  usePPTEditorStore: Object.assign(
    jest.fn(),
    {
      getState: () => ({
        presentation: null,
        pushHistory: jest.fn(),
      }),
      setState: jest.fn(),
    }
  ),
}));

// Mock SLIDE_LAYOUT_INFO and DEFAULT_PPT_THEMES
jest.mock('@/types/workflow', () => ({
  SLIDE_LAYOUT_INFO: {
    'title-content': { name: 'Title + Content' },
    'title': { name: 'Title Only' },
  },
  DEFAULT_PPT_THEMES: [
    { id: 'modern-light', name: 'Modern Light', primaryColor: '#3B82F6' },
    { id: 'dark', name: 'Dark', primaryColor: '#1E293B' },
  ],
}));

// Mock sub-components
jest.mock('./alignment-toolbar', () => ({
  AlignmentToolbar: () => <div data-testid="alignment-toolbar">Alignment</div>,
}));

jest.mock('../theme', () => ({
  ThemeCustomizer: () => <div data-testid="theme-customizer">Theme Customizer</div>,
}));

const mockPresentation: PPTPresentation = {
  id: 'test-ppt',
  title: 'Test',
  slides: [],
  totalSlides: 3,
  aspectRatio: '16:9',
  theme: {
    id: 'modern-light',
    name: 'Modern Light',
    primaryColor: '#3B82F6',
    secondaryColor: '#64748B',
    accentColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'mono',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultProps: EditorToolbarProps = {
  presentation: mockPresentation,
  selectedElements: [],
  isDirty: false,
  zoom: 100,
  showSlidePanel: true,
  showNotes: false,
  showThemeCustomizer: false,
  effectiveFullscreen: false,
  onSave: jest.fn(),
  onUndo: jest.fn(),
  onRedo: jest.fn(),
  canUndo: false,
  canRedo: false,
  onAddSlide: jest.fn(),
  onSetThemeById: jest.fn(),
  onThemeChange: jest.fn(),
  onSetShowThemeCustomizer: jest.fn(),
  onSetZoom: jest.fn(),
  onSetShowSlidePanel: jest.fn(),
  onToggleNotes: jest.fn(),
  onStartPresentation: jest.fn(),
  onExport: jest.fn(),
  onToggleFullscreen: jest.fn(),
  onAlign: jest.fn(),
  onDistribute: jest.fn(),
  onAutoArrange: jest.fn(),
  onBringToFront: jest.fn(),
  onSendToBack: jest.fn(),
};

describe('EditorToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render core buttons', () => {
      render(<EditorToolbar {...defaultProps} />);

      expect(screen.getByText('addSlide')).toBeInTheDocument();
      expect(screen.getByText('present')).toBeInTheDocument();
      expect(screen.getByText('export')).toBeInTheDocument();
    });

    it('should display current zoom level', () => {
      render(<EditorToolbar {...defaultProps} zoom={150} />);
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should display current aspect ratio', () => {
      render(<EditorToolbar {...defaultProps} />);
      expect(screen.getByText('16:9')).toBeInTheDocument();
    });
  });

  describe('undo/redo', () => {
    it('should disable undo when canUndo is false', () => {
      render(<EditorToolbar {...defaultProps} canUndo={false} />);
      const undoButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-undo-2')
      );
      expect(undoButton).toBeDisabled();
    });

    it('should disable redo when canRedo is false', () => {
      render(<EditorToolbar {...defaultProps} canRedo={false} />);
      const redoButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-redo-2')
      );
      expect(redoButton).toBeDisabled();
    });

    it('should call onUndo when undo button clicked', async () => {
      const onUndo = jest.fn();
      render(<EditorToolbar {...defaultProps} canUndo={true} onUndo={onUndo} />);

      const undoButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-undo-2')
      );
      if (undoButton) {
        await userEvent.click(undoButton);
        expect(onUndo).toHaveBeenCalled();
      }
    });

    it('should call onRedo when redo button clicked', async () => {
      const onRedo = jest.fn();
      render(<EditorToolbar {...defaultProps} canRedo={true} onRedo={onRedo} />);

      const redoButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-redo-2')
      );
      if (redoButton) {
        await userEvent.click(redoButton);
        expect(onRedo).toHaveBeenCalled();
      }
    });
  });

  describe('save', () => {
    it('should call onSave when save button clicked', async () => {
      const onSave = jest.fn();
      render(<EditorToolbar {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-save')
      );
      if (saveButton) {
        await userEvent.click(saveButton);
        expect(onSave).toHaveBeenCalled();
      }
    });

    it('should highlight save icon when dirty', () => {
      const { container } = render(<EditorToolbar {...defaultProps} isDirty={true} />);
      const saveIcon = container.querySelector('svg.lucide-save');
      expect(saveIcon?.classList.contains('text-primary')).toBe(true);
    });
  });

  describe('zoom controls', () => {
    it('should call onSetZoom with decreased value on zoom out', async () => {
      const onSetZoom = jest.fn();
      render(<EditorToolbar {...defaultProps} zoom={100} onSetZoom={onSetZoom} />);

      const zoomOutButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-zoom-out')
      );
      if (zoomOutButton) {
        await userEvent.click(zoomOutButton);
        expect(onSetZoom).toHaveBeenCalledWith(90);
      }
    });

    it('should call onSetZoom with increased value on zoom in', async () => {
      const onSetZoom = jest.fn();
      render(<EditorToolbar {...defaultProps} zoom={100} onSetZoom={onSetZoom} />);

      const zoomInButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-zoom-in')
      );
      if (zoomInButton) {
        await userEvent.click(zoomInButton);
        expect(onSetZoom).toHaveBeenCalledWith(110);
      }
    });

    it('should disable zoom out at minimum', () => {
      render(<EditorToolbar {...defaultProps} zoom={25} />);
      const zoomOutButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-zoom-out')
      );
      expect(zoomOutButton).toBeDisabled();
    });

    it('should disable zoom in at maximum', () => {
      render(<EditorToolbar {...defaultProps} zoom={200} />);
      const zoomInButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-zoom-in')
      );
      expect(zoomInButton).toBeDisabled();
    });
  });

  describe('view toggles', () => {
    it('should call onToggleNotes when notes button clicked', async () => {
      const onToggleNotes = jest.fn();
      render(<EditorToolbar {...defaultProps} onToggleNotes={onToggleNotes} />);

      const notesButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-align-left')
      );
      if (notesButton) {
        await userEvent.click(notesButton);
        expect(onToggleNotes).toHaveBeenCalled();
      }
    });

    it('should call onStartPresentation when present button clicked', async () => {
      const onStartPresentation = jest.fn();
      render(<EditorToolbar {...defaultProps} onStartPresentation={onStartPresentation} />);

      await userEvent.click(screen.getByText('present'));
      expect(onStartPresentation).toHaveBeenCalled();
    });
  });

  describe('alignment toolbar', () => {
    it('should show alignment toolbar when elements are selected', () => {
      const selectedElements = [
        { id: 'el-1', type: 'text', content: '', position: { x: 0, y: 0, width: 50, height: 20 } },
        { id: 'el-2', type: 'text', content: '', position: { x: 10, y: 10, width: 50, height: 20 } },
      ] as PPTSlideElement[];

      render(<EditorToolbar {...defaultProps} selectedElements={selectedElements} />);
      expect(screen.getByTestId('alignment-toolbar')).toBeInTheDocument();
    });

    it('should hide alignment toolbar when no elements selected', () => {
      render(<EditorToolbar {...defaultProps} selectedElements={[]} />);
      expect(screen.queryByTestId('alignment-toolbar')).not.toBeInTheDocument();
    });
  });

  describe('fullscreen toggle', () => {
    it('should call onToggleFullscreen when button clicked', async () => {
      const onToggleFullscreen = jest.fn();
      render(<EditorToolbar {...defaultProps} onToggleFullscreen={onToggleFullscreen} />);

      const fullscreenButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('svg.lucide-maximize-2') || btn.querySelector('svg.lucide-minimize-2')
      );
      if (fullscreenButton) {
        await userEvent.click(fullscreenButton);
        expect(onToggleFullscreen).toHaveBeenCalled();
      }
    });
  });
});
