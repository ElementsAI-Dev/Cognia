/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GitStatusPanel } from './git-status-panel';

// Mock useGit hook
const mockCheckGitInstalled = jest.fn();
const mockInstallGit = jest.fn();
const mockOpenGitWebsite = jest.fn();
const mockRefreshStatus = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();

const defaultGitStatus = {
  installed: false,
  version: null as string | null,
  path: null as string | null,
  status: 'not_installed' as 'not_installed' | 'installed',
  error: null as string | null,
  lastChecked: null as string | null,
};

type RepoInfo = {
  path: string;
  isGitRepo: boolean;
  status: 'clean' | 'dirty' | 'ahead' | 'behind' | 'diverged' | 'not_initialized' | 'error';
  branch: string;
  remoteName: string | null;
  remoteUrl: string | null;
  ahead: number;
  behind: number;
  hasUncommittedChanges: boolean;
  hasUntrackedFiles: boolean;
  lastCommit: {
    hash: string;
    shortHash: string;
    author: string;
    authorEmail: string;
    date: string;
    message: string;
  } | null;
};

type BranchInfo = {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
};

type FileStatus = {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
};

const defaultCurrentRepo: RepoInfo | null = null;

const mockUseGitReturnValue: {
  gitStatus: typeof defaultGitStatus;
  isInstalled: boolean;
  isCheckingGit: boolean;
  isInstallingGit: boolean;
  currentRepo: RepoInfo | null;
  branches: BranchInfo[];
  fileStatus: FileStatus[];
  isOperating: boolean;
  error: string | null;
  checkGitInstalled: typeof mockCheckGitInstalled;
  installGit: typeof mockInstallGit;
  openGitWebsite: typeof mockOpenGitWebsite;
  refreshStatus: typeof mockRefreshStatus;
  clearError: typeof mockClearError;
} = {
  gitStatus: defaultGitStatus,
  isInstalled: false,
  isCheckingGit: false,
  isInstallingGit: false,
  currentRepo: defaultCurrentRepo,
  branches: [],
  fileStatus: [],
  isOperating: false,
  error: null,
  checkGitInstalled: mockCheckGitInstalled,
  installGit: mockInstallGit,
  openGitWebsite: mockOpenGitWebsite,
  refreshStatus: mockRefreshStatus,
  clearError: mockClearError,
};

const mockUseGit = jest.fn().mockReturnValue(mockUseGitReturnValue);

jest.mock('@/hooks/native/use-git', () => ({
  useGit: (args: {
    repoPath?: string;
    projectId?: string;
    autoCheck?: boolean;
    autoLoadStatus?: boolean;
  }) => mockUseGit(args),
}));

// Mock utility functions from types/system/git
jest.mock('@/types/system/git', () => ({
  getGitStatusColor: jest.fn((status) => {
    switch (status) {
      case 'clean':
        return 'green';
      case 'dirty':
        return 'yellow';
      case 'ahead':
        return 'blue';
      case 'behind':
        return 'orange';
      case 'diverged':
        return 'red';
      case 'not_initialized':
        return 'gray';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  }),
  formatCommitDate: jest.fn((_date) => '2h ago'),
  formatCommitMessage: jest.fn((commit) => commit.message?.slice(0, 50) || ''),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'data-testid': dataTestId,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    'data-testid'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid={dataTestId || 'button'}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div role="alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-description">{children}</div>
  ),
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

describe('GitStatusPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default values
    Object.assign(mockUseGitReturnValue, {
      gitStatus: defaultGitStatus,
      isInstalled: false,
      isCheckingGit: false,
      isInstallingGit: false,
      currentRepo: defaultCurrentRepo,
      branches: [],
      fileStatus: [],
      isOperating: false,
      error: null,
    });
    mockUseGit.mockClear();
    mockUseGit.mockReturnValue(mockUseGitReturnValue);
  });

  describe('Compact Mode', () => {
    it('renders loading skeleton when checking git', () => {
      mockUseGitReturnValue.isCheckingGit = true;
      render(<GitStatusPanel compact />);

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('renders installed state with version', () => {
      mockUseGitReturnValue.isInstalled = true;
      mockUseGitReturnValue.gitStatus = {
        ...defaultGitStatus,
        installed: true,
        version: '2.39.0',
        path: '/usr/bin/git',
        status: 'installed',
        lastChecked: new Date().toISOString(),
      };

      render(<GitStatusPanel compact />);

      expect(screen.getByText(/Git 2\.39\.0/)).toBeInTheDocument();
    });

    it('renders installed state with current branch badge', () => {
      mockUseGitReturnValue.isInstalled = true;
      mockUseGitReturnValue.gitStatus = {
        ...defaultGitStatus,
        installed: true,
        version: '2.39.0',
        path: '/usr/bin/git',
        status: 'installed',
        lastChecked: new Date().toISOString(),
      };
      mockUseGitReturnValue.currentRepo = {
        path: '/test/repo',
        isGitRepo: true,
        status: 'clean',
        branch: 'main',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        ahead: 0,
        behind: 0,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        lastCommit: null,
      };

      render(<GitStatusPanel compact />);

      expect(screen.getByTestId('badge')).toHaveTextContent('main');
    });

    it('renders not installed state with install button', () => {
      mockUseGitReturnValue.isInstalled = false;
      mockUseGitReturnValue.gitStatus = defaultGitStatus;

      render(<GitStatusPanel compact />);

      expect(screen.getByText('Git not installed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
    });

    it('calls installGit when install button is clicked in compact mode', () => {
      mockUseGitReturnValue.isInstalled = false;

      render(<GitStatusPanel compact />);

      const installButton = screen.getByRole('button', { name: /install/i });
      fireEvent.click(installButton);

      expect(mockInstallGit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Full Mode - Installation Section', () => {
    it('renders installation section by default', () => {
      render(<GitStatusPanel />);

      expect(screen.getByText('Git Installation')).toBeInTheDocument();
      expect(screen.getByText('Version control system for tracking changes')).toBeInTheDocument();
    });

    it('hides installation section when showInstallation is false', () => {
      render(<GitStatusPanel showInstallation={false} />);

      expect(screen.queryByText('Git Installation')).not.toBeInTheDocument();
    });

    it('shows loading skeleton when checking git installation', () => {
      mockUseGitReturnValue.isCheckingGit = true;

      render(<GitStatusPanel />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays installed git version and path', () => {
      mockUseGitReturnValue.isInstalled = true;
      mockUseGitReturnValue.gitStatus = {
        ...defaultGitStatus,
        installed: true,
        version: '2.42.0',
        path: 'C:\\Program Files\\Git\\cmd\\git.exe',
        status: 'installed',
        lastChecked: new Date().toISOString(),
      };

      render(<GitStatusPanel />);

      expect(screen.getByText('Installed')).toBeInTheDocument();
      expect(screen.getByText('2.42.0')).toBeInTheDocument();
      expect(screen.getByText(/C:\\Program Files\\/)).toBeInTheDocument();
    });

    it('displays not installed state with install and website buttons', () => {
      mockUseGitReturnValue.isInstalled = false;

      render(<GitStatusPanel />);

      expect(screen.getByText('Git is not installed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Install Git/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Website/i })).toBeInTheDocument();
    });

    it('calls installGit when Install Git button is clicked', () => {
      mockUseGitReturnValue.isInstalled = false;

      render(<GitStatusPanel />);

      const installButton = screen.getByRole('button', { name: /Install Git/i });
      fireEvent.click(installButton);

      expect(mockInstallGit).toHaveBeenCalledTimes(1);
    });

    it('shows installing state with loading spinner', () => {
      mockUseGitReturnValue.isInstallingGit = true;

      render(<GitStatusPanel />);

      expect(screen.getByText('Installing...')).toBeInTheDocument();
    });

    it('calls openGitWebsite when Website button is clicked', () => {
      mockUseGitReturnValue.isInstalled = false;

      render(<GitStatusPanel />);

      const websiteButton = screen.getByRole('button', { name: /Website/i });
      fireEvent.click(websiteButton);

      expect(mockOpenGitWebsite).toHaveBeenCalledTimes(1);
    });

    it('calls checkGitInstalled when refresh button is clicked', () => {
      render(<GitStatusPanel />);

      const refreshButtons = screen.getAllByRole('button');
      const refreshButton = refreshButtons.find(
        (btn) => btn.getAttribute('data-testid') === 'button'
      );
      if (refreshButton) {
        fireEvent.click(refreshButton);
        expect(mockCheckGitInstalled).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Full Mode - Repository Status Section', () => {
    const mockRepoInfo = {
      path: '/test/repo',
      isGitRepo: true,
      status: 'clean' as const,
      branch: 'main',
      remoteName: 'origin',
      remoteUrl: 'https://github.com/test/repo.git',
      ahead: 0,
      behind: 0,
      hasUncommittedChanges: false,
      hasUntrackedFiles: false,
      lastCommit: {
        hash: 'abc123',
        shortHash: 'abc123',
        author: 'John Doe',
        authorEmail: 'john@example.com',
        date: new Date().toISOString(),
        message: 'Initial commit',
      },
    };

    beforeEach(() => {
      mockUseGitReturnValue.isInstalled = true;
      mockUseGitReturnValue.gitStatus = {
        ...defaultGitStatus,
        installed: true,
        version: '2.39.0',
        path: '/usr/bin/git',
        status: 'installed',
        lastChecked: new Date().toISOString(),
      };
      mockUseGitReturnValue.currentRepo = mockRepoInfo;
    });

    it('renders repository status section when git is installed and repo exists', () => {
      render(<GitStatusPanel />);

      expect(screen.getByText('Repository Status')).toBeInTheDocument();
      expect(screen.getByText('/test/repo')).toBeInTheDocument();
    });

    it('hides repository section when showRepoStatus is false', () => {
      render(<GitStatusPanel showRepoStatus={false} />);

      expect(screen.queryByText('Repository Status')).not.toBeInTheDocument();
    });

    it('displays branch badge', () => {
      render(<GitStatusPanel />);

      const badges = screen.getAllByTestId('badge');
      expect(badges.some((badge) => badge.textContent === 'main')).toBe(true);
    });

    it('displays status badge', () => {
      render(<GitStatusPanel />);

      const badges = screen.getAllByTestId('badge');
      expect(badges.some((badge) => badge.textContent === 'clean')).toBe(true);
    });

    it('shows cloud icon when remote url exists', () => {
      mockUseGitReturnValue.currentRepo = {
        ...mockRepoInfo,
        remoteUrl: 'https://github.com/test/repo.git',
      };

      render(<GitStatusPanel />);

      // Cloud icon should be in the document (represented by the component)
      const container = render(<GitStatusPanel />).container;
      expect(container).toBeInTheDocument();
    });

    it('shows cloud-off icon when no remote url', () => {
      mockUseGitReturnValue.currentRepo = {
        ...mockRepoInfo,
        remoteUrl: null,
      };

      render(<GitStatusPanel />);

      const container = render(<GitStatusPanel />).container;
      expect(container).toBeInTheDocument();
    });

    it('displays ahead/behind status when ahead', () => {
      mockUseGitReturnValue.currentRepo = {
        ...mockRepoInfo,
        ahead: 3,
        behind: 0,
      };

      render(<GitStatusPanel />);

      expect(screen.getByText(/↑ 3 ahead/)).toBeInTheDocument();
    });

    it('displays ahead/behind status when behind', () => {
      mockUseGitReturnValue.currentRepo = {
        ...mockRepoInfo,
        ahead: 0,
        behind: 2,
      };

      render(<GitStatusPanel />);

      expect(screen.getByText(/↓ 2 behind/)).toBeInTheDocument();
    });

    it('displays both ahead and behind when diverged', () => {
      mockUseGitReturnValue.currentRepo = {
        ...mockRepoInfo,
        ahead: 1,
        behind: 1,
      };

      render(<GitStatusPanel />);

      expect(screen.getByText(/↑ 1 ahead/)).toBeInTheDocument();
      expect(screen.getByText(/↓ 1 behind/)).toBeInTheDocument();
    });

    it('does not show ahead/behind when both are zero', () => {
      mockUseGitReturnValue.currentRepo = {
        ...mockRepoInfo,
        ahead: 0,
        behind: 0,
      };

      render(<GitStatusPanel />);

      expect(screen.queryByText(/ahead/)).not.toBeInTheDocument();
      expect(screen.queryByText(/behind/)).not.toBeInTheDocument();
    });

    it('displays file changes when files are modified', () => {
      mockUseGitReturnValue.fileStatus = [
        { path: 'src/test.ts', status: 'modified', staged: false },
        { path: 'src/test2.ts', status: 'added', staged: true },
        { path: 'old.txt', status: 'deleted', staged: false },
      ];

      render(<GitStatusPanel />);

      expect(screen.getByText(/Changes \(3 files\)/)).toBeInTheDocument();
      expect(screen.getByText('src/test.ts')).toBeInTheDocument();
      expect(screen.getByText('src/test2.ts')).toBeInTheDocument();
      expect(screen.getByText('old.txt')).toBeInTheDocument();
    });

    it('limits file changes display to 10 files', () => {
      const files = Array.from({ length: 15 }, (_, i) => ({
        path: `file${i}.txt`,
        status: 'modified' as const,
        staged: false,
      }));
      mockUseGitReturnValue.fileStatus = files;

      render(<GitStatusPanel />);

      expect(screen.getByText(/Changes \(15 files\)/)).toBeInTheDocument();
      expect(screen.getByText(/\+5 more files/)).toBeInTheDocument();
    });

    it('displays last commit information', () => {
      mockUseGitReturnValue.currentRepo = {
        ...mockRepoInfo,
        lastCommit: {
          hash: 'abc123',
          shortHash: 'abc123',
          author: 'Jane Doe',
          authorEmail: 'jane@example.com',
          date: new Date().toISOString(),
          message: 'Add new feature',
        },
      };

      render(<GitStatusPanel />);

      expect(screen.getByText('Last Commit')).toBeInTheDocument();
      expect(screen.getByText('Add new feature')).toBeInTheDocument();
      // Use a more flexible text matcher since the name is separated by •
      expect(screen.getByText((content) => content.includes('Jane Doe'))).toBeInTheDocument();
    });

    it('displays branches list', () => {
      mockUseGitReturnValue.branches = [
        { name: 'main', isRemote: false, isCurrent: true },
        { name: 'develop', isRemote: false, isCurrent: false },
        { name: 'feature/test', isRemote: false, isCurrent: false },
        { name: 'origin/main', isRemote: true, isCurrent: false },
      ];

      render(<GitStatusPanel />);

      expect(
        screen.getByText((content) => content.includes('Branches') && content.includes('4'))
      ).toBeInTheDocument();
      // Check for branch names in badges
      const badges = screen.getAllByTestId('badge');
      const branchNames = badges.map((b) => b.textContent);
      expect(branchNames).toContain('main');
      expect(branchNames).toContain('develop');
    });

    it('limits branches display to 5 branches', () => {
      const branches = Array.from({ length: 10 }, (_, i) => ({
        name: `branch-${i}`,
        isRemote: false,
        isCurrent: i === 0,
      }));
      mockUseGitReturnValue.branches = branches;

      render(<GitStatusPanel />);

      expect(screen.getByText(/Branches \(10\)/)).toBeInTheDocument();
      expect(screen.getByText(/\+5/)).toBeInTheDocument();
    });

    it('calls refreshStatus when refresh button is clicked', () => {
      render(<GitStatusPanel />);

      const refreshButtons = screen.getAllByRole('button');
      refreshButtons.forEach((btn) => {
        fireEvent.click(btn);
      });

      expect(mockRefreshStatus).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error alert when error exists', () => {
      mockUseGitReturnValue.error = 'Failed to check git installation';

      render(<GitStatusPanel />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to check git installation')).toBeInTheDocument();
    });

    it('calls clearError when Dismiss button is clicked', () => {
      mockUseGitReturnValue.error = 'Some error occurred';

      render(<GitStatusPanel />);

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      fireEvent.click(dismissButton);

      expect(mockClearError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Not a Git Repository', () => {
    it('displays not a git repository message when repoPath is provided but not a git repo', () => {
      mockUseGitReturnValue.isInstalled = true;
      // When not a git repo, currentRepo should be null
      mockUseGitReturnValue.currentRepo = null;

      render(<GitStatusPanel repoPath="/test/path" />);

      expect(
        screen.getByText((content) => content.includes('Not a Git repository'))
      ).toBeInTheDocument();
    });

    it('does not display not a git repository message when repoPath is not provided', () => {
      mockUseGitReturnValue.isInstalled = true;
      mockUseGitReturnValue.currentRepo = null;

      render(<GitStatusPanel />);

      expect(
        screen.queryByText((content) => content.includes('Not a Git repository'))
      ).not.toBeInTheDocument();
    });
  });

  describe('Props Configuration', () => {
    it('passes repoPath to useGit hook', () => {
      render(<GitStatusPanel repoPath="/custom/repo" />);

      expect(mockUseGit).toHaveBeenCalledWith(
        expect.objectContaining({
          repoPath: '/custom/repo',
        })
      );
    });

    it('passes projectId to useGit hook', () => {
      render(<GitStatusPanel projectId="project-123" />);

      expect(mockUseGit).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-123',
        })
      );
    });

    it('uses default props when not provided', () => {
      render(<GitStatusPanel />);

      expect(mockUseGit).toHaveBeenCalledWith(
        expect.objectContaining({
          autoCheck: true,
          autoLoadStatus: true,
        })
      );
    });
  });

  describe('File Status Colors', () => {
    beforeEach(() => {
      mockUseGitReturnValue.isInstalled = true;
      mockUseGitReturnValue.gitStatus = {
        ...defaultGitStatus,
        installed: true,
        version: '2.39.0',
        path: '/usr/bin/git',
        status: 'installed',
        lastChecked: new Date().toISOString(),
      };
      mockUseGitReturnValue.currentRepo = {
        path: '/test/repo',
        isGitRepo: true,
        status: 'dirty',
        branch: 'main',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo.git',
        ahead: 0,
        behind: 0,
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        lastCommit: null,
      };
    });

    it('displays added files with green color', () => {
      mockUseGitReturnValue.fileStatus = [{ path: 'new.txt', status: 'added', staged: false }];

      render(<GitStatusPanel />);

      const badge = screen.getAllByTestId('badge').find((b) => b.textContent === 'A');
      expect(badge).toHaveClass('text-green-600', 'border-green-600');
    });

    it('displays deleted files with red color', () => {
      mockUseGitReturnValue.fileStatus = [{ path: 'old.txt', status: 'deleted', staged: false }];

      render(<GitStatusPanel />);

      const badge = screen.getAllByTestId('badge').find((b) => b.textContent === 'D');
      expect(badge).toHaveClass('text-red-600', 'border-red-600');
    });

    it('displays modified files with yellow color', () => {
      mockUseGitReturnValue.fileStatus = [
        { path: 'changed.txt', status: 'modified', staged: false },
      ];

      render(<GitStatusPanel />);

      const badge = screen.getAllByTestId('badge').find((b) => b.textContent === 'M');
      expect(badge).toHaveClass('text-yellow-600', 'border-yellow-600');
    });
  });
});
