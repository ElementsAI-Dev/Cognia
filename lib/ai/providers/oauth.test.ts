/**
 * Tests for OAuth utilities
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
  saveOAuthState,
  getOAuthState,
  clearOAuthState,
  buildOAuthUrl,
  verifyOAuthState,
  OAUTH_PROVIDERS,
  type OAuthState,
} from './oauth';

// Polyfill TextEncoder for jsdom
import { TextEncoder as NodeTextEncoder } from 'util';
global.TextEncoder = NodeTextEncoder as typeof TextEncoder;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.subtle
const mockDigest = jest.fn().mockResolvedValue(new ArrayBuffer(32));
const mockGetRandomValues = jest.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
});

Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest,
    },
    getRandomValues: mockGetRandomValues,
  },
});

describe('generateCodeVerifier', () => {
  it('generates a code verifier string', () => {
    const verifier = generateCodeVerifier();
    expect(typeof verifier).toBe('string');
    expect(verifier.length).toBeGreaterThan(0);
  });

  it('generates different verifiers on each call', () => {
    const verifier1 = generateCodeVerifier();
    const verifier2 = generateCodeVerifier();
    expect(verifier1).not.toBe(verifier2);
  });

  it('generates URL-safe base64 string', () => {
    const verifier = generateCodeVerifier();
    // Should not contain +, /, or =
    expect(verifier).not.toMatch(/[+/=]/);
  });
});

describe('generateCodeChallenge', () => {
  it('generates a code challenge from verifier', async () => {
    const verifier = 'test-verifier';
    const challenge = await generateCodeChallenge(verifier);
    expect(typeof challenge).toBe('string');
    expect(challenge.length).toBeGreaterThan(0);
  });

  it('generates URL-safe base64 string', async () => {
    const verifier = 'test-verifier';
    const challenge = await generateCodeChallenge(verifier);
    // Should not contain +, /, or =
    expect(challenge).not.toMatch(/[+/=]/);
  });
});

describe('OAuth State Management', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('saveOAuthState', () => {
    it('saves OAuth state to localStorage', () => {
      const state: OAuthState = {
        state: 'test-state',
        codeVerifier: 'test-verifier',
        providerId: 'openrouter',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      saveOAuthState(state);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cognia-oauth-state',
        JSON.stringify(state)
      );
    });
  });

  describe('getOAuthState', () => {
    it('returns null when no state is stored', () => {
      const result = getOAuthState();
      expect(result).toBeNull();
    });

    it('returns stored state when valid', () => {
      const state: OAuthState = {
        state: 'test-state',
        codeVerifier: 'test-verifier',
        providerId: 'openrouter',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));
      const result = getOAuthState();
      expect(result).toEqual(state);
    });

    it('returns null and clears state when expired', () => {
      const expiredState: OAuthState = {
        state: 'test-state',
        codeVerifier: 'test-verifier',
        providerId: 'openrouter',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now() - 11 * 60 * 1000, // 11 minutes ago (expired)
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(expiredState));
      const result = getOAuthState();
      expect(result).toBeNull();
    });
  });

  describe('clearOAuthState', () => {
    it('removes OAuth state from localStorage', () => {
      clearOAuthState();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cognia-oauth-state');
    });
  });

  describe('verifyOAuthState', () => {
    it('returns null when no stored state', () => {
      const result = verifyOAuthState('some-state');
      expect(result).toBeNull();
    });

    it('returns null when state does not match', () => {
      const state: OAuthState = {
        state: 'stored-state',
        codeVerifier: 'test-verifier',
        providerId: 'openrouter',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));
      const result = verifyOAuthState('different-state');
      expect(result).toBeNull();
    });

    it('returns stored state when state matches', () => {
      const state: OAuthState = {
        state: 'matching-state',
        codeVerifier: 'test-verifier',
        providerId: 'openrouter',
        redirectUri: 'http://localhost:3000/callback',
        createdAt: Date.now(),
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));
      const result = verifyOAuthState('matching-state');
      expect(result).toEqual(state);
    });
  });
});

describe('OAUTH_PROVIDERS', () => {
  it('has OpenRouter configuration', () => {
    expect(OAUTH_PROVIDERS.openrouter).toBeDefined();
    expect(OAUTH_PROVIDERS.openrouter.providerId).toBe('openrouter');
    expect(OAUTH_PROVIDERS.openrouter.authorizationUrl).toBe('https://openrouter.ai/auth');
    expect(OAUTH_PROVIDERS.openrouter.pkceRequired).toBe(true);
    expect(OAUTH_PROVIDERS.openrouter.responseType).toBe('code');
  });
});

describe('buildOAuthUrl', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('returns null for unknown provider', async () => {
    const result = await buildOAuthUrl('unknown');
    expect(result).toBeNull();
  });

  it('builds OAuth URL for OpenRouter', async () => {
    const result = await buildOAuthUrl('openrouter');
    
    expect(result).not.toBeNull();
    expect(result?.url).toContain('https://openrouter.ai/auth');
    expect(result?.url).toContain('callback_url=');
    expect(result?.url).toContain('code_challenge=');
    expect(result?.url).toContain('code_challenge_method=S256');
    expect(result?.state).toBeDefined();
    expect(result?.state.providerId).toBe('openrouter');
  });

  it('saves OAuth state when building URL', async () => {
    await buildOAuthUrl('openrouter');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});
