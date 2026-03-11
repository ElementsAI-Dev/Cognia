/**
 * Convex endpoint utilities.
 *
 * Users often paste a deployment URL (commonly *.convex.cloud), while HTTP
 * actions are served from the HTTP actions host form (*.convex.site). These
 * helpers normalize input into a canonical HTTP base URL for sync routes.
 */

const CONVEX_CLOUD_SUFFIX = '.convex.cloud';
const CONVEX_SITE_SUFFIX = '.convex.site';

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export function isConvexDeploymentHost(hostname: string): boolean {
  return hostname.endsWith(CONVEX_CLOUD_SUFFIX) || hostname.endsWith(CONVEX_SITE_SUFFIX);
}

export function toConvexHttpActionsHost(hostname: string): string {
  if (hostname.endsWith(CONVEX_CLOUD_SUFFIX)) {
    return `${hostname.slice(0, -CONVEX_CLOUD_SUFFIX.length)}${CONVEX_SITE_SUFFIX}`;
  }
  return hostname;
}

export function normalizeConvexDeploymentUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value) return '';

  const parsed = new URL(value);
  parsed.pathname = '';
  parsed.search = '';
  parsed.hash = '';
  return stripTrailingSlashes(parsed.toString());
}

export function resolveConvexHttpBaseUrl(rawUrl: string): string {
  const normalized = normalizeConvexDeploymentUrl(rawUrl);
  if (!normalized) return '';

  const parsed = new URL(normalized);
  parsed.hostname = toConvexHttpActionsHost(parsed.hostname);
  parsed.pathname = '';
  parsed.search = '';
  parsed.hash = '';
  return stripTrailingSlashes(parsed.toString());
}

/**
 * Returns a user-facing validation error, or null when valid.
 */
export function validateConvexDeploymentUrl(rawUrl: string): string | null {
  const value = rawUrl.trim();
  if (!value) {
    return 'Convex deployment URL is required';
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'Convex deployment URL is invalid';
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'Convex deployment URL must use http(s)';
  }

  if (!isConvexDeploymentHost(parsed.hostname)) {
    return 'Convex deployment URL must use a .convex.cloud or .convex.site host';
  }

  return null;
}

