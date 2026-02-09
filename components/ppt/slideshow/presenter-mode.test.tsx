/**
 * PresenterMode Component Tests
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { PresenterMode } from './presenter-mode';
import type { PPTPresentation } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock SlideContent
jest.mock('../rendering', () => ({
  SlideContent: ({ slide }: { slide: { title?: string } }) => (
    <div data-testid="slide-content">{slide.title}</div>
  ),
}));

const mockPresentation: PPTPresentation = {
  id: 'test-ppt',
  title: 'Test Presentation',
  aspectRatio: '16:9',
  slides: [
    {
      id: 'slide-1',
      order: 0,
      layout: 'title',
      title: 'First Slide',
      elements: [],
      notes: 'Notes for slide 1',
    },
    {
      id: 'slide-2',
      order: 1,
      layout: 'title-content',
      title: 'Second Slide',
      elements: [],
      notes: 'Notes for slide 2',
    },
    {
      id: 'slide-3',
      order: 2,
      layout: 'bullets',
      title: 'Third Slide',
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

describe('PresenterMode', () => {
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

  it('renders current slide content', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // 'First Slide' appears in both current slide and thumbnail area
    const slides = screen.getAllByText('First Slide');
    expect(slides.length).toBeGreaterThanOrEqual(1);
  });

  it('renders presenter mode label', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(screen.getByText('presenterMode')).toBeInTheDocument();
  });

  it('shows slide counter badge', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={1}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    const counters = screen.getAllByText('2 / 3');
    expect(counters.length).toBeGreaterThanOrEqual(1);
  });

  it('renders speaker notes for current slide', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(screen.getByText('Notes for slide 1')).toBeInTheDocument();
  });

  it('shows no notes message when slide has no notes', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={2}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(screen.getByText('noNotes')).toBeInTheDocument();
  });

  it('shows next slide preview', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // Next slide label
    expect(screen.getByText('nextSlide')).toBeInTheDocument();
  });

  it('shows end of presentation when on last slide', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={2}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(screen.getByText('endOfPresentation')).toBeInTheDocument();
  });

  it('calls onPrev when previous button is clicked', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={1}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    const prevButton = screen.getByText('prev');
    fireEvent.click(prevButton);
    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('calls onNext when next button is clicked', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    const nextButton = screen.getByText('next');
    fireEvent.click(nextButton);
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('calls onExit when exit button is clicked', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    const exitButton = screen.getByText('exit');
    fireEvent.click(exitButton);
    expect(mockOnExit).toHaveBeenCalled();
  });

  it('handles keyboard navigation - ArrowRight calls onNext', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('handles keyboard navigation - ArrowLeft calls onPrev', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={1}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('handles keyboard navigation - Escape calls onExit', () => {
    render(
      <PresenterMode
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

  it('disables prev button on first slide', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    const prevButton = screen.getByText('prev').closest('button');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last slide', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={2}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    const nextButton = screen.getByText('next').closest('button');
    expect(nextButton).toBeDisabled();
  });

  it('displays elapsed time timer', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // Both elapsed and slide timers show 00:00 initially
    const timers = screen.getAllByText('00:00');
    expect(timers.length).toBeGreaterThanOrEqual(2);
  });

  it('increments elapsed time', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // Advance time by 65 seconds
    act(() => {
      jest.advanceTimersByTime(65000);
    });

    // Elapsed timer should show 01:05
    const timers = screen.getAllByText('01:05');
    expect(timers.length).toBeGreaterThanOrEqual(1);
  });

  it('renders slide thumbnails', () => {
    render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    expect(screen.getByText('allSlides')).toBeInTheDocument();
  });

  it('renders timer settings button', () => {
    const { container } = render(
      <PresenterMode
        presentation={mockPresentation}
        currentIndex={0}
        onPrev={mockOnPrev}
        onNext={mockOnNext}
        onExit={mockOnExit}
        onGoToSlide={mockOnGoToSlide}
      />
    );

    // Settings button should exist (gear icon)
    const settingsBtn = container.querySelector('svg.lucide-settings-2');
    expect(settingsBtn).toBeInTheDocument();
  });

  it('returns null when slide is not found', () => {
    const emptyPresentation = { ...mockPresentation, slides: [] };

    const { container } = render(
      <PresenterMode
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
});
