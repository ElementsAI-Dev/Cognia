/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexConfigForm } from './convex-config';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockSetConvexConfig = jest.fn((patch: Record<string, unknown>) => {
  mockConvexStoreState.convexConfig = {
    ...mockConvexStoreState.convexConfig,
    ...patch,
  };
});

const mockConvexStoreState = {
  convexConfig: {
    enabled: false,
    autoSync: false,
    syncInterval: 15,
    lastSyncAt: null as string | null,
    syncOnStartup: false,
    syncOnExit: false,
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    maxBackups: 10,
    syncDataTypes: [],
    deploymentUrl: '',
    projectSlug: '',
  },
};

jest.mock('@/stores/sync', () => ({
  useSyncStore: () => ({
    ...mockConvexStoreState,
    setConvexConfig: mockSetConvexConfig,
  }),
}));

const mockStoreConvexDeployKey = jest.fn().mockResolvedValue(true);
const mockGetConvexDeployKey = jest.fn().mockResolvedValue(null);
const mockRemoveConvexDeployKey = jest.fn().mockResolvedValue(true);
const mockInitConvex = jest.fn().mockResolvedValue(undefined);
const mockTestConnection = jest.fn().mockResolvedValue({ success: true });
const mockSetNativeConvexConfig = jest.fn().mockResolvedValue(true);
const mockTestNativeConvexConnection = jest.fn().mockResolvedValue(true);
let mockIsTauri = false;

jest.mock('@/lib/utils', () => ({
  isTauri: () => mockIsTauri,
}));

jest.mock('@/lib/native/convex', () => ({
  setConvexConfig: (...args: unknown[]) => mockSetNativeConvexConfig(...args),
  testConvexConnection: (...args: unknown[]) => mockTestNativeConvexConnection(...args),
}));

jest.mock('@/lib/sync', () => ({
  storeConvexDeployKey: (...args: unknown[]) => mockStoreConvexDeployKey(...args),
  getConvexDeployKey: (...args: unknown[]) => mockGetConvexDeployKey(...args),
  removeConvexDeployKey: (...args: unknown[]) => mockRemoveConvexDeployKey(...args),
  getSyncManager: () => ({
    initConvex: (...args: unknown[]) => mockInitConvex(...args),
    testConnection: (...args: unknown[]) => mockTestConnection(...args),
  }),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock('./sync-advanced-settings', () => ({
  SyncAdvancedSettings: () => <div data-testid="sync-advanced-settings">advanced</div>,
}));

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
  SelectValue: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value: number[]; onValueChange: (v: number[]) => void }) => (
    <input
      data-testid="slider"
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([parseInt(e.target.value, 10)])}
    />
  ),
}));

const resetState = () => {
  mockConvexStoreState.convexConfig = {
    enabled: false,
    autoSync: false,
    syncInterval: 15,
    lastSyncAt: null,
    syncOnStartup: false,
    syncOnExit: false,
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    maxBackups: 10,
    syncDataTypes: [],
    deploymentUrl: '',
    projectSlug: '',
  };
};

describe('ConvexConfigForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetState();
    mockIsTauri = false;
    mockStoreConvexDeployKey.mockResolvedValue(true);
    mockGetConvexDeployKey.mockResolvedValue(null);
    mockRemoveConvexDeployKey.mockResolvedValue(true);
    mockTestConnection.mockResolvedValue({ success: true });
    mockSetNativeConvexConfig.mockResolvedValue(true);
    mockTestNativeConvexConnection.mockResolvedValue(true);
  });

  it('renders core convex fields', () => {
    render(<ConvexConfigForm />);
    expect(screen.getByText('convexConfig')).toBeInTheDocument();
    expect(screen.getByTestId('input-convex-deployment-url')).toBeInTheDocument();
    expect(screen.getByTestId('input-convex-project-slug')).toBeInTheDocument();
    expect(screen.getByTestId('input-convex-deploy-key')).toBeInTheDocument();
  });

  it('shows validation error when deployment URL is missing', async () => {
    render(<ConvexConfigForm />);

    fireEvent.click(screen.getByText('saveAndConnect'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('convexDeploymentUrlRequired');
    });
  });

  it('shows validation error when deploy key is missing', async () => {
    mockConvexStoreState.convexConfig.deploymentUrl = 'https://test-app.convex.cloud';
    render(<ConvexConfigForm />);

    fireEvent.click(screen.getByText('saveAndConnect'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('convexDeployKeyRequired');
    });
  });

  it('stores deploy key and tests connection on save', async () => {
    mockConvexStoreState.convexConfig.deploymentUrl = 'https://test-app.convex.cloud';
    render(<ConvexConfigForm />);

    fireEvent.change(screen.getByTestId('input-convex-deploy-key'), {
      target: { value: 'prod:key_123' },
    });
    fireEvent.click(screen.getByText('saveAndConnect'));

    await waitFor(() => {
      expect(mockStoreConvexDeployKey).toHaveBeenCalledWith('prod:key_123');
      expect(mockInitConvex).toHaveBeenCalledWith('prod:key_123');
      expect(mockTestConnection).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('configSaved');
    });
  });

  it('uses native convex commands on tauri runtime with web fallback available', async () => {
    mockIsTauri = true;
    mockConvexStoreState.convexConfig.deploymentUrl = 'https://test-app.convex.cloud';
    render(<ConvexConfigForm />);

    fireEvent.change(screen.getByTestId('input-convex-deploy-key'), {
      target: { value: 'prod:key_123' },
    });
    fireEvent.click(screen.getByText('saveAndConnect'));

    await waitFor(() => {
      expect(mockSetNativeConvexConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          deploymentUrl: 'https://test-app.convex.cloud',
          deployKey: 'prod:key_123',
        })
      );
      expect(mockTestNativeConvexConnection).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('configSaved');
    });
  });

  it('removes existing deploy key', async () => {
    mockGetConvexDeployKey.mockResolvedValue('prod:key_123');
    render(<ConvexConfigForm />);

    await waitFor(() => {
      expect(screen.getByText('disconnect')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('disconnect'));

    await waitFor(() => {
      expect(mockRemoveConvexDeployKey).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('convexDeployKeyRemoved');
    });
  });
});
