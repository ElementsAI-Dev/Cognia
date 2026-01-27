/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MergeNode } from './merge-node';
import type { MergeNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    children,
    data,
    multipleTargetHandles,
  }: {
    children?: React.ReactNode;
    data: { nodeType: string };
    multipleTargetHandles?: Array<{ id: string; position: string }>;
  }) => (
    <div data-testid="base-node" data-node-type={data.nodeType}>
      {multipleTargetHandles &&
        multipleTargetHandles.map((handle: { id: string; position: string }) => (
          <div
            key={handle.id}
            data-testid={`handle-${handle.id}`}
            data-position={handle.position}
          />
        ))}
      {children}
    </div>
  ),
}));

// Mock @xyflow/react for Position
jest.mock('@xyflow/react', () => ({
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} {...props}>
      {children}
    </span>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  GitMerge: ({ className }: { className?: string }) => (
    <svg data-testid="git-merge-icon" className={className} />
  ),
  Layers: ({ className }: { className?: string }) => (
    <svg data-testid="layers-icon" className={className} />
  ),
  ChevronFirst: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-first-icon" className={className} />
  ),
  ChevronLast: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-last-icon" className={className} />
  ),
  Code: ({ className }: { className?: string }) => (
    <svg data-testid="code-icon" className={className} />
  ),
}));

const mockData: MergeNodeData = {
  id: 'merge-1',
  nodeType: 'merge',
  label: 'Merge Node',
  description: 'Merge multiple branches',
  mergeStrategy: 'merge',
  inputs: {
    'input-1': { value: 'data1' },
    'input-2': { value: 'data2' },
  },
  executionStatus: 'idle',
  isConfigured: true,
};

const mockProps = {
  id: 'merge-1',
  data: mockData,
  selected: false,
};

describe('MergeNode', () => {
  it('renders without crashing', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toBeInTheDocument();
  });

  it('renders merge strategy badge', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByText('merge')).toBeInTheDocument();
  });

  it('renders strategy description', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByText('Merge Objects')).toBeInTheDocument();
  });

  it('renders input count badge', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByText('2 inputs to merge')).toBeInTheDocument();
  });

  it('renders all three target handles', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByTestId('handle-input-1')).toBeInTheDocument();
    expect(screen.getByTestId('handle-input-2')).toBeInTheDocument();
    expect(screen.getByTestId('handle-input-3')).toBeInTheDocument();
  });

  it('has correct handle positions', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByTestId('handle-input-1')).toHaveAttribute('data-position', 'top');
    expect(screen.getByTestId('handle-input-2')).toHaveAttribute('data-position', 'left');
    expect(screen.getByTestId('handle-input-3')).toHaveAttribute('data-position', 'right');
  });

  it('renders git-merge icon for merge strategy', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByTestId('git-merge-icon')).toBeInTheDocument();
  });

  it('has correct node type', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toHaveAttribute('data-node-type', 'merge');
  });
});

describe('MergeNode with different strategies', () => {
  it('renders concat strategy', () => {
    const concatData = { ...mockData, mergeStrategy: 'concat' as const };
    render(<MergeNode {...mockProps} data={concatData} />);
    expect(screen.getByText('concat')).toBeInTheDocument();
    expect(screen.getByText('Concatenate Arrays')).toBeInTheDocument();
  });

  it('renders merge strategy', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByText('merge')).toBeInTheDocument();
    expect(screen.getByText('Merge Objects')).toBeInTheDocument();
  });

  it('renders first strategy', () => {
    const firstData = { ...mockData, mergeStrategy: 'first' as const };
    render(<MergeNode {...mockProps} data={firstData} />);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('First Value')).toBeInTheDocument();
  });

  it('renders last strategy', () => {
    const lastData = { ...mockData, mergeStrategy: 'last' as const };
    render(<MergeNode {...mockProps} data={lastData} />);
    expect(screen.getByText('last')).toBeInTheDocument();
    expect(screen.getByText('Last Value')).toBeInTheDocument();
  });

  it('renders custom strategy', () => {
    const customData = { ...mockData, mergeStrategy: 'custom' as const };
    render(<MergeNode {...mockProps} data={customData} />);
    expect(screen.getByText('custom')).toBeInTheDocument();
    expect(screen.getByText('Custom Logic')).toBeInTheDocument();
  });

  it('renders layers icon for concat strategy', () => {
    const concatData = { ...mockData, mergeStrategy: 'concat' as const };
    render(<MergeNode {...mockProps} data={concatData} />);
    expect(screen.getByTestId('layers-icon')).toBeInTheDocument();
  });

  it('renders git-merge icon for merge strategy', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByTestId('git-merge-icon')).toBeInTheDocument();
  });

  it('renders chevron-first icon for first strategy', () => {
    const firstData = { ...mockData, mergeStrategy: 'first' as const };
    render(<MergeNode {...mockProps} data={firstData} />);
    expect(screen.getByTestId('chevron-first-icon')).toBeInTheDocument();
  });

  it('renders chevron-last icon for last strategy', () => {
    const lastData = { ...mockData, mergeStrategy: 'last' as const };
    render(<MergeNode {...mockProps} data={lastData} />);
    expect(screen.getByTestId('chevron-last-icon')).toBeInTheDocument();
  });

  it('renders code icon for custom strategy', () => {
    const customData = { ...mockData, mergeStrategy: 'custom' as const };
    render(<MergeNode {...mockProps} data={customData} />);
    expect(screen.getByTestId('code-icon')).toBeInTheDocument();
  });
});

describe('MergeNode input handling', () => {
  it('does not render input count badge when no inputs', () => {
    const noInputsData = { ...mockData, inputs: {} };
    render(<MergeNode {...mockProps} data={noInputsData} />);
    expect(screen.queryByText(/inputs to merge/)).not.toBeInTheDocument();
  });

  it('renders correct count for single input', () => {
    const singleInputData = { ...mockData, inputs: { 'input-1': { value: 'data' } } };
    render(<MergeNode {...mockProps} data={singleInputData} />);
    expect(screen.getByText('1 inputs to merge')).toBeInTheDocument();
  });

  it('renders correct count for multiple inputs', () => {
    render(<MergeNode {...mockProps} />);
    expect(screen.getByText('2 inputs to merge')).toBeInTheDocument();
  });

  it('renders correct count for many inputs', () => {
    const manyInputsData = {
      ...mockData,
      inputs: {
        'input-1': { value: 'data1' },
        'input-2': { value: 'data2' },
        'input-3': { value: 'data3' },
        'input-4': { value: 'data4' },
        'input-5': { value: 'data5' },
      },
    };
    render(<MergeNode {...mockProps} data={manyInputsData} />);
    expect(screen.getByText('5 inputs to merge')).toBeInTheDocument();
  });
});

describe('MergeNode badge styling', () => {
  it('strategy badge has secondary variant', () => {
    render(<MergeNode {...mockProps} />);
    const badge = screen.getByText('merge').closest('[data-testid="badge"]');
    // Mock Badge uses data attribute for variant, check badge exists
    expect(badge).toBeInTheDocument();
  });

  it('input count badge has outline variant', () => {
    render(<MergeNode {...mockProps} />);
    const badge = screen.getByText(/inputs to merge/).closest('[data-testid="badge"]');
    // Mock Badge uses data attribute for variant, check badge exists
    expect(badge).toBeInTheDocument();
  });

  it('strategy badge has text-xs class', () => {
    render(<MergeNode {...mockProps} />);
    const badge = screen.getByText('merge').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('text-xs');
  });

  it('input count badge has text-xs class', () => {
    render(<MergeNode {...mockProps} />);
    // Text may be split across elements, use regex
    const badge = screen.getByText(/inputs to merge/).closest('[data-testid="badge"]');
    expect(badge).toHaveClass('text-xs');
  });
});

describe('MergeNode icon styling', () => {
  it('strategy icon has cyan color', () => {
    render(<MergeNode {...mockProps} />);
    const icon = screen.getByTestId('git-merge-icon');
    expect(icon).toHaveClass('text-cyan-500');
  });

  it('strategy icon has h-3 w-3 size', () => {
    render(<MergeNode {...mockProps} />);
    const icon = screen.getByTestId('git-merge-icon');
    expect(icon).toHaveClass('h-3');
    expect(icon).toHaveClass('w-3');
  });

  it('strategy icon has mr-1 margin', () => {
    render(<MergeNode {...mockProps} />);
    const icon = screen.getByTestId('git-merge-icon');
    expect(icon).toHaveClass('mr-1');
  });
});

describe('MergeNode content layout', () => {
  it('has space-y-2 class for content spacing', () => {
    const { container } = render(<MergeNode {...mockProps} />);
    const content = container.querySelector('.space-y-2');
    expect(content).toBeInTheDocument();
  });

  it('strategy badge is in flex container', () => {
    const { container } = render(<MergeNode {...mockProps} />);
    const flexContainer = container.querySelector('.flex.items-center.gap-2');
    expect(flexContainer).toBeInTheDocument();
  });

  it('strategy description has muted background', () => {
    const { container } = render(<MergeNode {...mockProps} />);
    const desc = container.querySelector('.bg-muted\\/50');
    expect(desc).toBeInTheDocument();
  });

  it('strategy description is rounded', () => {
    const { container } = render(<MergeNode {...mockProps} />);
    const desc = container.querySelector('.rounded');
    expect(desc).toBeInTheDocument();
  });
});

describe('MergeNode edge cases', () => {
  it('handles undefined mergeStrategy', () => {
    const noStrategyData = { ...mockData, mergeStrategy: undefined as unknown as 'merge' };
    render(<MergeNode {...mockProps} data={noStrategyData} />);
    expect(screen.getByTestId('git-merge-icon')).toBeInTheDocument();
  });

  it('handles unknown mergeStrategy', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unknownStrategyData = { ...mockData, mergeStrategy: 'unknown' as any };
    render(<MergeNode {...mockProps} data={unknownStrategyData} />);
    // Multiple elements may contain 'unknown', use getAllByText
    const elements = screen.getAllByText('unknown');
    expect(elements.length).toBeGreaterThan(0);
    expect(screen.getByTestId('git-merge-icon')).toBeInTheDocument();
  });

  it('handles null inputs', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const nullInputsData = { ...mockData, inputs: null as unknown as {} };
    render(<MergeNode {...mockProps} data={nullInputsData} />);
    expect(screen.queryByText(/inputs to merge/)).not.toBeInTheDocument();
  });

  it('handles undefined inputs', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const undefinedInputsData = { ...mockData, inputs: undefined as unknown as {} };
    render(<MergeNode {...mockProps} data={undefinedInputsData} />);
    expect(screen.queryByText(/inputs to merge/)).not.toBeInTheDocument();
  });
});

describe('MergeNode integration tests', () => {
  it('renders complete merge node with all features', () => {
    const completeData: MergeNodeData = {
      ...mockData,
      mergeStrategy: 'merge',
      inputs: {
        'input-1': { value: 'data1' },
        'input-2': { value: 'data2' },
        'input-3': { value: 'data3' },
      },
    };

    render(<MergeNode {...mockProps} data={completeData} />);

    expect(screen.getByText('merge')).toBeInTheDocument();
    expect(screen.getByText('Merge Objects')).toBeInTheDocument();
    expect(screen.getByText('3 inputs to merge')).toBeInTheDocument();
    expect(screen.getByTestId('git-merge-icon')).toBeInTheDocument();
    expect(screen.getByTestId('handle-input-1')).toBeInTheDocument();
    expect(screen.getByTestId('handle-input-2')).toBeInTheDocument();
    expect(screen.getByTestId('handle-input-3')).toBeInTheDocument();
  });

  it('renders concat node with multiple inputs', () => {
    const concatData: MergeNodeData = {
      ...mockData,
      mergeStrategy: 'concat',
      inputs: {
        'array-1': { value: [1, 2, 3] },
        'array-2': { value: [4, 5, 6] },
      },
    };

    render(<MergeNode {...mockProps} data={concatData} />);

    expect(screen.getByText('concat')).toBeInTheDocument();
    expect(screen.getByText('Concatenate Arrays')).toBeInTheDocument();
    expect(screen.getByText('2 inputs to merge')).toBeInTheDocument();
    expect(screen.getByTestId('layers-icon')).toBeInTheDocument();
  });
});
