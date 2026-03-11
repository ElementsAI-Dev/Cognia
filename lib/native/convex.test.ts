/**
 * Convex Native API tests
 */

import { getConvexConfig, setConvexConfig, testConvexConnection, isConvexConnected } from './convex';

// Mock isTauri
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  isTauri: jest.fn(() => false),
}));

// Mock invoke-with-trace
jest.mock('./invoke-with-trace', () => ({
  invokeWithTrace: jest.fn(),
}));

describe('Convex Native API', () => {
  describe('when not in Tauri environment', () => {
    it('getConvexConfig should return null', async () => {
      const result = await getConvexConfig();
      expect(result).toBeNull();
    });

    it('setConvexConfig should return false', async () => {
      const result = await setConvexConfig({
        deploymentUrl: 'https://test.convex.cloud',
        deployKey: 'prod:key123',
        enabled: true,
        syncIntervalSecs: 900,
      });
      expect(result).toBe(false);
    });

    it('testConvexConnection should return false', async () => {
      const result = await testConvexConnection();
      expect(result).toBe(false);
    });

    it('isConvexConnected should return false', async () => {
      const result = await isConvexConnected();
      expect(result).toBe(false);
    });
  });

  describe('when in Tauri environment', () => {
    const mockInvokeWithTrace = jest.requireMock('./invoke-with-trace').invokeWithTrace;
    const mockIsTauri = jest.requireMock('@/lib/utils').isTauri;

    beforeEach(() => {
      mockIsTauri.mockReturnValue(true);
      mockInvokeWithTrace.mockReset();
    });

    it('getConvexConfig should invoke convex_get_config', async () => {
      const mockConfig = {
        deploymentUrl: 'https://test.convex.cloud',
        deployKey: 'prod:key123',
        enabled: true,
        syncIntervalSecs: 900,
      };
      mockInvokeWithTrace.mockResolvedValueOnce(mockConfig);

      const result = await getConvexConfig();
      expect(result).toEqual(mockConfig);
      expect(mockInvokeWithTrace).toHaveBeenCalledWith('convex_get_config');
    });

    it('setConvexConfig should invoke convex_set_config', async () => {
      mockInvokeWithTrace.mockResolvedValueOnce(true);

      const config = {
        deploymentUrl: 'https://test.convex.cloud/path/',
        deployKey: '  prod:key123  ',
        enabled: true,
        syncIntervalSecs: 900,
      };
      const result = await setConvexConfig(config);
      expect(result).toBe(true);
      expect(mockInvokeWithTrace).toHaveBeenCalledWith('convex_set_config', {
        config: {
          deploymentUrl: 'https://test.convex.cloud',
          deployKey: 'prod:key123',
          enabled: true,
          syncIntervalSecs: 900,
        },
      });
    });

    it('testConvexConnection should invoke convex_test_connection', async () => {
      mockInvokeWithTrace.mockResolvedValueOnce(true);

      const result = await testConvexConnection();
      expect(result).toBe(true);
      expect(mockInvokeWithTrace).toHaveBeenCalledWith('convex_test_connection');
    });

    it('isConvexConnected should invoke convex_is_connected', async () => {
      mockInvokeWithTrace.mockResolvedValueOnce(false);

      const result = await isConvexConnected();
      expect(result).toBe(false);
      expect(mockInvokeWithTrace).toHaveBeenCalledWith('convex_is_connected');
    });
  });
});
