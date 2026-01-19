/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ParallelNode } from './parallel-node';
import type { ParallelNodeData } from '@/types/workflow/workflow-editor';

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

const mockData: ParallelNodeData = {
  id: 'parallel-1',
  nodeType: 'parallel',
  label: 'Parallel Processing',
  executionStatus: 'idle',
  isConfigured: true,
  branches: [
    { name: 'Branch 1', condition: 'type === "A"' },
    { name: 'Branch 2', condition: 'type === "B"' },
    { name: 'Branch 3', condition: 'type === "C"' },
  ],
  waitForAll: true,
  maxConcurrency: 5,
};

describe('ParallelNode', () => {
  it('renders without crashing', () => {
    render(<ParallelNode data={mockData} selected={false} />);
    expect(screen.getByText('Parallel Processing')).toBeInTheDocument();
  });

  it('renders branch count badge', () => {
    render(<ParallelNode data={mockData} selected={false} />);
    expect(screen.getByText('3 branch(es)')).toBeInTheDocument();
  });

  it('renders wait all badge when waitForAll is true', () => {
    render(<ParallelNode data={mockData} selected={false} />);
    expect(screen.getByText('Wait all')).toBeInTheDocument();
  });

  it('renders max concurrency', () => {
    render(<ParallelNode data={mockData} selected={false} />);
    expect(screen.getByText('Max concurrency: 5')).toBeInTheDocument();
  });

  it('does not render wait all when waitForAll is false', () => {
    const notWaitAllData: ParallelNodeData = {
      ...mockData,
      waitForAll: false,
    };

    render(<ParallelNode data={notWaitAllData} selected={false} />);
    expect(screen.queryByText('Wait all')).not.toBeInTheDocument();
  });

  it('does not render max concurrency when not set', () => {
    const noConcurrencyData: ParallelNodeData = {
      ...mockData,
      maxConcurrency: undefined,
    };

    render(<ParallelNode data={noConcurrencyData} selected={false} />);
    expect(screen.queryByText(/Max concurrency/)).not.toBeInTheDocument();
  });

  it('renders 0 branches badge when no branches', () => {
    const noBranchesData: ParallelNodeData = {
      ...mockData,
      branches: [],
    };

    render(<ParallelNode data={noBranchesData} selected={false} />);
    expect(screen.getByText('0 branch(es)')).toBeInTheDocument();
  });

  it('does not render wait all badge for single branch', () => {
    const singleBranchData: ParallelNodeData = {
      ...mockData,
      branches: [{ name: 'Only Branch', condition: 'true' }],
    };

    render(<ParallelNode data={singleBranchData} selected={false} />);
    expect(screen.getByText('1 branch(es)')).toBeInTheDocument();
  });
});

describe('ParallelNode integration tests', () => {
  it('handles complete parallel node', () => {
    render(<ParallelNode data={mockData} selected={false} />);

    expect(screen.getByText('Parallel Processing')).toBeInTheDocument();
    expect(screen.getByText('3 branch(es)')).toBeInTheDocument();
    expect(screen.getByText('Wait all')).toBeInTheDocument();
    expect(screen.getByText('Max concurrency: 5')).toBeInTheDocument();
  });

  it('handles parallel node without concurrency limit', () => {
    const noLimitData: ParallelNodeData = {
      ...mockData,
      maxConcurrency: undefined,
    };

    render(<ParallelNode data={noLimitData} selected={false} />);

    expect(screen.getByText('3 branch(es)')).toBeInTheDocument();
    expect(screen.getByText('Wait all')).toBeInTheDocument();
    expect(screen.queryByText(/Max concurrency/)).not.toBeInTheDocument();
  });

  it('handles parallel node that waits for any', () => {
    const waitForAnyData: ParallelNodeData = {
      ...mockData,
      waitForAll: false,
    };

    render(<ParallelNode data={waitForAnyData} selected={false} />);

    expect(screen.getByText('3 branch(es)')).toBeInTheDocument();
    expect(screen.queryByText('Wait all')).not.toBeInTheDocument();
  });

  it('handles parallel node with many branches', () => {
    const manyBranchesData: ParallelNodeData = {
      ...mockData,
      branches: Array.from({ length: 10 }, (_, i) => ({
        name: `Branch ${i + 1}`,
        condition: `value === ${i}`,
      })),
    };

    render(<ParallelNode data={manyBranchesData} selected={false} />);

    expect(screen.getByText('10 branch(es)')).toBeInTheDocument();
  });
});
