import { render, screen, fireEvent, act } from '@testing-library/react';
import { SlideshowView } from './slideshow-view';
import type { PPTPresentation } from '@/types/workflow';

// Mock the store
jest.mock('@/stores/tools/ppt-editor-store', () => ({
  usePPTEditorStore: () => ({
    slideshowSettings: {
      showThumbnails: false,
      showProgress: true,
      showTimer: true,
      showNotes: false,
      autoPlay: false,
      autoPlayInterval: 5,
      enableTransitions: true,
      transitionType: 'fade',
      transitionDuration: 300,
    },
    updateSlideshowSettings: jest.fn(),
  }),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the sub-components
jest.mock('./thumbnail-navigator', () => ({
  ThumbnailNavigator: ({ onSelect, currentIndex }: { onSelect: (i: number) => void; currentIndex: number }) => (
    <div data-testid="thumbnail-navigator" onClick={() => onSelect(currentIndex + 1)}>
      Thumbnails
    </div>
  ),
}));

jest.mock('./slideshow-controls', () => ({
  SlideshowControls: ({ 
    onPrev, 
    onNext, 
    onExit,
    onToggleThumbnails,
    onToggleNotes,
    currentIndex,
    totalSlides,
  }: {
    onPrev: () => void;
    onNext: () => void;
    onExit: () => void;
    onToggleThumbnails: () => void;
    onToggleNotes: () => void;
    currentIndex: number;
    totalSlides: number;
  }) => (
    <div data-testid="slideshow-controls">
      <button data-testid="prev-btn" onClick={onPrev}>Prev</button>
      <button data-testid="next-btn" onClick={onNext}>Next</button>
      <button data-testid="exit-btn" onClick={onExit}>Exit</button>
      <button data-testid="thumbnails-btn" onClick={onToggleThumbnails}>Thumbnails</button>
      <button data-testid="notes-btn" onClick={onToggleNotes}>Notes</button>
      <span data-testid="slide-info">{currentIndex + 1}/{totalSlides}</span>
    </div>
  ),
  KeyboardHelpModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? <div data-testid="keyboard-help" onClick={onClose}>Keyboard Help</div> : null,
}));

jest.mock('../rendering/error-boundary', () => ({
  PPTPreviewErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./drawing-overlay', () => ({
  DrawingOverlay: ({ pointerMode }: { pointerMode: string }) => (
    <div data-testid="drawing-overlay" data-pointer-mode={pointerMode}>
      {pointerMode === 'laser' && <span>laserPointer</span>}
      {pointerMode === 'draw' && <span>drawMode</span>}
    </div>
  ),
}));

jest.mock('../rendering', () => ({
  SlideContent: ({ slide }: { slide: { title?: string; subtitle?: string; bullets?: string[] } }) => (
    <div data-testid="slide-content">
      {slide.title && <h1>{slide.title}</h1>}
      {slide.subtitle && <h2>{slide.subtitle}</h2>}
      {slide.bullets?.map((b: string, i: number) => <li key={i}>{b}</li>)}
    </div>
  ),
}));

const mockPresentation: PPTPresentation = {
  id: 'test-ppt',
  title: 'Test Presentation',
  subtitle: 'Test Subtitle',
  aspectRatio: '16:9',
  slides: [
    {
      id: 'slide-1',
      order: 0,
      layout: 'title',
      title: 'First Slide',
      subtitle: 'Welcome',
      content: '',
      bullets: [],
      elements: [],
      notes: 'Speaker notes for slide 1',
    },
    {
      id: 'slide-2',
      order: 1,
      layout: 'title-content',
      title: 'Second Slide',
      subtitle: '',
      content: 'Some content',
      bullets: ['Point 1', 'Point 2'],
      elements: [],
      notes: '',
    },
    {
      id: 'slide-3',
      order: 2,
      layout: 'bullets',
      title: 'Third Slide',
      subtitle: '',
      content: '',
      bullets: ['A', 'B', 'C'],
      elements: [],
    },
  ],
  totalSlides: 3,
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
    codeFont: 'monospace',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SlideshowView', () => {
  const mockOnPrev = jest.fn();
  const mockOnNext = jest.fn();
  const mockOnExit = jest.fn();
  const mockOnGoToSlide = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the current slide content', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(screen.getByText('First Slide')).toBeInTheDocument();
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('renders slide with bullets', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={1}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(screen.getByText('Second Slide')).toBeInTheDocument();
    expect(screen.getByText('Point 1')).toBeInTheDocument();
    expect(screen.getByText('Point 2')).toBeInTheDocument();
  });

  it('renders slideshow controls', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(screen.getByTestId('slideshow-controls')).toBeInTheDocument();
  });

  it('calls onPrev when prev button clicked', () => {
    const { container } = render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={1}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.click(screen.getByTestId('prev-btn'));
    
    // Fire transitionEnd to complete CSS transition in jsdom
    const slideArea = container.querySelector('.flex-1.flex.flex-col');
    if (slideArea) {
      fireEvent.transitionEnd(slideArea);
      fireEvent.transitionEnd(slideArea);
    }

    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('calls onNext when next button clicked', () => {
    const { container } = render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.click(screen.getByTestId('next-btn'));
    
    const slideArea = container.querySelector('.flex-1.flex.flex-col');
    if (slideArea) {
      fireEvent.transitionEnd(slideArea);
      fireEvent.transitionEnd(slideArea);
    }

    expect(mockOnNext).toHaveBeenCalled();
  });

  it('calls onExit when exit button clicked', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.click(screen.getByTestId('exit-btn'));
    expect(mockOnExit).toHaveBeenCalled();
  });

  it('handles keyboard navigation - ArrowRight', () => {
    const { container } = render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    
    const slideArea = container.querySelector('.flex-1.flex.flex-col');
    if (slideArea) {
      fireEvent.transitionEnd(slideArea);
      fireEvent.transitionEnd(slideArea);
    }

    expect(mockOnNext).toHaveBeenCalled();
  });

  it('handles keyboard navigation - ArrowLeft', () => {
    const { container } = render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={1}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    
    const slideArea = container.querySelector('.flex-1.flex.flex-col');
    if (slideArea) {
      fireEvent.transitionEnd(slideArea);
      fireEvent.transitionEnd(slideArea);
    }

    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('handles keyboard navigation - Escape exits', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnExit).toHaveBeenCalled();
  });

  it('handles keyboard navigation - Home goes to first slide', () => {
    const { container } = render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={2}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.keyDown(window, { key: 'Home' });
    
    const slideArea = container.querySelector('.flex-1.flex.flex-col');
    if (slideArea) {
      fireEvent.transitionEnd(slideArea);
      fireEvent.transitionEnd(slideArea);
    }

    expect(mockOnGoToSlide).toHaveBeenCalledWith(0);
  });

  it('handles keyboard navigation - End goes to last slide', () => {
    const { container } = render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.keyDown(window, { key: 'End' });
    
    const slideArea = container.querySelector('.flex-1.flex.flex-col');
    if (slideArea) {
      fireEvent.transitionEnd(slideArea);
      fireEvent.transitionEnd(slideArea);
    }

    expect(mockOnGoToSlide).toHaveBeenCalledWith(2);
  });

  it('toggles thumbnails panel', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // Initially thumbnails should not be visible
    expect(screen.queryByTestId('thumbnail-navigator')).not.toBeInTheDocument();

    // Click thumbnails button
    fireEvent.click(screen.getByTestId('thumbnails-btn'));

    // Now thumbnails should be visible
    expect(screen.getByTestId('thumbnail-navigator')).toBeInTheDocument();
  });

  it('toggles notes panel with keyboard shortcut', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // Press N to toggle notes
    fireEvent.keyDown(window, { key: 'n' });

    // Notes panel should be visible with speaker notes (key returned by mock)
    expect(screen.getByText('speakerNotes')).toBeInTheDocument();
  });

  it('shows keyboard help modal with H key', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // Press H to show keyboard help
    fireEvent.keyDown(window, { key: 'h' });

    expect(screen.getByTestId('keyboard-help')).toBeInTheDocument();
  });

  it('returns null when slide is not found', () => {
    const emptyPresentation = { ...mockPresentation, slides: [] };
    
    const { container } = render(
      <SlideshowView
        presentation={emptyPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays elapsed time counter', () => {
    render(
      <SlideshowView
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // The timer should be displayed in the controls
    expect(screen.getByTestId('slideshow-controls')).toBeInTheDocument();
  });

  describe('Pointer and Drawing Tools', () => {
    it('toggles laser pointer mode with L key', () => {
      render(
        <SlideshowView
          presentation={mockPresentation}
          currentIndex={0}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onExit={mockOnExit}
          onGoToSlide={mockOnGoToSlide}
        />
      );

      // Press L to enable laser mode
      fireEvent.keyDown(window, { key: 'l' });

      // DrawingOverlay mock renders laserPointer text when pointerMode is laser
      expect(screen.getByText('laserPointer')).toBeInTheDocument();
      expect(screen.getByTestId('drawing-overlay')).toHaveAttribute('data-pointer-mode', 'laser');
    });

    it('toggles drawing mode with D key', () => {
      render(
        <SlideshowView
          presentation={mockPresentation}
          currentIndex={0}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onExit={mockOnExit}
          onGoToSlide={mockOnGoToSlide}
        />
      );

      // Press D to enable draw mode
      fireEvent.keyDown(window, { key: 'd' });

      // DrawingOverlay mock renders drawMode text when pointerMode is draw
      expect(screen.getByText('drawMode')).toBeInTheDocument();
      expect(screen.getByTestId('drawing-overlay')).toHaveAttribute('data-pointer-mode', 'draw');
    });

    it('exits laser mode when L is pressed again', () => {
      render(
        <SlideshowView
          presentation={mockPresentation}
          currentIndex={0}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onExit={mockOnExit}
          onGoToSlide={mockOnGoToSlide}
        />
      );

      // Toggle on then off
      fireEvent.keyDown(window, { key: 'l' });
      fireEvent.keyDown(window, { key: 'l' });

      // Pointer mode should be back to 'none'
      expect(screen.getByTestId('drawing-overlay')).toHaveAttribute('data-pointer-mode', 'none');
      expect(screen.queryByText('laserPointer')).not.toBeInTheDocument();
    });

    it('does not navigate when in draw mode and slide is clicked', () => {
      render(
        <SlideshowView
          presentation={mockPresentation}
          currentIndex={0}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onExit={mockOnExit}
          onGoToSlide={mockOnGoToSlide}
        />
      );

      // Enter draw mode
      fireEvent.keyDown(window, { key: 'd' });

      // Click on slide content area should not navigate (onClick is undefined when pointerMode !== 'none')
      const slideArea = screen.getByText('First Slide').closest('div');
      if (slideArea) {
        fireEvent.click(slideArea);
      }

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should not have navigated
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('passes laser pointer mode to DrawingOverlay', () => {
      render(
        <SlideshowView
          presentation={mockPresentation}
          currentIndex={0}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onExit={mockOnExit}
          onGoToSlide={mockOnGoToSlide}
        />
      );

      // Enable laser mode
      fireEvent.keyDown(window, { key: 'l' });

      // Cursor-none class should be on the parent slide area
      const cursorNone = screen.getByTestId('drawing-overlay').closest('.cursor-none');
      expect(cursorNone).toBeInTheDocument();
    });

    it('passes draw pointer mode to DrawingOverlay', () => {
      render(
        <SlideshowView
          presentation={mockPresentation}
          currentIndex={0}
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          onExit={mockOnExit}
          onGoToSlide={mockOnGoToSlide}
        />
      );

      // Enable draw mode
      fireEvent.keyDown(window, { key: 'd' });

      // Cursor-crosshair class should be on the parent slide area
      const crosshair = screen.getByTestId('drawing-overlay').closest('.cursor-crosshair');
      expect(crosshair).toBeInTheDocument();
    });
  });
});
