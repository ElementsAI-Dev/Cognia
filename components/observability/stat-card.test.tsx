/**
 * StatCard Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from './stat-card';

// Mock Recharts for sparkline tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('StatCard', () => {
  it('should render title and value', () => {
    render(<StatCard title="Total Requests" value="1,234" />);

    expect(screen.getByText('Total Requests')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should render with icon', () => {
    const icon = <span data-testid="test-icon">📊</span>;
    render(<StatCard title="Test" value="100" icon={icon} />);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('should display positive trend', () => {
    render(<StatCard title="Test" value="100" trend={{ value: 5.5, label: 'vs last week' }} />);

    expect(screen.getByText('+5.5%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('should display negative trend', () => {
    render(<StatCard title="Test" value="100" trend={{ value: -3.2, label: 'vs last month' }} />);

    expect(screen.getByText('-3.2%')).toBeInTheDocument();
  });

  it('should not display neutral trend indicator', () => {
    render(<StatCard title="Test" value="100" trend={{ value: 0 }} />);

    // Neutral trend (0) should not show +0.0% text
    expect(screen.queryByText('+0.0%')).not.toBeInTheDocument();
    expect(screen.queryByText('0.0%')).not.toBeInTheDocument();
  });

  it('should display subtitle', () => {
    render(<StatCard title="Test" value="100" subtitle="Some additional info" />);

    expect(screen.getByText('Some additional info')).toBeInTheDocument();
  });

  it('should show loading skeleton', () => {
    const { container } = render(<StatCard title="Test" value="100" isLoading />);

    // Should not show the value when loading
    expect(screen.queryByText('100')).not.toBeInTheDocument();
    // Should have skeleton element
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<StatCard title="Test" value="100" className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply custom valueClassName', () => {
    render(<StatCard title="Test" value="100" valueClassName="text-red-500" />);

    const valueElement = screen.getByText('100');
    expect(valueElement).toHaveClass('text-red-500');
  });
});

describe('StatCard with sparkline', () => {
  const sparklineData = [
    { value: 100, label: 'Jan' },
    { value: 150, label: 'Feb' },
    { value: 120, label: 'Mar' },
    { value: 200, label: 'Apr' },
    { value: 180, label: 'May' },
  ];

  it('should render sparkline when data is provided', () => {
    render(<StatCard title="Test" value="100" sparklineData={sparklineData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should not render sparkline with single data point', () => {
    render(<StatCard title="Test" value="100" sparklineData={[{ value: 100 }]} />);

    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('should not render sparkline without data', () => {
    render(<StatCard title="Test" value="100" />);

    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('should apply custom sparkline color', () => {
    render(
      <StatCard title="Test" value="100" sparklineData={sparklineData} sparklineColor="#ff0000" />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});

describe('StatCard sizes', () => {
  it('should render compact size', () => {
    const { container } = render(<StatCard title="Test" value="100" size="compact" />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render default size', () => {
    const { container } = render(<StatCard title="Test" value="100" size="default" />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render large size', () => {
    const { container } = render(<StatCard title="Test" value="100" size="large" />);

    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('StatCard animations', () => {
  it('should have hover animation classes when animated is true', () => {
    const { container } = render(<StatCard title="Test" value="100" animated />);

    expect(container.firstChild).toHaveClass('transition-all');
  });

  it('should not have hover animation classes when animated is false', () => {
    const { container } = render(<StatCard title="Test" value="100" animated={false} />);

    expect(container.firstChild).not.toHaveClass('hover:shadow-md');
  });
});
