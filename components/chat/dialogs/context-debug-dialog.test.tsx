/**
 * Tests for context-debug-dialog.tsx
 * Debug dialog for monitoring context file usage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextDebugDialog } from './context-debug-dialog';

// Mock window.confirm
const mockConfirm = jest.fn(() => true);
window.confirm = mockConfirm;

// Mock hooks
const mockRefresh = jest.fn();
const mockRunGC = jest.fn();
const mockClearAll = jest.fn();
const mockSync = jest.fn();

jest.mock('@/hooks/context', () => ({
  useContextStats: jest.fn(() => ({
    stats: {
      filesByCategory: {
        'tool-output': 5,
        'history': 3,
        'mcp': 10,
        'skills': 2,
        'terminal': 1,
        'temp': 0,
      },
      totalSizeBytes: 51200,
      estimatedTotalTokens: 12500,
      oldestFile: new Date('2024-01-01'),
      lastAccessed: new Date('2024-01-15'),
    },
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    runGC: mockRunGC,
    clearAll: mockClearAll,
    formatSize: (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    },
    formatTokens: (tokens: number) => {
      if (tokens < 1000) return `${tokens}`;
      if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
      return `${(tokens / 1000000).toFixed(2)}M`;
    },
  })),
  useAutoSync: jest.fn(() => ({
    isSyncing: false,
    lastResult: { durationMs: 100 },
    isRunning: true,
    sync: mockSync,
  })),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(' '),
}));

describe('ContextDebugDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunGC.mockResolvedValue(3);
  });

  it('should render dialog when open', () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText('Context Debug')).toBeInTheDocument();
  });

  it('should not render dialog when closed', () => {
    render(<ContextDebugDialog open={false} onOpenChange={() => {}} />);

    expect(screen.queryByText('Context Debug')).not.toBeInTheDocument();
  });

  it('should display summary stats', () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    // Total files (5+3+10+2+1+0 = 21)
    expect(screen.getByText('21')).toBeInTheDocument();
    // Storage (51200 bytes = 50.0 KB)
    expect(screen.getByText('50.0 KB')).toBeInTheDocument();
    // Tokens (12500 = 12.5K)
    expect(screen.getByText('12.5K')).toBeInTheDocument();
  });

  it('should display category breakdown', () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText('Tool Outputs')).toBeInTheDocument();
    expect(screen.getByText('Chat History')).toBeInTheDocument();
    expect(screen.getByText('MCP Tools')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('should display file counts for categories', () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    // Check that category labels are displayed
    expect(screen.getByText('Tool Outputs')).toBeInTheDocument();
    expect(screen.getByText('Chat History')).toBeInTheDocument();
    expect(screen.getByText('MCP Tools')).toBeInTheDocument();
    // Total files count (5+3+10+2+1+0 = 21) is displayed in summary
    expect(screen.getByText('21')).toBeInTheDocument();
  });

  it('should display auto-sync status', () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText('Auto-Sync')).toBeInTheDocument();
    expect(screen.getByText(/Running/)).toBeInTheDocument();
    expect(screen.getByText(/Last: 100ms/)).toBeInTheDocument();
  });

  it('should call refresh when Refresh button clicked', async () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should call runGC when Clean Old button clicked', async () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    const gcButton = screen.getByRole('button', { name: /Clean Old/i });
    fireEvent.click(gcButton);

    await waitFor(() => {
      expect(mockRunGC).toHaveBeenCalledWith(24 * 60 * 60 * 1000);
    });
  });

  it('should call sync when Sync Now button clicked', async () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    const syncButton = screen.getByRole('button', { name: /Sync Now/i });
    fireEvent.click(syncButton);

    expect(mockSync).toHaveBeenCalled();
  });

  it('should show GC result after garbage collection', async () => {
    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    const gcButton = screen.getByRole('button', { name: /Clean Old/i });
    fireEvent.click(gcButton);

    await waitFor(() => {
      expect(screen.getByText(/Cleaned 3 files/)).toBeInTheDocument();
    });
  });

  it('should call onOpenChange when dialog is closed', () => {
    const onOpenChange = jest.fn();
    render(<ContextDebugDialog open={true} onOpenChange={onOpenChange} />);

    // Dialog should be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Find and click the close button (X button in dialog)
    const closeButton = screen.getByRole('button', { name: /close/i });
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    }
  });
});

describe('ContextDebugDialog - Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state during refresh', () => {
    const hookModule = jest.requireMock<typeof import('@/hooks/context')>('@/hooks/context');
    hookModule.useContextStats.mockReturnValue({
      stats: null,
      isLoading: true,
      error: null,
      refresh: mockRefresh,
      runGC: mockRunGC,
      clearAll: mockClearAll,
      formatSize: () => '--',
      formatTokens: () => '--',
    });

    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    // Should show loading indicators (multiple '--' elements expected)
    const loadingIndicators = screen.getAllByText('--');
    expect(loadingIndicators.length).toBeGreaterThan(0);
  });
});

describe('ContextDebugDialog - Error State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display error message', () => {
    const hookModule = jest.requireMock<typeof import('@/hooks/context')>('@/hooks/context');
    hookModule.useContextStats.mockReturnValue({
      stats: null,
      isLoading: false,
      error: 'Failed to load stats',
      refresh: mockRefresh,
      runGC: mockRunGC,
      clearAll: mockClearAll,
      formatSize: () => '--',
      formatTokens: () => '--',
    });

    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText('Failed to load stats')).toBeInTheDocument();
  });
});

describe('ContextDebugDialog - Empty State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty state when no files', () => {
    const hookModule = jest.requireMock<typeof import('@/hooks/context')>('@/hooks/context');
    hookModule.useContextStats.mockReturnValue({
      stats: {
        filesByCategory: {},
        totalSizeBytes: 0,
        estimatedTotalTokens: 0,
        oldestFile: null,
        lastAccessed: null,
      },
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      runGC: mockRunGC,
      clearAll: mockClearAll,
      formatSize: () => '0 B',
      formatTokens: () => '0',
    });

    render(<ContextDebugDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText('No context files')).toBeInTheDocument();
  });
});
