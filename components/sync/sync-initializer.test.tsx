/**
 * Unit tests for SyncInitializer component
 */

import { render, cleanup } from '@testing-library/react';
import { SyncInitializer } from './sync-initializer';

// Mock the sync lib
const mockInitSyncScheduler = jest.fn().mockResolvedValue(undefined);
const mockSyncOnExit = jest.fn().mockResolvedValue(undefined);
const mockGetSyncScheduler = jest.fn().mockReturnValue({
  syncOnExit: mockSyncOnExit,
});

jest.mock('@/lib/sync', () => ({
  initSyncScheduler: () => mockInitSyncScheduler(),
  getSyncScheduler: () => mockGetSyncScheduler(),
}));

// Mock the sync store
let mockActiveProvider: string | null = 'github';
jest.mock('@/stores/sync', () => ({
  useSyncStore: (selector: (state: { activeProvider: string | null }) => unknown) => {
    return selector({ activeProvider: mockActiveProvider });
  },
}));

describe('SyncInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveProvider = 'github';
  });

  afterEach(cleanup);

  it('renders nothing', () => {
    const { container } = render(<SyncInitializer />);
    expect(container.firstChild).toBeNull();
  });

  it('initializes sync scheduler on mount', async () => {
    render(<SyncInitializer />);
    
    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    expect(mockInitSyncScheduler).toHaveBeenCalledTimes(1);
  });

  it('only initializes once even with re-renders', async () => {
    const { rerender } = render(<SyncInitializer />);
    
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    rerender(<SyncInitializer />);
    rerender(<SyncInitializer />);
    
    expect(mockInitSyncScheduler).toHaveBeenCalledTimes(1);
  });

  it('registers beforeunload handler when active provider exists', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    render(<SyncInitializer />);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
    
    addEventListenerSpy.mockRestore();
  });

  it('does not register beforeunload handler when no active provider', () => {
    mockActiveProvider = null;
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    render(<SyncInitializer />);
    
    const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
      (call) => String(call[0]) === 'beforeunload'
    );
    expect(beforeUnloadCalls.length).toBe(0);
    
    addEventListenerSpy.mockRestore();
  });

  it('removes beforeunload handler on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<SyncInitializer />);
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
    
    removeEventListenerSpy.mockRestore();
  });

  it('handles initialization errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockInitSyncScheduler.mockRejectedValueOnce(new Error('Init failed'));
    
    render(<SyncInitializer />);
    
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[SyncInitializer] Failed to initialize sync:',
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });
});
