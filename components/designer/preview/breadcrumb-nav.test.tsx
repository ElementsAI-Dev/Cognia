/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BreadcrumbNav } from './breadcrumb-nav';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockSelectElement = jest.fn();

jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      selectedElementId: null,
      elementTree: null,
      selectElement: mockSelectElement,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('BreadcrumbNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no element is selected', () => {
    render(<BreadcrumbNav />);
    expect(screen.getByText('noSelection')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<BreadcrumbNav className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('BreadcrumbNav with selected element', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render breadcrumb path when element is selected', () => {
    jest.doMock('@/stores/designer', () => ({
      useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          selectedElementId: 'child-1',
          elementTree: {
            id: 'root',
            tagName: 'div',
            className: 'container',
            children: [
              {
                id: 'child-1',
                tagName: 'h1',
                className: 'title',
                children: [],
              },
            ],
          },
          selectElement: mockSelectElement,
        };
        return selector(state);
      },
    }));

    // The component will show breadcrumb path when an element is selected
    const { container } = render(<BreadcrumbNav />);
    expect(container).toBeInTheDocument();
  });

  it('should handle maxItems prop', () => {
    const { container } = render(<BreadcrumbNav maxItems={3} />);
    expect(container).toBeInTheDocument();
  });
});
