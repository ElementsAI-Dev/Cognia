/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnswerNode } from './answer-node';
import type { AnswerNodeData } from '@/types/workflow/workflow-editor';

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

const mockData: AnswerNodeData = {
  nodeType: 'answer',
  label: 'Answer',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  template: 'Hello {{userName}}, your result is {{result}}.',
  variableRefs: [
    { nodeId: 'start-1', variableName: 'userName' },
    { nodeId: 'ai-1', variableName: 'result' },
  ],
};

const baseProps = {
  id: 'answer-1',
  type: 'answer',
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

describe('AnswerNode', () => {
  it('renders without crashing', () => {
    render(<AnswerNode {...baseProps} data={mockData} />);
    expect(screen.getByTestId('base-node')).toBeInTheDocument();
  });

  it('has correct node type', () => {
    render(<AnswerNode {...baseProps} data={mockData} />);
    expect(screen.getByTestId('base-node')).toHaveAttribute('data-node-type', 'answer');
  });

  it('renders template text', () => {
    render(<AnswerNode {...baseProps} data={mockData} />);
    expect(screen.getByText(/Hello \{\{userName\}\}/)).toBeInTheDocument();
  });
});

describe('AnswerNode empty state', () => {
  it('shows "No template configured" when template is empty', () => {
    const emptyData = { ...mockData, template: '' };
    render(<AnswerNode {...baseProps} data={emptyData} />);
    expect(screen.getByText('No template configured')).toBeInTheDocument();
  });

  it('shows "No template configured" when template is undefined', () => {
    const undefinedData = { ...mockData, template: undefined as unknown as string };
    render(<AnswerNode {...baseProps} data={undefinedData} />);
    expect(screen.getByText('No template configured')).toBeInTheDocument();
  });
});

describe('AnswerNode template truncation', () => {
  it('truncates templates longer than 80 characters', () => {
    const longTemplate = 'A'.repeat(100);
    const longData: AnswerNodeData = { ...mockData, template: longTemplate };
    render(<AnswerNode {...baseProps} data={longData} />);

    const displayed = screen.getByText(/A+\.\.\./);
    expect(displayed).toBeInTheDocument();
    // The displayed text should be 80 chars + "..."
    expect(displayed.textContent).toBe('A'.repeat(80) + '...');
  });

  it('does not truncate templates of exactly 80 characters', () => {
    const exactTemplate = 'B'.repeat(80);
    const exactData: AnswerNodeData = { ...mockData, template: exactTemplate };
    render(<AnswerNode {...baseProps} data={exactData} />);

    const displayed = screen.getByText('B'.repeat(80));
    expect(displayed.textContent).toBe('B'.repeat(80));
  });

  it('does not truncate short templates', () => {
    const shortData: AnswerNodeData = { ...mockData, template: 'Short template' };
    render(<AnswerNode {...baseProps} data={shortData} />);
    expect(screen.getByText('Short template')).toBeInTheDocument();
  });
});

describe('AnswerNode styling', () => {
  it('template preview has font-mono class', () => {
    const { container } = render(<AnswerNode {...baseProps} data={mockData} />);
    const preview = container.querySelector('.font-mono');
    expect(preview).toBeInTheDocument();
  });

  it('template preview has muted background', () => {
    const { container } = render(<AnswerNode {...baseProps} data={mockData} />);
    const preview = container.querySelector('.bg-muted\\/50');
    expect(preview).toBeInTheDocument();
  });

  it('empty state has italic text', () => {
    const emptyData = { ...mockData, template: '' };
    render(<AnswerNode {...baseProps} data={emptyData} />);
    const emptyText = screen.getByText('No template configured');
    expect(emptyText).toHaveClass('italic');
  });
});
