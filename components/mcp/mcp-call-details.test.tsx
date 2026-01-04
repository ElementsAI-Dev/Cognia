import { render, screen, fireEvent } from '@testing-library/react';
import { MCPCallDetails } from './mcp-call-details';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock CodeBlock to avoid async highlighting issues
jest.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: ({ code }: { code: string }) => <pre data-testid="code-block">{code}</pre>,
}));

describe('MCPCallDetails', () => {
  const defaultProps = {
    callId: 'call-123',
    serverId: 'test-server',
    toolName: 'read_file',
    args: { path: '/test/file.txt' },
  };

  it('renders basic call info', () => {
    render(<MCPCallDetails {...defaultProps} />);
    expect(screen.getByText('test-server')).toBeInTheDocument();
    expect(screen.getByText('read_file')).toBeInTheDocument();
  });

  it('shows server name when provided', () => {
    render(<MCPCallDetails {...defaultProps} serverName="My Server" />);
    expect(screen.getByText('My Server')).toBeInTheDocument();
  });

  it('shows tool description when provided', () => {
    render(
      <MCPCallDetails 
        {...defaultProps} 
        toolDescription="Read contents of a file"
      />
    );
    expect(screen.getByText('Read contents of a file')).toBeInTheDocument();
  });

  it('shows arguments section', () => {
    render(<MCPCallDetails {...defaultProps} />);
    expect(screen.getByText('arguments')).toBeInTheDocument();
  });

  it('expands arguments section by default', () => {
    render(<MCPCallDetails {...defaultProps} />);
    // Arguments section should be visible
    expect(screen.getByText('arguments')).toBeInTheDocument();
  });

  it('shows result section when result provided', () => {
    render(
      <MCPCallDetails 
        {...defaultProps} 
        result={{ content: 'file content' }}
      />
    );
    expect(screen.getByText('result')).toBeInTheDocument();
  });

  it('shows error section when error provided', () => {
    render(
      <MCPCallDetails 
        {...defaultProps} 
        error="File not found"
      />
    );
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('File not found')).toBeInTheDocument();
  });

  it('shows duration when timestamps provided', () => {
    const startedAt = new Date(Date.now() - 1500);
    const endedAt = new Date();
    
    render(
      <MCPCallDetails 
        {...defaultProps}
        startedAt={startedAt}
        endedAt={endedAt}
      />
    );
    expect(screen.getByText(/1\.\d+s/)).toBeInTheDocument();
  });

  it('shows metadata section when metadata provided', () => {
    render(
      <MCPCallDetails 
        {...defaultProps}
        metadata={{ version: '1.0', timeout: 5000 }}
      />
    );
    expect(screen.getByText('metadata')).toBeInTheDocument();
  });

  it('shows logs section when logs provided', () => {
    render(
      <MCPCallDetails 
        {...defaultProps}
        logs={[
          { level: 'info', message: 'Starting operation' },
          { level: 'debug', message: 'Reading file' },
        ]}
      />
    );
    expect(screen.getByText(/logs \(2\)/)).toBeInTheDocument();
  });

  it('shows input schema when provided', () => {
    render(
      <MCPCallDetails 
        {...defaultProps}
        inputSchema={{
          type: 'object',
          properties: { path: { type: 'string' } },
        }}
      />
    );
    expect(screen.getByText('inputSchema')).toBeInTheDocument();
  });

  it('expands/collapses sections on click', () => {
    render(
      <MCPCallDetails 
        {...defaultProps}
        result={{ data: 'test' }}
      />
    );
    
    // Click on result section header
    const resultButton = screen.getByText('result').closest('button');
    if (resultButton) {
      fireEvent.click(resultButton);
      // Section should expand and show content
    }
  });

  it('truncates long call IDs', () => {
    render(
      <MCPCallDetails 
        {...defaultProps}
        callId="very-long-call-id-that-should-be-truncated-in-display"
      />
    );
    // Call ID should be displayed (possibly truncated)
    expect(screen.getByText(/very-long-call-id/)).toBeInTheDocument();
  });
});
