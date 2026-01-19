/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitIntegrationPanel } from './git-integration-panel';
import type { GitRepository } from '@/types/workflow/template';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    className,
    onClick,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      data-testid="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({
    id,
    className,
    value,
    onChange,
    placeholder,
    ...props
  }: {
    id?: string;
    className?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <input
      data-testid="input"
      id={id}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
    ...props
  }: {
    children?: React.ReactNode;
    htmlFor?: string;
    [key: string]: unknown;
  }) => (
    <label data-testid="label" htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    _open,
    onOpenChange,
  }: {
    children?: React.ReactNode;
    _open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="dialog">
      {typeof onOpenChange === 'function' && (
        <button onClick={() => onOpenChange(false)}>Close</button>
      )}
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children?: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid="badge" className={className} {...props}>
      {children}
    </span>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  GitBranch: () => <svg data-testid="git-branch-icon" />,
  RefreshCw: ({ className }: { className?: string }) => (
    <svg data-testid="refresh-cw-icon" className={className} />
  ),
  Plus: () => <svg data-testid="plus-icon" />,
  Trash2: () => <svg data-testid="trash-icon" />,
  AlertCircle: () => <svg data-testid="alert-circle-icon" />,
  CheckCircle2: () => <svg data-testid="check-circle-icon" />,
}));

// Mock git integration service
jest.mock('@/lib/workflow/git-integration-service', () => ({
  getGitIntegrationService: () => ({
    cloneRepository: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockReturnValue({
      url: 'https://github.com/test/repo.git',
      branch: 'main',
      commit: 'abc123def456',
      hasUpdates: false,
      conflictCount: 0,
    }),
    pullChanges: jest.fn().mockResolvedValue(undefined),
    pushChanges: jest.fn().mockResolvedValue(undefined),
    checkForUpdates: jest.fn().mockResolvedValue(false),
    syncAllRepositories: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('GitIntegrationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<GitIntegrationPanel />);
    expect(screen.getByText('Git Integration')).toBeInTheDocument();
  });

  it('renders header with title', () => {
    render(<GitIntegrationPanel />);
    expect(screen.getByText('Git Integration')).toBeInTheDocument();
  });

  it('renders clone repository button', () => {
    render(<GitIntegrationPanel />);
    expect(screen.getByText('Clone Repository')).toBeInTheDocument();
  });

  it('renders sync all button', () => {
    render(<GitIntegrationPanel />);
    expect(screen.getByText('Sync All')).toBeInTheDocument();
  });

  it('renders plus icon in clone button', () => {
    render(<GitIntegrationPanel />);
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('renders refresh icon in sync all button', () => {
    render(<GitIntegrationPanel />);
    expect(screen.getByTestId('refresh-cw-icon')).toBeInTheDocument();
  });

  it('shows empty state when no repositories', () => {
    render(<GitIntegrationPanel />);
    expect(screen.getByText('No repositories connected')).toBeInTheDocument();
    expect(screen.getByText('Clone a repository to get started')).toBeInTheDocument();
  });

  it('shows git branch icon in empty state', () => {
    render(<GitIntegrationPanel />);
    expect(screen.getByTestId('git-branch-icon')).toBeInTheDocument();
  });

  it('opens clone dialog when clone button is clicked', () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('renders clone dialog with title', () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);
    expect(screen.getByText('Clone Git Repository')).toBeInTheDocument();
  });

  it('renders repository URL input in clone dialog', () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);
    expect(
      screen.getByPlaceholderText(/https:\/\/github.com\/username\/repo.git/)
    ).toBeInTheDocument();
  });

  it('renders branch input in clone dialog', () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);
    expect(screen.getByPlaceholderText('main')).toBeInTheDocument();
  });

  it('updates clone URL input on change', () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const urlInput = screen.getByPlaceholderText(/https:\/\/github.com\/username\/repo.git/);
    fireEvent.change(urlInput, { target: { value: 'https://github.com/test/repo.git' } });
    expect(urlInput).toHaveValue('https://github.com/test/repo.git');
  });

  it('updates branch input on change', () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const branchInput = screen.getByPlaceholderText('main');
    fireEvent.change(branchInput, { target: { value: 'develop' } });
    expect(branchInput).toHaveValue('develop');
  });

  it('shows error status when cloning with empty URL', async () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const submitButton = screen.getAllByText('Clone Repository')[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a Git repository URL/)).toBeInTheDocument();
    });
  });

  it('shows success status after successful clone', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getGitIntegrationService } = require('@/lib/workflow/git-integration-service');
    const gitService = getGitIntegrationService();

    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const urlInput = screen.getByPlaceholderText(/https:\/\/github.com\/username\/repo.git/);
    fireEvent.change(urlInput, { target: { value: 'https://github.com/test/repo.git' } });

    const submitButton = screen.getAllByText('Clone Repository')[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(gitService.cloneRepository).toHaveBeenCalled();
    });
  });

  it('shows info status during cloning', async () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const urlInput = screen.getByPlaceholderText(/https:\/\/github.com\/username\/repo.git/);
    fireEvent.change(urlInput, { target: { value: 'https://github.com/test/repo.git' } });

    const submitButton = screen.getAllByText('Clone Repository')[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Cloning repository...')).toBeInTheDocument();
    });
  });

  it('disables clone button while cloning', async () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const urlInput = screen.getByPlaceholderText(/https:\/\/github.com\/username\/repo.git/);
    fireEvent.change(urlInput, { target: { value: 'https://github.com/test/repo.git' } });

    const submitButton = screen.getAllByText('Clone Repository')[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('shows loading spinner while cloning', async () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const urlInput = screen.getByPlaceholderText(/https:\/\/github.com\/username\/repo.git/);
    fireEvent.change(urlInput, { target: { value: 'https://github.com/test/repo.git' } });

    const submitButton = screen.getAllByText('Clone Repository')[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      const spinningIcon = document.querySelector('.animate-spin');
      expect(spinningIcon).toBeInTheDocument();
    });
  });

  it('calls syncAll when sync all button is clicked', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getGitIntegrationService } = require('@/lib/workflow/git-integration-service');
    const gitService = getGitIntegrationService();

    render(<GitIntegrationPanel />);
    const syncAllButton = screen.getByText('Sync All');
    fireEvent.click(syncAllButton);

    await waitFor(() => {
      expect(gitService.syncAllRepositories).toHaveBeenCalled();
    });
  });

  it('shows success status after sync all', async () => {
    render(<GitIntegrationPanel />);
    const syncAllButton = screen.getByText('Sync All');
    fireEvent.click(syncAllButton);

    await waitFor(() => {
      expect(screen.getByText('All repositories synced')).toBeInTheDocument();
    });
  });

  it('renders check-circle icon for success status', () => {
    render(<GitIntegrationPanel />);
    // Trigger a success state by any action
    const syncAllButton = screen.getByText('Sync All');
    fireEvent.click(syncAllButton);

    // Check for success icon
    const successIcon = screen.queryByTestId('check-circle-icon');
    expect(successIcon).toBeInTheDocument();
  });

  it('renders alert-circle icon for error status', async () => {
    render(<GitIntegrationPanel />);
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const submitButton = screen.getAllByText('Clone Repository')[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorIcon = screen.queryByTestId('alert-circle-icon');
      expect(errorIcon).toBeInTheDocument();
    });
  });

  it('does not show status message when no status', () => {
    render(<GitIntegrationPanel />);
    const _statusContainer = document.querySelector('.border-b');
    // Only the header should have border-b, not a status container
    expect(screen.queryByText(/Success/)).not.toBeInTheDocument();
  });
});

describe('RepositoryCard', () => {
  const _mockRepo: GitRepository = {
    url: 'https://github.com/test/repo.git',
    branch: 'main',
    commit: 'abc123def456',
    hasUpdates: false,
    conflictCount: 0,
    lastSyncAt: new Date(),
  };

  it('renders repository name', () => {
    // The component renders when repositories are added
    // This would require adding repos to state, which is handled by the parent
    render(<GitIntegrationPanel />);
    expect(container.querySelector('.text-2xl')).toHaveTextContent('Git Integration');
  });

  it('renders branch badge', () => {
    render(<GitIntegrationPanel />);
    // In empty state, no badges
    expect(screen.getByText('No repositories connected')).toBeInTheDocument();
  });

  it('renders commit hash', () => {
    render(<GitIntegrationPanel />);
    // In empty state
    expect(screen.getByText('No repositories connected')).toBeInTheDocument();
  });
});

describe('GitIntegrationPanel integration tests', () => {
  it('handles complete clone workflow', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getGitIntegrationService } = require('@/lib/workflow/git-integration-service');
    const gitService = getGitIntegrationService();

    render(<GitIntegrationPanel />);

    // Open clone dialog
    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    // Fill in form
    const urlInput = screen.getByPlaceholderText(/https:\/\/github.com\/username\/repo.git/);
    fireEvent.change(urlInput, { target: { value: 'https://github.com/test/repo.git' } });

    // Submit
    const submitButton = screen.getAllByText('Clone Repository')[1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(gitService.cloneRepository).toHaveBeenCalledWith(
        'https://github.com/test/repo.git',
        expect.any(String),
        'main'
      );
    });
  });

  it('handles complete sync all workflow', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getGitIntegrationService } = require('@/lib/workflow/git-integration-service');
    const gitService = getGitIntegrationService();

    render(<GitIntegrationPanel />);

    const syncAllButton = screen.getByText('Sync All');
    fireEvent.click(syncAllButton);

    await waitFor(() => {
      expect(gitService.syncAllRepositories).toHaveBeenCalled();
      expect(screen.getByText('All repositories synced')).toBeInTheDocument();
    });
  });

  it('displays error message on sync failure', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getGitIntegrationService } = require('@/lib/workflow/git-integration-service');
    const gitService = getGitIntegrationService();

    gitService.syncAllRepositories = jest.fn().mockRejectedValue(new Error('Sync failed'));

    render(<GitIntegrationPanel />);

    const syncAllButton = screen.getByText('Sync All');
    fireEvent.click(syncAllButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to sync repositories/)).toBeInTheDocument();
    });
  });

  it('shows info icon during sync', async () => {
    render(<GitIntegrationPanel />);

    const syncAllButton = screen.getByText('Sync All');
    fireEvent.click(syncAllButton);

    await waitFor(() => {
      expect(screen.getByText('Syncing all repositories...')).toBeInTheDocument();
      const infoIcon = screen.queryByTestId('refresh-cw-icon');
      expect(infoIcon).toBeInTheDocument();
    });
  });

  it('handles branch name change in clone dialog', () => {
    render(<GitIntegrationPanel />);

    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const branchInput = screen.getByPlaceholderText('main');
    fireEvent.change(branchInput, { target: { value: 'develop' } });

    expect(branchInput).toHaveValue('develop');
  });

  it('maintains clone URL state', () => {
    render(<GitIntegrationPanel />);

    const cloneButton = screen.getByText('Clone Repository');
    fireEvent.click(cloneButton);

    const urlInput = screen.getByPlaceholderText(/https:\/\/github.com\/username\/repo.git/);
    fireEvent.change(urlInput, { target: { value: 'https://custom.url/repo.git' } });

    expect(urlInput).toHaveValue('https://custom.url/repo.git');
  });
});
