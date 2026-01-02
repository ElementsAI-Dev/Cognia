/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectEnvConfigPanel } from './project-env-config';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useVirtualEnv hook
const mockRefreshEnvironments = jest.fn();
const mockCreateProjectConfig = jest.fn();
const mockUpdateProjectConfig = jest.fn();
const mockRemoveProjectConfig = jest.fn();

let mockEnvironments: Array<{ id: string; name: string; path: string; pythonVersion?: string }> = [];
let mockProjectConfigs: Array<{
  id: string;
  projectName: string;
  projectPath: string;
  virtualEnvId: string | null;
  virtualEnvPath: string | null;
  autoActivate: boolean;
  envVars: Record<string, string>;
}> = [];

jest.mock('@/hooks/sandbox', () => ({
  useVirtualEnv: () => ({
    environments: mockEnvironments,
    projectConfigs: mockProjectConfigs,
    isLoading: false,
    refreshEnvironments: mockRefreshEnvironments,
    createProjectConfig: mockCreateProjectConfig,
    updateProjectConfig: mockUpdateProjectConfig,
    removeProjectConfig: mockRemoveProjectConfig,
  }),
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

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} data-testid="input" />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      data-testid="switch"
    >
      Switch
    </button>
  ),
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

jest.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div data-testid="accordion">{children}</div>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ProjectEnvConfigPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvironments = [];
    mockProjectConfigs = [];
  });

  it('renders without crashing', () => {
    render(<ProjectEnvConfigPanel />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays description', () => {
    render(<ProjectEnvConfigPanel />);
    expect(screen.getByText('description')).toBeInTheDocument();
  });

  it('shows add project button', () => {
    render(<ProjectEnvConfigPanel />);
    expect(screen.getByText('addProject')).toBeInTheDocument();
  });

  it('calls refreshEnvironments on mount', () => {
    render(<ProjectEnvConfigPanel />);
    expect(mockRefreshEnvironments).toHaveBeenCalled();
  });

  it('shows empty state when no projects configured', () => {
    render(<ProjectEnvConfigPanel />);
    expect(screen.getByText('noProjects')).toBeInTheDocument();
  });

  it('shows add first project button in empty state', () => {
    render(<ProjectEnvConfigPanel />);
    expect(screen.getByText('addFirst')).toBeInTheDocument();
  });

  it('opens add dialog when add button clicked', () => {
    render(<ProjectEnvConfigPanel />);
    const addButton = screen.getByText('addProject');
    fireEvent.click(addButton);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });
});

describe('ProjectEnvConfigPanel with configs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvironments = [
      { id: 'env1', name: 'Python 3.10', path: '/home/user/.venv/env1', pythonVersion: '3.10.0' },
    ];
    mockProjectConfigs = [
      {
        id: 'config1',
        projectName: 'My Project',
        projectPath: '/home/user/projects/myproject',
        virtualEnvId: 'env1',
        virtualEnvPath: '/home/user/.venv/env1',
        autoActivate: true,
        envVars: { API_KEY: 'secret' },
      },
    ];
  });

  it('displays project cards', () => {
    render(<ProjectEnvConfigPanel />);
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('displays project name', () => {
    render(<ProjectEnvConfigPanel />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('displays project path', () => {
    render(<ProjectEnvConfigPanel />);
    expect(screen.getByText('/home/user/projects/myproject')).toBeInTheDocument();
  });

  it('shows environment variables count badge', () => {
    render(<ProjectEnvConfigPanel />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('ProjectEnvConfigPanel with projectPath prop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvironments = [];
    mockProjectConfigs = [
      {
        id: 'config1',
        projectName: 'My Project',
        projectPath: '/home/user/projects/myproject',
        virtualEnvId: null,
        virtualEnvPath: null,
        autoActivate: false,
        envVars: {},
      },
      {
        id: 'config2',
        projectName: 'Other Project',
        projectPath: '/home/user/projects/other',
        virtualEnvId: null,
        virtualEnvPath: null,
        autoActivate: false,
        envVars: {},
      },
    ];
  });

  it('filters configs by projectPath when provided', () => {
    render(<ProjectEnvConfigPanel projectPath="/home/user/projects/myproject" />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.queryByText('Other Project')).not.toBeInTheDocument();
  });

  it('hides add project button when projectPath is provided', () => {
    render(<ProjectEnvConfigPanel projectPath="/home/user/projects/myproject" />);
    expect(screen.queryByText('addProject')).not.toBeInTheDocument();
  });
});
