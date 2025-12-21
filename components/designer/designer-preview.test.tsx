/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DesignerPreview } from './designer-preview';

// Mock stores
const mockSelectElement = jest.fn();
const mockHoverElement = jest.fn();
const mockParseCodeToElements = jest.fn();

jest.mock('@/stores/designer-store', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      mode: 'preview',
      code: '<div>Test</div>',
      viewport: 'desktop',
      zoom: 100,
      selectedElementId: null,
      hoveredElementId: null,
      selectElement: mockSelectElement,
      hoverElement: mockHoverElement,
      parseCodeToElements: mockParseCodeToElements,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock VIEWPORT_PRESETS
jest.mock('@/types/designer', () => ({
  VIEWPORT_PRESETS: {
    mobile: { width: 375, height: 667, label: 'Mobile' },
    tablet: { width: 768, height: 1024, label: 'Tablet' },
    desktop: { width: 1280, height: 800, label: 'Desktop' },
    full: { width: '100%', height: '100%', label: 'Full Width' },
  },
}));

describe('DesignerPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders iframe for preview', () => {
    render(<DesignerPreview />);
    expect(screen.getByTitle('Design Preview')).toBeInTheDocument();
  });

  it('renders viewport label badge', () => {
    render(<DesignerPreview />);
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByText(/Desktop/)).toBeInTheDocument();
  });

  it('calls parseCodeToElements on code change', () => {
    render(<DesignerPreview />);
    expect(mockParseCodeToElements).toHaveBeenCalledWith('<div>Test</div>');
  });

  it('applies className when provided', () => {
    const { container } = render(<DesignerPreview className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('DesignerPreview with different viewports', () => {
  it('renders mobile viewport', () => {
    jest.doMock('@/stores/designer-store', () => ({
      useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          mode: 'preview',
          code: '<div>Test</div>',
          viewport: 'mobile',
          zoom: 100,
          selectedElementId: null,
          hoveredElementId: null,
          selectElement: mockSelectElement,
          hoverElement: mockHoverElement,
          parseCodeToElements: mockParseCodeToElements,
        };
        return selector(state);
      },
    }));
    
    render(<DesignerPreview />);
    expect(screen.getByTitle('Design Preview')).toBeInTheDocument();
  });
});

describe('DesignerPreview with design mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in design mode', () => {
    jest.doMock('@/stores/designer-store', () => ({
      useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          mode: 'design',
          code: '<div>Test</div>',
          viewport: 'desktop',
          zoom: 100,
          selectedElementId: 'el-1',
          hoveredElementId: null,
          selectElement: mockSelectElement,
          hoverElement: mockHoverElement,
          parseCodeToElements: mockParseCodeToElements,
        };
        return selector(state);
      },
    }));
    
    render(<DesignerPreview />);
    expect(screen.getByTitle('Design Preview')).toBeInTheDocument();
  });
});
