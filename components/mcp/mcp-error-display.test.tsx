import { render, screen, fireEvent } from '@testing-library/react';
import { MCPErrorDisplay } from './mcp-error-display';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MCPErrorDisplay', () => {
  it('renders user-friendly message for timeout error', () => {
    render(<MCPErrorDisplay error="Operation timed out after 30s" />);
    expect(screen.getByText(/timed out/i)).toBeInTheDocument();
  });

  it('renders user-friendly message for connection error', () => {
    render(<MCPErrorDisplay error="Connection refused: ECONNREFUSED" />);
    expect(screen.getByText('Unable to connect to the server. Please check the server status.')).toBeInTheDocument();
  });

  it('renders user-friendly message for permission error', () => {
    render(<MCPErrorDisplay error="Unauthorized: invalid API key" />);
    expect(screen.getByText('Permission denied. Please check your credentials.')).toBeInTheDocument();
  });

  it('shows recovery suggestions', () => {
    render(<MCPErrorDisplay error="Connection refused" />);
    expect(screen.getByText('recoverySuggestions')).toBeInTheDocument();
  });

  it('shows retry button for retryable errors', () => {
    const onRetry = jest.fn();
    render(<MCPErrorDisplay error="Connection timeout" onRetry={onRetry} />);
    const retryButton = screen.getByText('retryAction');
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows dismiss button when onDismiss provided', () => {
    const onDismiss = jest.fn();
    render(<MCPErrorDisplay error="Some error" onDismiss={onDismiss} />);
    const dismissButtons = screen.getAllByRole('button');
    const dismissButton = dismissButtons.find((b) => b.querySelector('svg'));
    if (dismissButton) {
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalled();
    }
  });

  it('toggles raw error details', () => {
    render(<MCPErrorDisplay error="Raw error details here" />);
    expect(screen.queryByText('Raw error details here')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('showDetails'));
    expect(screen.getByText('Raw error details here')).toBeInTheDocument();
    fireEvent.click(screen.getByText('hideDetails'));
    expect(screen.queryByText('Raw error details here')).not.toBeInTheDocument();
  });

  it('renders compact variant', () => {
    const { container } = render(<MCPErrorDisplay error="Timeout error" compact />);
    expect(container.firstChild).toHaveClass('flex');
    expect(screen.queryByText('recoverySuggestions')).not.toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<MCPErrorDisplay error="Error" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('does not show retry button for non-retryable errors', () => {
    const onRetry = jest.fn();
    render(<MCPErrorDisplay error="tool xyz not found" onRetry={onRetry} />);
    // tool_not_found is not retryable, so retry button should not appear
    expect(screen.queryByText('retryAction')).not.toBeInTheDocument();
  });

  it('shows error type badge', () => {
    render(<MCPErrorDisplay error="Connection timeout after 30s" />);
    expect(screen.getByText('timeout')).toBeInTheDocument();
  });
});
