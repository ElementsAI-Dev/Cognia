/**
 * Tests for useMermaid hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import mermaid from 'mermaid';
import { useMermaid } from './use-mermaid';

// Mock mermaid
jest.mock('mermaid', () => ({
  default: {
    initialize: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg>test</svg>' }),
  },
}));

const mockedMermaid = mermaid as jest.Mocked<typeof mermaid>;

describe('useMermaid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document.documentElement.classList.contains
    jest.spyOn(document.documentElement.classList, 'contains').mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMermaid(undefined, { autoRender: false }));

    expect(result.current.svg).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should auto-render initial code when autoRender is true', async () => {
    const { result } = renderHook(() =>
      useMermaid('graph TD\nA-->B', { autoRender: true })
    );

    await waitFor(() => {
      expect(result.current.svg).toBe('<svg>test</svg>');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should not auto-render when autoRender is false', async () => {
    const { result } = renderHook(() =>
      useMermaid('graph TD\nA-->B', { autoRender: false })
    );

    // Wait a bit to ensure no auto-render
    await new Promise((r) => setTimeout(r, 100));

    expect(result.current.svg).toBe('');
    expect(result.current.isLoading).toBe(false);
  });

  it('should render on demand', async () => {
    const { result } = renderHook(() => useMermaid(undefined, { autoRender: false }));

    act(() => {
      result.current.render('graph TD\nA-->B');
    });

    await waitFor(() => {
      expect(result.current.svg).toBe('<svg>test</svg>');
    });
  });

  it('should handle empty code', async () => {
    const { result } = renderHook(() => useMermaid(undefined, { autoRender: false }));

    act(() => {
      result.current.render('');
    });

    await waitFor(() => {
      expect(result.current.svg).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle render errors', async () => {
    (mockedMermaid.render as jest.Mock).mockRejectedValueOnce(new Error('Parse error'));

    const { result } = renderHook(() =>
      useMermaid('invalid code', { autoRender: true })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Parse error');
    });

    expect(result.current.svg).toBe('');
    expect(result.current.isLoading).toBe(false);
  });

  it('should reset state', async () => {
    const { result } = renderHook(() =>
      useMermaid('graph TD\nA-->B', { autoRender: true })
    );

    await waitFor(() => {
      expect(result.current.svg).toBe('<svg>test</svg>');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.svg).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should use dark theme when document has dark class', async () => {
    jest.spyOn(document.documentElement.classList, 'contains').mockReturnValue(true);

    renderHook(() => useMermaid('graph TD\nA-->B', { autoRender: true }));

    await waitFor(() => {
      expect(mockedMermaid.initialize).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'dark' })
      );
    });
  });

  it('should debounce render calls', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useMermaid(undefined, { autoRender: false, debounceMs: 300 })
    );

    // Call render multiple times rapidly
    act(() => {
      result.current.render('graph 1');
      result.current.render('graph 2');
      result.current.render('graph 3');
    });

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      // Should only render the last one
      expect(mockedMermaid.render).toHaveBeenCalledTimes(1);
      expect(mockedMermaid.render).toHaveBeenCalledWith(
        expect.any(String),
        'graph 3'
      );
    });

    jest.useRealTimers();
  });
});
