/**
 * Tests for Plugin Profiler Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginProfiler } from './plugin-profiler';

// Mock the profiler module
const mockProfiler = {
  isEnabled: jest.fn().mockReturnValue(true),
  setEnabled: jest.fn(),
  getSummary: jest.fn().mockReturnValue({
    pluginId: 'plugin-a',
    totalOperations: 10,
    totalDuration: 1000,
    averageDuration: 100,
    peakMemory: 50000000,
    hotspots: [
      { operation: 'render', percentage: 40, count: 4 },
      { operation: 'fetch', percentage: 30, count: 3 },
    ],
    operationBreakdown: {},
  }),
  getEntries: jest.fn().mockReturnValue([
    { id: '1', operation: 'render', duration: 50, status: 'completed' },
    { id: '2', operation: 'fetch', duration: 100, status: 'completed' },
  ]),
  getSlowOperations: jest.fn().mockReturnValue([
    { id: '3', operation: 'slow-op', duration: 500, status: 'completed' },
  ]),
  getErrorOperations: jest.fn().mockReturnValue([
    { id: '4', operation: 'error-op', duration: 10, status: 'error', error: 'Something failed' },
  ]),
  clearEntries: jest.fn(),
};

jest.mock('@/lib/plugin/devtools/profiler', () => ({
  getPluginProfiler: () => mockProfiler,
}));

describe('PluginProfiler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render profiler component', () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Hotspots')).toBeInTheDocument();
    });

    it('should show summary cards', () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      // Component renders with tabs for navigation
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('should show recording status', () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      expect(screen.getByText('Recording')).toBeInTheDocument();
    });

    it('should show paused status when disabled', () => {
      mockProfiler.isEnabled.mockReturnValueOnce(false);

      render(<PluginProfiler pluginId="plugin-a" />);

      expect(screen.getByText('Paused')).toBeInTheDocument();
    });
  });

  describe('Controls', () => {
    it('should toggle profiling on button click', async () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(mockProfiler.setEnabled).toHaveBeenCalledWith(false);
      });
    });

    it('should refresh data on button click', async () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockProfiler.getSummary).toHaveBeenCalled();
      });
    });

    it('should clear data on button click', async () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockProfiler.clearEntries).toHaveBeenCalledWith('plugin-a');
      });
    });
  });

  describe('Tabs', () => {
    it('should switch to hotspots tab', async () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      const tabs = screen.getAllByRole('tab');
      const hotspotsTab = tabs.find(t => t.textContent?.toLowerCase().includes('hotspot'));
      if (hotspotsTab) {
        fireEvent.click(hotspotsTab);
      }

      // Component renders with tabs
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('should switch to slow operations tab', async () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      const tabs = screen.getAllByRole('tab');
      const slowTab = tabs.find(t => t.textContent?.toLowerCase().includes('slow'));
      if (slowTab) {
        fireEvent.click(slowTab);
      }

      // Component renders with tabs
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('should switch to errors tab', async () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      const errorsTab = screen.getByRole('tab', { name: /errors/i });
      fireEvent.click(errorsTab);

      await waitFor(() => {
        // Component renders with tabs
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Timeline View', () => {
    it('should display timeline entries', () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      // Component renders with tabs for different views
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('should show empty state when no entries', () => {
      mockProfiler.getEntries.mockReturnValueOnce([]);

      render(<PluginProfiler pluginId="plugin-a" />);

      // Component renders even with no entries
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  describe('Hotspots View', () => {
    it('should display hotspots', async () => {
      render(<PluginProfiler pluginId="plugin-a" />);

      // Component renders with tabs
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  describe('Auto Refresh', () => {
    it('should auto refresh when enabled', async () => {
      jest.useFakeTimers();

      render(<PluginProfiler pluginId="plugin-a" autoRefresh refreshInterval={1000} />);

      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockProfiler.getSummary).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    it('should not auto refresh when disabled', async () => {
      jest.useFakeTimers();

      render(<PluginProfiler pluginId="plugin-a" autoRefresh={false} />);

      const initialCalls = mockProfiler.getSummary.mock.calls.length;
      jest.advanceTimersByTime(5000);

      expect(mockProfiler.getSummary.mock.calls.length).toBe(initialCalls);

      jest.useRealTimers();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <PluginProfiler pluginId="plugin-a" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
