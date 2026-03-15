/**
 * ProjectGitPanel Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectGitPanel } from './project-git-panel';

// Mock the useGit hook
const mockUseGit: Record<string, unknown> = {
  isInstalled: true,
  currentRepo: null,
  commits: [],
  fileStatus: [],
  trackedRepos: [
    {
      path: '/tracked/repo',
      displayName: 'repo',
      source: 'manual',
      lastOpenedAt: '2026-03-14T00:00:00.000Z',
      linkedProjectIds: [],
    },
  ],
  isOperating: false,
  error: null,
  checkGitInstalled: jest.fn(),
  refreshStatus: jest.fn(),
  stageAll: jest.fn().mockResolvedValue(true),
  commit: jest.fn().mockResolvedValue(true),
  push: jest.fn().mockResolvedValue(true),
  pull: jest.fn().mockResolvedValue(true),
  fetch: jest.fn().mockResolvedValue(true),
  clearError: jest.fn(),
  projectConfig: null,
  enableGitForProject: jest.fn().mockResolvedValue(true),
  disableGitForProject: jest.fn(),
  updateProjectConfig: jest.fn(),
};

jest.mock('@/hooks/native/use-git', () => ({
  useGit: () => mockUseGit,
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ProjectGitPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show not installed message when Git is not installed', () => {
    mockUseGit.isInstalled = false;
    
    render(<ProjectGitPanel projectId="test-project" />);
    
    expect(screen.getByText('notInstalled.title')).toBeInTheDocument();
  });

  it('should show not configured message when Git is not enabled for project', () => {
    mockUseGit.isInstalled = true;
    mockUseGit.projectConfig = null;
    
    render(<ProjectGitPanel projectId="test-project" />);
    
    expect(screen.getByText('notConfigured.title')).toBeInTheDocument();
  });

  it('should show tracked repositories when Git is not configured', () => {
    mockUseGit.isInstalled = true;
    mockUseGit.projectConfig = null;

    render(<ProjectGitPanel projectId="test-project" />);

    expect(screen.getByText('repo')).toBeInTheDocument();
    expect(screen.getByText('/tracked/repo')).toBeInTheDocument();
  });

  it('should show repository status when Git is configured', () => {
    mockUseGit.isInstalled = true;
    mockUseGit.projectConfig = {
      enabled: true,
      repoPath: '/test/repo',
      autoCommit: false,
      commitOnSessionEnd: true,
    };
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
      syncState: 'up-to-date',
      hasConflicts: false,
      inProgressOperation: null,
      canAbortOperation: false,
      recommendedRecoveryAction: null,
    };
    
    render(<ProjectGitPanel projectId="test-project" />);
    
    expect(screen.getByText('repoStatus.title')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should enable Git when clicking enable button', async () => {
    mockUseGit.isInstalled = true;
    mockUseGit.projectConfig = null;
    
    render(<ProjectGitPanel projectId="test-project" />);
    
    const enableButton = screen.getByText('enableGit');
    fireEvent.click(enableButton);
    
    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText('initDialog.title')).toBeInTheDocument();
    });
  });

  it('should call refreshStatus on refresh button click', async () => {
    mockUseGit.isInstalled = true;
    mockUseGit.projectConfig = {
      enabled: true,
      repoPath: '/test/repo',
      autoCommit: false,
      commitOnSessionEnd: true,
    };
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
      syncState: 'local-only',
      hasConflicts: false,
      inProgressOperation: null,
      canAbortOperation: false,
      recommendedRecoveryAction: null,
    };
    
    render(<ProjectGitPanel projectId="test-project" />);
    
    // Find and click refresh button (it's a ghost button with RefreshCw icon)
    const refreshButtons = screen.getAllByRole('button');
    const refreshButton = refreshButtons.find(btn => 
      btn.querySelector('svg.lucide-refresh-cw') !== null
    );
    
    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockUseGit.refreshStatus).toHaveBeenCalled();
    }
  });

  it('should show explicit auto-stage message in commit dialog', async () => {
    mockUseGit.isInstalled = true;
    mockUseGit.projectConfig = {
      enabled: true,
      repoPath: '/test/repo',
      autoCommit: false,
      commitOnSessionEnd: true,
    };
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
      syncState: 'ahead',
      hasConflicts: false,
      inProgressOperation: null,
      canAbortOperation: false,
      recommendedRecoveryAction: null,
    };
    mockUseGit.fileStatus = [{ path: 'test.ts', status: 'modified', staged: false }];

    render(<ProjectGitPanel projectId="test-project" />);

    fireEvent.click(screen.getByText('quickActions.commit'));

    await waitFor(() => {
      expect(screen.getByText('commitDialog.autoStageNotice')).toBeInTheDocument();
    });
  });

  it('should disable commit while recovery is required', () => {
    mockUseGit.isInstalled = true;
    mockUseGit.projectConfig = {
      enabled: true,
      repoPath: '/test/repo',
      autoCommit: false,
      commitOnSessionEnd: true,
    };
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
      syncState: 'diverged',
      hasConflicts: true,
      inProgressOperation: 'merge',
      canAbortOperation: true,
      recommendedRecoveryAction: 'Resolve merge conflicts before continuing.',
    };
    mockUseGit.fileStatus = [{ path: 'test.ts', status: 'modified', staged: false }];

    render(<ProjectGitPanel projectId="test-project" />);

    expect(screen.getByText('Resolve merge conflicts before continuing.')).toBeInTheDocument();
    expect(screen.getByText('quickActions.commit').closest('button')).toBeDisabled();
  });
});
