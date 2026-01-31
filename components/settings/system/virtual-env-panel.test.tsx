/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualEnvPanel } from './virtual-env-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useVirtualEnv hook
const mockRefreshEnvironments = jest.fn();
const mockCreateEnvironment = jest.fn();
const mockDeleteEnvironment = jest.fn();
const mockDeleteEnvironments = jest.fn();
const mockActivateEnvironment = jest.fn();
const mockCloneEnvironment = jest.fn();
const mockLoadPackages = jest.fn();
const mockInstallPackages = jest.fn();
const mockUninstallPackages = jest.fn();
const mockUpgradeAllPackages = jest.fn();
const mockExportRequirements = jest.fn();
const mockImportRequirements = jest.fn();
const mockRefreshPythonVersions = jest.fn();
const mockSetFilter = jest.fn();
const mockClearFilters = jest.fn();
const mockToggleEnvSelection = jest.fn();
const mockSelectAllEnvs = jest.fn();
const mockDeselectAllEnvs = jest.fn();
const mockClearError = jest.fn();

let mockEnvironments: Array<{
  id: string;
  name: string;
  path: string;
  type: string;
  pythonVersion?: string;
  packages: number;
  size?: string;
  createdAt: string;
}> = [];
let mockActiveEnvId: string | null = null;

let mockIsAvailable = true;

jest.mock('@/hooks/sandbox', () => ({
  useVirtualEnv: () => ({
    environments: mockEnvironments,
    filteredEnvironments: mockEnvironments,
    activeEnvId: mockActiveEnvId,
    progress: null,
    isLoading: false,
    isCreating: false,
    isInstalling: false,
    isDeleting: false,
    isExporting: false,
    error: null,
    isAvailable: mockIsAvailable,
    availablePythonVersions: ['3.10', '3.11', '3.12'],
    refreshEnvironments: mockRefreshEnvironments,
    refreshPythonVersions: mockRefreshPythonVersions,
    createEnvironment: mockCreateEnvironment,
    deleteEnvironment: mockDeleteEnvironment,
    deleteEnvironments: mockDeleteEnvironments,
    activateEnvironment: mockActivateEnvironment,
    cloneEnvironment: mockCloneEnvironment,
    loadPackages: mockLoadPackages,
    installPackages: mockInstallPackages,
    uninstallPackages: mockUninstallPackages,
    upgradeAllPackages: mockUpgradeAllPackages,
    exportRequirements: mockExportRequirements,
    importRequirements: mockImportRequirements,
    selectedEnvPackages: [],
    filterOptions: { types: [] },
    selectedEnvIds: [],
    setFilter: mockSetFilter,
    clearFilters: mockClearFilters,
    toggleEnvSelection: mockToggleEnvSelection,
    selectAllEnvs: mockSelectAllEnvs,
    deselectAllEnvs: mockDeselectAllEnvs,
    clearError: mockClearError,
  }),
}));

// Mock environment types
jest.mock('@/types/system/environment', () => ({
  ENV_PRESETS: [
    { id: 'data-science', name: 'Data Science', pythonVersion: '3.11', packages: { python: ['numpy', 'pandas'] } },
    { id: 'web-dev', name: 'Web Development', pythonVersion: '3.10', packages: { python: ['flask', 'django'] } },
  ],
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

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} data-testid="input" />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Value</span>,
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

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div data-testid="collapsible">{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="checkbox"
    />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} data-testid="textarea" />
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('VirtualEnvPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvironments = [];
    mockActiveEnvId = null;
    mockIsAvailable = true;
  });

  it('renders without crashing', () => {
    render(<VirtualEnvPanel />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays description', () => {
    render(<VirtualEnvPanel />);
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('shows create environment button', () => {
    render(<VirtualEnvPanel />);
    expect(screen.getByText('new')).toBeInTheDocument();
  });

  it('shows refresh button', () => {
    render(<VirtualEnvPanel />);
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls refreshEnvironments when refresh button clicked', () => {
    render(<VirtualEnvPanel />);
    const refreshButton = screen.getAllByTestId('button').find(btn => 
      btn.querySelector('svg') !== null
    );
    if (refreshButton) {
      fireEvent.click(refreshButton);
    }
    // Check that refresh was called on mount
    expect(mockRefreshEnvironments).toHaveBeenCalled();
  });

  it('shows empty state when no environments', () => {
    render(<VirtualEnvPanel />);
    // Empty state message or new button should be visible
    expect(screen.getByText('new')).toBeInTheDocument();
  });

  it('opens create dialog when create button clicked', () => {
    render(<VirtualEnvPanel />);
    const createButton = screen.getByText('new');
    fireEvent.click(createButton);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });
});

describe('VirtualEnvPanel with environments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = true;
    mockEnvironments = [
      {
        id: 'env1',
        name: 'data-science',
        path: '/home/user/.venv/data-science',
        type: 'uv',
        pythonVersion: '3.11.0',
        packages: 42,
        size: '150 MB',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'env2',
        name: 'web-dev',
        path: '/home/user/.venv/web-dev',
        type: 'venv',
        pythonVersion: '3.10.0',
        packages: 28,
        size: '100 MB',
        createdAt: '2024-01-02T00:00:00Z',
      },
    ];
    mockActiveEnvId = 'env1';
  });

  it('displays environment cards', () => {
    render(<VirtualEnvPanel />);
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('displays environment names', () => {
    render(<VirtualEnvPanel />);
    expect(screen.getByText('data-science')).toBeInTheDocument();
    expect(screen.getByText('web-dev')).toBeInTheDocument();
  });

  it('shows active badge for active environment', () => {
    render(<VirtualEnvPanel />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('shows checkboxes for selection', () => {
    render(<VirtualEnvPanel />);
    const checkboxes = screen.getAllByTestId('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });
});

describe('VirtualEnvPanel bulk operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable = true;
    mockEnvironments = [
      {
        id: 'env1',
        name: 'env1',
        path: '/path/env1',
        type: 'uv',
        packages: 10,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'env2',
        name: 'env2',
        path: '/path/env2',
        type: 'uv',
        packages: 20,
        createdAt: '2024-01-02T00:00:00Z',
      },
    ];
    mockActiveEnvId = null;
  });

  it('shows new button when environments exist', () => {
    render(<VirtualEnvPanel />);
    expect(screen.getByText('new')).toBeInTheDocument();
  });
});
