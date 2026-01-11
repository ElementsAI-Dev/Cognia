/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolPart } from './tool-part';
import type { ToolInvocationPart } from '@/types/core/message';

// Mock Tool components
jest.mock('@/components/ai-elements/tool', () => ({
  Tool: ({ children, defaultOpen }: { children: React.ReactNode; defaultOpen?: boolean }) => (
    <div data-testid="tool" data-default-open={defaultOpen}>{children}</div>
  ),
  ToolHeader: ({ title, type, state }: { title: string; type: string; state: string }) => (
    <div data-testid="tool-header" data-title={title} data-type={type} data-state={state}>
      {title}
    </div>
  ),
  ToolContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tool-content">{children}</div>
  ),
  ToolInput: ({ input }: { input: unknown }) => (
    <div data-testid="tool-input">{JSON.stringify(input)}</div>
  ),
  ToolOutput: ({ output, errorText }: { output?: unknown; errorText?: string }) => (
    <div data-testid="tool-output" data-error={errorText}>
      {errorText || JSON.stringify(output)}
    </div>
  ),
}));

describe('ToolPart', () => {
  const createToolPart = (overrides: Partial<ToolInvocationPart> = {}): ToolInvocationPart => ({
    type: 'tool-invocation',
    toolCallId: 'call-123',
    toolName: 'read-file',
    args: { path: '/test/file.txt' },
    state: 'input-available',
    ...overrides,
  });

  it('renders without crashing', () => {
    render(<ToolPart part={createToolPart()} />);
    expect(screen.getByTestId('tool')).toBeInTheDocument();
  });

  it('displays formatted tool name', () => {
    render(<ToolPart part={createToolPart({ toolName: 'read-file' })} />);
    expect(screen.getByText('Read File')).toBeInTheDocument();
  });

  it('formats tool name with underscores', () => {
    render(<ToolPart part={createToolPart({ toolName: 'get_user_data' })} />);
    expect(screen.getByText('Get User Data')).toBeInTheDocument();
  });

  it('displays tool input arguments', () => {
    const args = { path: '/test/file.txt', encoding: 'utf-8' };
    render(<ToolPart part={createToolPart({ args })} />);
    
    const input = screen.getByTestId('tool-input');
    expect(input).toHaveTextContent('/test/file.txt');
    expect(input).toHaveTextContent('utf-8');
  });

  it('displays tool result when available', () => {
    const part = createToolPart({
      state: 'output-available',
      result: { content: 'File contents here' },
    });
    render(<ToolPart part={part} />);
    
    expect(screen.getByTestId('tool-output')).toHaveTextContent('File contents here');
  });

  it('displays error text when present', () => {
    const part = createToolPart({
      state: 'output-error',
      errorText: 'File not found',
    });
    render(<ToolPart part={part} />);
    
    // Error text is displayed in a custom error section, not in ToolOutput
    expect(screen.getByText('File not found')).toBeInTheDocument();
  });

  it('maps input-streaming state correctly', () => {
    render(<ToolPart part={createToolPart({ state: 'input-streaming' })} />);
    expect(screen.getByTestId('tool-header')).toHaveAttribute('data-state', 'input-streaming');
  });

  it('maps input-available state correctly', () => {
    render(<ToolPart part={createToolPart({ state: 'input-available' })} />);
    expect(screen.getByTestId('tool-header')).toHaveAttribute('data-state', 'input-available');
  });

  it('maps approval-requested state to input-available', () => {
    render(<ToolPart part={createToolPart({ state: 'approval-requested' })} />);
    expect(screen.getByTestId('tool-header')).toHaveAttribute('data-state', 'input-available');
  });

  it('maps approval-responded state to input-available', () => {
    render(<ToolPart part={createToolPart({ state: 'approval-responded' })} />);
    expect(screen.getByTestId('tool-header')).toHaveAttribute('data-state', 'input-available');
  });

  it('maps output-available state correctly', () => {
    render(<ToolPart part={createToolPart({ state: 'output-available' })} />);
    expect(screen.getByTestId('tool-header')).toHaveAttribute('data-state', 'output-available');
  });

  it('maps output-error state correctly', () => {
    render(<ToolPart part={createToolPart({ state: 'output-error' })} />);
    expect(screen.getByTestId('tool-header')).toHaveAttribute('data-state', 'output-error');
  });

  it('maps output-denied state to output-error', () => {
    render(<ToolPart part={createToolPart({ state: 'output-denied' })} />);
    expect(screen.getByTestId('tool-header')).toHaveAttribute('data-state', 'output-error');
  });

  it('defaults to open when not output-available', () => {
    render(<ToolPart part={createToolPart({ state: 'input-available' })} />);
    expect(screen.getByTestId('tool')).toHaveAttribute('data-default-open', 'true');
  });

  it('defaults to collapsed when output-available', () => {
    render(<ToolPart part={createToolPart({ state: 'output-available' })} />);
    expect(screen.getByTestId('tool')).toHaveAttribute('data-default-open', 'false');
  });

  it('handles empty arguments', () => {
    render(<ToolPart part={createToolPart({ args: {} })} />);
    expect(screen.getByTestId('tool-input')).toBeInTheDocument();
  });

  it('sets correct type attribute', () => {
    render(<ToolPart part={createToolPart()} />);
    expect(screen.getByTestId('tool-header')).toHaveAttribute('data-type', 'tool-invocation');
  });
});
