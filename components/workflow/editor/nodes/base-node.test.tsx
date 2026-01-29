/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BaseNode } from './base-node';
import type { WorkflowNodeData } from '@/types/workflow/workflow-editor';
import { Position } from '@xyflow/react';

// Mock dependencies
jest.mock('@xyflow/react', () => ({
  Handle: ({
    type,
    position,
    className,
    id,
  }: {
    type: string;
    position: string;
    className?: string;
    id?: string;
  }) => (
    <div
      data-testid={`handle-${type}-${id || 'default'}`}
      data-position={position}
      className={className}
    />
  ),
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
}));

jest.mock('../node-preview-tooltip', () => ({
  NodePreviewTooltip: ({ children, _data }: { children?: React.ReactNode; _data?: unknown }) => (
    <>{children}</>
  ),
}));

jest.mock('../node-quick-config', () => ({
  NodeQuickConfig: ({
    children,
    _nodeId,
    _data,
  }: {
    children?: React.ReactNode;
    _nodeId?: string;
    _data?: unknown;
  }) => <>{children}</>,
}));

jest.mock('lucide-react', () => ({
  Play: () => <svg data-testid="play-icon" />,
  Square: () => <svg data-testid="square-icon" />,
  Sparkles: () => <svg data-testid="sparkles-icon" />,
  Wrench: () => <svg data-testid="wrench-icon" />,
  GitBranch: () => <svg data-testid="git-branch-icon" />,
  GitFork: () => <svg data-testid="git-fork-icon" />,
  User: () => <svg data-testid="user-icon" />,
  Workflow: () => <svg data-testid="workflow-icon" />,
  Repeat: () => <svg data-testid="repeat-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  Globe: () => <svg data-testid="globe-icon" />,
  Code: () => <svg data-testid="code-icon" />,
  Shuffle: () => <svg data-testid="shuffle-icon" />,
  GitMerge: () => <svg data-testid="git-merge-icon" />,
  AlertCircle: () => <svg data-testid="alert-circle-icon" />,
  CheckCircle: () => <svg data-testid="check-circle-icon" />,
  Loader2: () => <svg data-testid="loader-icon" />,
  XCircle: () => <svg data-testid="x-circle-icon" />,
  Pause: () => <svg data-testid="pause-icon" />,
  Group: () => <svg data-testid="group-icon" />,
  StickyNote: () => <svg data-testid="sticky-note-icon" />,
}));

const mockData: WorkflowNodeData = {
  id: 'node-1',
  nodeType: 'ai',
  label: 'AI Node',
  description: 'An AI processing node',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
  aiPrompt: 'Test prompt',
  responseFormat: 'text',
};

const baseProps = {
  id: 'node-1',
  type: 'ai',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe('BaseNode', () => {
  it('renders without crashing', () => {
    render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('AI Node')).toBeInTheDocument();
  });

  it('renders node label', () => {
    render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('AI Node')).toBeInTheDocument();
  });

  it('renders node description', () => {
    render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('An AI processing node')).toBeInTheDocument();
  });

  it('renders color indicator bar', () => {
    const { container } = render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    const colorBar = container.querySelector('.absolute.left-0');
    expect(colorBar).toBeInTheDocument();
  });

  it('renders node type icon', () => {
    render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    const { container } = render(<BaseNode {...baseProps} data={mockData} selected={true} />);
    const node = container.querySelector('.ring-2');
    expect(node).toBeInTheDocument();
  });

  it('renders source handle by default', () => {
    render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByTestId('handle-source-default')).toBeInTheDocument();
  });

  it('renders target handle by default', () => {
    const newData = { ...mockData, nodeType: 'tool' as const, toolName: 'test', parameterMapping: {} };
    render(<BaseNode {...baseProps} data={newData} selected={false} />);
    expect(screen.getByTestId('handle-target-default')).toBeInTheDocument();
  });

  it('does not render source handle when showSourceHandle is false', () => {
    render(<BaseNode {...baseProps} data={mockData} selected={false} showSourceHandle={false} />);
    expect(screen.queryByTestId('handle-source-default')).not.toBeInTheDocument();
  });

  it('does not render target handle when showTargetHandle is false', () => {
    render(<BaseNode {...baseProps} data={mockData} selected={false} showTargetHandle={false} />);
    expect(screen.queryByTestId('handle-target-default')).not.toBeInTheDocument();
  });

  it('renders custom handle positions', () => {
    render(
      <BaseNode
        {...baseProps}
        data={mockData}
        selected={false}
        sourceHandlePosition={Position.Right}
        targetHandlePosition={Position.Left}
      />
    );
    expect(screen.getByTestId('handle-source-default')).toHaveAttribute('data-position', 'right');
    expect(screen.getByTestId('handle-target-default')).toHaveAttribute('data-position', 'left');
  });

  it('renders multiple source handles', () => {
    const multipleHandles = [
      { id: 'output-1', position: Position.Bottom },
      { id: 'output-2', position: Position.Right },
    ];

    render(<BaseNode {...baseProps} data={mockData} selected={false} multipleSourceHandles={multipleHandles} />);

    expect(screen.getByTestId('handle-source-output-1')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-output-2')).toBeInTheDocument();
  });

  it('renders multiple target handles', () => {
    const multipleHandles = [
      { id: 'input-1', position: Position.Top },
      { id: 'input-2', position: Position.Left },
    ];

    render(<BaseNode {...baseProps} data={mockData} selected={false} multipleTargetHandles={multipleHandles} />);

    expect(screen.getByTestId('handle-target-input-1')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target-input-2')).toBeInTheDocument();
  });

  it('renders error state when hasError is true', () => {
    const errorData = { ...mockData, hasError: true, errorMessage: 'Something went wrong' };
    const { container } = render(<BaseNode {...baseProps} data={errorData} selected={false} />);

    const errorNode = container.querySelector('.border-destructive');
    expect(errorNode).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders error icon', () => {
    const errorData = { ...mockData, hasError: true, errorMessage: 'Error' };
    render(<BaseNode {...baseProps} data={errorData} selected={false} />);
    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
  });

  it('renders running status', () => {
    const runningData = { ...mockData, executionStatus: 'running' as const };
    const { container } = render(<BaseNode {...baseProps} data={runningData} selected={false} />);

    const runningNode = container.querySelector('.border-blue-500');
    expect(runningNode).toBeInTheDocument();
    expect(screen.getByText('Executing...')).toBeInTheDocument();
  });

  it('renders completed status', () => {
    const completedData = { ...mockData, executionStatus: 'completed' as const };
    const { container } = render(<BaseNode {...baseProps} data={completedData} selected={false} />);

    const completedNode = container.querySelector('.border-green-500');
    expect(completedNode).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
  });

  it('renders failed status', () => {
    const failedData = { ...mockData, executionStatus: 'failed' as const };
    const { container } = render(<BaseNode {...baseProps} data={failedData} selected={false} />);

    const failedNode = container.querySelector('.border-red-500');
    expect(failedNode).toBeInTheDocument();
    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
  });

  it('renders pending status', () => {
    const pendingData = { ...mockData, executionStatus: 'pending' as const };
    const { container } = render(<BaseNode {...baseProps} data={pendingData} selected={false} />);

    const pendingNode = container.querySelector('.border-yellow-500');
    expect(pendingNode).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('renders skipped status', () => {
    const skippedData = { ...mockData, executionStatus: 'skipped' as const };
    const { container } = render(<BaseNode {...baseProps} data={skippedData} selected={false} />);

    const skippedNode = container.querySelector('.border-gray-400');
    expect(skippedNode).toBeInTheDocument();
    expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
  });

  it('renders execution time when provided', () => {
    const dataWithTime = { ...mockData, executionTime: 2500 };
    render(<BaseNode {...baseProps} data={dataWithTime} selected={false} />);
    expect(screen.getByText('2.50s')).toBeInTheDocument();
  });

  it('renders not configured indicator', () => {
    const notConfiguredData = { ...mockData, isConfigured: false, nodeType: 'tool' as const, toolName: 'test', parameterMapping: {} };
    render(<BaseNode {...baseProps} data={notConfiguredData} selected={false} />);
    expect(screen.getByText('Not configured')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(
      <BaseNode {...baseProps} data={mockData} selected={false}>
        <div data-testid="custom-content">Custom Content</div>
      </BaseNode>
    );
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });

  it('applies hover effects', () => {
    const { container } = render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    const node = container.querySelector('.hover\\:shadow-lg');
    expect(node).toBeInTheDocument();
  });

  it('has proper border styling', () => {
    const { container } = render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    const node = container.querySelector('.border-2');
    expect(node).toBeInTheDocument();
  });

  it('has proper card styling', () => {
    const { container } = render(<BaseNode {...baseProps} data={mockData} selected={false} />);
    const node = container.querySelector('.rounded-lg');
    expect(node).toBeInTheDocument();
  });
});

describe('BaseNode integration tests', () => {
  it('handles complete node with all features', () => {
    const completeData: WorkflowNodeData = {
      ...mockData,
      executionStatus: 'running',
      executionTime: 1500,
      hasError: false,
    };

    render(<BaseNode {...baseProps} data={completeData} selected={true} />);

    expect(screen.getByText('AI Node')).toBeInTheDocument();
    expect(screen.getByText('An AI processing node')).toBeInTheDocument();
    expect(screen.getByText('Executing...')).toBeInTheDocument();
    expect(screen.getByText('1.50s')).toBeInTheDocument();
  });

  it('handles node with error and execution time', () => {
    const errorData: WorkflowNodeData = {
      ...mockData,
      hasError: true,
      errorMessage: 'Connection failed',
      executionTime: 5000,
    };

    render(<BaseNode {...baseProps} data={errorData} selected={false} />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('5.00s')).toBeInTheDocument();
  });

  it('handles node with multiple handles', () => {
    const multiHandleData: WorkflowNodeData = {
      ...mockData,
      nodeType: 'conditional',
      condition: 'x > 0',
      conditionType: 'expression',
    };

    const multipleSourceHandles = [
      { id: 'true', position: Position.Right, label: 'True' },
      { id: 'false', position: Position.Bottom, label: 'False' },
    ];

    render(
      <BaseNode
        {...baseProps}
        data={multiHandleData}
        selected={false}
        multipleSourceHandles={multipleSourceHandles}
      />
    );

    expect(screen.getByTestId('handle-source-true')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-false')).toBeInTheDocument();
  });
});
