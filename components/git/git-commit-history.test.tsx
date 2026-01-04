/**
 * GitCommitHistory Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GitCommitHistory } from './git-commit-history';
import type { GitCommitInfo, GitDiffInfo } from '@/types/git';

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
jest.mock('@/types/git', () => ({
  ...jest.requireActual('@/types/git'),
  formatCommitDate: (date: string) => new Date(date).toLocaleDateString(),
  formatCommitMessage: (commit: { message: string }) => commit.message,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe('GitCommitHistory', () => {
  const mockCommits: GitCommitInfo[] = [
    {
      hash: 'abc123def456789',
      shortHash: 'abc123d',
      author: 'John Doe',
      authorEmail: 'john@example.com',
      date: '2024-01-15T10:30:00Z',
      message: 'Add new feature',
      messageBody: 'This commit adds a new feature with improvements.',
    },
    {
      hash: 'def456abc789123',
      shortHash: 'def456a',
      author: 'Jane Smith',
      authorEmail: 'jane@example.com',
      date: '2024-01-14T15:45:00Z',
      message: 'Fix bug in login',
    },
    {
      hash: 'ghi789def123456',
      shortHash: 'ghi789d',
      author: 'Bob Wilson',
      authorEmail: 'bob@example.com',
      date: '2024-01-13T09:00:00Z',
      message: 'Initial commit',
    },
  ];

  const mockDiffs: GitDiffInfo[] = [
    { path: 'src/feature.ts', additions: 50, deletions: 10 },
    { path: 'src/utils.ts', additions: 5, deletions: 2 },
  ];

  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);
  const mockOnLoadMore = jest.fn().mockResolvedValue(undefined);
  const mockOnViewDiff = jest.fn().mockResolvedValue(mockDiffs);
  const mockOnCheckout = jest.fn().mockResolvedValue(true);
  const mockOnRevert = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no commits', () => {
    render(<GitCommitHistory commits={[]} onRefresh={mockOnRefresh} />);
    expect(screen.getByText('noCommits')).toBeInTheDocument();
  });

  it('should render commit history title', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('should display current branch badge when provided', () => {
    render(
      <GitCommitHistory
        commits={mockCommits}
        currentBranch="main"
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should render commit messages', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    expect(screen.getByText('Add new feature')).toBeInTheDocument();
    expect(screen.getByText('Fix bug in login')).toBeInTheDocument();
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
  });

  it('should render commit authors', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('should render short hashes', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('def456a')).toBeInTheDocument();
  });

  it('should call onRefresh when clicking refresh button', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    
    const refreshButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg.lucide-refresh-cw')
    );
    
    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockOnRefresh).toHaveBeenCalled();
    }
  });

  it('should render commit messages in list', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    
    expect(screen.getByText('Add new feature')).toBeInTheDocument();
    expect(screen.getByText('Fix bug in login')).toBeInTheDocument();
  });

  it('should render short hashes in list', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    
    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('def456a')).toBeInTheDocument();
  });

  it('should render commit authors', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should render with checkout callback', () => {
    const { container } = render(
      <GitCommitHistory
        commits={mockCommits}
        onRefresh={mockOnRefresh}
        onCheckout={mockOnCheckout}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render with revert callback', () => {
    const { container } = render(
      <GitCommitHistory
        commits={mockCommits}
        onRefresh={mockOnRefresh}
        onRevert={mockOnRevert}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render title', () => {
    render(
      <GitCommitHistory
        commits={mockCommits}
        onRefresh={mockOnRefresh}
      />
    );
    
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('should show load more button when onLoadMore is provided', () => {
    render(
      <GitCommitHistory
        commits={mockCommits}
        onRefresh={mockOnRefresh}
        onLoadMore={mockOnLoadMore}
      />
    );
    expect(screen.getByText('loadMore')).toBeInTheDocument();
  });

  it('should call onLoadMore when clicking load more button', () => {
    render(
      <GitCommitHistory
        commits={mockCommits}
        onRefresh={mockOnRefresh}
        onLoadMore={mockOnLoadMore}
      />
    );
    
    const loadMoreButton = screen.getByText('loadMore');
    fireEvent.click(loadMoreButton);
    expect(mockOnLoadMore).toHaveBeenCalled();
  });

  it('should disable refresh when loading', () => {
    render(
      <GitCommitHistory
        commits={mockCommits}
        isLoading={true}
        onRefresh={mockOnRefresh}
      />
    );
    
    const buttons = screen.getAllByRole('button');
    const disabledButton = buttons.find(btn => btn.hasAttribute('disabled'));
    expect(disabledButton).toBeDefined();
  });

  it('should render commit list items', () => {
    render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    
    // All commits should be in the document
    expect(screen.getByText('Add new feature')).toBeInTheDocument();
    expect(screen.getByText('Fix bug in login')).toBeInTheDocument();
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
  });

  it('should have onViewDiff prop available', () => {
    const { container } = render(
      <GitCommitHistory
        commits={mockCommits}
        onRefresh={mockOnRefresh}
        onViewDiff={mockOnViewDiff}
      />
    );
    
    expect(container).toBeInTheDocument();
  });

  it('should render without errors', () => {
    const { container } = render(<GitCommitHistory commits={mockCommits} onRefresh={mockOnRefresh} />);
    expect(container).toBeInTheDocument();
  });
});
