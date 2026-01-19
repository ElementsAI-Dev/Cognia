/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DelayNode } from './delay-node';
import type { DelayNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    ...props
  }: {
    data: { label: string };
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="base-node" {...props}>
      <h3>{data.label}</h3>
      {children}
    </div>
  ),
}));

// Mock Badge
jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    variant,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} variant={variant} {...props}>
      {children}
    </span>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Timer: ({ className }: { className?: string }) => (
    <svg data-testid="timer-icon" className={className} />
  ),
  Calendar: ({ className }: { className?: string }) => (
    <svg data-testid="calendar-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg data-testid="clock-icon" className={className} />
  ),
}));

const mockData: DelayNodeData = {
  id: 'delay-1',
  nodeType: 'delay',
  label: 'Wait Before Processing',
  executionStatus: 'idle',
  isConfigured: true,
  delayType: 'fixed',
  delayMs: 5000,
};

describe('DelayNode', () => {
  it('renders without crashing', () => {
    render(<DelayNode data={mockData} selected={false} />);
    expect(screen.getByText('Wait Before Processing')).toBeInTheDocument();
  });

  it('renders delay type badge', () => {
    render(<DelayNode data={mockData} selected={false} />);
    expect(screen.getByText('fixed')).toBeInTheDocument();
  });

  it('renders delay value for fixed delay', () => {
    render(<DelayNode data={mockData} selected={false} />);
    expect(screen.getByText('5.0s')).toBeInTheDocument();
  });

  it('renders timer icon for fixed delay', () => {
    render(<DelayNode data={mockData} selected={false} />);
    expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
  });

  it('shows not set when delayMs is not provided', () => {
    const noDelayData: DelayNodeData = {
      ...mockData,
      delayMs: undefined,
    };

    render(<DelayNode data={noDelayData} selected={false} />);
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('renders until time for until delay type', () => {
    const untilData: DelayNodeData = {
      ...mockData,
      delayType: 'until',
      untilTime: '2024-12-25T10:00:00Z',
    };

    render(<DelayNode data={untilData} selected={false} />);
    expect(screen.getByText(/12\/25\/2024/)).toBeInTheDocument();
  });

  it('renders calendar icon for until delay', () => {
    const untilData: DelayNodeData = {
      ...mockData,
      delayType: 'until',
      untilTime: '2024-12-25T10:00:00Z',
    };

    render(<DelayNode data={untilData} selected={false} />);
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
  });

  it('renders cron expression for cron delay type', () => {
    const cronData: DelayNodeData = {
      ...mockData,
      delayType: 'cron',
      cronExpression: '0 0 * * *',
    };

    render(<DelayNode data={cronData} selected={false} />);
    expect(screen.getByText('0 0 * * *')).toBeInTheDocument();
  });

  it('renders clock icon for cron delay', () => {
    const cronData: DelayNodeData = {
      ...mockData,
      delayType: 'cron',
      cronExpression: '0 0 * * *',
    };

    render(<DelayNode data={cronData} selected={false} />);
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('shows not configured when no delay settings', () => {
    const noConfigData: DelayNodeData = {
      ...mockData,
      delayType: undefined,
      delayMs: undefined,
      untilTime: undefined,
      cronExpression: undefined,
    };

    render(<DelayNode data={noConfigData} selected={false} />);
    expect(screen.getByText('Not configured')).toBeInTheDocument();
  });
});

describe('DelayNode formatting', () => {
  it('formats milliseconds correctly', () => {
    const msData: DelayNodeData = {
      ...mockData,
      delayMs: 500,
    };

    render(<DelayNode data={msData} selected={false} />);
    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('formats seconds correctly', () => {
    const secData: DelayNodeData = {
      ...mockData,
      delayMs: 2500,
    };

    render(<DelayNode data={secData} selected={false} />);
    expect(screen.getByText('2.5s')).toBeInTheDocument();
  });

  it('formats minutes correctly', () => {
    const minData: DelayNodeData = {
      ...mockData,
      delayMs: 90000,
    };

    render(<DelayNode data={minData} selected={false} />);
    expect(screen.getByText('1m 30s')).toBeInTheDocument();
  });

  it('formats hours correctly', () => {
    const hourData: DelayNodeData = {
      ...mockData,
      delayMs: 3660000,
    };

    render(<DelayNode data={hourData} selected={false} />);
    expect(screen.getByText('1h 1m')).toBeInTheDocument();
  });
});

describe('DelayNode integration tests', () => {
  it('handles fixed delay with proper formatting', () => {
    const fixedData: DelayNodeData = {
      ...mockData,
      delayType: 'fixed',
      delayMs: 1500,
    };

    render(<DelayNode data={fixedData} selected={false} />);

    expect(screen.getByText('fixed')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });

  it('handles until delay with date display', () => {
    const untilData: DelayNodeData = {
      ...mockData,
      delayType: 'until',
      untilTime: '2024-06-15T14:30:00Z',
    };

    render(<DelayNode data={untilData} selected={false} />);

    expect(screen.getByText('until')).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('handles cron delay with expression', () => {
    const cronData: DelayNodeData = {
      ...mockData,
      delayType: 'cron',
      cronExpression: '*/5 * * * *',
    };

    render(<DelayNode data={cronData} selected={false} />);

    expect(screen.getByText('cron')).toBeInTheDocument();
    expect(screen.getByText('*/5 * * * *')).toBeInTheDocument();
  });
});
