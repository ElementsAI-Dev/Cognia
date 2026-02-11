'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NodeQuickConfig } from './node-quick-config';
import type { WorkflowNodeData } from '@/types/workflow/workflow-editor';

const mockUpdateNode = jest.fn();
const mockDuplicateNode = jest.fn();
const mockDeleteNode = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector) => {
    const state = {
      updateNode: mockUpdateNode,
      duplicateNode: mockDuplicateNode,
      deleteNode: mockDeleteNode,
      currentWorkflow: null,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

const mockNodeData = {
  nodeType: 'ai',
  label: 'AI Node',
  description: 'An AI node',
} as unknown as WorkflowNodeData;

describe('NodeQuickConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    expect(screen.getByText('Node Button')).toBeInTheDocument();
  });

  it('renders the trigger button correctly', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    expect(screen.getByRole('button', { name: 'Node Button' })).toBeInTheDocument();
  });

  it('accepts className and nodeId props', () => {
    const { container } = render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with different node types', () => {
    const toolData = {
      nodeType: 'tool',
      label: 'Tool Node',
      description: 'A tool node',
    } as unknown as WorkflowNodeData;

    render(
      <NodeQuickConfig nodeId="node-2" data={toolData}>
        <button>Tool Button</button>
      </NodeQuickConfig>
    );
    expect(screen.getByText('Tool Button')).toBeInTheDocument();
  });

  it('renders with code node type', () => {
    const codeData = {
      nodeType: 'code',
      label: 'Code Node',
      description: 'A code node',
    } as unknown as WorkflowNodeData;

    render(
      <NodeQuickConfig nodeId="node-3" data={codeData}>
        <button>Code Button</button>
      </NodeQuickConfig>
    );
    expect(screen.getByText('Code Button')).toBeInTheDocument();
  });

  it('renders with start node type', () => {
    const startData = {
      nodeType: 'start',
      label: 'Start Node',
      description: '',
    } as unknown as WorkflowNodeData;

    render(
      <NodeQuickConfig nodeId="node-4" data={startData}>
        <button>Start Button</button>
      </NodeQuickConfig>
    );
    expect(screen.getByText('Start Button')).toBeInTheDocument();
  });

  it('handles onOpenConfig callback prop', () => {
    const onOpenConfig = jest.fn();
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData} onOpenConfig={onOpenConfig}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    expect(screen.getByText('Node Button')).toBeInTheDocument();
  });
});
