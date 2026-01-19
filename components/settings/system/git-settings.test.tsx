/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitSettings } from './git-settings';
import type { GitConfig } from '@/types/system/git';
import type { GitState, GitActions } from '@/stores/git/git-store';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) return `${key}: ${JSON.stringify(params)}`;
    return key;
  },
}));

// Mock variables with "mock" prefix for jest.mock scoping
let mockIsInstalled = true;
const mockCheckGitInstalled = jest.fn();
const mockInstallGit = jest.fn();
const mockOpenGitWebsite = jest.fn();
const mockClearError = jest.fn();
const mockSetAutoCommitConfig = jest.fn();
const mockGetConfig = jest.fn();
const mockSetConfig = jest.fn();

// Mock useGit hook
jest.mock('@/hooks/native/use-git', () => ({
  useGit: () => ({
    gitStatus: {
      version: '2.40.0',
      path: '/usr/bin/git',
      lastChecked: new Date('2024-01-01').toISOString(),
    },
    isInstalled: mockIsInstalled,
    isCheckingGit: false,
    isInstallingGit: false,
    error: null,
    checkGitInstalled: mockCheckGitInstalled,
    installGit: mockInstallGit,
    openGitWebsite: mockOpenGitWebsite,
    clearError: mockClearError,
  }),
}));

// Mock useGitStore
jest.mock('@/stores/git', () => ({
  useGitStore: <T,>(selector: (state: GitState & GitActions) => T): T =>
    selector({
      autoCommitConfig: {
        enabled: true,
        triggers: ['session_end'],
        intervalMinutes: 15,
      },
      setAutoCommitConfig: mockSetAutoCommitConfig,
      trackedRepos: ['/path/to/repo'],
    } as unknown as GitState & GitActions),
}));

// Mock gitService
jest.mock('@/lib/native/git', () => ({
  gitService: {
    getConfig: () => mockGetConfig(),
    setConfig: (config: Partial<GitConfig>) => mockSetConfig(config),
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} data-testid="input" />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      data-testid="switch"
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (val: string) => void;
  }) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange('main')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Select Value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

describe('GitSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsInstalled = true;
    mockGetConfig.mockResolvedValue({
      userName: 'Test User',
      userEmail: 'test@example.com',
      defaultBranch: 'main',
    });
  });

  it('renders installation status when installed', async () => {
    render(<GitSettings />);

    expect(screen.getByText('installation.title')).toBeInTheDocument();
    expect(screen.getByText('installation.installed')).toBeInTheDocument();
    expect(screen.getByText('2.40.0')).toBeInTheDocument();

    // Config should load
    await waitFor(() => {
      expect(mockGetConfig).toHaveBeenCalled();
    });
  });

  it('renders not installed state', () => {
    mockIsInstalled = false;
    render(<GitSettings />);

    expect(screen.getByText('installation.notInstalled')).toBeInTheDocument();
    expect(screen.getByText('installation.install')).toBeInTheDocument();
  });

  it('calls checkGitInstalled when refresh button clicked', () => {
    render(<GitSettings />);
    // The refresh button is the first button in the first card header
    const buttons = screen.getAllByTestId('button');
    fireEvent.click(buttons[0]);
    expect(mockCheckGitInstalled).toHaveBeenCalled();
  });

  it('config section loads and displays user info', async () => {
    render(<GitSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });
  });

  it('updates config when save button clicked', async () => {
    render(<GitSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });

    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: 'New User' } });

    // Save button should appear when data changes
    const saveButton = screen.getByText('config.save');
    fireEvent.click(saveButton);

    expect(mockSetConfig).toHaveBeenCalledWith({
      userName: 'New User',
      userEmail: 'test@example.com',
      defaultBranch: 'main',
      editor: null,
    });
  });

  it('handles auto-commit toggle', () => {
    render(<GitSettings />);

    expect(screen.getByText('autoCommit.title')).toBeInTheDocument();

    // Find the main enable switch (first switch in auto-commit card)
    const switches = screen.getAllByTestId('switch');
    // First switch is Enable Auto Commit
    fireEvent.click(switches[0]);

    expect(mockSetAutoCommitConfig).toHaveBeenCalledWith({ enabled: false });
  });

  it('renders tracked repos list', () => {
    render(<GitSettings />);
    expect(screen.getByText('trackedRepos.title')).toBeInTheDocument();
    expect(screen.getByText('/path/to/repo')).toBeInTheDocument();
  });
});
