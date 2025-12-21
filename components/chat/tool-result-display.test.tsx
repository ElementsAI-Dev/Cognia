/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ToolResultDisplay,
  ToolMentionInline,
  ToolExecutionStatus,
} from './tool-result-display';
import type { ToolCallResult } from '@/types/mcp';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

// Mock clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('ToolResultDisplay', () => {
  const successResult: ToolCallResult = {
    content: [{ type: 'text', text: 'Operation completed successfully' }],
    isError: false,
  };

  const errorResult: ToolCallResult = {
    content: [{ type: 'text', text: 'Error: Something went wrong' }],
    isError: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <ToolResultDisplay
        serverId="test-server"
        toolName="test-tool"
        result={successResult}
      />
    );
    expect(screen.getByText('@test-server:test-tool')).toBeInTheDocument();
  });

  it('displays tool name and server', () => {
    render(
      <ToolResultDisplay
        serverId="my-server"
        toolName="fetch-data"
        result={successResult}
      />
    );
    expect(screen.getByText('@my-server:fetch-data')).toBeInTheDocument();
  });

  it('displays success icon for successful results', () => {
    const { container } = render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={successResult}
      />
    );
    // Check for green success styling
    expect(container.querySelector('.text-green-500')).toBeInTheDocument();
  });

  it('displays error icon for error results', () => {
    const { container } = render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={errorResult}
      />
    );
    // Check for destructive error styling
    expect(container.querySelector('.text-destructive')).toBeInTheDocument();
  });

  it('displays text content', () => {
    render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={successResult}
      />
    );
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
  });

  it('shows executing state', () => {
    render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={successResult}
        isExecuting
      />
    );
    expect(screen.getByText('Executing...')).toBeInTheDocument();
  });

  it('toggles expansion when header is clicked', () => {
    render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={successResult}
      />
    );
    
    // Content should be visible initially
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    
    // Click to collapse
    const header = screen.getByText('@server:tool').closest('div');
    fireEvent.click(header!);
    
    // Content should be hidden
    expect(screen.queryByText('Operation completed successfully')).not.toBeInTheDocument();
  });

  it('copies result to clipboard when copy button is clicked', async () => {
    render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={successResult}
      />
    );
    
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons[0];
    fireEvent.click(copyButton);
    
    expect(mockWriteText).toHaveBeenCalledWith('Operation completed successfully');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={successResult}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles image content', () => {
    const imageResult: ToolCallResult = {
      content: [{ type: 'image', mimeType: 'image/png', data: 'base64data' }],
      isError: false,
    };
    render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={imageResult}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,base64data');
  });

  it('handles resource content', () => {
    const resourceResult: ToolCallResult = {
      content: [{
        type: 'resource',
        resource: { uri: 'file:///test.txt', text: 'Resource content' },
      }],
      isError: false,
    };
    render(
      <ToolResultDisplay
        serverId="server"
        toolName="tool"
        result={resourceResult}
      />
    );
    expect(screen.getByText('Resource: file:///test.txt')).toBeInTheDocument();
    expect(screen.getByText('Resource content')).toBeInTheDocument();
  });
});

describe('ToolMentionInline', () => {
  it('renders without crashing', () => {
    render(<ToolMentionInline serverId="server" toolName="tool" />);
    expect(screen.getByText('@server:tool')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<ToolMentionInline serverId="server" toolName="tool" onClick={onClick} />);
    
    fireEvent.click(screen.getByText('@server:tool'));
    expect(onClick).toHaveBeenCalled();
  });

  it('displays server and tool name', () => {
    render(<ToolMentionInline serverId="my-mcp" toolName="read-file" />);
    expect(screen.getByText('@my-mcp:read-file')).toBeInTheDocument();
  });
});

describe('ToolExecutionStatus', () => {
  it('renders pending status', () => {
    render(
      <ToolExecutionStatus
        status="pending"
        serverId="server"
        toolName="tool"
      />
    );
    expect(screen.getByText('Pending: @server:tool')).toBeInTheDocument();
  });

  it('renders executing status', () => {
    render(
      <ToolExecutionStatus
        status="executing"
        serverId="server"
        toolName="tool"
      />
    );
    expect(screen.getByText('Executing: @server:tool')).toBeInTheDocument();
  });

  it('renders success status', () => {
    render(
      <ToolExecutionStatus
        status="success"
        serverId="server"
        toolName="tool"
      />
    );
    expect(screen.getByText('Completed: @server:tool')).toBeInTheDocument();
  });

  it('renders error status with message', () => {
    render(
      <ToolExecutionStatus
        status="error"
        serverId="server"
        toolName="tool"
        errorMessage="Connection failed"
      />
    );
    expect(screen.getByText('Failed: @server:tool')).toBeInTheDocument();
    expect(screen.getByText('- Connection failed')).toBeInTheDocument();
  });

  it('applies correct styling for each status', () => {
    const { rerender, container } = render(
      <ToolExecutionStatus status="pending" serverId="s" toolName="t" />
    );
    expect(container.firstChild).toHaveClass('bg-muted');
    
    rerender(<ToolExecutionStatus status="executing" serverId="s" toolName="t" />);
    expect(container.firstChild).toHaveClass('bg-primary/10');
    
    rerender(<ToolExecutionStatus status="success" serverId="s" toolName="t" />);
    expect(container.firstChild).toHaveClass('bg-green-500/10');
    
    rerender(<ToolExecutionStatus status="error" serverId="s" toolName="t" />);
    expect(container.firstChild).toHaveClass('bg-destructive/10');
  });
});
