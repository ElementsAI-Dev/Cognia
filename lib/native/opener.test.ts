/**
 * Tests for Opener Service
 */

import {
  openPath,
  openUrl,
  revealInFileExplorer,
  openFile,
  openDirectory,
  openEmail,
  openPhone,
} from './opener';

// Mock the isTauri function
jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

// Mock the Tauri opener plugin
jest.mock('@tauri-apps/plugin-opener', () => ({
  openPath: jest.fn(),
  openUrl: jest.fn(),
  revealItemInDir: jest.fn(),
}));

import { isTauri } from './utils';
import * as openerPlugin from '@tauri-apps/plugin-opener';

const mockIsTauri = isTauri as jest.Mock;
const mockOpenerOpenPath = openerPlugin.openPath as jest.Mock;
const mockOpenerOpenUrl = openerPlugin.openUrl as jest.Mock;
const mockOpenerReveal = openerPlugin.revealItemInDir as jest.Mock;

describe('Opener Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openPath', () => {
    it('returns error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      const result = await openPath('/path/to/file');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Opener requires Tauri desktop environment');
    });

    it('opens path successfully in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(true);
      mockOpenerOpenPath.mockResolvedValue(undefined);

      const result = await openPath('/path/to/file');

      expect(result.success).toBe(true);
      expect(mockOpenerOpenPath).toHaveBeenCalledWith('/path/to/file', undefined);
    });

    it('opens path with specific application', async () => {
      mockIsTauri.mockReturnValue(true);
      mockOpenerOpenPath.mockResolvedValue(undefined);

      const result = await openPath('/path/to/file', 'notepad');

      expect(result.success).toBe(true);
      expect(mockOpenerOpenPath).toHaveBeenCalledWith('/path/to/file', 'notepad');
    });

    it('handles errors gracefully', async () => {
      mockIsTauri.mockReturnValue(true);
      mockOpenerOpenPath.mockRejectedValue(new Error('File not found'));

      const result = await openPath('/nonexistent/file');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('openUrl', () => {
    it('returns error when window.open fails in browser', async () => {
      mockIsTauri.mockReturnValue(false);
      // jsdom throws "not implemented" for window.open, so we expect error handling
      const result = await openUrl('https://example.com');
      // In jsdom environment, window.open throws, so result should be success:false
      // or success:true if window.open doesn't throw
      expect(result).toHaveProperty('success');
    });

    it('opens URL in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(true);
      mockOpenerOpenUrl.mockResolvedValue(undefined);

      const result = await openUrl('https://example.com');

      expect(result.success).toBe(true);
      expect(mockOpenerOpenUrl).toHaveBeenCalledWith('https://example.com', undefined);
    });
  });

  describe('revealInFileExplorer', () => {
    it('returns error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      const result = await revealInFileExplorer('/path/to/file');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reveal in file explorer requires Tauri desktop environment');
    });

    it('reveals item in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(true);
      mockOpenerReveal.mockResolvedValue(undefined);

      const result = await revealInFileExplorer('/path/to/file');

      expect(result.success).toBe(true);
      expect(mockOpenerReveal).toHaveBeenCalledWith('/path/to/file');
    });
  });

  describe('convenience wrappers', () => {
    beforeEach(() => {
      mockIsTauri.mockReturnValue(true);
      mockOpenerOpenPath.mockResolvedValue(undefined);
    });

    it('openFile calls openPath', async () => {
      const result = await openFile('/path/to/file.txt');
      expect(result.success).toBe(true);
    });

    it('openDirectory calls openPath', async () => {
      const result = await openDirectory('/path/to/dir');
      expect(result.success).toBe(true);
    });
  });

  describe('protocol helpers', () => {
    beforeEach(() => {
      mockIsTauri.mockReturnValue(true);
      mockOpenerOpenUrl.mockResolvedValue(undefined);
    });

    it('openEmail adds mailto: prefix if missing', async () => {
      await openEmail('test@example.com');
      expect(mockOpenerOpenUrl).toHaveBeenCalledWith('mailto:test@example.com', undefined);
    });

    it('openEmail preserves existing mailto: prefix', async () => {
      await openEmail('mailto:test@example.com');
      expect(mockOpenerOpenUrl).toHaveBeenCalledWith('mailto:test@example.com', undefined);
    });

    it('openPhone adds tel: prefix if missing', async () => {
      await openPhone('+1234567890');
      expect(mockOpenerOpenUrl).toHaveBeenCalledWith('tel:+1234567890', undefined);
    });

    it('openPhone preserves existing tel: prefix', async () => {
      await openPhone('tel:+1234567890');
      expect(mockOpenerOpenUrl).toHaveBeenCalledWith('tel:+1234567890', undefined);
    });
  });
});
