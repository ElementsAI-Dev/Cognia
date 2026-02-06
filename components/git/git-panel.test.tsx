/**
 * GitPanel Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitPanel } from './git-panel';

// Mock the useGit hook
const mockUseGit: Record<string, unknown> = {
  isDesktopAvailable: true,
  isInstalled: true,
  isCheckingGit: false,
  currentRepo: {
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
    lastCommit: {
      hash: 'abc123',
      shortHash: 'abc123',
      author: 'Test User',
      authorEmail: 'test@example.com',
      date: new Date().toISOString(),
      message: 'Initial commit',
    },
  },
  branches: [
    { name: 'main', isRemote: false, isCurrent: true, upstream: 'origin/main' },
    { name: 'develop', isRemote: false, isCurrent: false, upstream: undefined },
  ],
  commits: [
    {
      hash: 'abc123',
      shortHash: 'abc123',
      author: 'Test User',
      authorEmail: 'test@example.com',
      date: new Date().toISOString(),
      message: 'Initial commit',
    },
  ],
  fileStatus: [],
  isOperating: false,
  error: null,
  installGit: jest.fn(),
  openGitWebsite: jest.fn(),
  refreshStatus: jest.fn().mockResolvedValue(undefined),
  stageAll: jest.fn().mockResolvedValue(true),
  stage: jest.fn().mockResolvedValue(true),
  unstage: jest.fn().mockResolvedValue(true),
  commit: jest.fn().mockResolvedValue(true),
  push: jest.fn().mockResolvedValue(true),
  pull: jest.fn().mockResolvedValue(true),
  createBranch: jest.fn().mockResolvedValue(true),
  deleteBranch: jest.fn().mockResolvedValue(true),
  checkout: jest.fn().mockResolvedValue(true),
  discardChanges: jest.fn().mockResolvedValue(true),
  clearError: jest.fn(),
  stashList: [],
  stashSave: jest.fn().mockResolvedValue(true),
  stashPop: jest.fn().mockResolvedValue(true),
  stashApply: jest.fn().mockResolvedValue(true),
  stashDrop: jest.fn().mockResolvedValue(true),
  stashClear: jest.fn().mockResolvedValue(true),
  mergeBranch: jest.fn().mockResolvedValue(true),
  getDiffBetween: jest.fn().mockResolvedValue([]),
};

jest.mock('@/hooks/native/use-git', () => ({
  useGit: () => mockUseGit,
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}: ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

// Mock formatCommitDate and formatCommitMessage from types/git
jest.mock('@/types/system/git', () => ({
  ...jest.requireActual('@/types/system/git'),
  formatCommitDate: (date: string) => new Date(date).toLocaleDateString(),
  formatCommitMessage: (commit: { message: string }) => commit.message,
}));

describe('GitPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGit.isDesktopAvailable = true;
    mockUseGit.isInstalled = true;
    mockUseGit.isCheckingGit = false;
    mockUseGit.currentRepo = {
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
      lastCommit: {
        hash: 'abc123',
        shortHash: 'abc123',
        author: 'Test User',
        authorEmail: 'test@example.com',
        date: new Date().toISOString(),
        message: 'Initial commit',
      },
    };
    mockUseGit.fileStatus = [];
    mockUseGit.error = null;
  });

  it('should show desktop required message when not in desktop mode', () => {
    mockUseGit.isDesktopAvailable = false;

    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('desktopRequired.title')).toBeInTheDocument();
  });

  it('should show not installed message when Git is not installed', () => {
    mockUseGit.isInstalled = false;
    mockUseGit.isCheckingGit = false;

    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('notInstalled.title')).toBeInTheDocument();
  });

  it('should show checking state when checking Git', () => {
    mockUseGit.isInstalled = false;
    mockUseGit.isCheckingGit = true;

    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('checking')).toBeInTheDocument();
  });

  it('should show repository header with branch name', () => {
    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should show repository status badge', () => {
    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('status.clean')).toBeInTheDocument();
  });

  it('should render tabs', () => {
    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('tabs.changes')).toBeInTheDocument();
    expect(screen.getByText('tabs.branches')).toBeInTheDocument();
    expect(screen.getByText('tabs.history')).toBeInTheDocument();
    expect(screen.getByText('tabs.stash')).toBeInTheDocument();
  });

  it('should show commit button', () => {
    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('actions.commit')).toBeInTheDocument();
  });

  it('should disable commit button when no changes', () => {
    mockUseGit.fileStatus = [];

    render(<GitPanel repoPath="/test/repo" />);

    const commitButton = screen.getByText('actions.commit').closest('button');
    expect(commitButton).toBeDisabled();
  });

  it('should enable commit button when there are changes', () => {
    mockUseGit.fileStatus = [{ path: 'test.ts', status: 'modified', staged: false }];

    render(<GitPanel repoPath="/test/repo" />);

    const commitButton = screen.getByText('actions.commit').closest('button');
    expect(commitButton).not.toBeDisabled();
  });

  it('should open commit dialog when clicking commit', async () => {
    mockUseGit.fileStatus = [{ path: 'test.ts', status: 'modified', staged: false }];

    render(<GitPanel repoPath="/test/repo" />);

    const commitButton = screen.getByText('actions.commit').closest('button');
    if (commitButton) {
      fireEvent.click(commitButton);
    }

    await waitFor(() => {
      expect(screen.getByText('commitDialog.title')).toBeInTheDocument();
    });
  });

  it('should call refreshStatus when clicking refresh', () => {
    render(<GitPanel repoPath="/test/repo" />);

    const refreshButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg.lucide-refresh-cw'));

    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockUseGit.refreshStatus).toHaveBeenCalled();
    }
  });

  it('should show error alert when there is an error', () => {
    mockUseGit.error = 'Something went wrong';

    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should clear error when clicking dismiss', () => {
    mockUseGit.error = 'Something went wrong';

    render(<GitPanel repoPath="/test/repo" />);

    const dismissButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg.lucide-x'));

    if (dismissButton) {
      fireEvent.click(dismissButton);
      expect(mockUseGit.clearError).toHaveBeenCalled();
    }
  });

  it('should show last commit info', () => {
    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('Initial commit')).toBeInTheDocument();
  });

  it('should show dirty status when repository has changes', () => {
    mockUseGit.currentRepo = {
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

    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('status.dirty')).toBeInTheDocument();
  });

  it('should show cloud icon when remote is configured', () => {
    render(<GitPanel repoPath="/test/repo" />);

    const cloudIcon = document.querySelector('svg.lucide-cloud');
    expect(cloudIcon).toBeInTheDocument();
  });

  it('should show cloud-off icon when no remote', () => {
    mockUseGit.currentRepo = {
      path: '/test/repo',
      isGitRepo: true,
      status: 'clean',
      branch: 'main',
      remoteName: null,
      remoteUrl: null,
      ahead: 0,
      behind: 0,
      hasUncommittedChanges: false,
      hasUntrackedFiles: false,
      lastCommit: null,
    };

    render(<GitPanel repoPath="/test/repo" />);

    const cloudOffIcon = document.querySelector('svg.lucide-cloud-off');
    expect(cloudOffIcon).toBeInTheDocument();
  });

  it('should show install button when Git not installed', () => {
    mockUseGit.isInstalled = false;
    mockUseGit.isCheckingGit = false;

    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('notInstalled.install')).toBeInTheDocument();
  });

  it('should call installGit when clicking install', () => {
    mockUseGit.isInstalled = false;
    mockUseGit.isCheckingGit = false;

    render(<GitPanel repoPath="/test/repo" />);

    const installButton = screen.getByText('notInstalled.install');
    fireEvent.click(installButton);

    expect(mockUseGit.installGit).toHaveBeenCalled();
  });

  it('should show website button when Git not installed', () => {
    mockUseGit.isInstalled = false;
    mockUseGit.isCheckingGit = false;

    render(<GitPanel repoPath="/test/repo" />);

    expect(screen.getByText('notInstalled.website')).toBeInTheDocument();
  });

  it('should have branch tab trigger', () => {
    render(<GitPanel repoPath="/test/repo" />);

    const branchesTab = screen.getByText('tabs.branches');
    expect(branchesTab).toBeInTheDocument();
  });

  it('should render with file changes', () => {
    mockUseGit.fileStatus = [
      { path: 'test1.ts', status: 'modified', staged: false },
      { path: 'test2.ts', status: 'added', staged: true },
    ];

    const { container } = render(<GitPanel repoPath="/test/repo" />);

    expect(container).toBeInTheDocument();
  });
});
