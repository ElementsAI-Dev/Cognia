/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from './error-message';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div role="alert" className={className}>{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value} />
  ),
}));

describe('ErrorMessage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<ErrorMessage error="Test error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<ErrorMessage error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('categorizes API key errors correctly', () => {
    render(<ErrorMessage error="Invalid API key" />);
    expect(screen.getByText('API Key Error')).toBeInTheDocument();
  });

  it('categorizes network errors correctly', () => {
    render(<ErrorMessage error="Network connection failed" />);
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  it('categorizes rate limit errors correctly', () => {
    render(<ErrorMessage error="Rate limit exceeded" />);
    expect(screen.getByText('Rate Limit Exceeded')).toBeInTheDocument();
  });

  it('categorizes server errors correctly', () => {
    render(<ErrorMessage error="500 Internal Server Error" />);
    expect(screen.getByText('Server Error')).toBeInTheDocument();
  });

  it('shows retry button when error is retryable', () => {
    const onRetry = jest.fn();
    render(<ErrorMessage error="Network error" onRetry={onRetry} />);
    expect(screen.getByText('Retry Now')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<ErrorMessage error="Network error" onRetry={onRetry} autoRetry={false} />);
    fireEvent.click(screen.getByText('Retry Now'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage error="Test error" onDismiss={onDismiss} />);
    const dismissButton = screen.getByRole('button', { name: '' });
    expect(dismissButton).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage error="Test error" onDismiss={onDismiss} />);
    const buttons = screen.getAllByRole('button');
    const dismissButton = buttons[buttons.length - 1];
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows settings link for API key errors', () => {
    render(<ErrorMessage error="Invalid API key" />);
    expect(screen.getByText('Go to Settings')).toBeInTheDocument();
  });

  it('does not show retry button for API key errors', () => {
    const onRetry = jest.fn();
    render(<ErrorMessage error="Invalid API key" onRetry={onRetry} />);
    expect(screen.queryByText('Retry Now')).not.toBeInTheDocument();
  });

  it('displays max retries message when limit reached', () => {
    render(
      <ErrorMessage
        error="Network error"
        onRetry={() => {}}
        maxRetries={3}
        retryCount={3}
      />
    );
    expect(screen.getByText(/Max retries reached/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ErrorMessage error="Test error" className="custom-class" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });
});
