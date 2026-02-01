/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebDAVConfigForm } from './webdav-config';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock sync store with mutable state
const mockSetWebDAVConfig = jest.fn();

const mockWebDAVStoreState = {
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
};

jest.mock('@/stores/sync', () => ({
  useSyncStore: () => ({
    ...mockWebDAVStoreState,
    setWebDAVConfig: mockSetWebDAVConfig,
  }),
}));

// Helper to reset mock state to defaults
const resetWebDAVMockState = () => {
  mockWebDAVStoreState.webdavConfig = {
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
};

// Mock lib/sync
const mockStoreWebDAVPassword = jest.fn();
const mockGetWebDAVPassword = jest.fn().mockResolvedValue(null);
const _mockGetSyncManager = jest.fn();
const mockInitWebDAV = jest.fn();
const mockTestConnection = jest.fn();

jest.mock('@/lib/sync', () => ({
  storeWebDAVPassword: (...args: unknown[]) => mockStoreWebDAVPassword(...args),
  getWebDAVPassword: () => mockGetWebDAVPassword(),
  getSyncManager: () => ({
    initWebDAV: mockInitWebDAV,
    testConnection: mockTestConnection,
  }),
}));

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

describe('WebDAVConfigForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetWebDAVMockState();
    mockGetWebDAVPassword.mockResolvedValue(null);
  });

  it('renders without crashing', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays WebDAV configuration title', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText('webdavConfig')).toBeInTheDocument();
  });

  it('displays WebDAV configuration description', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText('webdavConfigDesc')).toBeInTheDocument();
  });

  it('displays enable sync label', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText('enabled')).toBeInTheDocument();
  });

  it('displays server URL input', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByTestId('input-webdav-url')).toBeInTheDocument();
  });

  it('displays username input', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByTestId('input-webdav-username')).toBeInTheDocument();
  });

  it('displays password input', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByTestId('input-webdav-password')).toBeInTheDocument();
  });

  it('displays remote path input', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByTestId('input-webdav-path')).toBeInTheDocument();
  });

  it('displays auto sync switch', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText('autoSync')).toBeInTheDocument();
  });

  it('displays conflict resolution select', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText('conflictResolution')).toBeInTheDocument();
  });

  it('displays sync on startup switch', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText('syncOnStartup')).toBeInTheDocument();
  });

  it('displays sync on exit switch', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText('syncOnExit')).toBeInTheDocument();
  });

  it('displays save and connect button', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText('saveAndConnect')).toBeInTheDocument();
  });
});

describe('WebDAVConfigForm interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWebDAVPassword.mockResolvedValue(null);
  });

  it('calls setWebDAVConfig when enable switch is toggled', () => {
    render(<WebDAVConfigForm />);
    const switches = screen.getAllByTestId('switch');
    // First switch is the enable switch
    fireEvent.click(switches[0]);
    expect(mockSetWebDAVConfig).toHaveBeenCalledWith({ enabled: true });
  });

  it('calls setWebDAVConfig when server URL is changed', () => {
    render(<WebDAVConfigForm />);
    const input = screen.getByTestId('input-webdav-url');
    fireEvent.change(input, { target: { value: 'https://example.com/dav' } });
    expect(mockSetWebDAVConfig).toHaveBeenCalledWith({ serverUrl: 'https://example.com/dav' });
  });

  it('calls setWebDAVConfig when username is changed', () => {
    render(<WebDAVConfigForm />);
    const input = screen.getByTestId('input-webdav-username');
    fireEvent.change(input, { target: { value: 'testuser' } });
    expect(mockSetWebDAVConfig).toHaveBeenCalledWith({ username: 'testuser' });
  });

  it('calls setWebDAVConfig when remote path is changed', () => {
    render(<WebDAVConfigForm />);
    const input = screen.getByTestId('input-webdav-path');
    fireEvent.change(input, { target: { value: '/backup/' } });
    expect(mockSetWebDAVConfig).toHaveBeenCalledWith({ remotePath: '/backup/' });
  });

  it('calls setWebDAVConfig when auto sync is toggled', () => {
    render(<WebDAVConfigForm />);
    const switches = screen.getAllByTestId('switch');
    // Second switch is auto sync
    fireEvent.click(switches[1]);
    expect(mockSetWebDAVConfig).toHaveBeenCalledWith({ autoSync: true });
  });

  it('calls setWebDAVConfig when conflict resolution is changed', () => {
    render(<WebDAVConfigForm />);
    const changeButton = screen.getByText('Change');
    fireEvent.click(changeButton);
    expect(mockSetWebDAVConfig).toHaveBeenCalledWith({ conflictResolution: 'local' });
  });
});

describe('WebDAVConfigForm save functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWebDAVPassword.mockResolvedValue('storedpassword');
    mockStoreWebDAVPassword.mockResolvedValue(undefined);
    mockInitWebDAV.mockResolvedValue(undefined);
    mockTestConnection.mockResolvedValue({ success: true });
  });

  it('stores password and tests connection on save', async () => {
    render(<WebDAVConfigForm />);
    
    // Enter a new password
    const passwordInput = screen.getByTestId('input-webdav-password');
    fireEvent.change(passwordInput, { target: { value: 'newpassword' } });
    
    // Click save button
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockStoreWebDAVPassword).toHaveBeenCalledWith('newpassword');
    });
  });

  it('shows success toast on successful connection', async () => {
    const { toast } = jest.requireMock('@/components/ui/sonner');
    mockTestConnection.mockResolvedValue({ success: true });
    
    render(<WebDAVConfigForm />);
    
    const passwordInput = screen.getByTestId('input-webdav-password');
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('shows error toast on failed connection', async () => {
    const { toast } = jest.requireMock('@/components/ui/sonner');
    mockTestConnection.mockResolvedValue({ success: false, error: 'Auth failed' });
    
    render(<WebDAVConfigForm />);
    
    const passwordInput = screen.getByTestId('input-webdav-password');
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('shows error when no password is provided', async () => {
    const { toast } = jest.requireMock('@/components/ui/sonner');
    mockGetWebDAVPassword.mockResolvedValue(null);
    
    render(<WebDAVConfigForm />);
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('calls onConnectionStatusChange with success on successful connection', async () => {
    const onConnectionStatusChange = jest.fn();
    mockTestConnection.mockResolvedValue({ success: true });
    
    render(<WebDAVConfigForm onConnectionStatusChange={onConnectionStatusChange} />);
    
    const passwordInput = screen.getByTestId('input-webdav-password');
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onConnectionStatusChange).toHaveBeenCalledWith('success');
    });
  });

  it('calls onConnectionStatusChange with error on failed connection', async () => {
    const onConnectionStatusChange = jest.fn();
    mockTestConnection.mockResolvedValue({ success: false, error: 'Failed' });
    
    render(<WebDAVConfigForm onConnectionStatusChange={onConnectionStatusChange} />);
    
    const passwordInput = screen.getByTestId('input-webdav-password');
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    
    const saveButton = screen.getByText('saveAndConnect');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onConnectionStatusChange).toHaveBeenCalledWith('error');
    });
  });
});

describe('WebDAVConfigForm password visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWebDAVPassword.mockResolvedValue(null);
  });

  it('password input is hidden by default', () => {
    render(<WebDAVConfigForm />);
    const passwordInput = screen.getByTestId('input-webdav-password');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility when eye button is clicked', () => {
    render(<WebDAVConfigForm />);
    
    const toggleButtons = screen.getAllByRole('button');
    // Find the password toggle button (has ghost variant)
    const toggleButton = toggleButtons.find(btn => btn.getAttribute('data-variant') === 'ghost');
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
      const passwordInput = screen.getByTestId('input-webdav-password');
      expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });
});

describe('WebDAVConfigForm with auto sync enabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebDAVStoreState.webdavConfig = {
      enabled: true,
      autoSync: true,
      syncInterval: 30,
      lastSyncAt: null,
      syncOnStartup: false,
      syncOnExit: false,
      conflictResolution: 'newest',
      syncDirection: 'bidirectional',
      serverUrl: 'https://example.com/dav',
      username: 'testuser',
      remotePath: '/cognia-sync/',
      useDigestAuth: false,
    };
  });

  it('displays sync interval slider when auto sync is enabled', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByTestId('slider')).toBeInTheDocument();
  });

  it('displays current sync interval value', () => {
    render(<WebDAVConfigForm />);
    expect(screen.getByText(/syncInterval/)).toBeInTheDocument();
  });

  it('calls setWebDAVConfig when sync interval is changed', () => {
    render(<WebDAVConfigForm />);
    const slider = screen.getByTestId('slider');
    fireEvent.change(slider, { target: { value: '60' } });
    expect(mockSetWebDAVConfig).toHaveBeenCalledWith({ syncInterval: 60 });
  });
});

describe('WebDAVConfigForm with existing password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWebDAVPassword.mockResolvedValue('existingpassword');
  });

  it('shows placeholder indicating password is stored', async () => {
    render(<WebDAVConfigForm />);
    
    // The component checks for existing password on mount
    await waitFor(() => {
      const passwordInput = screen.getByTestId('input-webdav-password');
      expect(passwordInput).toHaveAttribute('placeholder', '••••••••');
    });
  });
});
