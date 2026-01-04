/**
 * Geolocation Service Tests
 * 
 * Tests for the unified Web/Tauri geolocation service.
 */

// Mock Tauri plugin before imports
jest.mock('@tauri-apps/plugin-geolocation', () => ({
  checkPermissions: jest.fn().mockRejectedValue(new Error('Not in Tauri')),
  requestPermissions: jest.fn().mockRejectedValue(new Error('Not in Tauri')),
  getCurrentPosition: jest.fn().mockRejectedValue(new Error('Not in Tauri')),
  watchPosition: jest.fn().mockRejectedValue(new Error('Not in Tauri')),
  clearWatch: jest.fn(),
}));

import { GeolocationService, geolocationService } from './geolocation';
import type { GeolocationErrorCode as _GeolocationErrorCode } from '@/types/geolocation';

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

const mockPermissions = {
  query: jest.fn(),
};

describe('GeolocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup navigator mocks
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
    
    Object.defineProperty(global.navigator, 'permissions', {
      value: mockPermissions,
      writable: true,
      configurable: true,
    });

    // Mock window.__TAURI__ to be undefined (web environment)
    Object.defineProperty(window, '__TAURI__', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = GeolocationService.getInstance();
      const instance2 = GeolocationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isSupported', () => {
    it('should return true when navigator.geolocation exists', () => {
      expect(geolocationService.isSupported()).toBe(true);
    });

    it('should have isSupported method available', () => {
      const service = GeolocationService.getInstance();
      expect(typeof service.isSupported).toBe('function');
    });
  });

  describe('checkPermissions (Web)', () => {
    it('should return a permission status object', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });
      
      const result = await geolocationService.checkPermissions();
      
      // Result should have location and coarseLocation properties
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('coarseLocation');
    });

    it('should have checkPermissions method available', async () => {
      expect(typeof geolocationService.checkPermissions).toBe('function');
    });
  });

  describe('getCurrentPosition (Web)', () => {
    it('should have getCurrentPosition method', () => {
      expect(typeof geolocationService.getCurrentPosition).toBe('function');
    });

    it('should throw error when permission is denied', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 1, message: 'User denied Geolocation' });
      });

      // Should reject with an error
      await expect(geolocationService.getCurrentPosition()).rejects.toBeDefined();
    });

    it('should throw error when position is unavailable', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 2, message: 'Position unavailable' });
      });

      // Should reject with an error
      await expect(geolocationService.getCurrentPosition()).rejects.toBeDefined();
    });

    it('should have timeout handling', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 3, message: 'Timeout' });
      });

      // Should reject with an error
      await expect(geolocationService.getCurrentPosition()).rejects.toBeDefined();
    });

    it('should have getCurrentPosition method available', () => {
      expect(typeof geolocationService.getCurrentPosition).toBe('function');
    });
  });

  describe('watchPosition (Web)', () => {
    it('should have watchPosition method', async () => {
      expect(typeof geolocationService.watchPosition).toBe('function');
    });

    it('should call error callback on failure', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockGeolocation.watchPosition.mockImplementation((_, error) => {
        error({ code: 1, message: 'Permission denied' });
        return 1;
      });

      await geolocationService.watchPosition(onSuccess, onError);

      // Error callback should be called with an error object
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('clearWatch', () => {
    it('should have clearWatch method available', async () => {
      expect(typeof geolocationService.clearWatch).toBe('function');
    });
  });

  describe('requestPermissions (Web)', () => {
    it('should have requestPermissions method available', () => {
      expect(typeof geolocationService.requestPermissions).toBe('function');
    });

    it('should have watchPosition method available', () => {
      expect(typeof geolocationService.watchPosition).toBe('function');
    });

    it('should have clearWatch method available', () => {
      expect(typeof geolocationService.clearWatch).toBe('function');
    });
  });
});
