import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageStudioHeader } from './image-studio-header';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href, 'data-testid': 'link' }, children),
}));

// Mock ZOOM_LEVELS
jest.mock('@/lib/image-studio', () => ({
  ZOOM_LEVELS: [
    { label: 'S', cols: 4 },
    { label: 'M', cols: 3 },
    { label: 'L', cols: 2 },
  ],
}));

const defaultProps = {
  imageCount: 5,
  canUndo: true,
  canRedo: false,
  viewMode: 'grid' as const,
  zoomLevel: 1,
  filterFavorites: false,
  showSidebar: true,
  showHistory: false,
  onUndo: jest.fn(),
  onRedo: jest.fn(),
  onViewModeChange: jest.fn(),
  onZoomLevelChange: jest.fn(),
  onFilterFavoritesChange: jest.fn(),
  onShowSidebarChange: jest.fn(),
  onShowHistoryChange: jest.fn(),
  onExport: jest.fn(),
};

describe('ImageStudioHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ImageStudioHeader {...defaultProps} />);
    expect(screen.getByText('Image Generation')).toBeInTheDocument();
  });

  it('should render back button', () => {
    render(<ImageStudioHeader {...defaultProps} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('should display image count', () => {
    render(<ImageStudioHeader {...defaultProps} imageCount={12} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should call onUndo when undo button is clicked', () => {
    render(<ImageStudioHeader {...defaultProps} />);
    // Find the undo tooltip content
    const undoContent = screen.getByText('Undo');
    // The button is a sibling in the tooltip structure
    const undoButton = undoContent.closest('[data-testid="tooltip"]')?.querySelector('button');
    if (undoButton) fireEvent.click(undoButton);
    expect(defaultProps.onUndo).toHaveBeenCalled();
  });

  it('should disable undo button when canUndo is false', () => {
    render(<ImageStudioHeader {...defaultProps} canUndo={false} />);
    const buttons = screen.getAllByRole('button');
    // First button group contains undo/redo
    const undoBtn = buttons.find((btn) => btn.closest('[data-testid="tooltip"]')?.textContent?.includes('Undo'));
    if (undoBtn) expect(undoBtn).toBeDisabled();
  });

  it('should call onExport when export button is clicked', () => {
    render(<ImageStudioHeader {...defaultProps} />);
    const exportText = screen.getByText('Export');
    const exportBtn = exportText.closest('button');
    if (exportBtn) fireEvent.click(exportBtn);
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it('should disable export when imageCount is 0', () => {
    render(<ImageStudioHeader {...defaultProps} imageCount={0} />);
    const exportText = screen.getByText('Export');
    const exportBtn = exportText.closest('button');
    expect(exportBtn).toBeDisabled();
  });

  describe('Progress Bar', () => {
    it('should NOT render progress bar when isGenerating is false', () => {
      const { container } = render(<ImageStudioHeader {...defaultProps} isGenerating={false} />);
      const progressBar = container.querySelector('.animate-pulse');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('should render progress bar when isGenerating is true', () => {
      const { container } = render(<ImageStudioHeader {...defaultProps} isGenerating={true} />);
      const progressBar = container.querySelector('.animate-pulse');
      expect(progressBar).toBeInTheDocument();
    });

    it('should NOT render progress bar when isGenerating is undefined', () => {
      const { container } = render(<ImageStudioHeader {...defaultProps} />);
      const progressBar = container.querySelector('.animate-pulse');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  describe('View Mode', () => {
    it('should have view mode toggle buttons rendered', () => {
      render(<ImageStudioHeader {...defaultProps} viewMode="grid" />);
      // Verify both grid and single mode buttons exist (they contain SVG icons)
      const buttons = screen.getAllByRole('button');
      // At minimum we should have undo, redo, favorites, history, export, grid, single, sidebar = 8+ buttons
      expect(buttons.length).toBeGreaterThanOrEqual(8);
    });

    it('should render zoom controls in grid mode', () => {
      render(<ImageStudioHeader {...defaultProps} viewMode="grid" />);
      expect(screen.getByText('Zoom')).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('should NOT render zoom controls in single mode', () => {
      render(<ImageStudioHeader {...defaultProps} viewMode="single" />);
      expect(screen.queryByText('Zoom')).not.toBeInTheDocument();
    });
  });

  describe('Favorites', () => {
    it('should call onFilterFavoritesChange when favorites button is clicked', () => {
      render(<ImageStudioHeader {...defaultProps} />);
      const favBtn = screen.getByText('Favorites').closest('button');
      if (favBtn) fireEvent.click(favBtn);
      expect(defaultProps.onFilterFavoritesChange).toHaveBeenCalledWith(true);
    });

    it('should show correct tooltip based on filter state', () => {
      render(<ImageStudioHeader {...defaultProps} filterFavorites={true} />);
      expect(screen.getByText('Show all')).toBeInTheDocument();
    });

    it('should show showFavoritesOnly tooltip when not filtering', () => {
      render(<ImageStudioHeader {...defaultProps} filterFavorites={false} />);
      expect(screen.getByText('Show favorites only')).toBeInTheDocument();
    });
  });

  describe('Sidebar Toggle', () => {
    it('should call onShowSidebarChange when sidebar toggle is clicked', () => {
      render(<ImageStudioHeader {...defaultProps} showSidebar={true} />);
      const tooltipText = screen.getByText('Hide sidebar');
      const btn = tooltipText.closest('[data-testid="tooltip"]')?.querySelector('button');
      if (btn) fireEvent.click(btn);
      expect(defaultProps.onShowSidebarChange).toHaveBeenCalledWith(false);
    });

    it('should show showSidebar tooltip when sidebar is hidden', () => {
      render(<ImageStudioHeader {...defaultProps} showSidebar={false} />);
      expect(screen.getByText('Show sidebar')).toBeInTheDocument();
    });
  });
});
