/**
 * Unit tests for ArenaErrorBoundary component
 */

import { render, screen } from '@testing-library/react';
import { ArenaErrorBoundary } from './arena-error-boundary';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    // The component calls t('errorBoundary.failedToLoad', { section: '{section}' })
    // which returns 'Failed to load {section}', then does .replace('{section}', sectionName)
    if (key === 'errorBoundary.failedToLoad' && params?.section) {
      return `Failed to load ${params.section}`;
    }
    if (key === 'errorBoundary.somethingWrong') return 'Something went wrong';
    if (key === 'errorBoundary.unexpectedError') return 'An unexpected error occurred';
    if (key === 'errorBoundary.tryAgain') return 'Try Again';
    return key;
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    ui: {
      error: jest.fn(),
    },
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h5>{children}</h5>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Component that throws errors on demand
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
}

// Suppress console.error during expected error boundary catches
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('React will try to recreate')) return;
    if (typeof args[0] === 'string' && args[0].includes('The above error occurred')) return;
    if (typeof args[0] === 'string' && args[0].includes('Error: Uncaught')) return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

describe('ArenaErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ArenaErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ArenaErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ArenaErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ArenaErrorBoundary>
    );
    expect(screen.queryByText('Normal content')).not.toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows section name in error title when provided', () => {
    render(
      <ArenaErrorBoundary sectionName="Leaderboard">
        <ThrowingComponent shouldThrow={true} />
      </ArenaErrorBoundary>
    );
    // The failedToLoad translation returns 'Failed to load {section}',
    // then the component does .replace('{section}', 'Leaderboard')
    expect(screen.getByText('Failed to load Leaderboard')).toBeInTheDocument();
  });

  it('shows generic title when no section name', () => {
    render(
      <ArenaErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ArenaErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ArenaErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ArenaErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    render(
      <ArenaErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ArenaErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('shows try again button with translated text', () => {
    render(
      <ArenaErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ArenaErrorBoundary>
    );
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
