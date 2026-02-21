/**
 * Background URL Safety Utilities
 *
 * Enforces strict protocol and content checks for external background sources.
 */

export interface SanitizedBackgroundUrlResult {
  valid: boolean;
  normalized?: string;
  reason?: string;
}

const ALLOWED_PROTOCOLS = new Set(['https:', 'blob:', 'asset:', 'tauri:', 'data:']);
const BASE64_IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i;
const SVG_DATA_URL_RE = /^data:image\/svg\+xml/i;

function hasSvgFileExtension(pathname: string): boolean {
  const lowerPath = pathname.toLowerCase();
  return lowerPath.endsWith('.svg') || lowerPath.includes('.svg?') || lowerPath.includes('.svg#');
}

export function sanitizeBackgroundUrl(rawUrl: string): SanitizedBackgroundUrlResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Background URL is empty' };
  }

  if (trimmed.startsWith('data:')) {
    if (SVG_DATA_URL_RE.test(trimmed)) {
      return { valid: false, reason: 'SVG data URLs are not allowed for backgrounds' };
    }
    if (!BASE64_IMAGE_DATA_URL_RE.test(trimmed)) {
      return {
        valid: false,
        reason: 'Only base64 data:image URLs with png/jpeg/webp/gif are allowed',
      };
    }
    return { valid: true, normalized: trimmed };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Background URL is not a valid absolute URL' };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      valid: false,
      reason: `URL protocol "${parsed.protocol}" is not allowed for backgrounds`,
    };
  }

  if (parsed.protocol === 'https:' && hasSvgFileExtension(parsed.pathname)) {
    return { valid: false, reason: 'Remote SVG backgrounds are not allowed' };
  }

  return { valid: true, normalized: parsed.toString() };
}
