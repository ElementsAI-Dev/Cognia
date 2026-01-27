'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NodePreviewTooltip } from './node-preview-tooltip';
import type { WorkflowNodeData } from '@/types/workflow/workflow-editor';

const mockNodeData = {
  nodeType: 'ai',
  label: 'AI Node',
  description: 'An AI processing node',
  executionStatus: 'idle',
  isConfigured: true,
} as unknown as WorkflowNodeData;

describe('NodePreviewTooltip', () => {
  it('renders children', () => {
    render(
      <NodePreviewTooltip data={mockNodeData}>
        <button>Trigger</button>
      </NodePreviewTooltip>
    );
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('renders as tooltip trigger', () => {
    render(
      <NodePreviewTooltip data={mockNodeData}>
        <button>Trigger</button>
      </NodePreviewTooltip>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('NodePreviewTooltip with different statuses', () => {
  it('handles completed status', () => {
    const completedData = {
      ...mockNodeData,
      executionStatus: 'completed',
      executionTime: 1500,
    } as unknown as WorkflowNodeData;
    
    render(
      <NodePreviewTooltip data={completedData}>
        <button>Trigger</button>
      </NodePreviewTooltip>
    );
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('handles unconfigured node', () => {
    const unconfiguredData = {
      ...mockNodeData,
      isConfigured: false,
    } as unknown as WorkflowNodeData;
    
    render(
      <NodePreviewTooltip data={unconfiguredData}>
        <button>Trigger</button>
      </NodePreviewTooltip>
    );
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('handles node without description', () => {
    const noDescData = {
      ...mockNodeData,
      description: undefined,
    } as unknown as WorkflowNodeData;
    
    render(
      <NodePreviewTooltip data={noDescData}>
        <button>Trigger</button>
      </NodePreviewTooltip>
    );
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });
});
