/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TemplateTransformNode } from './template-transform-node';
import type { TemplateTransformNodeData } from '@/types/workflow/workflow-editor';

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

const baseProps = {
  id: 'tt-1',
  type: 'templateTransform',
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

const mockData: TemplateTransformNodeData = {
  id: 'tt-1',
  nodeType: 'templateTransform',
  label: 'Template Transform',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  template: 'Hello {{name}}, your order #{{orderId}} is ready.',
  outputType: 'string',
  variableRefs: [
    { nodeId: 'start', variableName: 'name' },
    { nodeId: 'db', variableName: 'orderId' },
  ],
};

describe('TemplateTransformNode', () => {
  it('renders without crashing', () => {
    render(<TemplateTransformNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Template Transform')).toBeInTheDocument();
  });

  it('renders output type badge', () => {
    render(<TemplateTransformNode {...baseProps} data={mockData} />);
    expect(screen.getByText(/Output: string/)).toBeInTheDocument();
  });

  it('renders variable count badge', () => {
    render(<TemplateTransformNode {...baseProps} data={mockData} />);
    expect(screen.getByText('2 var(s)')).toBeInTheDocument();
  });

  it('renders template preview', () => {
    render(<TemplateTransformNode {...baseProps} data={mockData} />);
    expect(screen.getByText(/Hello \{\{name\}\}/)).toBeInTheDocument();
  });

  it('renders variable references', () => {
    render(<TemplateTransformNode {...baseProps} data={mockData} />);
    expect(screen.getByText(/start\.name/)).toBeInTheDocument();
    expect(screen.getByText(/db\.orderId/)).toBeInTheDocument();
  });

  it('shows empty state when no template', () => {
    const noTemplate = { ...mockData, template: '' };
    render(<TemplateTransformNode {...baseProps} data={noTemplate} />);
    expect(screen.getByText('No template defined')).toBeInTheDocument();
  });

  it('does not render var count badge when no vars', () => {
    const noVars = { ...mockData, variableRefs: [] };
    render(<TemplateTransformNode {...baseProps} data={noVars} />);
    expect(screen.queryByText(/var\(s\)/)).not.toBeInTheDocument();
  });
});
