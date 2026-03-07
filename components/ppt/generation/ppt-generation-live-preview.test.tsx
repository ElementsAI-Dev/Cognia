/**
 * Tests for PPTGenerationLivePreview
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PPTGenerationLivePreview } from './ppt-generation-live-preview';
import type { PPTPresentation } from '@/types/workflow';
import type { PPTGenerationProgress } from '@/hooks/ppt/use-ppt-generation';

// Mock SlideContent rendering component
jest.mock('../rendering', () => ({
  SlideContent: ({ slide }: { slide: { title: string } }) => (
    <div data-testid="slide-content">{slide.title}</div>
  ),
}));

const mockTheme = {
  id: 'modern-dark',
  name: 'Modern Dark',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#60A5FA',
  backgroundColor: '#0F172A',
  textColor: '#F8FAFC',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  codeFont: 'JetBrains Mono',
};

const mockSlide = {
  id: 'slide-1',
  title: 'Test Slide 1',
  layout: 'title' as const,
  elements: [],
  order: 0,
};

const mockSlide2 = {
  id: 'slide-2',
  title: 'Test Slide 2',
  layout: 'title-content' as const,
  elements: [],
  order: 1,
};

const mockPresentation: PPTPresentation = {
  id: 'ppt-1',
  title: 'Test Presentation',
  theme: mockTheme,
  slides: [mockSlide, mockSlide2],
  totalSlides: 5,
  aspectRatio: '16:9',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultProgress: PPTGenerationProgress = {
  stage: 'content',
  currentSlide: 2,
  totalSlides: 5,
  message: 'Generating slide 2 of 5...',
};

describe('PPTGenerationLivePreview', () => {
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnCancel.mockClear();
  });

  it('should render live preview header', () => {
    render(
      <PPTGenerationLivePreview
        presentation={mockPresentation}
        progress={defaultProgress}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });

  it('should show slide count badge', () => {
    render(
      <PPTGenerationLivePreview
        presentation={mockPresentation}
        progress={defaultProgress}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('should show progress message', () => {
    render(
      <PPTGenerationLivePreview
        presentation={mockPresentation}
        progress={defaultProgress}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('Generating slide 2 of 5...')).toBeInTheDocument();
  });

  it('should render completed slides', () => {
    render(
      <PPTGenerationLivePreview
        presentation={mockPresentation}
        progress={defaultProgress}
        onCancel={mockOnCancel}
      />
    );
    const slideContents = screen.getAllByTestId('slide-content');
    // 2 completed slides in thumbnail + 1 enlarged current slide
    expect(slideContents.length).toBeGreaterThanOrEqual(2);
  });

  it('should render pending skeleton placeholders', () => {
    const { container } = render(
      <PPTGenerationLivePreview
        presentation={mockPresentation}
        progress={defaultProgress}
        onCancel={mockOnCancel}
      />
    );
    // 5 total - 2 completed = 3 pending skeletons
    const skeletons = container.querySelectorAll('.aspect-video');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <PPTGenerationLivePreview
        presentation={mockPresentation}
        progress={defaultProgress}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancel Generation'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should handle null presentation gracefully', () => {
    const idleProgress: PPTGenerationProgress = {
      stage: 'outline',
      currentSlide: 0,
      totalSlides: 10,
      message: 'Generating outline...',
    };
    render(
      <PPTGenerationLivePreview
        presentation={null}
        progress={idleProgress}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('0/10')).toBeInTheDocument();
    // The progress message appears in both the ProgressBar label and the skeleton area
    expect(screen.getAllByText('Generating outline...').length).toBeGreaterThanOrEqual(1);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PPTGenerationLivePreview
        presentation={mockPresentation}
        progress={defaultProgress}
        onCancel={mockOnCancel}
        className="my-custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});
