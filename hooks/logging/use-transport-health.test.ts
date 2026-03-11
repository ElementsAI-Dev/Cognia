import { renderHook, act } from '@testing-library/react';
import { useTransportHealth } from './use-transport-health';

const mockGetTransportHealthSnapshot = jest.fn();

jest.mock('@/lib/logger', () => ({
  getTransportHealthSnapshot: (...args: unknown[]) =>
    (mockGetTransportHealthSnapshot as (...innerArgs: unknown[]) => unknown)(...args),
}));

describe('useTransportHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTransportHealthSnapshot.mockReturnValue({
      remote: {
        transport: 'remote',
        status: 'healthy',
        queueDepth: 0,
        retryCount: 0,
        droppedEntries: 0,
        updatedAt: new Date().toISOString(),
      },
    });
  });

  it('loads transport health snapshot', async () => {
    const { result } = renderHook(() => useTransportHealth({ autoRefresh: false }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.healthByTransport.remote?.status).toBe('healthy');
  });

  it('exposes errors when snapshot retrieval fails', async () => {
    mockGetTransportHealthSnapshot.mockImplementation(() => {
      throw new Error('boom');
    });

    const { result } = renderHook(() => useTransportHealth({ autoRefresh: false }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toEqual(new Error('boom'));
  });
});
