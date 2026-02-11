/**
 * EditorStatusBar Component Tests
 */

import { render, screen } from '@testing-library/react';
import { EditorStatusBar } from './editor-status-bar';
import type { PPTSlide } from '@/types/workflow';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key} ${JSON.stringify(params)}`;
    return key;
  },
}));

// Mock SLIDE_LAYOUT_INFO
jest.mock('@/types/workflow', () => ({
  SLIDE_LAYOUT_INFO: {
    'title-content': { name: 'Title + Content' },
    'title': { name: 'Title Only' },
    'bullets': { name: 'Bullets' },
    'two-column': { name: 'Two Column' },
    'blank': { name: 'Blank' },
  },
}));

const createMockSlide = (overrides: Partial<PPTSlide> = {}): PPTSlide => ({
  id: 'slide-1',
  order: 0,
  layout: 'title-content',
  title: 'Test Slide',
  elements: [],
  ...overrides,
});

describe('EditorStatusBar', () => {
  it('should render slide position info', () => {
    render(
      <EditorStatusBar
        currentSlideIndex={0}
        slideCount={5}
        currentSlide={createMockSlide()}
        isDirty={false}
        isGenerating={false}
      />
    );

    expect(screen.getByText(/slideOf/)).toBeInTheDocument();
  });

  it('should render layout name for current slide', () => {
    render(
      <EditorStatusBar
        currentSlideIndex={0}
        slideCount={3}
        currentSlide={createMockSlide({ layout: 'title-content' })}
        isDirty={false}
        isGenerating={false}
      />
    );

    expect(screen.getByText('Title + Content')).toBeInTheDocument();
  });

  it('should show unsaved badge when isDirty', () => {
    render(
      <EditorStatusBar
        currentSlideIndex={0}
        slideCount={3}
        currentSlide={createMockSlide()}
        isDirty={true}
        isGenerating={false}
      />
    );

    expect(screen.getByText('unsaved')).toBeInTheDocument();
  });

  it('should not show unsaved badge when not dirty', () => {
    render(
      <EditorStatusBar
        currentSlideIndex={0}
        slideCount={3}
        currentSlide={createMockSlide()}
        isDirty={false}
        isGenerating={false}
      />
    );

    expect(screen.queryByText('unsaved')).not.toBeInTheDocument();
  });

  it('should show generating indicator when isGenerating', () => {
    render(
      <EditorStatusBar
        currentSlideIndex={0}
        slideCount={3}
        currentSlide={createMockSlide()}
        isDirty={false}
        isGenerating={true}
      />
    );

    expect(screen.getByText('generating')).toBeInTheDocument();
  });

  it('should not show generating indicator when not generating', () => {
    render(
      <EditorStatusBar
        currentSlideIndex={0}
        slideCount={3}
        currentSlide={createMockSlide()}
        isDirty={false}
        isGenerating={false}
      />
    );

    expect(screen.queryByText('generating')).not.toBeInTheDocument();
  });

  it('should use default layout when currentSlide is null', () => {
    render(
      <EditorStatusBar
        currentSlideIndex={0}
        slideCount={3}
        currentSlide={null}
        isDirty={false}
        isGenerating={false}
      />
    );

    expect(screen.getByText('Title + Content')).toBeInTheDocument();
  });

  it('should show both unsaved and generating together', () => {
    render(
      <EditorStatusBar
        currentSlideIndex={2}
        slideCount={10}
        currentSlide={createMockSlide()}
        isDirty={true}
        isGenerating={true}
      />
    );

    expect(screen.getByText('unsaved')).toBeInTheDocument();
    expect(screen.getByText('generating')).toBeInTheDocument();
  });
});
