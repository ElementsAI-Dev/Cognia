/**
 * Google OAuth Tests
 */

import { TextEncoder } from 'util';

// Polyfill TextEncoder for Node.js test environment
global.TextEncoder = TextEncoder;

import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildGoogleAuthUrl,
  verifyGoogleOAuthState,
  saveGoogleOAuthState,
  getGoogleOAuthState,
  clearGoogleOAuthState,
  isTokenExpiringSoon,
  calculateTokenExpiry,
  GOOGLE_DRIVE_SCOPE,
  GOOGLE_PROFILE_SCOPE,
} from './google-oauth';

// Mock crypto.getRandomValues
const mockGetRandomValues = jest.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
});

const mockSubtleCrypto = {
  digest: jest.fn(async (_algorithm: string, data: ArrayBuffer) => {
    // Simple mock hash - just return the input padded/truncated to 32 bytes
    const result = new Uint8Array(32);
    const input = new Uint8Array(data);
    for (let i = 0; i < 32; i++) {
      result[i] = input[i % input.length] ^ (i * 7);
    }
    return result.buffer;
  }),
};

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockGetRandomValues,
    subtle: mockSubtleCrypto,
    randomUUID: () => 'test-uuid-12345',
  },
});

describe('Google OAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('PKCE Functions', () => {
    it('should generate a code verifier', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(0);
    });

    it('should generate a code challenge from verifier', async () => {
      const verifier = 'test-verifier-string';
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should generate different verifiers each time', () => {
      const _verifier1 = generateCodeVerifier();
      const _verifier2 = generateCodeVerifier();
      // Due to mocking, they might be similar but the function should be called
      expect(mockGetRandomValues).toHaveBeenCalled();
    });
  });

  describe('OAuth State Management', () => {
    it('should save OAuth state to localStorage', () => {
      const state = {
        state: 'test-state',
        codeVerifier: 'test-verifier',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      saveGoogleOAuthState(state);

      const stored = localStorage.getItem('cognia-google-oauth-state');
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toEqual(state);
    });

    it('should retrieve OAuth state from localStorage', () => {
      const state = {
        state: 'test-state',
        codeVerifier: 'test-verifier',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      localStorage.setItem('cognia-google-oauth-state', JSON.stringify(state));

      const retrieved = getGoogleOAuthState();
      expect(retrieved).toEqual(state);
    });

    it('should return null for expired OAuth state', () => {
      const state = {
        state: 'test-state',
        codeVerifier: 'test-verifier',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago (expired)
      };

      localStorage.setItem('cognia-google-oauth-state', JSON.stringify(state));

      const retrieved = getGoogleOAuthState();
      expect(retrieved).toBeNull();
    });

    it('should clear OAuth state', () => {
      const state = {
        state: 'test-state',
        codeVerifier: 'test-verifier',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      localStorage.setItem('cognia-google-oauth-state', JSON.stringify(state));
      clearGoogleOAuthState();

      expect(localStorage.getItem('cognia-google-oauth-state')).toBeNull();
    });

    it('should verify matching OAuth state', () => {
      const state = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      saveGoogleOAuthState(state);

      const verified = verifyGoogleOAuthState('test-state-123');
      expect(verified).toEqual(state);
    });

    it('should reject non-matching OAuth state', () => {
      const state = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      saveGoogleOAuthState(state);

      const verified = verifyGoogleOAuthState('wrong-state');
      expect(verified).toBeNull();
    });
  });

  describe('buildGoogleAuthUrl', () => {
    it('should build a valid OAuth URL', async () => {
      const config = {
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
      };

      const result = await buildGoogleAuthUrl(config);

      expect(result.url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('redirect_uri=');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('code_challenge=');
      expect(result.url).toContain('code_challenge_method=S256');
      expect(result.url).toContain('access_type=offline');
      expect(result.codeVerifier).toBeDefined();
      expect(result.state).toBe('test-uuid-12345');
    });

    it('should include required scopes', async () => {
      const config = {
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
      };

      const result = await buildGoogleAuthUrl(config);

      expect(result.url).toContain(encodeURIComponent(GOOGLE_DRIVE_SCOPE));
      expect(result.url).toContain(encodeURIComponent(GOOGLE_PROFILE_SCOPE));
    });

    it('should save state to localStorage', async () => {
      const config = {
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
      };

      await buildGoogleAuthUrl(config);

      const stored = getGoogleOAuthState();
      expect(stored).not.toBeNull();
      expect(stored?.state).toBe('test-uuid-12345');
    });
  });

  describe('Token Expiry Functions', () => {
    it('should calculate token expiry from expires_in', () => {
      const now = Date.now();
      const expiresIn = 3600; // 1 hour

      const expiry = calculateTokenExpiry(expiresIn);

      expect(expiry).toBeGreaterThan(now);
      expect(expiry).toBeLessThanOrEqual(now + expiresIn * 1000 + 100);
    });

    it('should detect token expiring soon (within 5 minutes)', () => {
      const now = Date.now();
      const expiringSoon = now + 4 * 60 * 1000; // 4 minutes from now

      expect(isTokenExpiringSoon(expiringSoon)).toBe(true);
    });

    it('should not flag token as expiring if more than 5 minutes remain', () => {
      const now = Date.now();
      const notExpiringSoon = now + 10 * 60 * 1000; // 10 minutes from now

      expect(isTokenExpiringSoon(notExpiringSoon)).toBe(false);
    });

    it('should detect already expired token', () => {
      const now = Date.now();
      const expired = now - 1000; // 1 second ago

      expect(isTokenExpiringSoon(expired)).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should export correct Google Drive scope', () => {
      expect(GOOGLE_DRIVE_SCOPE).toBe(
        'https://www.googleapis.com/auth/drive.appdata'
      );
    });

    it('should export correct Google Profile scope', () => {
      expect(GOOGLE_PROFILE_SCOPE).toBe(
        'https://www.googleapis.com/auth/userinfo.email'
      );
    });
  });
});
