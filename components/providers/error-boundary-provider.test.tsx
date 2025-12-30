/**
 * Tests for ErrorBoundaryProvider
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundaryProvider, useErrorBoundary } from './error-boundary-provider';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

// Component that uses the hook
function ErrorThrower() {
  const { triggerError } = useErrorBoundary();
  return (
    <button onClick={() => triggerError(new Error('Hook error'))}>
      Trigger Error
    </button>
  );
}

describe('ErrorBoundaryProvider', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundaryProvider>
          <div>Child content</div>
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders nested children correctly', () => {
      render(
        <ErrorBoundaryProvider>
          <div>
            <span>Nested content</span>
          </div>
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error UI when child throws', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('shows Try Again button', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('shows Go Home button', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundaryProvider fallback={<div>Custom error UI</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('calls onRetry when Try Again is clicked', () => {
      const onRetry = jest.fn();

      render(
        <ErrorBoundaryProvider onRetry={onRetry}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      fireEvent.click(screen.getByText('Try Again'));

      expect(onRetry).toHaveBeenCalled();
    });

    it('increments retry count on each retry', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      // Click retry once
      fireEvent.click(screen.getByText('Try Again'));

      // Should show retry count in message
      expect(screen.getByText(/after 1 attempt/)).toBeInTheDocument();
    });

    it('respects maxRetries limit', () => {
      render(
        <ErrorBoundaryProvider maxRetries={2}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      // Retry twice
      fireEvent.click(screen.getByText('Try Again'));
      fireEvent.click(screen.getByText('Try Again'));

      // Third retry should be blocked
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      fireEvent.click(screen.getByText('Try Again'));
      expect(warnSpy).toHaveBeenCalledWith('Max retries reached. Please reset the application.');
      warnSpy.mockRestore();
    });
  });

  describe('error callback', () => {
    it('calls onError when error is caught', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundaryProvider onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) }),
        expect.any(String) // errorId
      );
    });

    it('passes error object to onError', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundaryProvider onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      const [error] = onError.mock.calls[0];
      expect(error.message).toBe('Test error message');
    });
  });

  describe('reset functionality', () => {
    it('redirects to home when Go Home is clicked', () => {
      // Mock window.location
      const originalLocation = window.location;
      // @ts-expect-error - Mock location for testing
      delete window.location;
      // @ts-expect-error - Partial mock of Location for testing
      window.location = { ...originalLocation, href: '' };

      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      fireEvent.click(screen.getByText('Go Home'));

      expect(window.location.href).toBe('/');

      // @ts-expect-error - Restoring original location
      window.location = originalLocation;
    });
  });

  describe('showDetails prop', () => {
    it('shows error details when showDetails is true', () => {
      render(
        <ErrorBoundaryProvider showDetails={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });
  });

  describe('useErrorBoundary hook', () => {
    it('provides triggerError function', () => {
      render(
        <ErrorBoundaryProvider>
          <ErrorThrower />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Trigger Error')).toBeInTheDocument();
    });

    it('triggers error when called', () => {
      render(
        <ErrorBoundaryProvider>
          <ErrorThrower />
        </ErrorBoundaryProvider>
      );

      fireEvent.click(screen.getByText('Trigger Error'));

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('error name display', () => {
    it('displays error name', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('description text', () => {
    it('shows initial error description', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('shows retry-specific description after retry', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      fireEvent.click(screen.getByText('Try Again'));

      expect(screen.getByText(/An error occurred after 1 attempt/)).toBeInTheDocument();
    });
  });
});
