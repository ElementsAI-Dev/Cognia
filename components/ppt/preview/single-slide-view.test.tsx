/**
 * Single Slide View Component Tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SingleSlideView } from './single-slide-view';
import type { PPTSlide, PPTTheme } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockTheme: PPTTheme = {
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
};

const createMockSlide = (overrides: Partial<PPTSlide> = {}): PPTSlide => ({
  id: 'slide-1',
  order: 0,
  layout: 'title-content',
  title: 'Test Slide Title',
  subtitle: 'Test Subtitle',
  content: 'Test content',
  bullets: ['Bullet 1', 'Bullet 2'],
  notes: 'Speaker notes',
  elements: [],
  ...overrides,
});

describe('SingleSlideView', () => {
  const defaultProps = {
    slide: createMockSlide(),
    slideIndex: 0,
    totalSlides: 5,
    theme: mockTheme,
    onPrev: jest.fn(),
    onNext: jest.fn(),
    onEdit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render slide title', () => {
    render(<SingleSlideView {...defaultProps} />);
    expect(screen.getByText('Test Slide Title')).toBeInTheDocument();
  });

  it('should render slide subtitle', () => {
    render(<SingleSlideView {...defaultProps} />);
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('should render slide content', () => {
    render(<SingleSlideView {...defaultProps} />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render bullet points', () => {
    render(<SingleSlideView {...defaultProps} />);
    expect(screen.getByText('Bullet 1')).toBeInTheDocument();
    expect(screen.getByText('Bullet 2')).toBeInTheDocument();
  });

  it('should render speaker notes', () => {
    render(<SingleSlideView {...defaultProps} />);
    expect(screen.getByText('Speaker notes')).toBeInTheDocument();
  });

  it('should render slide position', () => {
    render(<SingleSlideView {...defaultProps} slideIndex={2} totalSlides={10} />);
    // slideOf text appears in multiple places (buttons + status bar)
    expect(screen.getAllByText(/slideOf/).length).toBeGreaterThanOrEqual(1);
  });

  it('should call onPrev when prev button is clicked', async () => {
    render(<SingleSlideView {...defaultProps} slideIndex={1} />);

    // Navigation buttons use slideOf aria-labels; find the first nav button (prev)
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    await userEvent.click(prevButton);

    expect(defaultProps.onPrev).toHaveBeenCalled();
  });

  it('should call onNext when next button is clicked', async () => {
    render(<SingleSlideView {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[1];
    await userEvent.click(nextButton);

    expect(defaultProps.onNext).toHaveBeenCalled();
  });

  it('should disable prev button on first slide', () => {
    render(<SingleSlideView {...defaultProps} slideIndex={0} />);

    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it('should disable next button on last slide', () => {
    render(<SingleSlideView {...defaultProps} slideIndex={4} totalSlides={5} />);

    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[1];
    expect(nextButton).toBeDisabled();
  });

  it('should call onEdit when edit button is clicked', async () => {
    render(<SingleSlideView {...defaultProps} />);

    const editButton = screen.getByLabelText('openEditor');
    await userEvent.click(editButton);

    expect(defaultProps.onEdit).toHaveBeenCalled();
  });

  it('should not render edit button when onEdit is not provided', () => {
    render(<SingleSlideView {...defaultProps} onEdit={undefined} />);
    expect(screen.queryByLabelText('openEditor')).not.toBeInTheDocument();
  });

  it('should render custom elements', () => {
    const slide = createMockSlide({
      elements: [{ id: 'el-1', type: 'text', content: 'Custom Element', position: { x: 10, y: 10, width: 20, height: 10 } }],
    });

    render(<SingleSlideView {...defaultProps} slide={slide} />);
    expect(screen.getByText('Custom Element')).toBeInTheDocument();
  });
});
