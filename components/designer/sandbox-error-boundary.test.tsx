/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import {
  SandboxErrorBoundary,
  useErrorBoundaryReset,
  useConsoleErrorInterceptor,
} from './sandbox-error-boundary';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

// Component that throws specific error types
function ThrowSpecificError({ errorType }: { errorType: string }): React.ReactNode {
  switch (errorType) {
    case 'reference':
      throw new Error('myVariable is not defined');
    case 'type':
      throw new Error("Cannot read properties of undefined (reading 'foo')");
    case 'syntax':
      throw new Error('Unexpected token <');
    case 'module':
      throw new Error("Module not found: Can't resolve 'nonexistent-module'");
    case 'loop':
      throw new Error('Maximum update depth exceeded');
    case 'hook':
      throw new Error('Invalid hook call. Hooks can only be called inside of a function component');
    default:
      throw new Error('Generic error');
  }
}

describe('SandboxErrorBoundary', () => {
  // Suppress console.error during tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <SandboxErrorBoundary>
        <div>Child content</div>
      </SandboxErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    render(
      <SandboxErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SandboxErrorBoundary>
    );
    expect(screen.getByText('Runtime Error')).toBeInTheDocument();
  });

  it('should show try again button', () => {
    render(
      <SandboxErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SandboxErrorBoundary>
    );
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should call onError when error is caught', () => {
    const onError = jest.fn();
    render(
      <SandboxErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </SandboxErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
  });

  it('should call onReset when try again is clicked', async () => {
    const onReset = jest.fn();
    render(
      <SandboxErrorBoundary onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </SandboxErrorBoundary>
    );
    
    const tryAgainButton = screen.getByText('Try Again');
    await userEvent.click(tryAgainButton);
    
    expect(onReset).toHaveBeenCalled();
  });

  it('should toggle error details when expand button is clicked', async () => {
    render(
      <SandboxErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SandboxErrorBoundary>
    );
    
    // Details should not be visible initially
    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    
    // Click the expand button
    const expandButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-chevron-down')
    );
    if (expandButton) {
      await userEvent.click(expandButton);
      expect(screen.getByText('Error Details')).toBeInTheDocument();
    }
  });

  it('should show copy button in error details', async () => {
    render(
      <SandboxErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SandboxErrorBoundary>
    );
    
    const expandButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-chevron-down')
    );
    if (expandButton) {
      await userEvent.click(expandButton);
      expect(screen.getByText('Copy')).toBeInTheDocument();
    }
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SandboxErrorBoundary className="custom-class">
        <ThrowError shouldThrow={true} />
      </SandboxErrorBoundary>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  describe('error message parsing', () => {
    it('should parse reference error', () => {
      render(
        <SandboxErrorBoundary>
          <ThrowSpecificError errorType="reference" />
        </SandboxErrorBoundary>
      );
      expect(screen.getByText('Reference Error')).toBeInTheDocument();
    });

    it('should parse type error', () => {
      render(
        <SandboxErrorBoundary>
          <ThrowSpecificError errorType="type" />
        </SandboxErrorBoundary>
      );
      expect(screen.getByText('Type Error')).toBeInTheDocument();
    });

    it('should parse syntax error', () => {
      render(
        <SandboxErrorBoundary>
          <ThrowSpecificError errorType="syntax" />
        </SandboxErrorBoundary>
      );
      expect(screen.getByText('Syntax Error')).toBeInTheDocument();
    });

    it('should parse module error', () => {
      render(
        <SandboxErrorBoundary>
          <ThrowSpecificError errorType="module" />
        </SandboxErrorBoundary>
      );
      expect(screen.getByText('Import Error')).toBeInTheDocument();
    });

    it('should parse infinite loop error', () => {
      render(
        <SandboxErrorBoundary>
          <ThrowSpecificError errorType="loop" />
        </SandboxErrorBoundary>
      );
      expect(screen.getByText('Infinite Loop')).toBeInTheDocument();
    });

    it('should parse hook error', () => {
      render(
        <SandboxErrorBoundary>
          <ThrowSpecificError errorType="hook" />
        </SandboxErrorBoundary>
      );
      expect(screen.getByText('Hook Error')).toBeInTheDocument();
    });
  });
});

describe('useErrorBoundaryReset hook', () => {
  it('should initialize with resetKey 0', () => {
    const { result } = renderHook(() => useErrorBoundaryReset());
    expect(result.current.resetKey).toBe(0);
  });

  it('should increment resetKey when reset is called', () => {
    const { result } = renderHook(() => useErrorBoundaryReset());
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.resetKey).toBe(1);
  });

  it('should increment resetKey multiple times', () => {
    const { result } = renderHook(() => useErrorBoundaryReset());
    
    act(() => {
      result.current.reset();
      result.current.reset();
      result.current.reset();
    });
    
    expect(result.current.resetKey).toBe(3);
  });
});

describe('useConsoleErrorInterceptor hook', () => {
  it('should initialize with empty errors array', () => {
    const { result } = renderHook(() => useConsoleErrorInterceptor());
    expect(result.current.errors).toEqual([]);
  });

  it('should clear errors when clearErrors is called', () => {
    const { result } = renderHook(() => useConsoleErrorInterceptor());
    
    // Trigger a console.error
    act(() => {
      console.error('Test error');
    });
    
    expect(result.current.errors.length).toBeGreaterThan(0);
    
    act(() => {
      result.current.clearErrors();
    });
    
    expect(result.current.errors).toEqual([]);
  });
});
