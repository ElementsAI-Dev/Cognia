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

// Mock the scheduler store
const mockSetSchedulerStatus = jest.fn();
jest.mock('@/stores/scheduler', () => ({
  useSchedulerStore: jest.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({
        setSchedulerStatus: mockSetSchedulerStatus,
      });
    }
    return { setSchedulerStatus: mockSetSchedulerStatus };
  }),
}));

const mockedSchedulerModule = schedulerModule as jest.Mocked<typeof schedulerModule>;

describe('SchedulerInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing (null)', () => {
    const { container } = render(<SchedulerInitializer />);
    expect(container.firstChild).toBeNull();
  });

  it('should initialize scheduler on mount', async () => {
    render(<SchedulerInitializer />);
    
    await waitFor(() => {
      expect(mockedSchedulerModule.initSchedulerSystem).toHaveBeenCalledTimes(1);
    });
  });

  it('should set scheduler status to running after initialization', async () => {
    render(<SchedulerInitializer />);
    
    await waitFor(() => {
      expect(mockSetSchedulerStatus).toHaveBeenCalledWith('running');
    });
  });

  it('should set scheduler status to stopped on error', async () => {
    mockedSchedulerModule.initSchedulerSystem.mockRejectedValueOnce(new Error('Init failed'));
    
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

  it('should only initialize once even if re-rendered', async () => {
    const { rerender } = render(<SchedulerInitializer />);
    
    await waitFor(() => {
      expect(mockedSchedulerModule.initSchedulerSystem).toHaveBeenCalledTimes(1);
    });
    
    // Re-render
    rerender(<SchedulerInitializer />);
    
    // Should still only be called once
    expect(mockedSchedulerModule.initSchedulerSystem).toHaveBeenCalledTimes(1);
  });
});
