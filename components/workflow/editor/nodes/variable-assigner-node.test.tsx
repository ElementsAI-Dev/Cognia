/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VariableAssignerNode } from './variable-assigner-node';
import type { VariableAssignerNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    ..._props
  }: {
    data: { nodeType: string };
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="base-node" data-node-type={data.nodeType}>
      {children}
    </div>
  ),
}));

// Mock Badge
jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    variant: _variant,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} {...props}>
      {children}
    </span>
  ),
}));

const mockData: VariableAssignerNodeData = {
  nodeType: 'variableAssigner',
  label: 'Set Variables',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  assignments: [
    { targetVariable: 'userName', sourceType: 'constant', sourceValue: 'Alice' },
    { targetVariable: 'count', sourceType: 'expression', sourceValue: '{{input.length}}' },
  ],
};

const baseProps = {
  id: 'var-1',
  type: 'variableAssigner',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  selected: false,
};

describe('VariableAssignerNode', () => {
  it('renders without crashing', () => {
    render(<VariableAssignerNode {...baseProps} data={mockData} />);
    expect(screen.getByTestId('base-node')).toBeInTheDocument();
  });

  it('has correct node type', () => {
    render(<VariableAssignerNode {...baseProps} data={mockData} />);
    expect(screen.getByTestId('base-node')).toHaveAttribute('data-node-type', 'variableAssigner');
  });

  it('renders assignment target variables', () => {
    render(<VariableAssignerNode {...baseProps} data={mockData} />);
    expect(screen.getByText('userName')).toBeInTheDocument();
    expect(screen.getByText('count')).toBeInTheDocument();
  });

  it('renders source types', () => {
    render(<VariableAssignerNode {...baseProps} data={mockData} />);
    expect(screen.getByText('constant')).toBeInTheDocument();
    expect(screen.getByText('expression')).toBeInTheDocument();
  });
});

describe('VariableAssignerNode empty state', () => {
  it('shows "No assignments" when assignments is empty', () => {
    const emptyData = { ...mockData, assignments: [] };
    render(<VariableAssignerNode {...baseProps} data={emptyData} />);
    expect(screen.getByText('No assignments')).toBeInTheDocument();
  });

  it('shows "No assignments" when assignments is undefined', () => {
    const undefinedData = { ...mockData, assignments: undefined as unknown as VariableAssignerNodeData['assignments'] };
    render(<VariableAssignerNode {...baseProps} data={undefinedData} />);
    expect(screen.getByText('No assignments')).toBeInTheDocument();
  });
});

describe('VariableAssignerNode truncation', () => {
  it('shows at most 3 assignments', () => {
    const manyData: VariableAssignerNodeData = {
      ...mockData,
      assignments: [
        { targetVariable: 'a', sourceType: 'constant', sourceValue: '1' },
        { targetVariable: 'b', sourceType: 'constant', sourceValue: '2' },
        { targetVariable: 'c', sourceType: 'constant', sourceValue: '3' },
        { targetVariable: 'd', sourceType: 'constant', sourceValue: '4' },
        { targetVariable: 'e', sourceType: 'constant', sourceValue: '5' },
      ],
    };
    render(<VariableAssignerNode {...baseProps} data={manyData} />);

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.queryByText('d')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('does not show "+more" when exactly 3 assignments', () => {
    const threeData: VariableAssignerNodeData = {
      ...mockData,
      assignments: [
        { targetVariable: 'a', sourceType: 'constant', sourceValue: '1' },
        { targetVariable: 'b', sourceType: 'constant', sourceValue: '2' },
        { targetVariable: 'c', sourceType: 'constant', sourceValue: '3' },
      ],
    };
    render(<VariableAssignerNode {...baseProps} data={threeData} />);
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });
});

describe('VariableAssignerNode edge cases', () => {
  it('handles assignment with empty targetVariable', () => {
    const emptyTargetData: VariableAssignerNodeData = {
      ...mockData,
      assignments: [{ targetVariable: '', sourceType: 'constant', sourceValue: '' }],
    };
    render(<VariableAssignerNode {...baseProps} data={emptyTargetData} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
