/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncSettings } from './sync-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock sync store with mutable state
const mockSetActiveProvider = jest.fn();
const mockStartSync = jest.fn();
const mockTestConnection = jest.fn();

const mockSyncStoreState = {
  activeProvider: null as string | null,
  webdavConfig: {
    enabled: false,
    autoSync: false,
    syncInterval: 30,
    lastSyncAt: null as string | null,
    syncOnStartup: false,
    syncOnExit: false,
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    serverUrl: '',
    username: '',
    remotePath: '/cognia-sync/',
    useDigestAuth: false,
  },
  githubConfig: {
    enabled: false,
    autoSync: false,
    syncInterval: 60,
    lastSyncAt: null as string | null,
    syncOnStartup: false,
    syncOnExit: false,
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    repoOwner: '',
    repoName: 'cognia-sync',
    branch: 'main',
    remotePath: 'backup/',
    createPrivateRepo: true,
    gistMode: false,
  },
  status: 'idle' as string,
  lastError: null as string | null,
};

jest.mock('@/stores/sync', () => ({
  useSyncStore: () => ({
    ...mockSyncStoreState,
    setActiveProvider: mockSetActiveProvider,
    startSync: mockStartSync,
    testConnection: mockTestConnection,
  }),
}));

// Mock lib/sync
jest.mock('@/lib/sync', () => ({
  initSyncScheduler: jest.fn(),
}));

// Mock child components
jest.mock('./webdav-config', () => ({
  WebDAVConfigForm: ({ onConnectionStatusChange }: { onConnectionStatusChange?: (status: string) => void }) => (
    <div data-testid="webdav-config-form" onClick={() => onConnectionStatusChange?.('success')}>
      WebDAV Config Form
    </div>
  ),
}));

jest.mock('./github-config', () => ({
  GitHubConfigForm: ({ onConnectionStatusChange }: { onConnectionStatusChange?: (status: string) => void }) => (
    <div data-testid="github-config-form" onClick={() => onConnectionStatusChange?.('success')}>
      GitHub Config Form
    </div>
  ),
}));

jest.mock('./sync-history-dialog', () => ({
  SyncHistoryDialog: () => <div data-testid="sync-history-dialog">Sync History</div>,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant }: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string; variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-size={size} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange('webdav')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Helper to reset mock state to defaults
const resetMockState = () => {
  mockSyncStoreState.activeProvider = null;
  mockSyncStoreState.webdavConfig = {
    enabled: false,
    autoSync: false,
    syncInterval: 30,
    lastSyncAt: null,
    syncOnStartup: false,
    syncOnExit: false,
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    serverUrl: '',
    username: '',
    remotePath: '/cognia-sync/',
    useDigestAuth: false,
  };
  mockSyncStoreState.githubConfig = {
    enabled: false,
    autoSync: false,
    syncInterval: 60,
    lastSyncAt: null,
    syncOnStartup: false,
    syncOnExit: false,
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    repoOwner: '',
    repoName: 'cognia-sync',
    branch: 'main',
    remotePath: 'backup/',
    createPrivateRepo: true,
    gistMode: false,
  };
  mockSyncStoreState.status = 'idle';
  mockSyncStoreState.lastError = null;
};

describe('SyncSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
  });

  it('renders without crashing', () => {
    render(<SyncSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays cloud sync title', () => {
    render(<SyncSettings />);
    expect(screen.getByText('cloudSync')).toBeInTheDocument();
  });

  it('displays cloud sync description', () => {
    render(<SyncSettings />);
    expect(screen.getByText('cloudSyncDesc')).toBeInTheDocument();
  });

  it('displays provider selector label', () => {
    render(<SyncSettings />);
    expect(screen.getByText('syncProvider')).toBeInTheDocument();
  });

  it('renders select component for provider selection', () => {
    render(<SyncSettings />);
    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('does not show provider config forms when no provider selected', () => {
    render(<SyncSettings />);
    expect(screen.queryByTestId('webdav-config-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('github-config-form')).not.toBeInTheDocument();
  });

  it('calls setActiveProvider when provider is selected', () => {
    render(<SyncSettings />);
    const select = screen.getByTestId('select');
    fireEvent.click(select);
    expect(mockSetActiveProvider).toHaveBeenCalledWith('webdav');
  });
});

describe('SyncSettings with WebDAV provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    mockSyncStoreState.activeProvider = 'webdav';
    mockSyncStoreState.webdavConfig = {
      enabled: true,
      autoSync: false,
      syncInterval: 30,
      lastSyncAt: '2024-01-01T00:00:00Z',
      syncOnStartup: false,
      syncOnExit: false,
      conflictResolution: 'newest',
      syncDirection: 'bidirectional',
      serverUrl: 'https://example.com/dav',
      username: 'testuser',
      remotePath: '/cognia-sync/',
      useDigestAuth: false,
    };
    mockSyncStoreState.githubConfig = {
      enabled: false,
      autoSync: false,
      syncInterval: 60,
      lastSyncAt: null,
      syncOnStartup: false,
      syncOnExit: false,
      conflictResolution: 'newest',
      syncDirection: 'bidirectional',
      repoOwner: '',
      repoName: 'cognia-sync',
      branch: 'main',
      remotePath: 'backup/',
      createPrivateRepo: true,
      gistMode: false,
    };
    mockSyncStoreState.status = 'idle';
    mockSyncStoreState.lastError = null;
  });

  it('shows WebDAV config form when webdav provider is active', () => {
    render(<SyncSettings />);
    expect(screen.getByTestId('webdav-config-form')).toBeInTheDocument();
  });

  it('displays status indicator when provider is active', () => {
    render(<SyncSettings />);
    // The component renders 'status:' with the colon after it
    expect(screen.getByText(/status/i)).toBeInTheDocument();
  });

  it('displays last sync time when available', () => {
    render(<SyncSettings />);
    // lastSync text includes a colon and date, so use regex
    expect(screen.getByText(/lastSync/)).toBeInTheDocument();
  });
});

describe('SyncSettings with GitHub provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    mockSyncStoreState.activeProvider = 'github';
    mockSyncStoreState.webdavConfig.enabled = false;
    mockSyncStoreState.webdavConfig.lastSyncAt = null;
    mockSyncStoreState.githubConfig = {
      enabled: true,
      autoSync: false,
      syncInterval: 60,
      lastSyncAt: null,
      syncOnStartup: false,
      syncOnExit: false,
      conflictResolution: 'newest',
      syncDirection: 'bidirectional',
      repoOwner: 'testowner',
      repoName: 'cognia-sync',
      branch: 'main',
      remotePath: 'backup/',
      createPrivateRepo: true,
      gistMode: false,
    };
    mockSyncStoreState.status = 'idle';
    mockSyncStoreState.lastError = null;
  });

  it('shows GitHub config form when github provider is active', () => {
    render(<SyncSettings />);
    expect(screen.getByTestId('github-config-form')).toBeInTheDocument();
  });
});

describe('SyncSettings sync actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    mockStartSync.mockResolvedValue({ success: true, itemsSynced: 5 });
    mockTestConnection.mockResolvedValue({ success: true });
    mockSyncStoreState.activeProvider = 'webdav';
    mockSyncStoreState.webdavConfig.enabled = true;
    mockSyncStoreState.webdavConfig.autoSync = false;
    mockSyncStoreState.webdavConfig.syncInterval = 30;
    mockSyncStoreState.webdavConfig.lastSyncAt = null;
    mockSyncStoreState.githubConfig.enabled = false;
    mockSyncStoreState.status = 'idle';
    mockSyncStoreState.lastError = null;
  });

  it('displays sync actions card when provider is enabled', () => {
    render(<SyncSettings />);
    expect(screen.getByText('syncActions')).toBeInTheDocument();
  });

  it('displays test connection button', () => {
    render(<SyncSettings />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('displays sync now button', () => {
    render(<SyncSettings />);
    expect(screen.getByText('syncNow')).toBeInTheDocument();
  });

  it('displays upload button', () => {
    render(<SyncSettings />);
    expect(screen.getByText('uploadOnly')).toBeInTheDocument();
  });

  it('displays download button', () => {
    render(<SyncSettings />);
    expect(screen.getByText('downloadOnly')).toBeInTheDocument();
  });

  it('displays sync history dialog', () => {
    render(<SyncSettings />);
    expect(screen.getByTestId('sync-history-dialog')).toBeInTheDocument();
  });

  it('calls testConnection when test button is clicked', async () => {
    render(<SyncSettings />);
    const testButton = screen.getByText('test');
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalled();
    });
  });

  it('calls startSync with bidirectional when sync now button is clicked', async () => {
    render(<SyncSettings />);
    const syncButton = screen.getByText('syncNow');
    fireEvent.click(syncButton);
    
    await waitFor(() => {
      expect(mockStartSync).toHaveBeenCalledWith('bidirectional');
    });
  });

  it('calls startSync with upload when upload button is clicked', async () => {
    render(<SyncSettings />);
    const uploadButton = screen.getByText('uploadOnly');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(mockStartSync).toHaveBeenCalledWith('upload');
    });
  });

  it('calls startSync with download when download button is clicked', async () => {
    render(<SyncSettings />);
    const downloadButton = screen.getByText('downloadOnly');
    fireEvent.click(downloadButton);
    
    await waitFor(() => {
      expect(mockStartSync).toHaveBeenCalledWith('download');
    });
  });
});

describe('SyncSettings status states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    mockSyncStoreState.activeProvider = 'webdav';
    mockSyncStoreState.webdavConfig.enabled = true;
    mockSyncStoreState.webdavConfig.lastSyncAt = null;
    mockSyncStoreState.githubConfig.enabled = false;
  });

  it('displays syncing badge when status is syncing', () => {
    mockSyncStoreState.status = 'syncing';
    mockSyncStoreState.lastError = null;
    render(<SyncSettings />);
    expect(screen.getByText('syncing')).toBeInTheDocument();
  });

  it('displays success badge when status is success', () => {
    mockSyncStoreState.status = 'success';
    mockSyncStoreState.lastError = null;
    render(<SyncSettings />);
    expect(screen.getByText('synced')).toBeInTheDocument();
  });

  it('displays error badge when status is error', () => {
    mockSyncStoreState.status = 'error';
    mockSyncStoreState.lastError = null;
    render(<SyncSettings />);
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('displays idle badge when status is idle', () => {
    mockSyncStoreState.status = 'idle';
    mockSyncStoreState.lastError = null;
    render(<SyncSettings />);
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('displays error message when lastError is set', () => {
    mockSyncStoreState.status = 'error';
    mockSyncStoreState.lastError = 'Connection timeout';
    render(<SyncSettings />);
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });
});

describe('SyncSettings handleProviderChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    mockSyncStoreState.activeProvider = 'webdav';
    mockSyncStoreState.webdavConfig.enabled = false;
    mockSyncStoreState.webdavConfig.lastSyncAt = null;
    mockSyncStoreState.githubConfig.enabled = false;
    mockSyncStoreState.status = 'idle';
    mockSyncStoreState.lastError = null;
  });

  it('verifies setActiveProvider is defined', () => {
    render(<SyncSettings />);
    expect(mockSetActiveProvider).toBeDefined();
  });
});
