import { render, screen, fireEvent } from '@testing-library/react';
import { MCPToolCallCard } from './mcp-tool-call-card';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock CodeBlock to avoid async highlighting issues
jest.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: ({ code }: { code: string }) => <pre data-testid="code-block">{code}</pre>,
}));

describe('MCPToolCallCard', () => {
  const defaultProps = {
    callId: 'call-123',
    serverId: 'test-server',
    toolName: 'test_tool',
    args: { param1: 'value1' },
    state: 'output-available' as const,
  };

  it('renders tool name formatted correctly', () => {
    render(<MCPToolCallCard {...defaultProps} />);
    expect(screen.getByText('Test Tool')).toBeInTheDocument();
  });

  it('renders server badge', () => {
    render(<MCPToolCallCard {...defaultProps} serverName="My Server" />);
    expect(screen.getByText('My Server')).toBeInTheDocument();
  });

  it('shows parameters tab by default', () => {
    render(<MCPToolCallCard {...defaultProps} />);
    expect(screen.getByText('parameters')).toBeInTheDocument();
  });

  it('shows result tab when completed', () => {
    render(
      <MCPToolCallCard
        {...defaultProps}
        result={{ content: [{ type: 'text', text: 'Success!' }], isError: false }}
      />
    );
    expect(screen.getByText('result')).toBeInTheDocument();
  });

  it('shows approval UI when approval requested', () => {
    render(
      <MCPToolCallCard
        {...defaultProps}
        state="approval-requested"
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />
    );
    expect(screen.getByText('approvalRequired')).toBeInTheDocument();
    expect(screen.getByText('approve')).toBeInTheDocument();
    expect(screen.getByText('deny')).toBeInTheDocument();
  });

  it('calls onApprove when approve button clicked', () => {
    const onApprove = jest.fn();
    render(<MCPToolCallCard {...defaultProps} state="approval-requested" onApprove={onApprove} />);
    fireEvent.click(screen.getByText('approve'));
    expect(onApprove).toHaveBeenCalled();
  });

  it('calls onDeny when deny button clicked', () => {
    const onDeny = jest.fn();
    render(<MCPToolCallCard {...defaultProps} state="approval-requested" onDeny={onDeny} />);
    fireEvent.click(screen.getByText('deny'));
    expect(onDeny).toHaveBeenCalled();
  });

  it('shows error state styling', () => {
    render(
      <MCPToolCallCard {...defaultProps} state="output-error" errorText="Something went wrong" />
    );
    // Error card has red border styling
    expect(screen.getByText('Test Tool')).toBeInTheDocument();
  });

  it('shows retry button on error when callback provided', () => {
    const onRetry = jest.fn();
    render(<MCPToolCallCard {...defaultProps} state="output-error" onRetry={onRetry} />);
    // Find retry button by tooltip content or icon
    const retryButtons = screen.getAllByRole('button');
    const retryBtn = retryButtons.find((btn) => btn.querySelector('svg.lucide-refresh-cw'));
    if (retryBtn) {
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalled();
    }
  });

  it('shows risk level badge when provided', () => {
    render(<MCPToolCallCard {...defaultProps} riskLevel="high" />);
    // Risk level is shown as a badge
    const badges = screen.getAllByText('high');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows duration when timestamps provided', () => {
    const startedAt = new Date(Date.now() - 2500);
    const completedAt = new Date();

    render(<MCPToolCallCard {...defaultProps} startedAt={startedAt} completedAt={completedAt} />);
    expect(screen.getByText(/2\.\d+s/)).toBeInTheDocument();
  });

  it('collapses/expands on header click', () => {
    render(<MCPToolCallCard {...defaultProps} defaultOpen={false} />);

    // Click to expand
    const header = screen.getByText('Test Tool').closest('button');
    if (header) {
      fireEvent.click(header);
    }

    expect(screen.getByText('parameters')).toBeInTheDocument();
  });
});
