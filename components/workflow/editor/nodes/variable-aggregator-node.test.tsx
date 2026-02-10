/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VariableAggregatorNode } from './variable-aggregator-node';
import type { VariableAggregatorNodeData } from '@/types/workflow/workflow-editor';

jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
  }: {
    data: { label: string };
    children?: React.ReactNode;
  }) => (
    <div data-testid="base-node">
      <h3>{data.label}</h3>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  Handle: ({ id }: { id: string }) => <div data-testid={`handle-${id}`} />,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

const baseProps = {
  id: 'va-1',
  type: 'variableAggregator',
  selected: false,
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

const mockData: VariableAggregatorNodeData = {
  id: 'va-1',
  nodeType: 'variableAggregator',
  label: 'Aggregate Vars',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  aggregationMode: 'array',
  variableRefs: [
    { nodeId: 'node-1', variableName: 'output' },
    { nodeId: 'node-2', variableName: 'result' },
  ],
  outputVariableName: 'merged_data',
};

describe('VariableAggregatorNode', () => {
  it('renders without crashing', () => {
    render(<VariableAggregatorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Aggregate Vars')).toBeInTheDocument();
  });

  it('renders aggregation mode badge', () => {
    render(<VariableAggregatorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Collect as Array')).toBeInTheDocument();
  });

  it('renders first value mode', () => {
    const firstMode = { ...mockData, aggregationMode: 'first' as const };
    render(<VariableAggregatorNode {...baseProps} data={firstMode} />);
    expect(screen.getByText('First Value')).toBeInTheDocument();
  });

  it('renders variable references', () => {
    render(<VariableAggregatorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('node-1')).toBeInTheDocument();
    expect(screen.getByText('output')).toBeInTheDocument();
    expect(screen.getByText('node-2')).toBeInTheDocument();
  });

  it('shows empty state when no variables', () => {
    const noVars = { ...mockData, variableRefs: [] };
    render(<VariableAggregatorNode {...baseProps} data={noVars} />);
    expect(screen.getByText('No variables selected')).toBeInTheDocument();
  });

  it('renders output variable name', () => {
    render(<VariableAggregatorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('merged_data')).toBeInTheDocument();
  });

  it('shows overflow for many variable refs', () => {
    const manyRefs = {
      ...mockData,
      variableRefs: Array.from({ length: 6 }, (_, i) => ({
        nodeId: `node-${i}`,
        variableName: `var-${i}`,
      })),
    };
    render(<VariableAggregatorNode {...baseProps} data={manyRefs} />);
    expect(screen.getByText('+2 more variables')).toBeInTheDocument();
  });

  it('renders multiple input handles', () => {
    render(<VariableAggregatorNode {...baseProps} data={mockData} />);
    expect(screen.getByTestId('handle-input-1')).toBeInTheDocument();
    expect(screen.getByTestId('handle-input-2')).toBeInTheDocument();
  });
});
