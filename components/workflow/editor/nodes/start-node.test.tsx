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
    <span data-testid="badge" className={className} data-variant={variant} {...props}>
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
  hasError: false,
  workflowInputs: {
    userId: { type: 'string', description: 'User ID' },
    apiKey: { type: 'string', description: 'API Key' },
  },
};

const baseProps = {
  id: 'start-1',
  type: 'start',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe('StartNode', () => {
  it('renders without crashing', () => {
    render(<StartNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('renders node label', () => {
    render(<StartNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('passes showTargetHandle={false} to BaseNode', () => {
    render(<StartNode {...baseProps} data={mockData} selected={false} />);
    const baseNode = screen.getByTestId('base-node');
    expect(baseNode).toHaveAttribute('data-show-target-handle', 'false');
  });

  it('renders input count when inputs are defined', () => {
    render(<StartNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('2 input(s) defined')).toBeInTheDocument();
  });

  it('renders input badges', () => {
    render(<StartNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('userId')).toBeInTheDocument();
    expect(screen.getByText('apiKey')).toBeInTheDocument();
  });

  it('renders only first 3 inputs', () => {
    const dataWithManyInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {
        input1: { type: 'string', description: 'Input 1' },
        input2: { type: 'string', description: 'Input 2' },
        input3: { type: 'string', description: 'Input 3' },
        input4: { type: 'string', description: 'Input 4' },
        input5: { type: 'string', description: 'Input 5' },
      },
    };

    render(<StartNode {...baseProps} data={dataWithManyInputs} selected={false} />);

    expect(screen.getByText('input1')).toBeInTheDocument();
    expect(screen.getByText('input2')).toBeInTheDocument();
    expect(screen.getByText('input3')).toBeInTheDocument();
    // Use queryByText for elements that should NOT be in document
    expect(screen.queryByText('input4')).not.toBeInTheDocument();
  });

  it('renders more indicator when more than 3 inputs', () => {
    const dataWithManyInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {
        input1: { type: 'string', description: 'Input 1' },
        input2: { type: 'string', description: 'Input 2' },
        input3: { type: 'string', description: 'Input 3' },
        input4: { type: 'string', description: 'Input 4' },
      },
    };

    render(<StartNode {...baseProps} data={dataWithManyInputs} selected={false} />);
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('does not render input section when no inputs', () => {
    const dataWithNoInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {},
    };

    render(<StartNode {...baseProps} data={dataWithNoInputs} selected={false} />);
    expect(screen.queryByText(/input\(s\) defined/)).not.toBeInTheDocument();
  });
});

describe('StartNode integration tests', () => {
  it('handles start node with multiple inputs', () => {
    const dataWithInputs: StartNodeData = {
      ...mockData,
      workflowInputs: {
        url: { type: 'string', description: 'URL' },
        timeout: { type: 'number', description: 'Timeout' },
        retry: { type: 'boolean', description: 'Retry' },
      },
    };

    render(<StartNode {...baseProps} data={dataWithInputs} selected={false} />);

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

    render(<StartNode {...baseProps} data={dataWithNoInputs} selected={false} />);

    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.queryByText(/input\(s\)/)).not.toBeInTheDocument();
  });

  it('displays correct more count for inputs', () => {
    const dataWith10Inputs: StartNodeData = {
      ...mockData,
      workflowInputs: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`input${i}`, { type: 'string' as const, description: `Input ${i}` }])
      ),
    };

    render(<StartNode {...baseProps} data={dataWith10Inputs} selected={false} />);

    expect(screen.getByText('10 input(s) defined')).toBeInTheDocument();
    expect(screen.getByText('+7 more')).toBeInTheDocument();
  });
});
