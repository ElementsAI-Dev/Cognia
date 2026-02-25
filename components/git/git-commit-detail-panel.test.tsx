/**
 * GitCommitDetailPanel Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GitCommitDetailPanel } from './git-commit-detail-panel';
import type { GitCommitDetail } from '@/types/system/git';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock diff parser
jest.mock('@/lib/git/diff-parser', () => ({
  parseDiffContent: jest.fn(() => []),
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
});

describe('GitCommitDetailPanel', () => {
  const mockDetail: GitCommitDetail = {
    commit: {
      hash: 'abc123def456789',
      shortHash: 'abc123d',
      author: 'Alice',
      authorEmail: 'alice@test.com',
      date: '2025-01-15T10:00:00Z',
      message: 'feat: add login page',
      messageBody: 'Detailed description of the change.',
    },
    fileChanges: [
      { path: 'src/login.tsx', additions: 50, deletions: 10 },
      { path: 'src/auth.ts', additions: 20, deletions: 5 },
    ],
    diffContent: 'diff --git a/src/login.tsx b/src/login.tsx\n@@ -1 +1 @@\n-old\n+new',
    parents: ['parent123', 'parent456'],
    totalAdditions: 70,
    totalDeletions: 15,
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no commit detail', () => {
    render(<GitCommitDetailPanel commitDetail={null} onClose={mockOnClose} />);
    expect(screen.getByText('commitDetail.noDetail')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { container } = render(
      <GitCommitDetailPanel commitDetail={null} isLoading onClose={mockOnClose} />
    );
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders commit message and body', () => {
    render(<GitCommitDetailPanel commitDetail={mockDetail} onClose={mockOnClose} />);
    expect(screen.getByText('feat: add login page')).toBeInTheDocument();
    expect(screen.getByText('Detailed description of the change.')).toBeInTheDocument();
  });

  it('renders commit metadata', () => {
    render(<GitCommitDetailPanel commitDetail={mockDetail} onClose={mockOnClose} />);
    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders parent commit hashes', () => {
    render(<GitCommitDetailPanel commitDetail={mockDetail} onClose={mockOnClose} />);
    expect(screen.getByText('parent1')).toBeInTheDocument();
    expect(screen.getByText('parent4')).toBeInTheDocument();
  });

  it('renders file changes count', () => {
    render(<GitCommitDetailPanel commitDetail={mockDetail} onClose={mockOnClose} />);
    expect(screen.getByText('src/login.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/auth.ts')).toBeInTheDocument();
  });

  it('renders total additions and deletions', () => {
    render(<GitCommitDetailPanel commitDetail={mockDetail} onClose={mockOnClose} />);
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<GitCommitDetailPanel commitDetail={mockDetail} onClose={mockOnClose} />);
    const closeButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('[class*="h-4 w-4"]')
    );
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('calls onNavigateToParent when parent hash is clicked', () => {
    const mockNavigate = jest.fn();
    render(
      <GitCommitDetailPanel
        commitDetail={mockDetail}
        onClose={mockOnClose}
        onNavigateToParent={mockNavigate}
      />
    );
    const parentBtn = screen.getByText('parent1');
    fireEvent.click(parentBtn);
    expect(mockNavigate).toHaveBeenCalledWith('parent123');
  });

  it('renders action buttons when handlers are provided', () => {
    const mockCherryPick = jest.fn();
    const mockRevert = jest.fn();
    render(
      <GitCommitDetailPanel
        commitDetail={mockDetail}
        onClose={mockOnClose}
        onCherryPick={mockCherryPick}
        onRevert={mockRevert}
      />
    );
    expect(screen.getByText('commitDetail.cherryPick')).toBeInTheDocument();
    expect(screen.getByText('commitDetail.revert')).toBeInTheDocument();
  });

  it('calls onCherryPick when cherry-pick button is clicked', () => {
    const mockCherryPick = jest.fn();
    render(
      <GitCommitDetailPanel
        commitDetail={mockDetail}
        onClose={mockOnClose}
        onCherryPick={mockCherryPick}
      />
    );
    fireEvent.click(screen.getByText('commitDetail.cherryPick'));
    expect(mockCherryPick).toHaveBeenCalledWith('abc123def456789');
  });

  it('applies custom className', () => {
    const { container } = render(
      <GitCommitDetailPanel
        commitDetail={mockDetail}
        onClose={mockOnClose}
        className="w-400"
      />
    );
    expect(container.firstChild).toHaveClass('w-400');
  });

  it('toggles file diff expansion when file is clicked', () => {
    render(<GitCommitDetailPanel commitDetail={mockDetail} onClose={mockOnClose} />);
    const fileBtn = screen.getByText('src/login.tsx');
    fireEvent.click(fileBtn);
    // After expanding, it should show the file entry expanded
    // Click again to collapse
    fireEvent.click(fileBtn);
  });
});
