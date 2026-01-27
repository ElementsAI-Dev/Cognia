/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConditionalNode } from './conditional-node';
import type { ConditionalNodeData } from '@/types/workflow/workflow-editor';
// Position is not directly used in tests

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    _multipleSourceHandles,
    ...props
  }: {
    data: { label: string };
    children?: React.ReactNode;
    _multipleSourceHandles?: unknown;
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

const mockData: ConditionalNodeData = {
  id: 'conditional-1',
  nodeType: 'conditional',
  label: 'Check Condition',
  executionStatus: 'idle',
  isConfigured: true,
  conditionType: 'comparison',
  condition: 'data.value > 100',
  comparisonOperator: '>',
  comparisonValue: '100',
};

describe('ConditionalNode', () => {
  it('renders without crashing', () => {
    render(<ConditionalNode data={mockData} selected={false} />);
    expect(screen.getByText('Check Condition')).toBeInTheDocument();
  });

  it('renders condition type badge', () => {
    render(<ConditionalNode data={mockData} selected={false} />);
    expect(screen.getByText('comparison')).toBeInTheDocument();
  });

  it('renders condition expression', () => {
    render(<ConditionalNode data={mockData} selected={false} />);
    expect(screen.getByText('data.value > 100')).toBeInTheDocument();
  });

  it('renders comparison operator and value', () => {
    render(<ConditionalNode data={mockData} selected={false} />);
    // Multiple elements contain '> 100', use getAllByText
    const elements = screen.getAllByText(/>\s*100/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders true/false indicators', () => {
    render(<ConditionalNode data={mockData} selected={false} />);
    expect(screen.getByText('✓ True')).toBeInTheDocument();
    expect(screen.getByText('✗ False')).toBeInTheDocument();
  });

  it('does not render condition when not set', () => {
    const noConditionData: ConditionalNodeData = {
      ...mockData,
      condition: undefined,
    };

    render(<ConditionalNode data={noConditionData} selected={false} />);
    const codeElements = screen.queryAllByText(/data\.value/);
    expect(codeElements.length).toBe(0);
  });

  it('does not render comparison details when not comparison type', () => {
    const expressionData: ConditionalNodeData = {
      ...mockData,
      conditionType: 'expression',
      condition: 'isValid && hasPermission', // Different condition without '100'
      comparisonOperator: undefined,
      comparisonValue: undefined,
    };

    render(<ConditionalNode data={expressionData} selected={false} />);
    // Check that the specific comparison value is not rendered
    expect(screen.queryByText('> 100')).not.toBeInTheDocument();
  });
});

describe('ConditionalNode integration tests', () => {
  it('handles complete conditional node', () => {
    render(<ConditionalNode data={mockData} selected={false} />);

    expect(screen.getByText('Check Condition')).toBeInTheDocument();
    expect(screen.getByText('comparison')).toBeInTheDocument();
    expect(screen.getByText('data.value > 100')).toBeInTheDocument();
    // Multiple elements contain '> 100', verify at least one exists
    const elements = screen.getAllByText(/>\s*100/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('handles expression type condition', () => {
    const expressionData: ConditionalNodeData = {
      ...mockData,
      conditionType: 'expression',
      condition: 'isValid && hasPermission',
    };

    render(<ConditionalNode data={expressionData} selected={false} />);

    expect(screen.getByText('expression')).toBeInTheDocument();
    expect(screen.getByText('isValid && hasPermission')).toBeInTheDocument();
  });

  it('handles switch type condition', () => {
    const switchData: ConditionalNodeData = {
      ...mockData,
      conditionType: 'switch',
      condition: 'user.role',
    };

    render(<ConditionalNode data={switchData} selected={false} />);

    expect(screen.getByText('switch')).toBeInTheDocument();
    expect(screen.getByText('user.role')).toBeInTheDocument();
  });
});
