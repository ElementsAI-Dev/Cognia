/**
 * Geolocation Service Tests
 * 
 * Tests for the unified Web/Tauri geolocation service.
 */

import { GeolocationService, geolocationService } from './geolocation';
import { GeolocationErrorCode } from './types';

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
    it('should return granted status when permission is granted', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' });
      
      const result = await geolocationService.checkPermissions();
      
      expect(result.location).toBe('granted');
      expect(result.coarseLocation).toBe('granted');
    });

    it('should return denied status when permission is denied', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'denied' });
      
      const result = await geolocationService.checkPermissions();
      
      expect(result.location).toBe('denied');
      expect(result.coarseLocation).toBe('denied');
    });

    it('should return prompt status when permission needs prompt', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'prompt' });
      
      const result = await geolocationService.checkPermissions();
      
      expect(result.location).toBe('prompt');
      expect(result.coarseLocation).toBe('prompt');
    });

    it('should have checkPermissions method available', async () => {
      expect(typeof geolocationService.checkPermissions).toBe('function');
    });
  });

  describe('getCurrentPosition (Web)', () => {
    const mockPosition = {
      coords: {
        latitude: 39.9042,
        longitude: 116.4074,
        accuracy: 10,
        altitude: 50,
        altitudeAccuracy: 5,
        heading: 90,
        speed: 10,
      },
      timestamp: Date.now(),
    };

    it('should return position when geolocation succeeds', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await geolocationService.getCurrentPosition();

      expect(result.coords.latitude).toBe(39.9042);
      expect(result.coords.longitude).toBe(116.4074);
      expect(result.coords.accuracy).toBe(10);
    });

    it('should throw error when permission is denied', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 1, message: 'User denied Geolocation' });
      });

      await expect(geolocationService.getCurrentPosition()).rejects.toMatchObject({
        code: GeolocationErrorCode.PERMISSION_DENIED,
      });
    });

    it('should throw error when position is unavailable', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 2, message: 'Position unavailable' });
      });

      await expect(geolocationService.getCurrentPosition()).rejects.toMatchObject({
        code: GeolocationErrorCode.POSITION_UNAVAILABLE,
      });
    });

    it('should throw error when request times out', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error({ code: 3, message: 'Timeout' });
      });

      await expect(geolocationService.getCurrentPosition()).rejects.toMatchObject({
        code: GeolocationErrorCode.TIMEOUT,
      });
    });

    it('should have getCurrentPosition method available', () => {
      expect(typeof geolocationService.getCurrentPosition).toBe('function');
    });
  });

  describe('watchPosition (Web)', () => {
    const mockPosition = {
      coords: {
        latitude: 39.9042,
        longitude: 116.4074,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    it('should call success callback with position updates', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockGeolocation.watchPosition.mockImplementation((success) => {
        success(mockPosition);
        return 1;
      });

      await geolocationService.watchPosition(onSuccess, onError);

      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
        coords: expect.objectContaining({
          latitude: 39.9042,
          longitude: 116.4074,
        }),
      }));
    });

    it('should call error callback on failure', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockGeolocation.watchPosition.mockImplementation((_, error) => {
        error({ code: 1, message: 'Permission denied' });
        return 1;
      });

      await geolocationService.watchPosition(onSuccess, onError);

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: GeolocationErrorCode.PERMISSION_DENIED,
      }));
    });
  });

  describe('clearWatch', () => {
    it('should clear the watch when called', async () => {
      mockGeolocation.watchPosition.mockReturnValue(123);
      
      await geolocationService.watchPosition(jest.fn(), jest.fn());
      await geolocationService.clearWatch();

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(123);
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
