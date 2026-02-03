/**
 * useLinkMetadata - Hook for fetching Open Graph metadata from URLs
 * Features:
 * - Fetches title, description, image, favicon
 * - Caches results to avoid redundant requests
 * - Handles errors gracefully
 * - Supports timeout
 */

import { useState, useEffect, useCallback } from 'react';

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  url: string;
}

interface UseLinkMetadataOptions {
  /** Enable automatic fetching on mount */
  enabled?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Initial metadata (skip fetching if provided) */
  initialMetadata?: LinkMetadata;
}

interface UseLinkMetadataResult {
  metadata: LinkMetadata | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// In-memory cache for metadata
const metadataCache = new Map<string, LinkMetadata>();

/**
 * Extract domain from URL
 */
function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

/**
 * Get favicon URL for a domain
 */
function getFaviconUrl(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/**
 * Parse HTML for Open Graph metadata
 */
function parseOgMetadata(html: string, url: string): LinkMetadata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const getMetaContent = (property: string): string | undefined => {
    const meta = doc.querySelector(
      `meta[property="${property}"], meta[name="${property}"]`
    );
    return meta?.getAttribute('content') || undefined;
  };

  return {
    title:
      getMetaContent('og:title') ||
      doc.querySelector('title')?.textContent ||
      undefined,
    description:
      getMetaContent('og:description') ||
      getMetaContent('description') ||
      undefined,
    image: getMetaContent('og:image') || undefined,
    siteName: getMetaContent('og:site_name') || undefined,
    favicon: getFaviconUrl(url),
    url,
  };
}

/**
 * Fetch metadata from a URL
 */
async function fetchMetadata(
  url: string,
  timeout: number
): Promise<LinkMetadata> {
  // Check cache first
  const cached = metadataCache.get(url);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Use a CORS proxy or direct fetch (may fail due to CORS)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const metadata = parseOgMetadata(html, url);

    // Cache the result
    metadataCache.set(url, metadata);

    return metadata;
  } catch {
    // If fetch fails (e.g., CORS), return basic metadata
    const basicMetadata: LinkMetadata = {
      url,
      favicon: getFaviconUrl(url),
    };

    // Cache even basic metadata to avoid repeated failures
    metadataCache.set(url, basicMetadata);

    return basicMetadata;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Hook for fetching link metadata
 */
export function useLinkMetadata(
  url: string,
  options: UseLinkMetadataOptions = {}
): UseLinkMetadataResult {
  const { enabled = true, timeout = 5000, initialMetadata } = options;

  const [metadata, setMetadata] = useState<LinkMetadata | null>(
    initialMetadata || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setMetadata(null);
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      setError('Invalid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMetadata(url, timeout);
      setMetadata(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
      // Still set basic metadata on error
      setMetadata({
        url,
        favicon: getFaviconUrl(url),
      });
    } finally {
      setIsLoading(false);
    }
  }, [url, timeout]);

  useEffect(() => {
    if (enabled && !initialMetadata) {
      fetchData();
    }
  }, [enabled, initialMetadata, fetchData]);

  return {
    metadata,
    isLoading,
    error,
    refetch: fetchData,
  };
}

/**
 * Clear the metadata cache
 */
export function clearMetadataCache(): void {
  metadataCache.clear();
}

/**
 * Get cached metadata without fetching
 */
export function getCachedMetadata(url: string): LinkMetadata | undefined {
  return metadataCache.get(url);
}

export default useLinkMetadata;
