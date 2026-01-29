/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AINode } from './ai-node';
import type { AINodeData } from '@/types/workflow/workflow-editor';

// Mock BaseNode
jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
    ...props
  }: {
    data: { label: string };
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="base-node" {...props}>
      <h3>{data.label}</h3>
      {children}
    </div>
  ),
}));

// Mock Badge
jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    variant,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} data-variant={variant} {...props}>
      {children}
    </span>
  ),
}));

const mockData: AINodeData = {
  id: 'ai-1',
  nodeType: 'ai',
  label: 'AI Assistant',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
  aiPrompt: 'Generate a summary of the data',
  responseFormat: 'json',
};

const baseProps = {
  id: 'ai-1',
  type: 'ai',
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe('AINode', () => {
  it('renders without crashing', () => {
    render(<AINode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders node label', () => {
    render(<AINode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders AI prompt preview', () => {
    render(<AINode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('Generate a summary of the data')).toBeInTheDocument();
  });

  it('truncates long prompts', () => {
    const longPromptData: AINodeData = {
      ...mockData,
      aiPrompt: 'A'.repeat(150),
    };

    render(<AINode {...baseProps} data={longPromptData} selected={false} />);
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });

  it('renders model badge', () => {
    render(<AINode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('renders temperature badge', () => {
    render(<AINode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('T: 0.7')).toBeInTheDocument();
  });

  it('renders response format badge', () => {
    render(<AINode {...baseProps} data={mockData} selected={false} />);
    expect(screen.getByText('json')).toBeInTheDocument();
  });

  it('does not render response format when text', () => {
    const textFormatData: AINodeData = {
      ...mockData,
      responseFormat: 'text',
    };

    render(<AINode {...baseProps} data={textFormatData} selected={false} />);
    expect(screen.queryByText('text')).not.toBeInTheDocument();
  });

  it('does not render model when not set', () => {
    const noModelData: AINodeData = {
      ...mockData,
      model: undefined,
    };

    render(<AINode {...baseProps} data={noModelData} selected={false} />);
    // Model badge not rendered, but temperature badge still exists
    expect(screen.queryByText('gpt-4')).not.toBeInTheDocument();
  });

  it('does not render temperature when not set', () => {
    const noTempData: AINodeData = {
      ...mockData,
      temperature: undefined,
    };

    render(<AINode {...baseProps} data={noTempData} selected={false} />);
    expect(screen.queryByText(/T:/)).not.toBeInTheDocument();
  });
});

describe('AINode integration tests', () => {
  it('handles complete AI node configuration', () => {
    render(<AINode {...baseProps} data={mockData} selected={false} />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Generate a summary of the data')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('T: 0.7')).toBeInTheDocument();
    expect(screen.getByText('json')).toBeInTheDocument();
  });

  it('handles AI node with minimal configuration', () => {
    const minimalData: AINodeData = {
      ...mockData,
      model: '',
      temperature: 0,
      responseFormat: 'text',
      aiPrompt: '',
    };

    render(<AINode {...baseProps} data={minimalData} selected={false} />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    // No model, temp, or response format badges
    expect(screen.queryByText('gpt-4')).not.toBeInTheDocument();
    expect(screen.queryByText(/T:/)).not.toBeInTheDocument();
  });

  it('handles AI node with different models', () => {
    const claudeData: AINodeData = {
      ...mockData,
      model: 'claude-3-opus',
    };

    render(<AINode {...baseProps} data={claudeData} selected={false} />);
    expect(screen.getByText('claude-3-opus')).toBeInTheDocument();
  });

  it('handles AI node with different response formats', () => {
    const markdownFormatData: AINodeData = {
      ...mockData,
      responseFormat: 'markdown',
    };

    render(<AINode {...baseProps} data={markdownFormatData} selected={false} />);
    expect(screen.getByText('markdown')).toBeInTheDocument();
  });
});
