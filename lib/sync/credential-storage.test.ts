/**
 * Credential Storage Tests
 */

// Mock isTauri to control environment
let mockIsTauri = false;
jest.mock('@/lib/utils', () => ({
  isTauri: () => mockIsTauri,
}));

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

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

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock btoa/atob
global.btoa = jest.fn((str: string) => Buffer.from(str).toString('base64'));
global.atob = jest.fn((str: string) => Buffer.from(str, 'base64').toString());

// Import after mocking
import {
  storeWebDAVPassword,
  getWebDAVPassword,
  removeWebDAVPassword,
  storeGitHubToken,
  getGitHubToken,
  removeGitHubToken,
  hasStoredCredentials,
} from './credential-storage';

describe('Credential Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockIsTauri = false;
  });

  describe('WebDAV Password (localStorage fallback)', () => {
    describe('storeWebDAVPassword', () => {
      it('should store password in localStorage when not in Tauri', async () => {
        const result = await storeWebDAVPassword('test-password');

        expect(result).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'sync:webdav:password',
          expect.any(String)
        );
      });

      it('should encode password with btoa', async () => {
        await storeWebDAVPassword('my-secret');

        expect(global.btoa).toHaveBeenCalledWith('my-secret');
      });
    });

    describe('getWebDAVPassword', () => {
      it('should return null when no password stored', async () => {
        const result = await getWebDAVPassword();

        expect(result).toBeNull();
      });

      it('should retrieve and decode stored password', async () => {
        // Store first
        await storeWebDAVPassword('test-password');
        // Then retrieve
        const result = await getWebDAVPassword();

        expect(result).toBe('test-password');
      });
    });

    describe('removeWebDAVPassword', () => {
      it('should remove password from localStorage', async () => {
        await storeWebDAVPassword('test-password');
        const result = await removeWebDAVPassword();

        expect(result).toBe(true);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('sync:webdav:password');
      });
    });
  });

  describe('GitHub Token (localStorage fallback)', () => {
    describe('storeGitHubToken', () => {
      it('should store token in localStorage when not in Tauri', async () => {
        const result = await storeGitHubToken('ghp_test_token');

        expect(result).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'sync:github:token',
          expect.any(String)
        );
      });

      it('should encode token with btoa', async () => {
        await storeGitHubToken('ghp_secret');

        expect(global.btoa).toHaveBeenCalledWith('ghp_secret');
      });
    });

    describe('getGitHubToken', () => {
      it('should return null when no token stored', async () => {
        const result = await getGitHubToken();

        expect(result).toBeNull();
      });

      it('should retrieve and decode stored token', async () => {
        await storeGitHubToken('ghp_test_token');
        const result = await getGitHubToken();

        expect(result).toBe('ghp_test_token');
      });
    });

    describe('removeGitHubToken', () => {
      it('should remove token from localStorage', async () => {
        await storeGitHubToken('ghp_test_token');
        const result = await removeGitHubToken();

        expect(result).toBe(true);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('sync:github:token');
      });
    });
  });

  describe('Tauri Environment', () => {
    beforeEach(() => {
      mockIsTauri = true;
    });

    describe('storeWebDAVPassword', () => {
      it('should use Stronghold when in Tauri', async () => {
        mockInvoke.mockResolvedValueOnce(undefined);

        const result = await storeWebDAVPassword('secure-password');

        expect(result).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith('stronghold_store_sync_credential', {
          key: 'sync:webdav:password',
          value: 'secure-password',
        });
      });

      it('should fallback to localStorage when Stronghold fails', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('Stronghold error'));

        const result = await storeWebDAVPassword('secure-password');

        expect(result).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });

    describe('getWebDAVPassword', () => {
      it('should use Stronghold when in Tauri', async () => {
        mockInvoke.mockResolvedValueOnce('stronghold-password');

        const result = await getWebDAVPassword();

        expect(result).toBe('stronghold-password');
        expect(mockInvoke).toHaveBeenCalledWith('stronghold_get_sync_credential', {
          key: 'sync:webdav:password',
        });
      });

      it('should fallback to localStorage when Stronghold fails', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('Stronghold error'));
        localStorageMock.setItem('sync:webdav:password', btoa('fallback-password'));

        const result = await getWebDAVPassword();

        expect(result).toBe('fallback-password');
      });
    });

    describe('storeGitHubToken', () => {
      it('should use Stronghold when in Tauri', async () => {
        mockInvoke.mockResolvedValueOnce(undefined);

        const result = await storeGitHubToken('ghp_secure_token');

        expect(result).toBe(true);
        expect(mockInvoke).toHaveBeenCalledWith('stronghold_store_sync_credential', {
          key: 'sync:github:token',
          value: 'ghp_secure_token',
        });
      });
    });

    describe('getGitHubToken', () => {
      it('should use Stronghold when in Tauri', async () => {
        mockInvoke.mockResolvedValueOnce('ghp_stronghold_token');

        const result = await getGitHubToken();

        expect(result).toBe('ghp_stronghold_token');
        expect(mockInvoke).toHaveBeenCalledWith('stronghold_get_sync_credential', {
          key: 'sync:github:token',
        });
      });
    });
  });

  describe('Utility Functions', () => {
    describe('hasStoredCredentials', () => {
      it('should return false for webdav when no password stored', async () => {
        const result = await hasStoredCredentials('webdav');

        expect(result).toBe(false);
      });

      it('should return false for github when no token stored', async () => {
        const result = await hasStoredCredentials('github');

        expect(result).toBe(false);
      });

      it('should return true for webdav when password stored', async () => {
        await storeWebDAVPassword('password');

        const result = await hasStoredCredentials('webdav');

        expect(result).toBe(true);
      });

      it('should return true for github when token stored', async () => {
        await storeGitHubToken('token');

        const result = await hasStoredCredentials('github');

        expect(result).toBe(true);
      });
    });
  });
});
