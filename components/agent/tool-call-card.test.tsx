/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolCallCard } from './tool-call-card';

// Mock the Tool components
jest.mock('@/components/ai-elements/tool', () => ({
  Tool: ({ children, className, open, onOpenChange }: { children: React.ReactNode; className?: string; open?: boolean; onOpenChange?: (open: boolean) => void }) => (
    <div data-testid="tool" className={className} data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  ToolHeader: ({ title, type, state }: { title: string; type: string; state?: string }) => (
    <div data-testid="tool-header" data-type={type} data-state={state}>{title}</div>
  ),
  ToolContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tool-content">{children}</div>
  ),
  ToolInput: ({ input }: { input: unknown }) => (
    <div data-testid="tool-input">{JSON.stringify(input)}</div>
  ),
  ToolOutput: ({ output, errorText }: { output?: unknown; errorText?: string }) => (
    <div data-testid="tool-output">
      {output && <span>{JSON.stringify(output)}</span>}
      {errorText && <span data-testid="tool-error">{errorText}</span>}
    </div>
  ) as React.ReactNode,
}));

describe('ToolCallCard', () => {
  const mockTool = {
    type: 'tool-invocation-web_search',
    input: { query: 'test query' },
    output: { results: ['result1', 'result2'] },
    state: 'output-available',
  };

  it('renders without crashing', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    expect(screen.getByTestId('tool')).toBeInTheDocument();
  });

  it('renders tool header with formatted name', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    const header = screen.getByTestId('tool-header');
    expect(header).toHaveTextContent('Web Search');
  });

  it('passes correct type to header', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    const header = screen.getByTestId('tool-header');
    expect(header).toHaveAttribute('data-type', 'tool-invocation-web_search');
  });

  it('passes state to header', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    const header = screen.getByTestId('tool-header');
    expect(header).toHaveAttribute('data-state', 'output-available');
  });

  it('renders tool content', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    expect(screen.getByTestId('tool-content')).toBeInTheDocument();
  });

  it('renders tool input', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    const input = screen.getByTestId('tool-input');
    expect(input).toHaveTextContent('{"query":"test query"}');
  });

  it('renders tool output', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    const output = screen.getByTestId('tool-output');
    expect(output).toHaveTextContent('{"results":["result1","result2"]}');
  });

  it('applies custom className', () => {
    render(<ToolCallCard tool={mockTool as never} className="custom-class" />);
    const tool = screen.getByTestId('tool');
    expect(tool).toHaveClass('custom-class');
  });

  it('starts with closed state', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    const tool = screen.getByTestId('tool');
    expect(tool).toHaveAttribute('data-open', 'false');
  });

  it('toggles open state when clicked', () => {
    render(<ToolCallCard tool={mockTool as never} />);
    const tool = screen.getByTestId('tool');
    fireEvent.click(tool);
    expect(tool).toHaveAttribute('data-open', 'true');
  });

  it('formats tool name with underscores correctly', () => {
    const toolWithUnderscores = { ...mockTool, type: 'tool-invocation-file_read_write' };
    render(<ToolCallCard tool={toolWithUnderscores as never} />);
    expect(screen.getByTestId('tool-header')).toHaveTextContent('File Read Write');
  });

  it('handles tool type without dashes', () => {
    const simpleTool = { ...mockTool, type: 'search' };
    render(<ToolCallCard tool={simpleTool as never} />);
    expect(screen.getByTestId('tool-header')).toHaveTextContent('Search');
  });

  it('renders error text when present', () => {
    const errorTool = { ...mockTool, output: undefined, errorText: 'Something went wrong' };
    render(<ToolCallCard tool={errorTool as never} />);
    expect(screen.getByTestId('tool-error')).toHaveTextContent('Something went wrong');
  });
});
