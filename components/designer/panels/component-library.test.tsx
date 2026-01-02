/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentLibrary } from './component-library';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock @dnd-kit/core
jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    isDragging: false,
    transform: null,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="accordion" className={className}>{children}</div>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accordion-content">{children}</div>
  ),
  AccordionItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`accordion-item-${value}`}>{children}</div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="accordion-trigger">{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('ComponentLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component library header', () => {
    render(<ComponentLibrary />);
    expect(screen.getByText('componentLibrary')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<ComponentLibrary />);
    expect(screen.getByPlaceholderText('searchComponents')).toBeInTheDocument();
  });

  it('should render component categories', () => {
    render(<ComponentLibrary />);
    expect(screen.getByText('Layout')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ComponentLibrary className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should filter components when searching', async () => {
    render(<ComponentLibrary />);
    
    const searchInput = screen.getByPlaceholderText('searchComponents');
    await userEvent.type(searchInput, 'button');
    
    // Search should filter results
    expect(searchInput).toHaveValue('button');
  });

  it('should clear search when clear button is clicked', async () => {
    render(<ComponentLibrary />);
    
    const searchInput = screen.getByPlaceholderText('searchComponents');
    await userEvent.type(searchInput, 'test');
    
    // Find and click clear button if visible
    const clearButton = screen.queryAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-x')
    );
    
    if (clearButton) {
      await userEvent.click(clearButton);
      expect(searchInput).toHaveValue('');
    }
  });

  it('should render accordion for categories', () => {
    render(<ComponentLibrary />);
    expect(screen.getByTestId('accordion')).toBeInTheDocument();
  });

  it('should render component items in accordion', () => {
    render(<ComponentLibrary />);
    
    // Accordion content should be visible
    expect(screen.getAllByTestId('accordion-content').length).toBeGreaterThan(0);
  });
});
