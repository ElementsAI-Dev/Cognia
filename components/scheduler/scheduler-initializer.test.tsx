/**
 * SchedulerInitializer Component Tests
 */

import { render, waitFor } from '@testing-library/react';
import { SchedulerInitializer } from './scheduler-initializer';
import * as schedulerModule from '@/lib/scheduler';

// Mock the scheduler module
jest.mock('@/lib/scheduler', () => ({
  initSchedulerSystem: jest.fn().mockResolvedValue(undefined),
  stopSchedulerSystem: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    ui: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  },
}));

// Mock the scheduler store
const mockInitialize = jest.fn().mockResolvedValue(undefined);
const mockSetSchedulerStatus = jest.fn();
let mockIsInitialized = false;

jest.mock('@/stores/scheduler', () => ({
  useSchedulerStore: jest.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({
        initialize: mockInitialize,
        isInitialized: mockIsInitialized,
        setSchedulerStatus: mockSetSchedulerStatus,
      });
    }
    return {
      initialize: mockInitialize,
      isInitialized: mockIsInitialized,
      setSchedulerStatus: mockSetSchedulerStatus,
    };
  }),
}));

const mockedSchedulerModule = schedulerModule as jest.Mocked<typeof schedulerModule>;

describe('SchedulerInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsInitialized = false;
    mockInitialize.mockResolvedValue(undefined);
  });

  it('should render nothing (null)', () => {
    const { container } = render(<SchedulerInitializer />);
    expect(container.firstChild).toBeNull();
  });

  it('should initialize scheduler on mount', async () => {
    render(<SchedulerInitializer />);
    
    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });
  });

  it('should set scheduler status to running after initialization', async () => {
    render(<SchedulerInitializer />);
    
    await waitFor(() => {
      expect(mockSetSchedulerStatus).toHaveBeenCalledWith('running');
    });
  });

  it('should set scheduler status to stopped on error', async () => {
    mockInitialize.mockRejectedValueOnce(new Error('Init failed'));
    
    render(<SchedulerInitializer />);
    
    await waitFor(() => {
      expect(mockSetSchedulerStatus).toHaveBeenCalledWith('stopped');
    });
  });

  it('should stop scheduler on unmount', async () => {
    const { unmount } = render(<SchedulerInitializer />);
    
    // Wait for initialization
    await waitFor(() => {
      expect(mockSetSchedulerStatus).toHaveBeenCalled();
    });
    
    // Unmount and check cleanup
    unmount();
    
    expect(mockedSchedulerModule.stopSchedulerSystem).toHaveBeenCalled();
  });

  it('should not initialize when already initialized', async () => {
    mockIsInitialized = true;
    
    render(<SchedulerInitializer />);
    
    // Should not call initialize when already initialized
    expect(mockInitialize).not.toHaveBeenCalled();
  });
});
