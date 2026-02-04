/**
 * Google OAuth 2.0 with PKCE for Google Drive sync
 * Uses the drive.appdata scope (non-sensitive, no review required)
 */

import { loggers } from '@/lib/logger';

const log = loggers.auth;

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// Scope: drive.appdata for app-specific hidden folder (non-sensitive)
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const GOOGLE_PROFILE_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';

// ============================================
// PKCE Utilities (reused pattern from oauth.ts)
// ============================================

function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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

// ============================================
// Types
// ============================================

export interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  picture?: string;
}

export interface GoogleOAuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}

// ============================================
// State Management
// ============================================

const GOOGLE_OAUTH_STATE_KEY = 'cognia-google-oauth-state';
const OAUTH_STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

export function saveGoogleOAuthState(oauthState: GoogleOAuthState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOOGLE_OAUTH_STATE_KEY, JSON.stringify(oauthState));
}

export function getGoogleOAuthState(): GoogleOAuthState | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
  if (!stored) return null;

  try {
    const state = JSON.parse(stored) as GoogleOAuthState;
    if (Date.now() - state.createdAt > OAUTH_STATE_EXPIRY) {
      clearGoogleOAuthState();
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearGoogleOAuthState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
}

// ============================================
// OAuth Flow Functions
// ============================================

/**
 * Build Google OAuth authorization URL with PKCE
 */
export async function buildGoogleAuthUrl(config: GoogleOAuthConfig): Promise<{
  url: string;
  codeVerifier: string;
  state: string;
}> {
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const oauthState: GoogleOAuthState = {
    state,
    codeVerifier,
    redirectUri: config.redirectUri,
    createdAt: Date.now(),
  };

  saveGoogleOAuthState(oauthState);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: `${GOOGLE_DRIVE_SCOPE} ${GOOGLE_PROFILE_SCOPE}`,
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Always show consent screen to get refresh token
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  log.info('Built Google OAuth URL', { clientId: config.clientId });

  return { url, codeVerifier, state };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
  config: GoogleOAuthConfig
): Promise<GoogleTokenResponse> {
  log.info('Exchanging Google authorization code for tokens');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    log.error('Failed to exchange Google code', new Error(error));
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokens = (await response.json()) as GoogleTokenResponse;

  log.info('Successfully exchanged Google code for tokens');

  return tokens;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshGoogleToken(
  refreshToken: string,
  clientId: string
): Promise<GoogleTokenResponse> {
  log.info('Refreshing Google access token');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    log.error('Failed to refresh Google token', new Error(error));
    throw new Error(`Token refresh failed: ${error}`);
  }

  const tokens = (await response.json()) as GoogleTokenResponse;

  log.info('Successfully refreshed Google access token');

  return tokens;
}

/**
 * Revoke Google token
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  log.info('Revoking Google token');

  const response = await fetch(`${GOOGLE_REVOKE_URL}?token=${token}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();
    log.warn('Failed to revoke Google token', { error });
  } else {
    log.info('Successfully revoked Google token');
  }
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    log.error('Failed to get Google user info', new Error(error));
    throw new Error(`Failed to get user info: ${error}`);
  }

  return (await response.json()) as GoogleUserInfo;
}

/**
 * Verify OAuth state matches
 */
export function verifyGoogleOAuthState(returnedState: string): GoogleOAuthState | null {
  const storedState = getGoogleOAuthState();
  if (!storedState || storedState.state !== returnedState) {
    log.warn('Google OAuth state mismatch');
    return null;
  }
  return storedState;
}

/**
 * Check if token is expired or expiring soon (within 5 minutes)
 */
export function isTokenExpiringSoon(expiresAt: number): boolean {
  const buffer = 5 * 60 * 1000; // 5 minutes
  return Date.now() >= expiresAt - buffer;
}

/**
 * Calculate token expiry timestamp from expires_in seconds
 */
export function calculateTokenExpiry(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}
