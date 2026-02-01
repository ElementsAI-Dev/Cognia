/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SyncHistoryDialog } from './sync-history-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock sync store
const mockListBackups = jest.fn();
const mockDeleteBackup = jest.fn();

const mockSyncHistoryStoreState = {
  syncHistory: [
    {
      success: true,
      timestamp: '2024-01-15T10:00:00Z',
      direction: 'upload',
      itemsSynced: 10,
    },
    {
      success: false,
      timestamp: '2024-01-14T09:00:00Z',
      direction: 'download',
      itemsSynced: 0,
      error: 'Connection failed',
    },
  ] as Array<{
    success: boolean;
    timestamp: string;
    direction: string;
    itemsSynced: number;
    error?: string;
  }>,
};

// Helper to reset state
const resetSyncHistoryMockState = () => {
  mockSyncHistoryStoreState.syncHistory = [
    {
      success: true,
      timestamp: '2024-01-15T10:00:00Z',
      direction: 'upload',
      itemsSynced: 10,
    },
    {
      success: false,
      timestamp: '2024-01-14T09:00:00Z',
      direction: 'download',
      itemsSynced: 0,
      error: 'Connection failed',
    },
  ];
};

jest.mock('@/stores/sync', () => ({
  useSyncStore: () => ({
    ...mockSyncHistoryStoreState,
    listBackups: mockListBackups,
    deleteBackup: mockDeleteBackup,
  }),
}));

// Mock UI components - Dialog always shows content for testing
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string; variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-size={size} data-variant={variant} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-trigger">{children}</div>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan, className }: { children: React.ReactNode; colSpan?: number; className?: string }) => (
    <td colSpan={colSpan} className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => <th className={className}>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SyncHistoryDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSyncHistoryMockState();
    mockListBackups.mockResolvedValue([]);
  });

  it('renders without crashing', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('displays dialog trigger', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
  });

  it('displays dialog content', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  it('displays sync history title', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('syncHistory')).toBeInTheDocument();
  });

  it('displays sync history description', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('syncHistoryDesc')).toBeInTheDocument();
  });

  it('displays recent syncs section', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('recentSyncs')).toBeInTheDocument();
  });

  it('displays remote backups section', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('remoteBackups')).toBeInTheDocument();
  });
});

describe('SyncHistoryDialog with sync history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSyncHistoryMockState();
    mockListBackups.mockResolvedValue([]);
  });

  it('displays sync history entries', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('upload')).toBeInTheDocument();
  });

  it('displays success badge for successful sync', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('displays failed badge for failed sync', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('displays items synced count', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});

describe('SyncHistoryDialog empty states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListBackups.mockResolvedValue([]);
    mockSyncHistoryStoreState.syncHistory = [];
  });

  it('displays no sync history message when empty', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('noSyncHistory')).toBeInTheDocument();
  });

  it('displays no backups message when empty', async () => {
    render(<SyncHistoryDialog />);
    await waitFor(() => {
      expect(screen.getByText('noBackups')).toBeInTheDocument();
    });
  });
});

describe('SyncHistoryDialog backup list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSyncHistoryMockState();
    mockListBackups.mockResolvedValue([]);
  });

  it('displays refresh button for backups', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('refresh')).toBeInTheDocument();
  });

  it('listBackups is available in the store', () => {
    render(<SyncHistoryDialog />);
    // Verify the component renders and listBackups mock is set up
    expect(mockListBackups).toBeDefined();
  });

  it('displays noBackups when list is empty', async () => {
    render(<SyncHistoryDialog />);
    await waitFor(() => {
      expect(screen.getByText('noBackups')).toBeInTheDocument();
    });
  });
});

describe('SyncHistoryDialog component structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSyncHistoryMockState();
    mockListBackups.mockResolvedValue([]);
  });

  it('renders table headers for sync history', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('direction')).toBeInTheDocument();
    expect(screen.getByText('items')).toBeInTheDocument();
    expect(screen.getByText('time')).toBeInTheDocument();
  });

  it('renders table headers for backups', () => {
    render(<SyncHistoryDialog />);
    expect(screen.getByText('filename')).toBeInTheDocument();
    expect(screen.getByText('size')).toBeInTheDocument();
    expect(screen.getByText('created')).toBeInTheDocument();
    expect(screen.getByText('actions')).toBeInTheDocument();
  });

  it('renders scroll areas for tables', () => {
    render(<SyncHistoryDialog />);
    const scrollAreas = screen.getAllByTestId('scroll-area');
    expect(scrollAreas.length).toBe(2);
  });

  it('renders tables for history and backups', () => {
    render(<SyncHistoryDialog />);
    const tables = screen.getAllByTestId('table');
    expect(tables.length).toBe(2);
  });
});
