/**
 * Tests for MathErrorBoundary component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MathErrorBoundary, MathErrorFallback } from './math-error-boundary';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      mathRenderError: 'Math Rendering Error',
      mathErrorRetry: 'Retry rendering',
      mathErrorCopySource: 'Copy LaTeX source',
      latexCopied: 'LaTeX copied to clipboard',
    };
    return translations[key] || key;
  },
}));

// Mock the hooks
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue(undefined),
    isCopying: false,
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  Copy: () => <span data-testid="copy-icon">Copy</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
}));

// Component that throws an error for testing
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="child-content">Child content</div>;
};

describe('MathErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  describe('when no error occurs', () => {
    it('should render children normally', () => {
      render(
        <MathErrorBoundary>
          <div data-testid="child">Child content</div>
        </MathErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('should render default fallback UI', () => {
      render(
        <MathErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </MathErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Math Rendering Error')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      render(
        <MathErrorBoundary fallback={<div data-testid="custom-fallback">Custom error</div>}>
          <ThrowingComponent shouldThrow={true} />
        </MathErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error')).toBeInTheDocument();
    });

    it('should display LaTeX source when provided', () => {
      render(
        <MathErrorBoundary latex="x^2 + y^2 = z^2">
          <ThrowingComponent shouldThrow={true} />
        </MathErrorBoundary>
      );

      expect(screen.getByText('x^2 + y^2 = z^2')).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = jest.fn();
      
      render(
        <MathErrorBoundary onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </MathErrorBoundary>
      );

      const retryButton = screen.getByLabelText('Retry rendering');
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });
});

describe('MathErrorFallback', () => {
  it('should render error message', () => {
    render(<MathErrorFallback error={new Error('Test error')} />);

    expect(screen.getByText('Math Rendering Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should render LaTeX source when provided', () => {
    render(<MathErrorFallback error={null} latex="x^2" />);

    expect(screen.getByText('x^2')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<MathErrorFallback error={null} onRetry={onRetry} />);

    expect(screen.getByLabelText('Retry rendering')).toBeInTheDocument();
  });

  it('should not show retry button when onRetry is not provided', () => {
    render(<MathErrorFallback error={null} />);

    expect(screen.queryByLabelText('Retry rendering')).not.toBeInTheDocument();
  });

  it('should show copy button when latex is provided', () => {
    render(<MathErrorFallback error={null} latex="x^2" />);

    expect(screen.getByLabelText('Copy LaTeX source')).toBeInTheDocument();
  });

  it('should not show copy button when latex is not provided', () => {
    render(<MathErrorFallback error={null} />);

    expect(screen.queryByLabelText('Copy LaTeX source')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<MathErrorFallback error={null} className="custom-class" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<MathErrorFallback error={null} onRetry={onRetry} />);

    const retryButton = screen.getByLabelText('Retry rendering');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });
});
