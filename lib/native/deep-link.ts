/**
 * Deep Link Service - Handle custom URL schemes (cognia://)
 * Wraps @tauri-apps/plugin-deep-link for Tauri desktop environment
 */

import { isTauri } from './utils';

export interface DeepLinkResult {
  success: boolean;
  urls?: string[];
  error?: string;
}

export interface ParsedDeepLink {
  scheme: string;
  action: string;
  params: Record<string, string>;
  raw: string;
}

/**
 * Get the deep link URLs that triggered the app launch
 * Returns null if the app was not started via a deep link
 */
export async function getCurrentDeepLinks(): Promise<DeepLinkResult> {
  if (!isTauri()) {
    return {
      success: false,
      error: 'Deep links require Tauri desktop environment',
    };
  }

  try {
    const { getCurrent } = await import('@tauri-apps/plugin-deep-link');
    const urls = await getCurrent();
    return {
      success: true,
      urls: urls ?? [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get current deep links',
    };
  }
}

/**
 * Listen for deep link open events
 * @param callback - Function called when a deep link opens the app
 * @returns Unsubscribe function
 */
export async function onDeepLinkOpen(
  callback: (urls: string[]) => void
): Promise<(() => void) | null> {
  if (!isTauri()) {
    return null;
  }

  try {
    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
    const unlisten = await onOpenUrl((urls) => {
      callback(urls);
    });
    return unlisten;
  } catch (error) {
    console.error('Failed to register deep link listener:', error);
    return null;
  }
}

/**
 * Register a custom URL scheme at runtime (Windows/Linux only)
 * On macOS, schemes must be registered in the app bundle
 * @param scheme - The URL scheme to register (e.g., 'cognia')
 */
export async function registerScheme(scheme: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isTauri()) {
    return {
      success: false,
      error: 'Deep links require Tauri desktop environment',
    };
  }

  try {
    const { register } = await import('@tauri-apps/plugin-deep-link');
    await register(scheme);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register scheme',
    };
  }
}

/**
 * Check if a URL scheme is registered
 * @param scheme - The URL scheme to check
 */
export async function isSchemeRegistered(scheme: string): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    const { isRegistered } = await import('@tauri-apps/plugin-deep-link');
    return await isRegistered(scheme);
  } catch {
    return false;
  }
}

/**
 * Parse a deep link URL into its components
 * Expected format: cognia://action?param1=value1&param2=value2
 * 
 * Example deep links:
 * - cognia://chat/new?prompt=Hello
 * - cognia://chat/open?id=abc123
 * - cognia://file/open?path=/path/to/file
 * - cognia://settings/open?section=provider
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(':', '');
    const action = parsed.hostname + parsed.pathname;
    const params: Record<string, string> = {};
    
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      scheme,
      action,
      params,
      raw: url,
    };
  } catch {
    return null;
  }
}

/**
 * Create a deep link URL
 * @param action - The action path (e.g., 'chat/new', 'file/open')
 * @param params - Optional query parameters
 * @param scheme - The URL scheme (defaults to 'cognia')
 */
export function createDeepLink(
  action: string,
  params?: Record<string, string>,
  scheme = 'cognia'
): string {
  const url = new URL(`${scheme}://${action}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

/**
 * Deep link action handlers registry
 */
type DeepLinkHandler = (params: Record<string, string>) => void | Promise<void>;
const handlers = new Map<string, DeepLinkHandler>();

/**
 * Register a handler for a specific deep link action
 */
export function registerHandler(action: string, handler: DeepLinkHandler): void {
  handlers.set(action, handler);
}

/**
 * Unregister a handler for a specific deep link action
 */
export function unregisterHandler(action: string): void {
  handlers.delete(action);
}

/**
 * Handle a deep link URL by routing it to the appropriate handler
 */
export async function handleDeepLink(url: string): Promise<boolean> {
  const parsed = parseDeepLink(url);
  if (!parsed) {
    console.warn('Invalid deep link URL:', url);
    return false;
  }

  const handler = handlers.get(parsed.action);
  if (handler) {
    await handler(parsed.params);
    return true;
  }

  console.warn('No handler registered for deep link action:', parsed.action);
  return false;
}

/**
 * Initialize deep link handling
 * Sets up listeners and processes any startup deep links
 */
export async function initializeDeepLinks(
  onDeepLink?: (parsed: ParsedDeepLink) => void
): Promise<void> {
  if (!isTauri()) {
    return;
  }

  // Check for startup deep links
  const startupLinks = await getCurrentDeepLinks();
  if (startupLinks.success && startupLinks.urls && startupLinks.urls.length > 0) {
    for (const url of startupLinks.urls) {
      const parsed = parseDeepLink(url);
      if (parsed) {
        if (onDeepLink) {
          onDeepLink(parsed);
        }
        await handleDeepLink(url);
      }
    }
  }

  // Listen for runtime deep links
  await onDeepLinkOpen(async (urls) => {
    for (const url of urls) {
      const parsed = parseDeepLink(url);
      if (parsed) {
        if (onDeepLink) {
          onDeepLink(parsed);
        }
        await handleDeepLink(url);
      }
    }
  });
}
