import { renderHook, waitFor, act } from '@testing-library/react';
import { useLinkMetadata, clearMetadataCache, getCachedMetadata } from './use-link-metadata';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock DOMParser
const mockParseFromString = jest.fn();
global.DOMParser = jest.fn().mockImplementation(() => ({
  parseFromString: mockParseFromString,
})) as unknown as typeof DOMParser;

describe('useLinkMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMetadataCache();

    // Default mock DOM response
    mockParseFromString.mockReturnValue({
      querySelector: (selector: string) => {
        if (selector === 'title') {
          return { textContent: 'Test Page Title' };
        }
        if (selector.includes('og:title')) {
          return { getAttribute: () => 'OG Title' };
        }
        if (selector.includes('og:description')) {
          return { getAttribute: () => 'OG Description' };
        }
        if (selector.includes('og:image')) {
          return { getAttribute: () => 'https://example.com/image.jpg' };
        }
        if (selector.includes('og:site_name')) {
          return { getAttribute: () => 'Example Site' };
        }
        return null;
      },
    });
  });

  it('returns null metadata when URL is empty', () => {
    const { result } = renderHook(() => useLinkMetadata(''));

    expect(result.current.metadata).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error for invalid URL', async () => {
    const { result } = renderHook(() => useLinkMetadata('not-a-valid-url'));

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid URL');
    });
  });

  it('fetches metadata successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><head><title>Test</title></head></html>'),
    });

    const { result } = renderHook(() => useLinkMetadata('https://example.com'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metadata).toBeDefined();
    expect(result.current.metadata?.url).toBe('https://example.com');
    expect(result.current.metadata?.favicon).toContain('google.com/s2/favicons');
  });

  it('uses cached metadata on subsequent calls', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><title>Test</title></html>'),
    });

    const { result, rerender } = renderHook(() => useLinkMetadata('https://example.com'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // First fetch should be called
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Rerender to trigger another fetch attempt
    rerender();

    // Should use cache, no additional fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns basic metadata on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useLinkMetadata('https://example.com'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metadata).toBeDefined();
    expect(result.current.metadata?.url).toBe('https://example.com');
    expect(result.current.metadata?.favicon).toContain('google.com/s2/favicons');
  });

  it('skips fetching when enabled is false', () => {
    const { result } = renderHook(() =>
      useLinkMetadata('https://example.com', { enabled: false })
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.metadata).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('uses initialMetadata when provided', () => {
    const initialMetadata = {
      url: 'https://example.com',
      title: 'Initial Title',
      description: 'Initial Description',
    };

    const { result } = renderHook(() =>
      useLinkMetadata('https://example.com', { initialMetadata })
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.metadata).toEqual(initialMetadata);
  });

  it('provides refetch function', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><title>Test</title></html>'),
    });

    const { result } = renderHook(() =>
      useLinkMetadata('https://example.com', { enabled: false })
    );

    expect(result.current.metadata).toBeNull();

    // Manually trigger fetch
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.metadata).toBeDefined();
    });
  });
});

describe('clearMetadataCache', () => {
  it('clears all cached metadata', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><title>Test</title></html>'),
    });

    const { result } = renderHook(() => useLinkMetadata('https://example.com'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getCachedMetadata('https://example.com')).toBeDefined();

    clearMetadataCache();

    expect(getCachedMetadata('https://example.com')).toBeUndefined();
  });
});

describe('getCachedMetadata', () => {
  it('returns undefined for uncached URLs', () => {
    expect(getCachedMetadata('https://uncached.com')).toBeUndefined();
  });

  it('returns cached metadata when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><title>Cached Test</title></html>'),
    });

    const { result } = renderHook(() => useLinkMetadata('https://cached-test.com'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const cached = getCachedMetadata('https://cached-test.com');
    expect(cached).toBeDefined();
    expect(cached?.url).toBe('https://cached-test.com');
  });
});
