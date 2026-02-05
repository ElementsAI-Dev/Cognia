/**
 * Unit tests for EmptyState component
 */

import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="link">{children}</a>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/empty', () => ({
  Empty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="empty" data-slot="empty" className={className}>{children}</div>
  ),
  EmptyHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="empty-header" data-slot="empty-header">{children}</div>
  ),
  EmptyMedia: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="empty-media" data-slot="empty-media">{children}</div>
  ),
  EmptyTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="empty-title" data-slot="empty-title">{children}</div>
  ),
  EmptyDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="empty-description" data-slot="empty-description">{children}</div>
  ),
  EmptyContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="empty-content" data-slot="empty-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild: _asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) => (
    <button data-testid="button" {...props}>{children}</button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <span data-testid="icon-chart" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  Settings: () => <span data-testid="icon-settings" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
}));

describe('EmptyState', () => {
  it('renders no-data state by default', () => {
    render(<EmptyState />);
    expect(screen.getByText('noDataTitle')).toBeInTheDocument();
    expect(screen.getByText('noDataDescription')).toBeInTheDocument();
  });

  it('renders tips in no-data state', () => {
    render(<EmptyState />);
    expect(screen.getByText('tip1Title')).toBeInTheDocument();
    expect(screen.getByText('tip2Title')).toBeInTheDocument();
    expect(screen.getByText('tip3Title')).toBeInTheDocument();
  });

  it('renders disabled state', () => {
    render(<EmptyState type="disabled" />);
    expect(screen.getByText('disabledTitle')).toBeInTheDocument();
    expect(screen.getByText('disabledDescription')).toBeInTheDocument();
  });

  it('shows settings link in disabled state', () => {
    render(<EmptyState type="disabled" />);
    expect(screen.getByText('goToSettings')).toBeInTheDocument();
  });

  it('renders chart icon', () => {
    render(<EmptyState />);
    const icons = screen.getAllByTestId('icon-chart');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders settings icon in disabled state', () => {
    render(<EmptyState type="disabled" />);
    const icons = screen.getAllByTestId('icon-settings');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders empty container', () => {
    render(<EmptyState />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });
});
