/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CodeNode } from './code-node';
import type { CodeNodeData } from '@/types/workflow/workflow-editor';

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
    <span data-testid="badge" className={className} variant={variant} {...props}>
      {children}
    </span>
  ),
}));

const mockData: CodeNodeData = {
  id: 'code-1',
  nodeType: 'code',
  label: 'Process Data',
  executionStatus: 'idle',
  isConfigured: true,
  language: 'python',
  code: `def process(data):
    return data.upper()`,
};

describe('CodeNode', () => {
  it('renders without crashing', () => {
    render(<CodeNode data={mockData} selected={false} />);
    expect(screen.getByText('Process Data')).toBeInTheDocument();
  });

  it('renders node label', () => {
    render(<CodeNode data={mockData} selected={false} />);
    expect(screen.getByText('Process Data')).toBeInTheDocument();
  });

  it('renders language badge', () => {
    render(<CodeNode data={mockData} selected={false} />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('renders code preview', () => {
    render(<CodeNode data={mockData} selected={false} />);
    expect(screen.getByText(/def process/)).toBeInTheDocument();
  });

  it('truncates long code', () => {
    const longCodeData: CodeNodeData = {
      ...mockData,
      code: 'const veryLongCode = ' + 'A'.repeat(200),
    };

    render(<CodeNode data={longCodeData} selected={false} />);
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });

  it('displays code in monospace font', () => {
    const { container } = render(<CodeNode data={mockData} selected={false} />);
    const codeElement = container.querySelector('.font-mono');
    expect(codeElement).toBeInTheDocument();
  });

  it('has code preview background styling', () => {
    const { container } = render(<CodeNode data={mockData} selected={false} />);
    const codePreview = container.querySelector('.bg-muted\\/50');
    expect(codePreview).toBeInTheDocument();
  });

  it('does not render code when not set', () => {
    const noCodeData: CodeNodeData = {
      ...mockData,
      code: undefined,
    };

    render(<CodeNode data={noCodeData} selected={false} />);
    const codeElements = screen.queryAllByText(/def process/);
    expect(codeElements.length).toBe(0);
  });
});

describe('CodeNode integration tests', () => {
  it('handles complete code node', () => {
    render(<CodeNode data={mockData} selected={false} />);

    expect(screen.getByText('Process Data')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText(/def process/)).toBeInTheDocument();
  });

  it('handles code node with minimal config', () => {
    const minimalData: CodeNodeData = {
      ...mockData,
      code: undefined,
    };

    render(<CodeNode data={minimalData} selected={false} />);

    expect(screen.getByText('Process Data')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('handles different languages', () => {
    const jsData: CodeNodeData = {
      ...mockData,
      language: 'javascript',
    };

    render(<CodeNode data={jsData} selected={false} />);
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('handles multi-line code', () => {
    const multiLineData: CodeNodeData = {
      ...mockData,
      code: `function add(a, b) {
  return a + b;
}`,
    };

    render(<CodeNode data={multiLineData} selected={false} />);
    expect(screen.getByText(/function add/)).toBeInTheDocument();
    expect(screen.getByText(/return a \+ b/)).toBeInTheDocument();
  });

  it('handles very short code', () => {
    const shortCodeData: CodeNodeData = {
      ...mockData,
      code: 'return x;',
    };

    render(<CodeNode data={shortCodeData} selected={false} />);
    expect(screen.getByText('return x;')).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
  });
});
