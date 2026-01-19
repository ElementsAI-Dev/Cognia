/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StartNode } from './start-node';
import type { StartNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    showTargetHandle,
    ...props
  }: {
    data: { label: string };
    children?: React.ReactNode;
    showTargetHandle?: boolean;
    [key: string]: unknown;
  }) => (
    <div data-testid="base-node" data-show-target-handle={showTargetHandle} {...props}>
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

const mockData: StartNodeData = {
  id: 'start-1',
  nodeType: 'start',
  label: 'Start',
  executionStatus: 'idle',
  isConfigured: true,
  workflowInputs: {
    userId: { type: 'string', required: true },
    apiKey: { type: 'string', required: true },
  },
};

describe('StartNode', () => {
  it('renders without crashing', () => {
    render(<StartNode data={mockData} selected={false} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('renders node label', () => {
    render(<StartNode data={mockData} selected={false} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('passes showTargetHandle={false} to BaseNode', () => {
    render(<StartNode data={mockData} selected={false} />);
    const baseNode = screen.getByTestId('base-node');
    expect(baseNode).toHaveAttribute('data-show-target-handle', 'false');
  });

  it('renders input count when inputs are defined', () => {
    render(<StartNode data={mockData} selected={false} />);
    expect(screen.getByText('2 input(s) defined')).toBeInTheDocument();
  });

  it('renders input badges', () => {
    render(<StartNode data={mockData} selected={false} />);
    expect(screen.getByText('userId')).toBeInTheDocument();
    expect(screen.getByText('apiKey')).toBeInTheDocument();
  });

  it('renders only first 3 inputs', () => {
    const dataWithManyInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {
        input1: { type: 'string', required: true },
        input2: { type: 'string', required: true },
        input3: { type: 'string', required: true },
        input4: { type: 'string', required: true },
        input5: { type: 'string', required: true },
      },
    };

    render(<StartNode data={dataWithManyInputs} selected={false} />);

    expect(screen.getByText('input1')).toBeInTheDocument();
    expect(screen.getByText('input2')).toBeInTheDocument();
    expect(screen.getByText('input3')).toBeInTheDocument();
    expect(screen.getByText('input4')).not.toBeInTheDocument();
  });

  it('renders more indicator when more than 3 inputs', () => {
    const dataWithManyInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {
        input1: { type: 'string', required: true },
        input2: { type: 'string', required: true },
        input3: { type: 'string', required: true },
        input4: { type: 'string', required: true },
      },
    };

    render(<StartNode data={dataWithManyInputs} selected={false} />);
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('does not render input section when no inputs', () => {
    const dataWithNoInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {},
    };

    render(<StartNode data={dataWithNoInputs} selected={false} />);
    expect(screen.queryByText(/input\(s\) defined/)).not.toBeInTheDocument();
  });
});

describe('StartNode integration tests', () => {
  it('handles start node with multiple inputs', () => {
    const dataWithInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {
        url: { type: 'string', required: true },
        timeout: { type: 'number', required: false, default: 30 },
        retry: { type: 'boolean', required: false },
      },
    };

    render(<StartNode data={dataWithInputs} selected={false} />);

    expect(screen.getByText('3 input(s) defined')).toBeInTheDocument();
    expect(screen.getByText('url')).toBeInTheDocument();
    expect(screen.getByText('timeout')).toBeInTheDocument();
    expect(screen.getByText('retry')).toBeInTheDocument();
  });

  it('handles start node with no inputs', () => {
    const dataWithNoInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {},
    };

    render(<StartNode data={dataWithNoInputs} selected={false} />);

    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.queryByText(/input\(s\)/)).not.toBeInTheDocument();
  });

  it('displays correct more count for inputs', () => {
    const dataWith10Inputs: StartNodeData = {
      ...mockData,
      workflowInputs: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`input${i}`, { type: 'string', required: true }])
      ) as Record<string, { type: string; required: boolean }>,
    };

    render(<StartNode data={dataWith10Inputs} selected={false} />);

    expect(screen.getByText('10 input(s) defined')).toBeInTheDocument();
    expect(screen.getByText('+7 more')).toBeInTheDocument();
  });
});
