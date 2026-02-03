import { render, screen, fireEvent } from '@testing-library/react';
import { RendererErrorBoundary, withRendererErrorBoundary } from './renderer-error-boundary';

// Component that throws an error
const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="success">Success</div>;
};

// Suppress console.error for these tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('RendererErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <RendererErrorBoundary>
        <div data-testid="child">Child content</div>
      </RendererErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    render(
      <RendererErrorBoundary>
        <ThrowingComponent />
      </RendererErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Render Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows renderer name in error message when provided', () => {
    render(
      <RendererErrorBoundary rendererName="TestRenderer">
        <ThrowingComponent />
      </RendererErrorBoundary>
    );

    expect(screen.getByText('TestRenderer Render Error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <RendererErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowingComponent />
      </RendererErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <RendererErrorBoundary onError={onError}>
        <ThrowingComponent />
      </RendererErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('recovers when retry button is clicked', () => {
    const { rerender } = render(
      <RendererErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </RendererErrorBoundary>
    );

    // Verify error state
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Rerender with non-throwing component before clicking retry
    rerender(
      <RendererErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </RendererErrorBoundary>
    );

    // Click retry button
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // Verify recovery
    expect(screen.getByTestId('success')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <RendererErrorBoundary className="custom-class">
        <ThrowingComponent />
      </RendererErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });
});

describe('withRendererErrorBoundary HOC', () => {
  const TestComponent = ({ text }: { text: string }) => <div>{text}</div>;

  it('wraps component with error boundary', () => {
    const WrappedComponent = withRendererErrorBoundary(TestComponent, 'TestComponent');

    render(<WrappedComponent text="Hello" />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('catches errors from wrapped component', () => {
    const WrappedThrowingComponent = withRendererErrorBoundary(ThrowingComponent, 'ThrowingTest');

    render(<WrappedThrowingComponent />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('ThrowingTest Render Error')).toBeInTheDocument();
  });

  it('sets correct displayName', () => {
    const WrappedComponent = withRendererErrorBoundary(TestComponent, 'TestComponent');

    expect(WrappedComponent.displayName).toBe('withRendererErrorBoundary(TestComponent)');
  });
});
