/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitHubConfigForm } from './github-config';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock sync store with mutable state
const mockSetGitHubConfig = jest.fn();

const mockGitHubStoreState = {
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
    gistId: undefined as string | undefined,
  },
};

jest.mock('@/stores/sync', () => ({
  useSyncStore: () => ({
    ...mockGitHubStoreState,
    githubConfig: {
      maxBackups: 10,
      syncDataTypes: [],
      ...mockGitHubStoreState.githubConfig,
    },
    setGitHubConfig: mockSetGitHubConfig,
  }),
}));

// Helper to reset mock state to defaults
const resetGitHubMockState = () => {
  mockGitHubStoreState.githubConfig = {
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
    gistId: undefined,
  };
};

// Mock lib/sync
const mockStoreGitHubToken = jest.fn();
const mockGetGitHubToken = jest.fn().mockResolvedValue(null);
const mockInitGitHub = jest.fn();
const mockTestConnection = jest.fn();

jest.mock('@/lib/sync', () => ({
  storeGitHubToken: (...args: unknown[]) => mockStoreGitHubToken(...args),
  getGitHubToken: () => mockGetGitHubToken(),
  getSyncManager: () => ({
    initGitHub: mockInitGitHub,
    testConnection: mockTestConnection,
  }),
}));

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true });

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant, size, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} type={type} data-variant={variant} data-size={size} className={className}>
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

jest.mock('@/components/ui/input', () => ({
  Input: ({ id, placeholder, value, onChange, type, className }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      type={type}
      className={className}
      data-testid={`input-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <button
      data-testid="switch"
      data-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      {checked ? 'On' : 'Off'}
    </button>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('local')}>Change</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Select Value</span>,
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step }: { value: number[]; onValueChange: (v: number[]) => void; min: number; max: number; step: number }) => (
    <input
      type="range"
      data-testid="slider"
      value={value[0]}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange([parseInt(e.target.value)])}
    />
  ),
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GitHubConfigForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGitHubMockState();
    mockGetGitHubToken.mockResolvedValue(null);
  });

  it('renders without crashing', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays GitHub configuration title', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('githubConfig')).toBeInTheDocument();
  });

  it('displays GitHub configuration description', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('githubConfigDesc')).toBeInTheDocument();
  });

  it('displays enable sync label', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('enabled')).toBeInTheDocument();
  });

  it('displays personal access token input', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByTestId('input-github-token')).toBeInTheDocument();
  });

  it('displays gist mode switch', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('gistMode')).toBeInTheDocument();
  });

  it('displays remote path input', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByTestId('input-github-path')).toBeInTheDocument();
  });

  it('displays auto sync switch', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('autoSync')).toBeInTheDocument();
  });

  it('displays conflict resolution select', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('conflictResolution')).toBeInTheDocument();
  });

  it('displays sync on startup switch', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('syncOnStartup')).toBeInTheDocument();
  });

  it('displays sync on exit switch', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('syncOnExit')).toBeInTheDocument();
  });

  it('displays save and connect button', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('saveAndConnect')).toBeInTheDocument();
  });

  it('displays create token link', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('createToken')).toBeInTheDocument();
  });
});

describe('GitHubConfigForm repository mode (not gist)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGitHubToken.mockResolvedValue(null);
    mockGitHubStoreState.githubConfig = {
      enabled: true,
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
      gistId: undefined,
    };
  });

  it('displays repository owner input when not in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByTestId('input-github-owner')).toBeInTheDocument();
  });

  it('displays repository name input when not in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByTestId('input-github-repo')).toBeInTheDocument();
  });

  it('displays branch input when not in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByTestId('input-github-branch')).toBeInTheDocument();
  });

  it('displays create private repo switch when not in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByText('createPrivateRepo')).toBeInTheDocument();
  });

  it('does not display gist ID input when not in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.queryByTestId('input-github-gist')).not.toBeInTheDocument();
  });
});

describe('GitHubConfigForm gist mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGitHubToken.mockResolvedValue(null);
    mockGitHubStoreState.githubConfig = {
      enabled: true,
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
      gistMode: true,
      gistId: '',
    };
  });

  it('displays gist ID input when in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.getByTestId('input-github-gist')).toBeInTheDocument();
  });

  it('does not display repository owner input when in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.queryByTestId('input-github-owner')).not.toBeInTheDocument();
  });

  it('does not display repository name input when in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.queryByTestId('input-github-repo')).not.toBeInTheDocument();
  });

  it('does not display branch input when in gist mode', () => {
    render(<GitHubConfigForm />);
    expect(screen.queryByTestId('input-github-branch')).not.toBeInTheDocument();
  });
});

describe('GitHubConfigForm interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGitHubMockState();
    mockGetGitHubToken.mockResolvedValue(null);
  });

  it('renders multiple switches for configuration', () => {
    render(<GitHubConfigForm />);
    const switches = screen.getAllByTestId('switch');
    expect(switches.length).toBeGreaterThan(0);
  });

  it('calls setGitHubConfig when a switch is toggled', () => {
    render(<GitHubConfigForm />);
    const switches = screen.getAllByTestId('switch');
    fireEvent.click(switches[0]);
    expect(mockSetGitHubConfig).toHaveBeenCalled();
  });

  it('calls setGitHubConfig when remote path is changed', () => {
    render(<GitHubConfigForm />);
    const input = screen.getByTestId('input-github-path');
    fireEvent.change(input, { target: { value: 'new-path/' } });
    expect(mockSetGitHubConfig).toHaveBeenCalledWith({ remotePath: 'new-path/' });
  });

  it('opens GitHub token page when create token is clicked', () => {
    render(<GitHubConfigForm />);
    const createTokenButton = screen.getByText('createToken');
    fireEvent.click(createTokenButton);
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://github.com/settings/tokens/new?scopes=repo,gist&description=Cognia%20Sync',
      '_blank'
    );
  });
});

describe('GitHubConfigForm repository settings interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGitHubStoreState.githubConfig = {
      enabled: true,
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
      gistId: undefined,
    };
  });

  it('calls setGitHubConfig when repo owner is changed', () => {
    render(<GitHubConfigForm />);
    const input = screen.getByTestId('input-github-owner');
    fireEvent.change(input, { target: { value: 'testowner' } });
    expect(mockSetGitHubConfig).toHaveBeenCalledWith({ repoOwner: 'testowner' });
  });

  it('calls setGitHubConfig when repo name is changed', () => {
    render(<GitHubConfigForm />);
    const input = screen.getByTestId('input-github-repo');
    fireEvent.change(input, { target: { value: 'my-repo' } });
    expect(mockSetGitHubConfig).toHaveBeenCalledWith({ repoName: 'my-repo' });
  });

  it('calls setGitHubConfig when branch is changed', () => {
    render(<GitHubConfigForm />);
    const input = screen.getByTestId('input-github-branch');
    fireEvent.change(input, { target: { value: 'develop' } });
    expect(mockSetGitHubConfig).toHaveBeenCalledWith({ branch: 'develop' });
  });
});

describe('GitHubConfigForm save functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGitHubMockState();
    mockGetGitHubToken.mockResolvedValue('storedtoken');
    mockStoreGitHubToken.mockResolvedValue(undefined);
    mockInitGitHub.mockResolvedValue(undefined);
    mockTestConnection.mockResolvedValue({ success: true });
  });

  it('stores token and tests connection on save', async () => {
    render(<GitHubConfigForm />);
    
    const tokenInput = screen.getByTestId('input-github-token');
    fireEvent.change(tokenInput, { target: { value: 'ghp_newtoken123' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockStoreGitHubToken).toHaveBeenCalledWith('ghp_newtoken123');
    });
  });

  it('shows success toast on successful connection', async () => {
    const { toast } = jest.requireMock('@/components/ui/sonner');
    mockTestConnection.mockResolvedValue({ success: true });
    
    render(<GitHubConfigForm />);
    
    const tokenInput = screen.getByTestId('input-github-token');
    fireEvent.change(tokenInput, { target: { value: 'ghp_token' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('shows error toast on failed connection', async () => {
    const { toast } = jest.requireMock('@/components/ui/sonner');
    mockTestConnection.mockResolvedValue({ success: false, error: 'Invalid token' });
    
    render(<GitHubConfigForm />);
    
    const tokenInput = screen.getByTestId('input-github-token');
    fireEvent.change(tokenInput, { target: { value: 'ghp_token' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('shows error when no token is provided', async () => {
    const { toast } = jest.requireMock('@/components/ui/sonner');
    mockGetGitHubToken.mockResolvedValue(null);
    
    render(<GitHubConfigForm />);
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('calls onConnectionStatusChange with success on successful connection', async () => {
    const onConnectionStatusChange = jest.fn();
    mockTestConnection.mockResolvedValue({ success: true });
    
    render(<GitHubConfigForm onConnectionStatusChange={onConnectionStatusChange} />);
    
    const tokenInput = screen.getByTestId('input-github-token');
    fireEvent.change(tokenInput, { target: { value: 'ghp_token' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onConnectionStatusChange).toHaveBeenCalledWith('success');
    });
  });

  it('calls onConnectionStatusChange with error on failed connection', async () => {
    const onConnectionStatusChange = jest.fn();
    mockTestConnection.mockResolvedValue({ success: false, error: 'Failed' });
    
    render(<GitHubConfigForm onConnectionStatusChange={onConnectionStatusChange} />);
    
    const tokenInput = screen.getByTestId('input-github-token');
    fireEvent.change(tokenInput, { target: { value: 'ghp_token' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onConnectionStatusChange).toHaveBeenCalledWith('error');
    });
  });
});

describe('GitHubConfigForm token visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGitHubMockState();
    mockGetGitHubToken.mockResolvedValue(null);
  });

  it('token input is hidden by default', () => {
    render(<GitHubConfigForm />);
    const tokenInput = screen.getByTestId('input-github-token');
    expect(tokenInput).toHaveAttribute('type', 'password');
  });

  it('toggles token visibility when eye button is clicked', () => {
    render(<GitHubConfigForm />);
    
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.getAttribute('data-variant') === 'ghost');
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
      const tokenInput = screen.getByTestId('input-github-token');
      expect(tokenInput).toHaveAttribute('type', 'text');
    }
  });
});

describe('GitHubConfigForm with auto sync enabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGitHubStoreState.githubConfig = {
      enabled: true,
      autoSync: true,
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
      gistId: undefined,
    };
  });

  it('displays sync interval slider when auto sync is enabled', () => {
    render(<GitHubConfigForm />);
    const syncIntervalSlider = screen
      .getAllByTestId('slider')
      .find((slider) => slider.getAttribute('max') === '240');
    expect(syncIntervalSlider).toBeInTheDocument();
  });

  it('calls setGitHubConfig when sync interval is changed', () => {
    render(<GitHubConfigForm />);
    const syncIntervalSlider = screen
      .getAllByTestId('slider')
      .find((slider) => slider.getAttribute('max') === '240');
    expect(syncIntervalSlider).toBeDefined();
    fireEvent.change(syncIntervalSlider!, { target: { value: '120' } });
    expect(mockSetGitHubConfig).toHaveBeenCalledWith({ syncInterval: 120 });
  });
});

describe('GitHubConfigForm gist mode interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGitHubStoreState.githubConfig = {
      enabled: true,
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
      gistMode: true,
      gistId: 'abc123',
    };
  });

  it('calls setGitHubConfig when gist ID is changed', () => {
    render(<GitHubConfigForm />);
    const input = screen.getByTestId('input-github-gist');
    fireEvent.change(input, { target: { value: 'newgistid' } });
    expect(mockSetGitHubConfig).toHaveBeenCalledWith({ gistId: 'newgistid' });
  });

  it('calls setGitHubConfig with undefined when gist ID is cleared', () => {
    render(<GitHubConfigForm />);
    const input = screen.getByTestId('input-github-gist');
    fireEvent.change(input, { target: { value: '' } });
    expect(mockSetGitHubConfig).toHaveBeenCalledWith({ gistId: undefined });
  });
});
