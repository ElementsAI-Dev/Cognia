/**
 * GitCommitGraph Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GitCommitGraph } from './git-commit-graph';
import type { GitGraphCommit } from '@/types/system/git';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}: ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

// Mock formatCommitDate
jest.mock('@/types/system/git', () => ({
  ...jest.requireActual('@/types/system/git'),
  formatCommitDate: jest.fn((date: string) => date),
}));

describe('GitCommitGraph', () => {
  const mockCommits: GitGraphCommit[] = [
    {
      hash: 'abc123def456',
      shortHash: 'abc123d',
      author: 'Alice',
      authorEmail: 'alice@example.com',
      date: '2025-01-15T10:00:00Z',
      message: 'feat: add login page',
      parents: ['def456abc789'],
      refs: ['HEAD -> main'],
      lane: 0,
    },
    {
      hash: 'def456abc789',
      shortHash: 'def456a',
      author: 'Bob',
      authorEmail: 'bob@example.com',
      date: '2025-01-14T09:00:00Z',
      message: 'fix: resolve bug',
      parents: ['ghi789def012'],
      refs: ['origin/main'],
      lane: 0,
    },
    {
      hash: 'ghi789def012',
      shortHash: 'ghi789d',
      author: 'Alice',
      authorEmail: 'alice@example.com',
      date: '2025-01-13T08:00:00Z',
      message: 'Initial commit',
      parents: [],
      refs: ['tag: v1.0.0'],
      lane: 0,
    },
  ];

  const mergeCommits: GitGraphCommit[] = [
    {
      hash: 'merge123',
      shortHash: 'merge12',
      author: 'Alice',
      authorEmail: 'alice@example.com',
      date: '2025-01-16T12:00:00Z',
      message: 'Merge branch feature into main',
      parents: ['abc123def456', 'feature123'],
      refs: ['HEAD -> main'],
      lane: 0,
    },
    ...mockCommits,
  ];

  const mockOnCommitClick = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no commits', () => {
    render(<GitCommitGraph commits={[]} />);
    expect(screen.getByText('graph.noCommits')).toBeInTheDocument();
  });

  it('should render refresh button in empty state when onRefresh provided', () => {
    render(<GitCommitGraph commits={[]} onRefresh={mockOnRefresh} />);
    expect(screen.getByText('graph.refresh')).toBeInTheDocument();
  });

  it('should call onRefresh when clicking refresh in empty state', () => {
    render(<GitCommitGraph commits={[]} onRefresh={mockOnRefresh} />);
    fireEvent.click(screen.getByText('graph.refresh'));
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('should render graph header with title and commit count', () => {
    render(<GitCommitGraph commits={mockCommits} />);
    expect(screen.getByText('graph.title')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render commit messages', () => {
    render(<GitCommitGraph commits={mockCommits} />);
    // Messages appear in both the row and tooltip, so use getAllByText
    expect(screen.getAllByText('feat: add login page').length).toBeGreaterThan(0);
    expect(screen.getAllByText('fix: resolve bug').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Initial commit').length).toBeGreaterThan(0);
  });

  it('should render short hashes', () => {
    render(<GitCommitGraph commits={mockCommits} />);
    // Hashes appear in both row and tooltip
    expect(screen.getAllByText('abc123d').length).toBeGreaterThan(0);
    expect(screen.getAllByText('def456a').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ghi789d').length).toBeGreaterThan(0);
  });

  it('should render ref badges', () => {
    render(<GitCommitGraph commits={mockCommits} />);
    // The refs get processed - HEAD -> main becomes 'main', may appear multiple times
    expect(screen.getAllByText('main').length).toBeGreaterThan(0);
  });

  it('should call onCommitClick when clicking a commit row', () => {
    render(
      <GitCommitGraph commits={mockCommits} onCommitClick={mockOnCommitClick} />
    );
    const messages = screen.getAllByText('feat: add login page');
    fireEvent.click(messages[0]);
    expect(mockOnCommitClick).toHaveBeenCalledWith(
      expect.objectContaining({ hash: 'abc123def456' })
    );
  });

  it('should highlight selected commit', () => {
    render(
      <GitCommitGraph
        commits={mockCommits}
        selectedCommit="abc123def456"
      />
    );
    // Selected commit should have primary background class
    const messages = screen.getAllByText('feat: add login page');
    const selectedRow = messages[0].closest('div');
    expect(selectedRow).toHaveClass('bg-primary/10');
  });

  it('should render SVG with graph nodes', () => {
    const { container } = render(<GitCommitGraph commits={mockCommits} />);
    const circles = container.querySelectorAll('circle');
    // Each commit has at least one circle node
    expect(circles.length).toBeGreaterThanOrEqual(3);
  });

  it('should render connections between commits', () => {
    const { container } = render(<GitCommitGraph commits={mockCommits} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Should have lines or paths for connections
    const lines = container.querySelectorAll('line');
    const paths = container.querySelectorAll('path');
    expect(lines.length + paths.length).toBeGreaterThan(0);
  });

  it('should render merge commit tooltip info', () => {
    render(<GitCommitGraph commits={mergeCommits} />);
    expect(screen.getAllByText('Merge branch feature into main').length).toBeGreaterThan(0);
  });

  it('should render refresh button in header when onRefresh provided', () => {
    render(
      <GitCommitGraph commits={mockCommits} onRefresh={mockOnRefresh} />
    );
    // Header should have a refresh button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should show loading state', () => {
    const { container } = render(
      <GitCommitGraph commits={mockCommits} isLoading={true} onRefresh={mockOnRefresh} />
    );
    // Loading spinner should be present
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <GitCommitGraph commits={mockCommits} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  // ==================== New Feature Tests ====================

  it('should render search input in header', () => {
    render(<GitCommitGraph commits={mockCommits} />);
    expect(screen.getByPlaceholderText('graph.searchPlaceholder')).toBeInTheDocument();
  });

  it('should render diamond polygon for merge commits', () => {
    const { container } = render(<GitCommitGraph commits={mergeCommits} />);
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(1);
  });

  it('should dim non-matching commits when searching', () => {
    const { container } = render(<GitCommitGraph commits={mockCommits} />);
    const input = screen.getByPlaceholderText('graph.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'add login' } });

    // Non-matching commit rows should have opacity-25 class
    const rows = container.querySelectorAll('[class*="opacity-25"]');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should render load more button when onLoadMore is provided', () => {
    const mockLoadMore = jest.fn();
    render(<GitCommitGraph commits={mockCommits} onLoadMore={mockLoadMore} />);
    expect(screen.getByText('graph.loadMore')).toBeInTheDocument();
  });

  it('should call onLoadMore when load more button is clicked', () => {
    const mockLoadMore = jest.fn();
    render(<GitCommitGraph commits={mockCommits} onLoadMore={mockLoadMore} />);
    fireEvent.click(screen.getByText('graph.loadMore'));
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('should not render load more button when onLoadMore is not provided', () => {
    render(<GitCommitGraph commits={mockCommits} />);
    expect(screen.queryByText('graph.loadMore')).not.toBeInTheDocument();
  });

  it('should render normal circles for non-merge commits', () => {
    const nonMergeCommits: GitGraphCommit[] = [
      {
        hash: 'single1',
        shortHash: 'single1',
        author: 'Alice',
        authorEmail: 'alice@example.com',
        date: '2025-01-15T10:00:00Z',
        message: 'Single parent commit',
        parents: ['parent1'],
        refs: [],
        lane: 0,
      },
    ];
    const { container } = render(<GitCommitGraph commits={nonMergeCommits} />);
    const circles = container.querySelectorAll('circle');
    const polygons = container.querySelectorAll('polygon');
    expect(circles.length).toBeGreaterThan(0);
    expect(polygons.length).toBe(0);
  });

  it('should handle empty parents gracefully', () => {
    const rootCommit: GitGraphCommit[] = [
      {
        hash: 'root123',
        shortHash: 'root123',
        author: 'Alice',
        authorEmail: 'alice@example.com',
        date: '2025-01-01T00:00:00Z',
        message: 'Root commit',
        parents: [],
        refs: [],
        lane: 0,
      },
    ];
    const { container } = render(<GitCommitGraph commits={rootCommit} />);
    expect(container).toBeInTheDocument();
    expect(screen.getAllByText('Root commit').length).toBeGreaterThan(0);
  });
});
