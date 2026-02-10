/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuestionClassifierNode } from './question-classifier-node';
import type { QuestionClassifierNodeData } from '@/types/workflow/workflow-editor';

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
  id: 'qc-1',
  type: 'questionClassifier',
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

const mockData: QuestionClassifierNodeData = {
  id: 'qc-1',
  nodeType: 'questionClassifier',
  label: 'Classify Question',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  model: 'gpt-4',
  inputVariable: null,
  classes: [
    { id: 'c1', name: 'Technical', description: 'Technical questions' },
    { id: 'c2', name: 'Billing', description: 'Billing inquiries' },
    { id: 'c3', name: 'General', description: '' },
  ],
};

describe('QuestionClassifierNode', () => {
  it('renders without crashing', () => {
    render(<QuestionClassifierNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Classify Question')).toBeInTheDocument();
  });

  it('renders model badge', () => {
    render(<QuestionClassifierNode {...baseProps} data={mockData} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('renders classification classes', () => {
    render(<QuestionClassifierNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('renders class descriptions', () => {
    render(<QuestionClassifierNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Technical questions')).toBeInTheDocument();
    expect(screen.getByText('Billing inquiries')).toBeInTheDocument();
  });

  it('renders output handles for each class', () => {
    render(<QuestionClassifierNode {...baseProps} data={mockData} />);
    expect(screen.getByTestId('handle-class-c1')).toBeInTheDocument();
    expect(screen.getByTestId('handle-class-c2')).toBeInTheDocument();
    expect(screen.getByTestId('handle-class-c3')).toBeInTheDocument();
  });

  it('renders input variable reference', () => {
    const withInput = {
      ...mockData,
      inputVariable: { nodeId: 'start', variableName: 'question' },
    };
    render(<QuestionClassifierNode {...baseProps} data={withInput} />);
    expect(screen.getByText(/start\.question/)).toBeInTheDocument();
  });

  it('does not render model when not set', () => {
    const noModel = { ...mockData, model: undefined };
    render(<QuestionClassifierNode {...baseProps} data={noModel} />);
    expect(screen.queryByText('gpt-4')).not.toBeInTheDocument();
  });
});
