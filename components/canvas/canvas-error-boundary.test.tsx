'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { CanvasErrorBoundary } from './canvas-error-boundary';

const messages = {
  canvas: {
    errorTitle: 'Something went wrong',
    errorDescription: 'An error occurred in the canvas',
    tryAgain: 'Try Again',
    copyError: 'Copy Error',
    copied: 'Copied',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('CanvasErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error', () => {
    renderWithProviders(
      <CanvasErrorBoundary>
        <div>Child content</div>
      </CanvasErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when error occurs', () => {
    renderWithProviders(
      <CanvasErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CanvasErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    renderWithProviders(
      <CanvasErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError shouldThrow={true} />
      </CanvasErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    renderWithProviders(
      <CanvasErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </CanvasErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
  });

  it('renders try again button', () => {
    renderWithProviders(
      <CanvasErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CanvasErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('renders copy error button', () => {
    renderWithProviders(
      <CanvasErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CanvasErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /Copy Error/i })).toBeInTheDocument();
  });

  it('renders show details button', () => {
    renderWithProviders(
      <CanvasErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CanvasErrorBoundary>
    );
    expect(screen.getByText('Show Details')).toBeInTheDocument();
  });

  it('calls onReset when try again clicked', () => {
    const onReset = jest.fn();
    renderWithProviders(
      <CanvasErrorBoundary onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </CanvasErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(onReset).toHaveBeenCalled();
  });
});
