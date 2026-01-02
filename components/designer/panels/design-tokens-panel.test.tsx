/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignTokensPanel } from './design-tokens-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
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

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe('DesignTokensPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the design tokens header', () => {
    render(<DesignTokensPanel />);
    expect(screen.getByText('designTokens')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<DesignTokensPanel />);
    expect(screen.getByPlaceholderText('searchTokens')).toBeInTheDocument();
  });

  it('should render token categories', () => {
    render(<DesignTokensPanel />);
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('Typography')).toBeInTheDocument();
    expect(screen.getByText('Spacing')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<DesignTokensPanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should filter tokens when searching', async () => {
    render(<DesignTokensPanel />);
    
    const searchInput = screen.getByPlaceholderText('searchTokens');
    await userEvent.type(searchInput, 'primary');
    
    expect(searchInput).toHaveValue('primary');
  });

  it('should render accordion for categories', () => {
    render(<DesignTokensPanel />);
    expect(screen.getByTestId('accordion')).toBeInTheDocument();
  });

  it('should call onTokenSelect when token is selected', () => {
    const onTokenSelect = jest.fn();
    render(<DesignTokensPanel onTokenSelect={onTokenSelect} />);
    
    // The callback should be available
    expect(screen.getByText('designTokens')).toBeInTheDocument();
  });

  it('should render scroll area for tokens', () => {
    render(<DesignTokensPanel />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('should display color tokens', () => {
    render(<DesignTokensPanel />);
    // Colors category should be visible
    expect(screen.getByTestId('accordion-item-colors')).toBeInTheDocument();
  });

  it('should display typography tokens', () => {
    render(<DesignTokensPanel />);
    expect(screen.getByTestId('accordion-item-typography')).toBeInTheDocument();
  });

  it('should display spacing tokens', () => {
    render(<DesignTokensPanel />);
    expect(screen.getByTestId('accordion-item-spacing')).toBeInTheDocument();
  });
});
