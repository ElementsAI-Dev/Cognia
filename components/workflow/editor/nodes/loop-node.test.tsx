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
    <span data-testid="badge" className={className} variant={variant} {...props}>
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
  loopType: 'forEach',
  maxIterations: 100,
  iteratorVariable: 'item',
  collection: 'items',
  condition: 'item.isActive',
};

describe('LoopNode', () => {
  it('renders without crashing', () => {
    render(<LoopNode data={mockData} selected={false} />);
    expect(screen.getByText('Process Items')).toBeInTheDocument();
  });

  it('renders loop type badge', () => {
    render(<LoopNode data={mockData} selected={false} />);
    expect(screen.getByText('forEach')).toBeInTheDocument();
  });

  it('renders max iterations badge', () => {
    render(<LoopNode data={mockData} selected={false} />);
    expect(screen.getByText('max: 100')).toBeInTheDocument();
  });

  it('renders iterator variable', () => {
    render(<LoopNode data={mockData} selected={false} />);
    expect(screen.getByText('item')).toBeInTheDocument();
  });

  it('renders collection', () => {
    render(<LoopNode data={mockData} selected={false} />);
    expect(screen.getByText('Collection: items')).toBeInTheDocument();
  });

  it('renders condition', () => {
    render(<LoopNode data={mockData} selected={false} />);
    expect(screen.getByText('item.isActive')).toBeInTheDocument();
  });

  it('does not render iterator variable when not set', () => {
    const noIteratorData: LoopNodeData = {
      ...mockData,
      iteratorVariable: undefined,
    };

    render(<LoopNode data={noIteratorData} selected={false} />);
    expect(screen.queryByText(/item/)).not.toBeInTheDocument();
  });

  it('does not render collection when not set', () => {
    const noCollectionData: LoopNodeData = {
      ...mockData,
      collection: undefined,
    };

    render(<LoopNode data={noCollectionData} selected={false} />);
    expect(screen.queryByText(/Collection:/)).not.toBeInTheDocument();
  });

  it('does not render condition when not set', () => {
    const noConditionData: LoopNodeData = {
      ...mockData,
      condition: undefined,
    };

    render(<LoopNode data={noConditionData} selected={false} />);
    const codeElements = screen.queryAllByText(/item\.isActive/);
    expect(codeElements.length).toBe(0);
  });
});

describe('LoopNode integration tests', () => {
  it('handles complete loop node', () => {
    render(<LoopNode data={mockData} selected={false} />);

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

    render(<LoopNode data={whileData} selected={false} />);

    expect(screen.getByText('while')).toBeInTheDocument();
    expect(screen.getByText('counter < 10')).toBeInTheDocument();
  });

  it('handles do-while loop type', () => {
    const doWhileData: LoopNodeData = {
      ...mockData,
      loopType: 'doWhile',
      condition: 'isValid',
    };

    render(<LoopNode data={doWhileData} selected={false} />);

    expect(screen.getByText('doWhile')).toBeInTheDocument();
    expect(screen.getByText('isValid')).toBeInTheDocument();
  });

  it('handles for loop type', () => {
    const forData: LoopNodeData = {
      ...mockData,
      loopType: 'for',
      iteratorVariable: 'i',
      condition: 'i < 10',
    };

    render(<LoopNode data={forData} selected={false} />);

    expect(screen.getByText('for')).toBeInTheDocument();
    expect(screen.getByText('i')).toBeInTheDocument();
  });

  it('handles minimal loop config', () => {
    const minimalData: LoopNodeData = {
      ...mockData,
      iteratorVariable: undefined,
      collection: undefined,
      condition: undefined,
    };

    render(<LoopNode data={minimalData} selected={false} />);

    expect(screen.getByText('Process Items')).toBeInTheDocument();
    expect(screen.getByText('forEach')).toBeInTheDocument();
    expect(screen.getByText('max: 100')).toBeInTheDocument();
  });
});
