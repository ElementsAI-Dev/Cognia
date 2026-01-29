/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EndNode } from './end-node';
import type { EndNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    showSourceHandle,
    ...props
  }: {
    data: { label: string };
    children?: React.ReactNode;
    showSourceHandle?: boolean;
    [key: string]: unknown;
  }) => (
    <div data-testid="base-node" data-show-source-handle={showSourceHandle} {...props}>
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

const mockData: EndNodeData = {
  id: 'end-1',
  nodeType: 'end',
  label: 'End',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  workflowOutputs: {
    result: { type: 'object', description: 'Result object' },
    statusCode: { type: 'number', description: 'Status code' },
    message: { type: 'string', description: 'Message' },
  },
  outputMapping: {},
};

const baseProps = {
  id: 'end-1',
  type: 'end',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe('EndNode', () => {
  it('renders without crashing', () => {
    render(<EndNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  it('renders node label', () => {
    render(<EndNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  it('passes showSourceHandle={false} to BaseNode', () => {
    render(<EndNode {...baseProps} data={mockData} selected={false} />);
    const baseNode = screen.getByTestId('base-node');
    expect(baseNode).toHaveAttribute('data-show-source-handle', 'false');
  });

  it('renders output count when outputs are defined', () => {
    render(<EndNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('3 output(s) defined')).toBeInTheDocument();
  });

  it('renders output badges', () => {
    render(<EndNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('result')).toBeInTheDocument();
    expect(screen.getByText('statusCode')).toBeInTheDocument();
    expect(screen.getByText('message')).toBeInTheDocument();
  });

  it('renders only first 3 outputs', () => {
    const dataWithManyOutputs: EndNodeData = {
      ...mockData,
      workflowOutputs: {
        output1: { type: 'string', description: 'Output 1' },
        output2: { type: 'string', description: 'Output 2' },
        output3: { type: 'string', description: 'Output 3' },
        output4: { type: 'string', description: 'Output 4' },
        output5: { type: 'string', description: 'Output 5' },
      },
    };

    render(<EndNode {...baseProps} data={dataWithManyOutputs} selected={false} />);

    expect(screen.getByText('output1')).toBeInTheDocument();
    expect(screen.getByText('output2')).toBeInTheDocument();
    expect(screen.getByText('output3')).toBeInTheDocument();
    expect(screen.queryByText('output4')).not.toBeInTheDocument();
  });

  it('renders more indicator when more than 3 outputs', () => {
    const dataWithManyOutputs: EndNodeData = {
      ...mockData,
      workflowOutputs: {
        output1: { type: 'string', description: 'Output 1' },
        output2: { type: 'string', description: 'Output 2' },
        output3: { type: 'string', description: 'Output 3' },
        output4: { type: 'string', description: 'Output 4' },
      },
    };

    render(<EndNode {...baseProps} data={dataWithManyOutputs} selected={false} />);
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('does not render output section when no outputs', () => {
    const dataWithNoOutputs: EndNodeData = {
      ...mockData,
      workflowOutputs: {},
    };

    render(<EndNode {...baseProps} data={dataWithNoOutputs} selected={false} />);
    expect(screen.queryByText(/output\(s\) defined/)).not.toBeInTheDocument();
  });
});

describe('EndNode integration tests', () => {
  it('handles end node with multiple outputs', () => {
    const dataWithOutputs: EndNodeData = {
      ...mockData,
      workflowOutputs: {
        result: { type: 'object', description: 'Result' },
        status: { type: 'string', description: 'Status' },
        timestamp: { type: 'string', description: 'Timestamp' },
      },
    };

    render(<EndNode {...baseProps} data={dataWithOutputs} selected={false} />);

    expect(screen.getByText('3 output(s) defined')).toBeInTheDocument();
    expect(screen.getByText('result')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('timestamp')).toBeInTheDocument();
  });

  it('handles end node with no outputs', () => {
    const dataWithNoOutputs: EndNodeData = {
      ...mockData,
      workflowOutputs: {},
    };

    render(<EndNode {...baseProps} data={dataWithNoOutputs} selected={false} />);

    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.queryByText(/output\(s\)/)).not.toBeInTheDocument();
  });

  it('displays correct more count for outputs', () => {
    const dataWith10Outputs: EndNodeData = {
      ...mockData,
      workflowOutputs: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`output${i}`, { type: 'string' as const, description: `Output ${i}` }])
      ),
    };

    render(<EndNode {...baseProps} data={dataWith10Outputs} selected={false} />);

    expect(screen.getByText('10 output(s) defined')).toBeInTheDocument();
    expect(screen.getByText('+7 more')).toBeInTheDocument();
  });
});
