/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { PreviewLoading, usePreviewStatus } from './preview/preview-loading';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Progress component
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

describe('PreviewLoading', () => {
  it('should render loading status by default', () => {
    render(<PreviewLoading />);
    const icon = document.querySelector('svg.animate-spin');
    expect(icon).toBeInTheDocument();
  });

  it('should render compiling status', () => {
    render(<PreviewLoading status="compiling" />);
    const icon = document.querySelector('svg.animate-pulse');
    expect(icon).toBeInTheDocument();
  });

  it('should render rendering status', () => {
    render(<PreviewLoading status="rendering" />);
    const icon = document.querySelector('svg.animate-spin');
    expect(icon).toBeInTheDocument();
  });

  it('should render done status', () => {
    render(<PreviewLoading status="done" />);
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render error status', () => {
    render(<PreviewLoading status="error" />);
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should show progress bar for loading states', () => {
    render(<PreviewLoading status="loading" />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('should show progress bar for compiling state', () => {
    render(<PreviewLoading status="compiling" />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('should show progress bar for rendering state', () => {
    render(<PreviewLoading status="rendering" />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('should not show progress bar for done state', () => {
    render(<PreviewLoading status="done" />);
    expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
  });

  it('should not show progress bar for error state', () => {
    render(<PreviewLoading status="error" />);
    expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
  });

  it('should display error message when provided', () => {
    render(<PreviewLoading status="error" errorMessage="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should display custom message', () => {
    render(<PreviewLoading message="Custom message" />);
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<PreviewLoading className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('usePreviewStatus hook', () => {
  it('should initialize with loading status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    expect(result.current.status).toBe('loading');
    expect(result.current.progress).toBe(0);
  });

  it('should start loading', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.startCompiling();
    });
    expect(result.current.status).toBe('compiling');
    
    act(() => {
      result.current.startLoading('Loading...');
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.progress).toBe(0);
    expect(result.current.message).toBe('Loading...');
  });

  it('should start compiling', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.startCompiling('Compiling...');
    });
    expect(result.current.status).toBe('compiling');
    expect(result.current.progress).toBe(25);
    expect(result.current.message).toBe('Compiling...');
  });

  it('should start rendering', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.startRendering('Rendering...');
    });
    expect(result.current.status).toBe('rendering');
    expect(result.current.progress).toBe(75);
  });

  it('should set done status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.setDone('Done!');
    });
    expect(result.current.status).toBe('done');
    expect(result.current.progress).toBe(100);
  });

  it('should set error status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.setError('Something went wrong');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('Something went wrong');
  });

  it('should update progress', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.updateProgress(50);
    });
    expect(result.current.progress).toBe(50);
  });

  it('should clamp progress to 0-100', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.updateProgress(150);
    });
    expect(result.current.progress).toBe(100);
    
    act(() => {
      result.current.updateProgress(-10);
    });
    expect(result.current.progress).toBe(0);
  });
});
