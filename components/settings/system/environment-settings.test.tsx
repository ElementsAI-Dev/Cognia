/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvironmentSettings } from './environment-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) return `${key}: ${JSON.stringify(params)}`;
    return key;
  },
}));

// Mock useEnvironment hook
const mockRefreshStatus = jest.fn();
const mockCheckTool = jest.fn();
const mockInstallTool = jest.fn();
const mockOpenToolWebsite = jest.fn();
const mockClearError = jest.fn();

let mockIsAvailable = true;
let mockPlatform = 'windows';

jest.mock('@/hooks/sandbox', () => ({
  useEnvironment: () => ({
    platform: mockPlatform,
    tools: {
      uv: { installed: true, version: '0.1.0', path: '/usr/local/bin/uv', status: 'ready' },
      nvm: { installed: false, status: 'ready' },
      docker: { installed: true, version: '24.0.0', path: '/usr/bin/docker', status: 'ready' },
      podman: { installed: false, status: 'ready' },
    },
    isRefreshing: false,
    isInstalling: false,
    installProgress: null,
    error: null,
    isAvailable: mockIsAvailable,
    refreshStatus: mockRefreshStatus,
    checkTool: mockCheckTool,
    installTool: mockInstallTool,
    openToolWebsite: mockOpenToolWebsite,
    clearError: mockClearError,
  }),
}));

// Mock environment types
jest.mock('@/types/system/environment', () => ({
  TOOL_INFO: {
    uv: { name: 'uv', description: 'Fast Python package manager', icon: '🐍', category: 'language_manager' },
    nvm: { name: 'nvm', description: 'Node.js version manager', icon: '📦', category: 'language_manager' },
    docker: { name: 'Docker', description: 'Container runtime', icon: '🐳', category: 'container_runtime' },
    podman: { name: 'Podman', description: 'Container runtime', icon: '🦭', category: 'container_runtime' },
  },
}));

// Mock sub-components
jest.mock('./virtual-env-panel', () => ({
  VirtualEnvPanel: () => <div data-testid="virtual-env-panel">VirtualEnvPanel</div>,
}));

jest.mock('./project-env-config', () => ({
  ProjectEnvConfigPanel: () => <div data-testid="project-env-config">ProjectEnvConfigPanel</div>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

describe('EnvironmentSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = true;
    mockPlatform = 'windows';
  });

  it('renders without crashing', () => {
    render(<EnvironmentSettings />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays platform badge', () => {
    render(<EnvironmentSettings />);
    expect(screen.getByText('windows')).toBeInTheDocument();
  });

  it('shows refresh all button', () => {
    render(<EnvironmentSettings />);
    expect(screen.getByText('refreshAll')).toBeInTheDocument();
  });

  it('calls refreshStatus when refresh button clicked', () => {
    render(<EnvironmentSettings />);
    const refreshButton = screen.getByText('refreshAll');
    fireEvent.click(refreshButton);
    expect(mockRefreshStatus).toHaveBeenCalled();
  });

  it('displays language managers section', () => {
    render(<EnvironmentSettings />);
    expect(screen.getByText('languageManagers')).toBeInTheDocument();
  });

  it('displays container runtimes section', () => {
    render(<EnvironmentSettings />);
    expect(screen.getByText('containerRuntimes')).toBeInTheDocument();
  });

  it('shows tabs for tools, virtual envs, and projects', () => {
    render(<EnvironmentSettings />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-tools')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-virtualenv')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-projects')).toBeInTheDocument();
  });

  it('renders tool cards', () => {
    render(<EnvironmentSettings />);
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('shows installed badge for installed tools', () => {
    render(<EnvironmentSettings />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.some(badge => badge.textContent === 'installed')).toBeTruthy();
  });
});

describe('EnvironmentSettings not available', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = false;
    mockPlatform = 'windows';
  });

  it('shows not available message when environment is not available', () => {
    render(<EnvironmentSettings />);
    expect(screen.getByText('notAvailable')).toBeInTheDocument();
  });

  it('displays not available description', () => {
    render(<EnvironmentSettings />);
    expect(screen.getByText('notAvailableDesc')).toBeInTheDocument();
  });
});

describe('EnvironmentSettings tool operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = true;
    mockPlatform = 'windows';
  });

  it('calls checkTool when refresh button on tool card clicked', () => {
    render(<EnvironmentSettings />);
    const refreshButtons = screen.getAllByText('refresh');
    if (refreshButtons.length > 0) {
      fireEvent.click(refreshButtons[0]);
      expect(mockCheckTool).toHaveBeenCalled();
    }
  });

  it('calls openToolWebsite when docs button clicked', () => {
    render(<EnvironmentSettings />);
    const docsButtons = screen.getAllByText('docs');
    if (docsButtons.length > 0) {
      fireEvent.click(docsButtons[0]);
      expect(mockOpenToolWebsite).toHaveBeenCalled();
    }
  });
});
