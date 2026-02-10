/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ParameterExtractorNode } from './parameter-extractor-node';
import type { ParameterExtractorNodeData } from '@/types/workflow/workflow-editor';

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
  id: 'pe-1',
  type: 'parameterExtractor',
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

const mockData: ParameterExtractorNodeData = {
  id: 'pe-1',
  nodeType: 'parameterExtractor',
  label: 'Extract Params',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  model: 'gpt-4',
  instruction: 'Extract user details from the text',
  parameters: [
    { name: 'name', type: 'string', required: true, description: 'User name' },
    { name: 'age', type: 'number', required: false, description: 'User age' },
  ],
  inputVariable: null,
};

describe('ParameterExtractorNode', () => {
  it('renders without crashing', () => {
    render(<ParameterExtractorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Extract Params')).toBeInTheDocument();
  });

  it('renders model badge', () => {
    render(<ParameterExtractorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('renders instruction preview', () => {
    render(<ParameterExtractorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Extract user details from the text')).toBeInTheDocument();
  });

  it('renders parameter names and types', () => {
    render(<ParameterExtractorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
    expect(screen.getByText('number')).toBeInTheDocument();
  });

  it('renders required indicator for required params', () => {
    render(<ParameterExtractorNode {...baseProps} data={mockData} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows overflow for many parameters', () => {
    const manyParams = {
      ...mockData,
      parameters: Array.from({ length: 6 }, (_, i) => ({
        name: `param${i}`,
        type: 'string',
        required: false,
        description: '',
      })),
    };
    render(<ParameterExtractorNode {...baseProps} data={manyParams} />);
    expect(screen.getByText('+2 more parameters')).toBeInTheDocument();
  });

  it('shows empty state when no parameters', () => {
    const noParams = { ...mockData, parameters: [] };
    render(<ParameterExtractorNode {...baseProps} data={noParams} />);
    expect(screen.getByText('No parameters defined')).toBeInTheDocument();
  });

  it('renders input variable reference', () => {
    const withInput = {
      ...mockData,
      inputVariable: { nodeId: 'ai-1', variableName: 'output' },
    };
    render(<ParameterExtractorNode {...baseProps} data={withInput} />);
    expect(screen.getByText(/ai-1\.output/)).toBeInTheDocument();
  });

  it('does not render model when not set', () => {
    const noModel = { ...mockData, model: undefined };
    render(<ParameterExtractorNode {...baseProps} data={noModel} />);
    expect(screen.queryByText('gpt-4')).not.toBeInTheDocument();
  });
});
