/**
 * Unit tests for RecommendationsPanel component
 */

import { render, screen } from '@testing-library/react';
import { RecommendationsPanel } from './recommendations-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-description">{children}</p>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Lightbulb: () => <span data-testid="icon-lightbulb" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  CheckCircle: () => <span data-testid="icon-check" />,
}));

describe('RecommendationsPanel', () => {
  const mockRecommendations = [
    'Your usage is healthy and within budget.',
    'Consider using a smaller model for cost savings.',
    'API requests have increased significantly.',
  ];

  it('renders the panel with recommendations', () => {
    render(<RecommendationsPanel recommendations={mockRecommendations} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders all recommendation alerts', () => {
    render(<RecommendationsPanel recommendations={mockRecommendations} />);
    const alerts = screen.getAllByTestId('alert');
    expect(alerts).toHaveLength(3);
  });

  it('returns null when no recommendations', () => {
    const { container } = render(<RecommendationsPanel recommendations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays recommendation text', () => {
    render(<RecommendationsPanel recommendations={mockRecommendations} />);
    expect(screen.getByText('Your usage is healthy and within budget.')).toBeInTheDocument();
    expect(
      screen.getByText('Consider using a smaller model for cost savings.')
    ).toBeInTheDocument();
  });

  it('renders title with lightbulb icon', () => {
    render(<RecommendationsPanel recommendations={mockRecommendations} />);
    expect(screen.getByText('title')).toBeInTheDocument();
    const icons = screen.getAllByTestId('icon-lightbulb');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('shows check icon for healthy recommendations', () => {
    render(<RecommendationsPanel recommendations={['Your usage is healthy.']} />);
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('shows trending icon for cost recommendations', () => {
    render(<RecommendationsPanel recommendations={['Consider cost savings options.']} />);
    expect(screen.getByTestId('icon-trending-up')).toBeInTheDocument();
  });

  it('shows alert icon for increased usage recommendations', () => {
    render(<RecommendationsPanel recommendations={['Usage has increased dramatically.']} />);
    expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<RecommendationsPanel recommendations={mockRecommendations} className="custom-class" />);
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });
});
