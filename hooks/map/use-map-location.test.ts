/**
 * useMapLocation Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMapLocation } from './use-map-location';
import { useGeolocation } from '@/hooks/network/use-geolocation';

jest.mock('@/hooks/network/use-geolocation');

const mockUseGeolocation = useGeolocation as jest.MockedFunction<typeof useGeolocation>;

describe('useMapLocation', () => {
  const mockGetCurrentPosition = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGeolocation.mockReturnValue({
      position: null,
      error: null,
      loading: false,
      permissionStatus: null,
      isSupported: true,
      getCurrentPosition: mockGetCurrentPosition,
      requestPermission: jest.fn(),
      clearWatch: jest.fn(),
      refresh: jest.fn(),
    });
  });

  it('initializes with null position', () => {
    const { result } = renderHook(() => useMapLocation());

    expect(result.current.position).toBeNull();
    expect(result.current.accuracy).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns position from geolocation', () => {
    mockUseGeolocation.mockReturnValue({
      position: {
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
      },
      error: null,
      loading: false,
      permissionStatus: null,
      isSupported: true,
      getCurrentPosition: mockGetCurrentPosition,
      requestPermission: jest.fn(),
      clearWatch: jest.fn(),
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useMapLocation());

    expect(result.current.position).toEqual({
      latitude: 39.9042,
      longitude: 116.4074,
    });
    expect(result.current.accuracy).toBe(10);
  });

  it('returns error from geolocation', () => {
    mockUseGeolocation.mockReturnValue({
      position: null,
      error: { code: 1, message: 'Permission denied' },
      loading: false,
      permissionStatus: null,
      isSupported: true,
      getCurrentPosition: mockGetCurrentPosition,
      requestPermission: jest.fn(),
      clearWatch: jest.fn(),
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useMapLocation());

    expect(result.current.error).toBe('Permission denied');
  });

  it('locate() calls getCurrentPosition and returns position', async () => {
    const mockPosition = {
      coords: {
        latitude: 39.9042,
        longitude: 116.4074,
        accuracy: 15,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGetCurrentPosition.mockResolvedValue(mockPosition);

    const { result } = renderHook(() => useMapLocation());

    let locatedPosition;
    await act(async () => {
      locatedPosition = await result.current.locate();
    });

    expect(mockGetCurrentPosition).toHaveBeenCalled();
    expect(locatedPosition).toEqual({
      latitude: 39.9042,
      longitude: 116.4074,
    });
  });

  it('locate() handles error', async () => {
    mockGetCurrentPosition.mockRejectedValue(new Error('Location unavailable'));

    const { result } = renderHook(() => useMapLocation());

    await act(async () => {
      await result.current.locate();
    });

    expect(result.current.error).toBe('Location unavailable');
  });

  it('clearError() clears the error', async () => {
    mockGetCurrentPosition.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => useMapLocation());

    await act(async () => {
      await result.current.locate();
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('passes enableHighAccuracy option to useGeolocation', () => {
    renderHook(() => useMapLocation({ enableHighAccuracy: true }));

    expect(mockUseGeolocation).toHaveBeenCalledWith(
      expect.objectContaining({
        enableHighAccuracy: true,
      })
    );
  });

  it('passes watchPosition option to useGeolocation', () => {
    renderHook(() => useMapLocation({ watchPosition: true }));

    expect(mockUseGeolocation).toHaveBeenCalledWith(
      expect.objectContaining({
        watch: true,
      })
    );
  });
});
