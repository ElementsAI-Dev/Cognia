/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CarriedContextBanner } from './carried-context-banner';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: { count?: number }) => {
    const translations: Record<string, string> = {
      title: 'Carried Context',
      contextHint: 'This context was carried from your previous conversation.',
      modeChat: 'Chat',
      modeAgent: 'Agent',
      modeResearch: 'Research',
      modeLearning: 'Learning',
      justNow: 'just now',
    };
    if (key === 'minutesAgo') return `${values?.count ?? 0}m ago`;
    if (key === 'hoursAgo') return `${values?.count ?? 0}h ago`;
    if (key === 'daysAgo') return `${values?.count ?? 0}d ago`;
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
}));

describe('CarriedContextBanner', () => {
  const defaultProps = {
    fromMode: 'chat' as const,
    toMode: 'agent' as const,
    summary: 'This is a test summary of the previous conversation.',
    carriedAt: new Date(),
  };

  it('renders correctly with required props', () => {
    render(<CarriedContextBanner {...defaultProps} />);
    
    expect(screen.getByText('Carried Context')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.summary)).toBeInTheDocument();
  });

  it('displays mode transition correctly', () => {
    render(<CarriedContextBanner {...defaultProps} />);
    
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('shows time ago badge', () => {
    render(<CarriedContextBanner {...defaultProps} />);
    
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<CarriedContextBanner {...defaultProps} onDismiss={onDismiss} />);
    
    // Find all buttons and get the last one (dismiss button)
    // The order is: CollapsibleTrigger, then Dismiss button
    const buttons = screen.getAllByRole('button');
    // Dismiss button is the second button (after collapsible trigger)
    const dismissButton = buttons[buttons.length - 1];
    expect(dismissButton).toBeTruthy();
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CarriedContextBanner {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays different modes correctly', () => {
    const props = {
      ...defaultProps,
      fromMode: 'research' as const,
      toMode: 'learning' as const,
    };
    
    render(<CarriedContextBanner {...props} />);
    
    expect(screen.getByText('Research')).toBeInTheDocument();
    expect(screen.getByText('Learning')).toBeInTheDocument();
  });

  it('formats time correctly for recent timestamps', () => {
    const recentTime = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    render(<CarriedContextBanner {...defaultProps} carriedAt={recentTime} />);
    
    expect(screen.getByTestId('badge')).toHaveTextContent('just now');
  });

  it('formats time correctly for older timestamps', () => {
    const hourAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    render(<CarriedContextBanner {...defaultProps} carriedAt={hourAgo} />);
    
    expect(screen.getByTestId('badge')).toHaveTextContent('2h ago');
  });
});
