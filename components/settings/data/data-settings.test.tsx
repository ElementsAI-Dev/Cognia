/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DataSettings } from './data-settings';

const mockParseImportFile = jest.fn();
const mockImportFullBackup = jest.fn();
const mockDownloadExport = jest.fn();
const mockStorageClearAll = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockSessionsList = jest.fn();
const mockProjectsList = jest.fn();
const mockSummarySetCurrentSession = jest.fn();
const mockSessionSetState = jest.fn();
const mockSessionGetState = jest.fn();
const mockProjectSetState = jest.fn();

// Mock stores - inline to avoid hoisting issues
jest.mock('@/stores', () => {
  let sessionState: Record<string, unknown> = {
    sessions: [{ id: '1', title: 'Test Session' }],
    clearAllSessions: jest.fn(),
    activeSessionId: null,
  };
  let projectState: Record<string, unknown> = {
    projects: [],
    activeProjectId: null,
    clearAllProjects: jest.fn(),
  };

  const useSessionStore = Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => selector(sessionState),
    {
      setState: (updater: Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown>)) => {
        const nextState = typeof updater === 'function' ? updater(sessionState) : updater;
        sessionState = { ...sessionState, ...nextState };
        mockSessionSetState(nextState);
      },
      getState: () => {
        mockSessionGetState();
        return sessionState;
      },
    }
  );

  const useProjectStore = Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => selector(projectState),
    {
      setState: (updater: Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown>)) => {
        const nextState = typeof updater === 'function' ? updater(projectState) : updater;
        projectState = { ...projectState, ...nextState };
        mockProjectSetState(nextState);
      },
      getState: () => projectState,
    }
  );

  const artifactStore = Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => {
      const state = { artifacts: {} };
      return selector(state);
    },
    { getState: () => ({ artifacts: {} }) }
  );
  
  return {
    useSessionStore,
    useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {};
      return selector(state);
    },
    useArtifactStore: artifactStore,
    useBackupStore: (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        markBackupComplete: jest.fn(),
        dismissReminder: jest.fn(),
        shouldShowReminder: jest.fn(() => false),
        daysSinceLastBackup: jest.fn(() => null),
      };
      return selector(state);
    },
    useProjectStore,
    useSummaryStore: (selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        setCurrentSession: mockSummarySetCurrentSession,
      };
      return selector(state);
    },
  };
});

jest.mock('@/lib/storage', () => ({
  downloadExport: (...args: unknown[]) => mockDownloadExport(...args),
  parseImportFile: (...args: unknown[]) => mockParseImportFile(...args),
  importFullBackup: (...args: unknown[]) => mockImportFullBackup(...args),
  StorageManager: {
    clearAllCogniaData: (...args: unknown[]) => mockStorageClearAll(...args),
  },
}));

jest.mock('@/lib/storage/persistence/unified-persistence-service', () => ({
  unifiedPersistenceService: {
    sessions: {
      list: (...args: unknown[]) => mockSessionsList(...args),
    },
    projects: {
      list: (...args: unknown[]) => mockProjectsList(...args),
    },
  },
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock('@/hooks/storage', () => ({
  useStorageStats: () => ({
    stats: null,
    health: null,
    isLoading: false,
    refresh: jest.fn(),
    formatBytes: (value: number) => `${value}B`,
  }),
  useStorageCleanup: () => ({
    clearCategory: jest.fn().mockResolvedValue(0),
    isRunning: false,
  }),
}));

// Mock db
jest.mock('@/lib/db', () => ({
  db: {
    messages: { toArray: jest.fn().mockResolvedValue([]) },
  },
}));

// Mock BatchExportDialog
jest.mock('@/components/export', () => ({
  BatchExportDialog: () => <div data-testid="batch-export-dialog">Batch Export</div>,
}));

jest.mock('./storage-breakdown', () => ({
  StorageBreakdown: () => <div data-testid="storage-breakdown" />,
}));

jest.mock('./storage-health', () => ({
  StorageHealthDisplay: () => <div data-testid="storage-health" />,
}));

jest.mock('./storage-cleanup-dialog', () => ({
  StorageCleanupDialog: ({ trigger }: { trigger: React.ReactNode }) => (
    <div data-testid="storage-cleanup-dialog">{trigger}</div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
}));

describe('DataSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParseImportFile.mockResolvedValue({
      data: {
        version: '3.0',
        manifest: {
          version: '3.0',
          schemaVersion: 3,
          traceId: 'trace-id',
          exportedAt: new Date().toISOString(),
          backend: 'web-dexie',
          integrity: {
            algorithm: 'SHA-256',
            checksum: '',
          },
        },
        payload: {
          sessions: [],
          messages: [],
          projects: [],
          knowledgeFiles: [],
          summaries: [],
        },
      },
      errors: [],
      classifiedErrors: [],
    });
    mockImportFullBackup.mockResolvedValue({
      success: true,
      imported: {
        sessions: 1,
        messages: 0,
        artifacts: 0,
        documents: 0,
        projects: 1,
        settings: true,
      },
      skipped: {
        sessions: 0,
        messages: 0,
        artifacts: 0,
      },
      errors: [],
      warnings: [],
      warningDetails: [],
      duration: 1,
    });
    mockSessionsList.mockResolvedValue([{ id: 'persisted-session-1', title: 'Persisted Session' }]);
    mockProjectsList.mockResolvedValue([{ id: 'persisted-project-1', name: 'Persisted Project' }]);
    mockStorageClearAll.mockResolvedValue({ localStorage: 0, indexedDB: true });
  });

  it('renders without crashing', () => {
    render(<DataSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays storage section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Storage')).toBeInTheDocument();
  });

  it('displays Export & Import section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Export & Import')).toBeInTheDocument();
  });

  it('displays Danger Zone section', () => {
    render(<DataSettings />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('displays Export button', () => {
    render(<DataSettings />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('displays Import button', () => {
    render(<DataSettings />);
    expect(screen.getAllByText('Import').length).toBeGreaterThan(0);
  });

  it('displays Batch Export button', () => {
    render(<DataSettings />);
    expect(screen.getByText('Batch Export')).toBeInTheDocument();
  });

  it('displays Delete All Data button', () => {
    render(<DataSettings />);
    expect(screen.getByText('Delete All Data')).toBeInTheDocument();
  });

  it('displays batch export dialog', () => {
    render(<DataSettings />);
    expect(screen.getByTestId('batch-export-dialog')).toBeInTheDocument();
  });

  it('displays Data Privacy alert', () => {
    render(<DataSettings />);
    expect(screen.getByText('Data Privacy')).toBeInTheDocument();
  });

  it('displays sessions count', () => {
    render(<DataSettings />);
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  it('displays artifacts count', () => {
    render(<DataSettings />);
    expect(screen.getByText('Artifacts')).toBeInTheDocument();
  });

  it('displays localStorage info', () => {
    render(<DataSettings />);
    expect(screen.getByText('Local Storage')).toBeInTheDocument();
  });

  it('displays IndexedDB info', () => {
    render(<DataSettings />);
    expect(screen.getByText('IndexedDB')).toBeInTheDocument();
  });

  it('displays optional manual passphrase field', () => {
    render(<DataSettings />);
    expect(screen.getByText('Optional manual passphrase')).toBeInTheDocument();
  });

  it('shows passphrase-required feedback for classified encrypted import errors', async () => {
    mockParseImportFile.mockResolvedValueOnce({
      data: null,
      errors: ['Encrypted backup requires a passphrase'],
      classifiedErrors: [{ category: 'passphrase-required', message: 'Encrypted backup requires a passphrase' }],
    });

    const { container } = render(<DataSettings />);
    const fileInput = container.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['{}'], 'backup.json', { type: 'application/json' })],
      },
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('Encrypted backup detected')
      );
    });
    expect(mockImportFullBackup).not.toHaveBeenCalled();
  });

  it('keeps retry UX and shows passphrase retry failure for decrypt-failed errors', async () => {
    mockParseImportFile
      .mockResolvedValueOnce({
        data: null,
        errors: ['Encrypted backup requires a passphrase'],
        classifiedErrors: [{ category: 'passphrase-required', message: 'Encrypted backup requires a passphrase' }],
      })
      .mockResolvedValueOnce({
        data: null,
        errors: ['Failed to decrypt backup package'],
        classifiedErrors: [{ category: 'decrypt-failed', message: 'Failed to decrypt backup package' }],
      });

    const { container } = render(<DataSettings />);
    const fileInput = container.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['{}'], 'backup.json', { type: 'application/json' })],
      },
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('Encrypted backup detected')
      );
    });

    fireEvent.change(screen.getByLabelText('Backup passphrase'), {
      target: { value: 'wrong-passphrase' },
    });

    const importButtons = screen.getAllByRole('button', { name: 'Import' });
    fireEvent.click(importButtons[importButtons.length - 1]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('Passphrase invalid or backup file is corrupted')
      );
    });
  });

  it('refreshes session/project state deterministically after successful import', async () => {
    const { container } = render(<DataSettings />);
    const fileInput = container.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['{}'], 'backup.json', { type: 'application/json' })],
      },
    });

    await waitFor(() => {
      expect(mockSessionSetState).toHaveBeenCalled();
      expect(mockProjectSetState).toHaveBeenCalled();
      expect(mockSummarySetCurrentSession).toHaveBeenCalledWith('persisted-session-1');
    });
  });
});
