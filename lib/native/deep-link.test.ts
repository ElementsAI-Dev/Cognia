/**
 * Tests for Deep Link Service
 */

import {
  parseDeepLink,
  createDeepLink,
  registerHandler,
  unregisterHandler,
  handleDeepLink,
} from './deep-link';

describe('Deep Link Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseDeepLink', () => {
    it('parses a simple deep link URL', () => {
      const result = parseDeepLink('cognia://chat/new');

      expect(result).not.toBeNull();
      expect(result?.scheme).toBe('cognia');
      expect(result?.action).toBe('chat/new');
      expect(result?.params).toEqual({});
      expect(result?.raw).toBe('cognia://chat/new');
    });

    it('parses a deep link URL with query parameters', () => {
      const result = parseDeepLink('cognia://chat/open?id=abc123&mode=edit');

      expect(result).not.toBeNull();
      expect(result?.scheme).toBe('cognia');
      expect(result?.action).toBe('chat/open');
      expect(result?.params).toEqual({ id: 'abc123', mode: 'edit' });
    });

    it('parses a deep link URL with encoded parameters', () => {
      const result = parseDeepLink('cognia://file/open?path=%2Fpath%2Fto%2Ffile.txt');

      expect(result).not.toBeNull();
      expect(result?.params.path).toBe('/path/to/file.txt');
    });

    it('returns null for invalid URLs', () => {
      const result = parseDeepLink('not-a-valid-url');

      expect(result).toBeNull();
    });

    it('handles root action correctly', () => {
      const result = parseDeepLink('cognia://');

      expect(result).not.toBeNull();
      expect(result?.action).toBe('');
    });
  });

  describe('createDeepLink', () => {
    it('creates a simple deep link URL', () => {
      const url = createDeepLink('chat/new');

      expect(url).toBe('cognia://chat/new');
    });

    it('creates a deep link URL with parameters', () => {
      const url = createDeepLink('chat/open', { id: 'abc123', mode: 'edit' });

      expect(url).toContain('cognia://chat/open');
      expect(url).toContain('id=abc123');
      expect(url).toContain('mode=edit');
    });

    it('creates a deep link URL with custom scheme', () => {
      const url = createDeepLink('action', undefined, 'myapp');

      expect(url).toBe('myapp://action');
    });

    it('encodes special characters in parameters', () => {
      const url = createDeepLink('file/open', { path: '/path/to/file.txt' });

      expect(url).toContain('path=%2Fpath%2Fto%2Ffile.txt');
    });
  });

  describe('handler registration', () => {
    afterEach(() => {
      unregisterHandler('test/action');
    });

    it('registers a handler for an action', async () => {
      const handler = jest.fn();
      registerHandler('test/action', handler);

      const handled = await handleDeepLink('cognia://test/action?param=value');

      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalledWith({ param: 'value' });
    });

    it('returns false when no handler is registered', async () => {
      const handled = await handleDeepLink('cognia://unknown/action');

      expect(handled).toBe(false);
    });

    it('unregisters a handler', async () => {
      const handler = jest.fn();
      registerHandler('test/action', handler);
      unregisterHandler('test/action');

      const handled = await handleDeepLink('cognia://test/action');

      expect(handled).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });

    it('handles async handlers', async () => {
      const asyncHandler = jest.fn().mockResolvedValue(undefined);
      registerHandler('test/action', asyncHandler);

      const handled = await handleDeepLink('cognia://test/action');

      expect(handled).toBe(true);
      expect(asyncHandler).toHaveBeenCalled();
    });
  });

  describe('handleDeepLink', () => {
    it('returns false for invalid deep link URLs', async () => {
      const handled = await handleDeepLink('not-a-valid-url');

      expect(handled).toBe(false);
    });

    it('passes parsed params to handler', async () => {
      const handler = jest.fn();
      registerHandler('settings/open', handler);

      await handleDeepLink('cognia://settings/open?section=provider&tab=api');

      expect(handler).toHaveBeenCalledWith({
        section: 'provider',
        tab: 'api',
      });

      unregisterHandler('settings/open');
    });
  });
});
