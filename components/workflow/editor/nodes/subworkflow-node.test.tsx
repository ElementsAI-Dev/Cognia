/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SubworkflowNode } from './subworkflow-node';
import type { SubworkflowNodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    children,
    data,
    multipleSourceHandles,
    multipleTargetHandles,
  }: {
    children?: React.ReactNode;
    data: { nodeType: string };
    multipleSourceHandles?: Array<{ id: string; position: string }>;
    multipleTargetHandles?: Array<{ id: string; position: string }>;
  }) => (
    <div data-testid="base-node" data-node-type={data.nodeType}>
      {multipleSourceHandles &&
        multipleSourceHandles.map((handle: { id: string; position: string }) => (
          <div
            key={handle.id}
            data-testid={`source-handle-${handle.id}`}
            data-position={handle.position}
          />
        ))}
      {multipleTargetHandles &&
        multipleTargetHandles.map((handle: { id: string; position: string }) => (
          <div
            key={handle.id}
            data-testid={`target-handle-${handle.id}`}
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
  Workflow: ({ className }: { className?: string }) => (
    <svg data-testid="workflow-icon" className={className} />
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <svg data-testid="external-link-icon" className={className} />
  ),
}));

const mockData: SubworkflowNodeData = {
  id: 'subworkflow-1',
  nodeType: 'subworkflow',
  label: 'My Subworkflow',
  description: 'Execute a nested workflow',
  workflowId: 'workflow-123',
  workflowName: 'Data Processing Pipeline',
  inputMapping: {
    'source-input': 'target-input',
    data: 'payload',
  },
  outputMapping: {
    result: 'output',
    status: 'final-status',
  },
  executionStatus: 'idle',
  isConfigured: true,
  inputs: {},
  outputs: {},
  hasError: false,
};

const mockProps = {
  id: 'subworkflow-1',
  data: mockData,
  selected: false,
  type: 'subworkflow',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe('SubworkflowNode', () => {
  it('renders without crashing', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toBeInTheDocument();
  });

  it('renders workflow reference when workflowId exists', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByText('Data Processing Pipeline')).toBeInTheDocument();
  });

  it('renders workflowId when workflowName is not provided', () => {
    const noNameData = { ...mockData, workflowName: undefined };
    render(<SubworkflowNode {...mockProps} data={noNameData} />);
    expect(screen.getByText('workflow-123')).toBeInTheDocument();
  });

  it('renders no workflow message when workflowId is missing', () => {
    const noWorkflowData = { ...mockData, workflowId: undefined as unknown as string };
    render(<SubworkflowNode {...mockProps} data={noWorkflowData} />);
    expect(screen.getByText('No workflow selected')).toBeInTheDocument();
  });

  it('renders workflow icon', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByTestId('workflow-icon')).toBeInTheDocument();
  });

  it('renders external link icon', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
  });

  it('renders input mapping badge', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByText('2 inputs')).toBeInTheDocument();
  });

  it('renders output mapping badge', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByText('2 outputs')).toBeInTheDocument();
  });

  it('does not render input mapping badge when inputMapping is empty', () => {
    const noInputData = { ...mockData, inputMapping: {} };
    render(<SubworkflowNode {...mockProps} data={noInputData} />);
    expect(screen.queryByText(/inputs/)).not.toBeInTheDocument();
  });

  it('does not render output mapping badge when outputMapping is empty', () => {
    const noOutputData = { ...mockData, outputMapping: {} };
    render(<SubworkflowNode {...mockProps} data={noOutputData} />);
    expect(screen.queryByText(/outputs/)).not.toBeInTheDocument();
  });

  it('renders source handle', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByTestId('source-handle-output')).toBeInTheDocument();
  });

  it('renders target handle', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByTestId('target-handle-input')).toBeInTheDocument();
  });

  it('has correct source handle position', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByTestId('source-handle-output')).toHaveAttribute('data-position', 'bottom');
  });

  it('has correct target handle position', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByTestId('target-handle-input')).toHaveAttribute('data-position', 'top');
  });

  it('has correct node type', () => {
    render(<SubworkflowNode {...mockProps} />);
    expect(screen.getByTestId('base-node')).toHaveAttribute('data-node-type', 'subworkflow');
  });
});

describe('SubworkflowNode styling', () => {
  it('workflow reference has muted background', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const ref = container.querySelector('.bg-muted\\/50');
    expect(ref).toBeInTheDocument();
  });

  it('workflow reference is rounded', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const ref = container.querySelector('.rounded');
    expect(ref).toBeInTheDocument();
  });

  it('workflow reference has flex layout', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const ref = container.querySelector('.flex');
    expect(ref).toBeInTheDocument();
  });

  it('workflow name has font-mono class', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const name = container.querySelector('.font-mono');
    expect(name).toBeInTheDocument();
  });

  it('workflow name has truncate class', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const name = container.querySelector('.truncate');
    expect(name).toBeInTheDocument();
  });

  it('workflow icon has indigo color', () => {
    render(<SubworkflowNode {...mockProps} />);
    const icon = screen.getByTestId('workflow-icon');
    expect(icon).toHaveClass('text-indigo-500');
  });

  it('workflow icon has correct size', () => {
    render(<SubworkflowNode {...mockProps} />);
    const icon = screen.getByTestId('workflow-icon');
    // Class names with dots don't need escaping in toHaveClass
    expect(icon).toHaveClass('h-3.5');
    expect(icon).toHaveClass('w-3.5');
  });

  it('external link icon has muted-foreground color', () => {
    render(<SubworkflowNode {...mockProps} />);
    const icon = screen.getByTestId('external-link-icon');
    expect(icon).toHaveClass('text-muted-foreground');
  });
});

describe('SubworkflowNode badges', () => {
  it('input mapping badge has outline variant', () => {
    render(<SubworkflowNode {...mockProps} />);
    const badge = screen.getByText('2 inputs').closest('[data-testid="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('output mapping badge has outline variant', () => {
    render(<SubworkflowNode {...mockProps} />);
    const badge = screen.getByText('2 outputs').closest('[data-testid="badge"]');
    expect(badge).toBeInTheDocument();
  });

  it('input mapping badge has text-xs class', () => {
    render(<SubworkflowNode {...mockProps} />);
    const badge = screen.getByText('2 inputs').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('text-xs');
  });

  it('output mapping badge has text-xs class', () => {
    render(<SubworkflowNode {...mockProps} />);
    const badge = screen.getByText('2 outputs').closest('[data-testid="badge"]');
    expect(badge).toHaveClass('text-xs');
  });

  it('badges are in flex container with gap', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const flexContainer = container.querySelector('.flex.gap-2');
    expect(flexContainer).toBeInTheDocument();
  });
});

describe('SubworkflowNode empty state', () => {
  it('shows italic text when no workflow', () => {
    const noWorkflowData = { ...mockData, workflowId: undefined as unknown as string };
    render(<SubworkflowNode {...mockProps} data={noWorkflowData} />);
    const emptyText = screen.getByText('No workflow selected');
    expect(emptyText).toHaveClass('italic');
  });

  it('shows muted-foreground color when no workflow', () => {
    const noWorkflowData = { ...mockData, workflowId: undefined as unknown as string };
    render(<SubworkflowNode {...mockProps} data={noWorkflowData} />);
    const emptyText = screen.getByText('No workflow selected');
    expect(emptyText).toHaveClass('text-muted-foreground');
  });

  it('shows text-xs when no workflow', () => {
    const noWorkflowData = { ...mockData, workflowId: undefined as unknown as string };
    render(<SubworkflowNode {...mockProps} data={noWorkflowData} />);
    const emptyText = screen.getByText('No workflow selected');
    expect(emptyText).toHaveClass('text-xs');
  });
});

describe('SubworkflowNode content layout', () => {
  it('has space-y-2 class for content spacing', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const content = container.querySelector('.space-y-2');
    expect(content).toBeInTheDocument();
  });

  it('renders workflow reference section', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const ref = container.querySelector('.p-2');
    expect(ref).toBeInTheDocument();
  });

  it('renders badges section', () => {
    const { container } = render(<SubworkflowNode {...mockProps} />);
    const badges = container.querySelector('.flex.gap-2');
    expect(badges).toBeInTheDocument();
  });
});

describe('SubworkflowNode with different mapping counts', () => {
  it('handles single input mapping', () => {
    const singleInputData = { ...mockData, inputMapping: { input: 'output' } };
    render(<SubworkflowNode {...mockProps} data={singleInputData} />);
    expect(screen.getByText('1 inputs')).toBeInTheDocument();
  });

  it('handles single output mapping', () => {
    const singleOutputData = { ...mockData, outputMapping: { output: 'result' } };
    render(<SubworkflowNode {...mockProps} data={singleOutputData} />);
    expect(screen.getByText('1 outputs')).toBeInTheDocument();
  });

  it('handles many input mappings', () => {
    const manyInputsData = {
      ...mockData,
      inputMapping: {
        'input-1': 'output-1',
        'input-2': 'output-2',
        'input-3': 'output-3',
        'input-4': 'output-4',
        'input-5': 'output-5',
      },
    };
    render(<SubworkflowNode {...mockProps} data={manyInputsData} />);
    expect(screen.getByText('5 inputs')).toBeInTheDocument();
  });

  it('handles many output mappings', () => {
    const manyOutputsData = {
      ...mockData,
      outputMapping: {
        'output-1': 'result-1',
        'output-2': 'result-2',
        'output-3': 'result-3',
        'output-4': 'result-4',
        'output-5': 'result-5',
      },
    };
    render(<SubworkflowNode {...mockProps} data={manyOutputsData} />);
    expect(screen.getByText('5 outputs')).toBeInTheDocument();
  });
});

describe('SubworkflowNode edge cases', () => {
  it('handles null workflowId', () => {
    const nullData = { ...mockData, workflowId: null as unknown as string };
    render(<SubworkflowNode {...mockProps} data={nullData} />);
    expect(screen.getByText('No workflow selected')).toBeInTheDocument();
  });

  it('handles empty workflowId', () => {
    const emptyData = { ...mockData, workflowId: '' };
    render(<SubworkflowNode {...mockProps} data={emptyData} />);
    expect(screen.getByText('No workflow selected')).toBeInTheDocument();
  });

  it('handles undefined inputMapping', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const undefinedInputData = { ...mockData, inputMapping: undefined as unknown as {} };
    render(<SubworkflowNode {...mockProps} data={undefinedInputData} />);
    expect(screen.queryByText(/inputs/)).not.toBeInTheDocument();
  });

  it('handles undefined outputMapping', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const undefinedOutputData = { ...mockData, outputMapping: undefined as unknown as {} };
    render(<SubworkflowNode {...mockProps} data={undefinedOutputData} />);
    expect(screen.queryByText(/outputs/)).not.toBeInTheDocument();
  });

  it('handles very long workflow name', () => {
    const longName = 'A'.repeat(100);
    const longNameData = { ...mockData, workflowName: longName };
    render(<SubworkflowNode {...mockProps} data={longNameData} />);
    const name = screen.getByText(longName);
    expect(name).toHaveClass('truncate');
  });

  it('handles very long workflowId', () => {
    const longId = 'workflow-' + 'A'.repeat(100);
    const longIdData = { ...mockData, workflowId: longId, workflowName: undefined };
    render(<SubworkflowNode {...mockProps} data={longIdData} />);
    const id = screen.getByText(longId);
    expect(id).toHaveClass('truncate');
  });
});

describe('SubworkflowNode integration tests', () => {
  it('renders complete subworkflow node with all features', () => {
    render(<SubworkflowNode {...mockProps} />);

    expect(screen.getByText('Data Processing Pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-icon')).toBeInTheDocument();
    expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
    expect(screen.getByText('2 inputs')).toBeInTheDocument();
    expect(screen.getByText('2 outputs')).toBeInTheDocument();
    expect(screen.getByTestId('source-handle-output')).toBeInTheDocument();
    expect(screen.getByTestId('target-handle-input')).toBeInTheDocument();
  });

  it('renders subworkflow node without workflow', () => {
    const noWorkflowData = {
      ...mockData,
      workflowId: undefined as unknown as string,
      inputMapping: {},
      outputMapping: {},
    };
    render(<SubworkflowNode {...mockProps} data={noWorkflowData} />);

    expect(screen.getByText('No workflow selected')).toBeInTheDocument();
    expect(screen.queryByText(/inputs/)).not.toBeInTheDocument();
    expect(screen.queryByText(/outputs/)).not.toBeInTheDocument();
  });
});
