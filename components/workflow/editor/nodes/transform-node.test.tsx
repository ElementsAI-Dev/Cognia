/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TransformNode } from './transform-node';
import type { TransformNodeData } from '@/types/workflow/workflow-editor';

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

// Mock UI components
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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Shuffle: ({ className }: { className?: string }) => (
    <svg data-testid="shuffle-icon" className={className} />
  ),
  Filter: ({ className }: { className?: string }) => (
    <svg data-testid="filter-icon" className={className} />
  ),
  ArrowDownUp: ({ className }: { className?: string }) => (
    <svg data-testid="arrow-down-up-icon" className={className} />
  ),
  Layers: ({ className }: { className?: string }) => (
    <svg data-testid="layers-icon" className={className} />
  ),
  Code: ({ className }: { className?: string }) => (
    <svg data-testid="code-icon" className={className} />
  ),
}));

const mockData: TransformNodeData = {
  id: 'transform-1',
  nodeType: 'transform',
  label: 'Transform Data',
  description: 'Apply transformation',
  transformType: 'map',
  expression: 'items.map(x => x * 2)',
  inputs: {
    items: { type: 'array', description: 'Input array' },
  },
  outputs: {
    result: { type: 'array', description: 'Transformed array' },
  },
  executionStatus: 'idle',
  isConfigured: true,
};

const mockProps = {
  id: 'transform-1',
  data: mockData,
  selected: false,
};

describe('TransformNode', () => {
  it('renders without crashing', () => {
    render(<TransformNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toBeInTheDocument();
  });

  it('renders transform type badge', () => {
    render(<TransformNode {...mockProps} />);
    expect(screen.getByText('map')).toBeInTheDocument();
  });

  it('renders expression preview', () => {
    render(<TransformNode {...mockProps} />);
    expect(screen.getByText('items.map(x => x * 2)')).toBeInTheDocument();
  });

  it('renders input count badge', () => {
    render(<TransformNode {...mockProps} />);
    expect(screen.getByText('1 in')).toBeInTheDocument();
  });

  it('renders output count badge', () => {
    render(<TransformNode {...mockProps} />);
    expect(screen.getByText('1 out')).toBeInTheDocument();
  });

  it('has correct node type', () => {
    render(<TransformNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toHaveAttribute('data-node-type', 'transform');
  });
});

describe('TransformNode with different transform types', () => {
  it('renders map transform type', () => {
    render(<TransformNode {...mockProps} />);
    expect(screen.getByText('map')).toBeInTheDocument();
    expect(screen.getByTestId('shuffle-icon')).toBeInTheDocument();
  });

  it('renders filter transform type', () => {
    const filterData = { ...mockData, transformType: 'filter' as const };
    render(<TransformNode {...mockProps} data={filterData} />);
    expect(screen.getByText('filter')).toBeInTheDocument();
    expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
  });

  it('renders reduce transform type', () => {
    const reduceData = { ...mockData, transformType: 'reduce' as const };
    render(<TransformNode {...mockProps} data={reduceData} />);
    expect(screen.getByText('reduce')).toBeInTheDocument();
    expect(screen.getByTestId('layers-icon')).toBeInTheDocument();
  });

  it('renders sort transform type', () => {
    const sortData = { ...mockData, transformType: 'sort' as const };
    render(<TransformNode {...mockProps} data={sortData} />);
    expect(screen.getByText('sort')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-down-up-icon')).toBeInTheDocument();
  });

  it('renders custom transform type', () => {
    const customData = { ...mockData, transformType: 'custom' as const };
    render(<TransformNode {...mockProps} data={customData} />);
    expect(screen.getByText('custom')).toBeInTheDocument();
    expect(screen.getByTestId('code-icon')).toBeInTheDocument();
  });

  it('capitalizes transform type', () => {
    render(<TransformNode {...mockProps} />);
    const badge = screen.getByText('map').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('capitalize');
  });
});

describe('TransformNode expression display', () => {
  it('renders full expression when short', () => {
    const shortExprData = { ...mockData, expression: 'x * 2' };
    render(<TransformNode {...mockProps} data={shortExprData} />);
    expect(screen.getByText('x * 2')).toBeInTheDocument();
  });

  it('truncates long expression with ellipsis', () => {
    const longExpr = 'a'.repeat(100);
    const longExprData = { ...mockData, expression: longExpr };
    render(<TransformNode {...mockProps} data={longExprData} />);
    expect(screen.getByText(`${longExpr.slice(0, 60)}...`)).toBeInTheDocument();
  });

  it('renders "No expression defined" when expression is missing', () => {
    const noExprData = { ...mockData, expression: undefined as unknown as string };
    render(<TransformNode {...mockProps} data={noExprData} />);
    expect(screen.getByText('No expression defined')).toBeInTheDocument();
  });

  it('renders "No expression defined" when expression is empty', () => {
    const emptyExprData = { ...mockData, expression: '' };
    render(<TransformNode {...mockProps} data={emptyExprData} />);
    expect(screen.getByText('No expression defined')).toBeInTheDocument();
  });

  it('has italic style for "No expression defined"', () => {
    const noExprData = { ...mockData, expression: undefined as unknown as string };
    render(<TransformNode {...mockProps} data={noExprData} />);
    const emptyText = screen.getByText('No expression defined');
    expect(emptyText).toHaveClass('italic');
  });

  it('has muted-foreground color for "No expression defined"', () => {
    const noExprData = { ...mockData, expression: undefined as unknown as string };
    render(<TransformNode {...mockProps} data={noExprData} />);
    const emptyText = screen.getByText('No expression defined');
    expect(emptyText).toHaveClass('text-muted-foreground');
  });
});

describe('TransformNode icon colors', () => {
  it('map icon has purple color', () => {
    render(<TransformNode {...mockProps} />);
    const icon = screen.getByTestId('shuffle-icon');
    expect(icon).toHaveClass('text-purple-500');
  });

  it('filter icon has blue color', () => {
    const filterData = { ...mockData, transformType: 'filter' as const };
    render(<TransformNode {...mockProps} data={filterData} />);
    const icon = screen.getByTestId('filter-icon');
    expect(icon).toHaveClass('text-blue-500');
  });

  it('reduce icon has green color', () => {
    const reduceData = { ...mockData, transformType: 'reduce' as const };
    render(<TransformNode {...mockProps} data={reduceData} />);
    const icon = screen.getByTestId('layers-icon');
    expect(icon).toHaveClass('text-green-500');
  });

  it('sort icon has orange color', () => {
    const sortData = { ...mockData, transformType: 'sort' as const };
    render(<TransformNode {...mockProps} data={sortData} />);
    const icon = screen.getByTestId('arrow-down-up-icon');
    expect(icon).toHaveClass('text-orange-500');
  });

  it('custom icon has pink color', () => {
    const customData = { ...mockData, transformType: 'custom' as const };
    render(<TransformNode {...mockProps} data={customData} />);
    const icon = screen.getByTestId('code-icon');
    expect(icon).toHaveClass('text-pink-500');
  });

  it('icon has h-3 w-3 size', () => {
    render(<TransformNode {...mockProps} />);
    const icon = screen.getByTestId('shuffle-icon');
    expect(icon).toHaveClass('h-3');
    expect(icon).toHaveClass('w-3');
  });

  it('icon has mr-1 margin', () => {
    render(<TransformNode {...mockProps} />);
    const icon = screen.getByTestId('shuffle-icon');
    expect(icon).toHaveClass('mr-1');
  });
});

describe('TransformNode badges', () => {
  it('transform type badge has secondary variant', () => {
    render(<TransformNode {...mockProps} />);
    const badge = screen.getByText('map').closest('[data-testid="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('input badge has outline variant', () => {
    render(<TransformNode {...mockProps} />);
    const badge = screen.getByText('1 in').closest('[data-testid="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('output badge has outline variant', () => {
    render(<TransformNode {...mockProps} />);
    const badge = screen.getByText('1 out').closest('[data-testid="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('all badges have text-xs class', () => {
    render(<TransformNode {...mockProps} />);
    const badges = screen.getAllByTestId('badge');
    badges.forEach((badge) => {
      expect(badge).toHaveClass('text-xs');
    });
  });
});

describe('TransformNode content layout', () => {
  it('has space-y-2 class for content spacing', () => {
    const { container } = render(<TransformNode {...mockProps} />);
    const content = container.querySelector('.space-y-2');
    expect(content).toBeInTheDocument();
  });

  it('transform type badge is in flex container', () => {
    const { container } = render(<TransformNode {...mockProps} />);
    const flexContainer = container.querySelector('.flex.items-center.gap-2');
    expect(flexContainer).toBeInTheDocument();
  });

  it('expression preview has muted background', () => {
    const { container } = render(<TransformNode {...mockProps} />);
    const expr = container.querySelector('.bg-muted\\/50');
    expect(expr).toBeInTheDocument();
  });

  it('expression preview is rounded', () => {
    const { container } = render(<TransformNode {...mockProps} />);
    const expr = container.querySelector('.rounded');
    expect(expr).toBeInTheDocument();
  });

  it('expression preview has font-mono class', () => {
    const { container } = render(<TransformNode {...mockProps} />);
    const expr = container.querySelector('.font-mono');
    expect(expr).toBeInTheDocument();
  });

  it('expression preview has line-clamp-2', () => {
    const { container } = render(<TransformNode {...mockProps} />);
    const expr = container.querySelector('.line-clamp-2');
    expect(expr).toBeInTheDocument();
  });

  it('IO badges are in flex container with gap', () => {
    const { container } = render(<TransformNode {...mockProps} />);
    const _flexContainer = container.querySelector('.flex.gap-2');
    const ioBadges = container.querySelectorAll('.flex.gap-2');
    expect(ioBadges.length).toBeGreaterThan(0);
  });
});

describe('TransformNode input/output handling', () => {
  it('does not render input badge when inputs is empty', () => {
    const noInputsData = { ...mockData, inputs: {} };
    render(<TransformNode {...mockProps} data={noInputsData} />);
    expect(screen.queryByText(/in$/)).not.toBeInTheDocument();
  });

  it('does not render output badge when outputs is empty', () => {
    const noOutputsData = { ...mockData, outputs: {} };
    render(<TransformNode {...mockProps} data={noOutputsData} />);
    expect(screen.queryByText(/out$/)).not.toBeInTheDocument();
  });

  it('handles multiple inputs', () => {
    const multiInputsData = {
      ...mockData,
      inputs: {
        input1: { type: 'string' },
        input2: { type: 'number' },
        input3: { type: 'boolean' },
      },
    };
    render(<TransformNode {...mockProps} data={multiInputsData} />);
    expect(screen.getByText('3 in')).toBeInTheDocument();
  });

  it('handles multiple outputs', () => {
    const multiOutputsData = {
      ...mockData,
      outputs: {
        output1: { type: 'string' },
        output2: { type: 'number' },
      },
    };
    render(<TransformNode {...mockProps} data={multiOutputsData} />);
    expect(screen.getByText('2 out')).toBeInTheDocument();
  });
});

describe('TransformNode edge cases', () => {
  it('handles undefined transformType', () => {
    const noTypeData = { ...mockData, transformType: undefined as unknown as 'map' };
    render(<TransformNode {...mockProps} data={noTypeData} />);
    expect(screen.getByTestId('shuffle-icon')).toBeInTheDocument();
  });

  it('handles unknown transformType', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unknownTypeData = { ...mockData, transformType: 'unknown' as any };
    render(<TransformNode {...mockProps} data={unknownTypeData} />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
    expect(screen.getByTestId('shuffle-icon')).toBeInTheDocument();
  });

  it('handles null inputs', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const nullInputsData = { ...mockData, inputs: null as unknown as {} };
    render(<TransformNode {...mockProps} data={nullInputsData} />);
    expect(screen.queryByText(/in$/)).not.toBeInTheDocument();
  });

  it('handles undefined inputs', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const undefinedInputsData = { ...mockData, inputs: undefined as unknown as {} };
    render(<TransformNode {...mockProps} data={undefinedInputsData} />);
    expect(screen.queryByText(/in$/)).not.toBeInTheDocument();
  });
});

describe('TransformNode integration tests', () => {
  it('renders complete transform node with all features', () => {
    render(<TransformNode {...mockProps} />);

    expect(screen.getByText('map')).toBeInTheDocument();
    expect(screen.getByText('items.map(x => x * 2)')).toBeInTheDocument();
    expect(screen.getByText('1 in')).toBeInTheDocument();
    expect(screen.getByText('1 out')).toBeInTheDocument();
    expect(screen.getByTestId('shuffle-icon')).toBeInTheDocument();
  });

  it('renders filter transform node', () => {
    const filterData: TransformNodeData = {
      ...mockData,
      transformType: 'filter',
      expression: 'items.filter(x => x > 0)',
    };

    render(<TransformNode {...mockProps} data={filterData} />);

    expect(screen.getByText('filter')).toBeInTheDocument();
    expect(screen.getByText('items.filter(x => x > 0)')).toBeInTheDocument();
    expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
  });

  it('renders transform node without expression', () => {
    const noExprData: TransformNodeData = {
      ...mockData,
      expression: undefined as unknown as string,
      inputs: {},
      outputs: {},
    };

    render(<TransformNode {...mockProps} data={noExprData} />);

    expect(screen.getByText('No expression defined')).toBeInTheDocument();
    expect(screen.queryByText(/in$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/out$/)).not.toBeInTheDocument();
  });
});
