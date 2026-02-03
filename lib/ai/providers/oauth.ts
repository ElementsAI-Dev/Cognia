/**
 * OAuth utilities for AI provider authentication
 * Supports PKCE flow for providers like OpenRouter
 */

import { nanoid } from 'nanoid';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

// PKCE Challenge Generation
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// OAuth State Management
export interface OAuthState {
  state: string;
  codeVerifier: string;
  providerId: string;
  redirectUri: string;
  createdAt: number;
}

const OAUTH_STATE_KEY = 'cognia-oauth-state';
const OAUTH_STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

export function saveOAuthState(oauthState: OAuthState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(oauthState));
}

export function getOAuthState(): OAuthState | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(OAUTH_STATE_KEY);
  if (!stored) return null;
  
  try {
    const state = JSON.parse(stored) as OAuthState;
    // Check expiry
    if (Date.now() - state.createdAt > OAUTH_STATE_EXPIRY) {
      clearOAuthState();
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearOAuthState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OAUTH_STATE_KEY);
}

// Provider-specific OAuth configurations
export interface ProviderOAuthConfig {
  providerId: string;
  authorizationUrl: string;
  tokenUrl?: string;
  clientId?: string;
  scope?: string;
  pkceRequired?: boolean;
  responseType?: string;
  extraParams?: Record<string, string>;
}

export const OAUTH_PROVIDERS: Record<string, ProviderOAuthConfig> = {
  openrouter: {
    providerId: 'openrouter',
    authorizationUrl: 'https://openrouter.ai/auth',
    pkceRequired: true,
    responseType: 'code',
    extraParams: {
      callback_url: typeof window !== 'undefined' 
        ? `${window.location.origin}/api/oauth/openrouter/callback`
        : '',
    },
  },
};

// Build OAuth Authorization URL
export async function buildOAuthUrl(providerId: string): Promise<{
  url: string;
  state: OAuthState;
} | null> {
  const config = OAUTH_PROVIDERS[providerId];
  if (!config) return null;

  const state = nanoid(32);
  const codeVerifier = generateCodeVerifier();
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/oauth/${providerId}/callback`
    : '';

  const oauthState: OAuthState = {
    state,
    codeVerifier,
    providerId,
    redirectUri,
    createdAt: Date.now(),
  };

  saveOAuthState(oauthState);

  const params = new URLSearchParams();
  
  // OpenRouter specific - uses callback_url parameter
  if (providerId === 'openrouter') {
    params.set('callback_url', redirectUri);
  }

  // Add PKCE code challenge if required
  if (config.pkceRequired) {
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  // Add extra params
  if (config.extraParams) {
    Object.entries(config.extraParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }

  const url = `${config.authorizationUrl}?${params.toString()}`;
  return { url, state: oauthState };
}

// Exchange authorization code for API key
export async function exchangeCodeForApiKey(
  providerId: string,
  code: string
): Promise<{ apiKey: string; expiresAt?: number } | null> {
  try {
    const response = await fetch(`/api/oauth/${providerId}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to exchange code for API key');
    }

    const data = await response.json();
    return {
      apiKey: data.apiKey || data.key,
      expiresAt: data.expiresAt,
    };
  } catch (error) {
    log.error('OAuth exchange failed', error as Error);
    return null;
  }
}

// Verify OAuth state matches
export function verifyOAuthState(returnedState: string): OAuthState | null {
  const storedState = getOAuthState();
  if (!storedState || storedState.state !== returnedState) {
    return null;
  }
  return storedState;
}

// Token expiration constants
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const TOKEN_EXPIRY_STORAGE_KEY = 'cognia-oauth-token-expiry';

// Token expiration storage
interface TokenExpiryInfo {
  providerId: string;
  expiresAt: number;
  refreshToken?: string;
}

export function saveTokenExpiry(providerId: string, expiresAt: number, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  const key = `${TOKEN_EXPIRY_STORAGE_KEY}-${providerId}`;
  const info: TokenExpiryInfo = { providerId, expiresAt, refreshToken };
  localStorage.setItem(key, JSON.stringify(info));
}

export function getTokenExpiry(providerId: string): TokenExpiryInfo | null {
  if (typeof window === 'undefined') return null;
  const key = `${TOKEN_EXPIRY_STORAGE_KEY}-${providerId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as TokenExpiryInfo;
  } catch {
    return null;
  }
}

export function clearTokenExpiry(providerId: string): void {
  if (typeof window === 'undefined') return;
  const key = `${TOKEN_EXPIRY_STORAGE_KEY}-${providerId}`;
  localStorage.removeItem(key);
}

// Check if token needs refresh
export function isTokenExpiringSoon(providerId: string): boolean {
  const expiryInfo = getTokenExpiry(providerId);
  if (!expiryInfo || !expiryInfo.expiresAt) return false;
  
  const now = Date.now();
  const expiresAt = expiryInfo.expiresAt;
  
  // Token expires within the buffer period
  return expiresAt - now <= TOKEN_REFRESH_BUFFER;
}

// Check if token is expired
export function isTokenExpired(providerId: string): boolean {
  const expiryInfo = getTokenExpiry(providerId);
  if (!expiryInfo || !expiryInfo.expiresAt) return false;
  
  return Date.now() >= expiryInfo.expiresAt;
}

// Get time until token expiry in milliseconds
export function getTokenTimeToExpiry(providerId: string): number | null {
  const expiryInfo = getTokenExpiry(providerId);
  if (!expiryInfo || !expiryInfo.expiresAt) return null;
  
  const remaining = expiryInfo.expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

// Refresh OAuth token (for providers that support refresh tokens)
export async function refreshOAuthToken(
  providerId: string
): Promise<{ apiKey: string; expiresAt?: number } | null> {
  const expiryInfo = getTokenExpiry(providerId);
  if (!expiryInfo?.refreshToken) {
    log.warn('No refresh token available for provider', { providerId });
    return null;
  }
  
  try {
    const response = await fetch(`/api/oauth/${providerId}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: expiryInfo.refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to refresh token');
    }

    const data = await response.json();
    
    // Update stored expiry info
    if (data.expiresAt) {
      saveTokenExpiry(providerId, data.expiresAt, data.refreshToken || expiryInfo.refreshToken);
    }
    
    return {
      apiKey: data.apiKey || data.key,
      expiresAt: data.expiresAt,
    };
  } catch (error) {
    log.error('OAuth token refresh failed', error as Error);
    return null;
  }
}

// Auto-refresh handler - call this periodically or before API requests
export async function ensureValidToken(
  providerId: string,
  onRefresh?: (newApiKey: string) => void
): Promise<boolean> {
  // Check if token is expiring soon
  if (!isTokenExpiringSoon(providerId)) {
    return true; // Token is still valid
  }
  
  // Token is expired or expiring soon, try to refresh
  if (isTokenExpired(providerId)) {
    log.info('Token expired, attempting refresh', { providerId });
  } else {
    log.info('Token expiring soon, proactively refreshing', { providerId });
  }
  
  const result = await refreshOAuthToken(providerId);
  if (result) {
    log.info('Token refreshed successfully', { providerId });
    onRefresh?.(result.apiKey);
    return true;
  }
  
  log.warn('Token refresh failed', { providerId });
  return false;
}
