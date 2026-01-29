/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoopNode } from './loop-node';
import type { LoopNodeData } from '@/types/workflow/workflow-editor';

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
    <span data-testid="badge" className={className} data-variant={variant} {...props}>
      {children}
    </span>
  ),
}));

const mockData: LoopNodeData = {
  id: 'loop-1',
  nodeType: 'loop',
  label: 'Process Items',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  loopType: 'forEach',
  maxIterations: 100,
  iteratorVariable: 'item',
  collection: 'items',
  condition: 'item.isActive',
};

const baseProps = {
  id: 'loop-1',
  type: 'loop',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe('LoopNode', () => {
  it('renders without crashing', () => {
    render(<LoopNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Process Items')).toBeInTheDocument();
  });

  it('renders loop type badge', () => {
    render(<LoopNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('forEach')).toBeInTheDocument();
  });

  it('renders max iterations badge', () => {
    render(<LoopNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('max: 100')).toBeInTheDocument();
  });

  it('renders iterator variable', () => {
    render(<LoopNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('item')).toBeInTheDocument();
  });

  it('renders collection', () => {
    render(<LoopNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Collection: items')).toBeInTheDocument();
  });

  it('renders condition', () => {
    render(<LoopNode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('item.isActive')).toBeInTheDocument();
  });

  it('does not render iterator variable when not set', () => {
    const noIteratorData: LoopNodeData = {
      ...mockData,
      iteratorVariable: '',
      collection: 'data', // Use different collection name to avoid 'item' match
      condition: 'x > 0', // Use different condition to avoid 'item' match
    };

    render(<LoopNode {...baseProps} data={noIteratorData} selected={false} />);
    // Check iterator variable is not shown as a standalone element
    expect(screen.queryByText('Iterator:')).not.toBeInTheDocument();
  });

  it('does not render collection when not set', () => {
    const noCollectionData: LoopNodeData = {
      ...mockData,
      collection: '',
    };

    render(<LoopNode {...baseProps} data={noCollectionData} selected={false} />);
    expect(screen.queryByText(/Collection:/)).not.toBeInTheDocument();
  });

  it('does not render condition when not set', () => {
    const noConditionData: LoopNodeData = {
      ...mockData,
      condition: '',
    };

    render(<LoopNode {...baseProps} data={noConditionData} selected={false} />);
    const codeElements = screen.queryAllByText(/item\.isActive/);
    expect(codeElements.length).toBe(0);
  });
});

describe('LoopNode integration tests', () => {
  it('handles complete loop node', () => {
    render(<LoopNode {...baseProps} data={mockData} selected={false} />);

    expect(screen.getByText('Process Items')).toBeInTheDocument();
    expect(screen.getByText('forEach')).toBeInTheDocument();
    expect(screen.getByText('max: 100')).toBeInTheDocument();
    expect(screen.getByText('item')).toBeInTheDocument();
    expect(screen.getByText('Collection: items')).toBeInTheDocument();
  });

  it('handles while loop type', () => {
    const whileData: LoopNodeData = {
      ...mockData,
      loopType: 'while',
      condition: 'counter < 10',
    };

    render(<LoopNode {...baseProps} data={whileData} selected={false} />);

    expect(screen.getByText('while')).toBeInTheDocument();
    expect(screen.getByText('counter < 10')).toBeInTheDocument();
  });

  it('handles times loop type', () => {
    const timesData: LoopNodeData = {
      ...mockData,
      loopType: 'times',
      condition: 'isValid',
    };

    render(<LoopNode {...baseProps} data={timesData} selected={false} />);

    expect(screen.getByText('times')).toBeInTheDocument();
    expect(screen.getByText('isValid')).toBeInTheDocument();
  });

  it('handles forEach loop type', () => {
    const forEachData: LoopNodeData = {
      ...mockData,
      loopType: 'forEach',
      iteratorVariable: 'i',
      condition: 'i < 10',
    };

    render(<LoopNode {...baseProps} data={forEachData} selected={false} />);

    expect(screen.getByText('forEach')).toBeInTheDocument();
    expect(screen.getByText('i')).toBeInTheDocument();
  });

  it('handles minimal loop config', () => {
    const minimalData: LoopNodeData = {
      ...mockData,
      iteratorVariable: '',
      collection: '',
      condition: '',
    };

    render(<LoopNode {...baseProps} data={minimalData} selected={false} />);

    expect(screen.getByText('Process Items')).toBeInTheDocument();
    expect(screen.getByText('forEach')).toBeInTheDocument();
    expect(screen.getByText('max: 100')).toBeInTheDocument();
  });
});
