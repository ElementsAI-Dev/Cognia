'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeQuickConfig } from './node-quick-config';
import type { WorkflowNodeData } from '@/types/workflow/workflow-editor';

const mockUpdateNode = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector) => {
    const state = {
      updateNode: mockUpdateNode,
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

  it('opens popover on right click', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    fireEvent.contextMenu(screen.getByText('Node Button'));
    expect(screen.getByText('Quick Config')).toBeInTheDocument();
  });

  it('renders label input in popover', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    fireEvent.contextMenu(screen.getByText('Node Button'));
    expect(screen.getByLabelText('Label')).toBeInTheDocument();
  });

  it('renders description textarea in popover', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    fireEvent.contextMenu(screen.getByText('Node Button'));
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('renders save and cancel buttons', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    fireEvent.contextMenu(screen.getByText('Node Button'));
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('pre-fills form with node data', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    fireEvent.contextMenu(screen.getByText('Node Button'));
    expect(screen.getByDisplayValue('AI Node')).toBeInTheDocument();
    expect(screen.getByDisplayValue('An AI node')).toBeInTheDocument();
  });

  it('calls updateNode when save clicked', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    fireEvent.contextMenu(screen.getByText('Node Button'));
    fireEvent.click(screen.getByText('Save'));
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', expect.any(Object));
  });

  it('closes popover when cancel clicked', () => {
    render(
      <NodeQuickConfig nodeId="node-1" data={mockNodeData}>
        <button>Node Button</button>
      </NodeQuickConfig>
    );
    fireEvent.contextMenu(screen.getByText('Node Button'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Quick Config')).not.toBeInTheDocument();
  });
});
