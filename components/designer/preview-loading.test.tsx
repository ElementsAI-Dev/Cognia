/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { PreviewLoading, usePreviewStatus } from './preview-loading';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PreviewLoading', () => {
  describe('default variant', () => {
    it('should render loading status by default', () => {
      render(<PreviewLoading />);
      expect(screen.getByText('loading')).toBeInTheDocument();
    });

    it('should render loading icon', () => {
      render(<PreviewLoading status="loading" />);
      // Check that an animated icon is present
      const icon = document.querySelector('svg.animate-spin');
      expect(icon).toBeInTheDocument();
    });

    it('should render compiling status', () => {
      render(<PreviewLoading status="compiling" />);
      expect(screen.getByText('compiling')).toBeInTheDocument();
    });

    it('should render compiling icon', () => {
      render(<PreviewLoading status="compiling" />);
      // Check that an SVG icon is present
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render bundling status', () => {
      render(<PreviewLoading status="bundling" />);
      expect(screen.getByText('bundling')).toBeInTheDocument();
    });

    it('should render bundling icon', () => {
      render(<PreviewLoading status="bundling" />);
      const icon = document.querySelector('svg.lucide-box');
      expect(icon).toBeInTheDocument();
    });

    it('should render ready status', () => {
      render(<PreviewLoading status="ready" />);
      expect(screen.getByText('ready')).toBeInTheDocument();
    });

    it('should render ready icon', () => {
      render(<PreviewLoading status="ready" />);
      const icon = document.querySelector('svg.lucide-refresh-cw');
      expect(icon).toBeInTheDocument();
    });

    it('should render error status', () => {
      render(<PreviewLoading status="error" />);
      expect(screen.getByText('error')).toBeInTheDocument();
    });

    it('should render error icon', () => {
      render(<PreviewLoading status="error" />);
      const icon = document.querySelector('svg.lucide-refresh-cw');
      expect(icon).toBeInTheDocument();
    });

    it('should show description for loading status', () => {
      render(<PreviewLoading status="loading" />);
      expect(screen.getByText('loadingDesc')).toBeInTheDocument();
    });

    it('should show description for compiling status', () => {
      render(<PreviewLoading status="compiling" />);
      expect(screen.getByText('compilingDesc')).toBeInTheDocument();
    });

    it('should show description for bundling status', () => {
      render(<PreviewLoading status="bundling" />);
      expect(screen.getByText('bundlingDesc')).toBeInTheDocument();
    });

    it('should show description for ready status', () => {
      render(<PreviewLoading status="ready" />);
      expect(screen.getByText('readyDesc')).toBeInTheDocument();
    });

    it('should show description for error status', () => {
      render(<PreviewLoading status="error" />);
      expect(screen.getByText('errorDesc')).toBeInTheDocument();
    });

    it('should show progress bar for loading states', () => {
      const { container } = render(<PreviewLoading status="loading" />);
      const progressBar = container.querySelector('.bg-primary.rounded-full');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not show progress bar for ready state', () => {
      const { container } = render(<PreviewLoading status="ready" />);
      const progressBar = container.querySelector('.w-48.h-1');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('should not show progress bar for error state', () => {
      const { container } = render(<PreviewLoading status="error" />);
      const progressBar = container.querySelector('.w-48.h-1');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<PreviewLoading className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('skeleton variant', () => {
    it('should render skeleton layout', () => {
      const { container } = render(<PreviewLoading variant="skeleton" />);
      expect(container.firstChild).toHaveClass('animate-pulse');
    });

    it('should render header skeleton elements', () => {
      const { container } = render(<PreviewLoading variant="skeleton" />);
      const skeletonElements = container.querySelectorAll('.bg-muted');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<PreviewLoading variant="skeleton" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('minimal variant', () => {
    it('should render minimal loader', () => {
      render(<PreviewLoading variant="minimal" />);
      // Check that an SVG icon is present
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should not render status text in minimal variant', () => {
      render(<PreviewLoading variant="minimal" />);
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<PreviewLoading variant="minimal" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('usePreviewStatus hook', () => {
  it('should initialize with loading status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    expect(result.current.status).toBe('loading');
  });

  it('should set loading status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.setCompiling();
    });
    expect(result.current.status).toBe('compiling');
    
    act(() => {
      result.current.setLoading();
    });
    expect(result.current.status).toBe('loading');
  });

  it('should set compiling status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.setCompiling();
    });
    expect(result.current.status).toBe('compiling');
  });

  it('should set bundling status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.setBundling();
    });
    expect(result.current.status).toBe('bundling');
  });

  it('should set ready status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.setReady();
    });
    expect(result.current.status).toBe('ready');
  });

  it('should set error status', () => {
    const { result } = renderHook(() => usePreviewStatus());
    
    act(() => {
      result.current.setError();
    });
    expect(result.current.status).toBe('error');
  });
});
