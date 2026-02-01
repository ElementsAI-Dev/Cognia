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
