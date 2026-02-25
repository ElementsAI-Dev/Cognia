/**
 * GitCommitSearch Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GitCommitSearch } from './git-commit-search';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock search API
const mockSearchCommits = jest.fn();
jest.mock('@/lib/native/git/search', () => ({
  searchCommits: (...args: unknown[]) => mockSearchCommits(...args),
}));

// Mock formatCommitDate
jest.mock('@/types/system/git', () => ({
  ...jest.requireActual('@/types/system/git'),
  formatCommitDate: jest.fn((date: string) => date),
}));

describe('GitCommitSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders search UI with hint', () => {
    render(<GitCommitSearch repoPath="/repo" />);
    expect(screen.getByText('search.title')).toBeInTheDocument();
    expect(screen.getByText('search.hint')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('search.placeholder')).toBeInTheDocument();
  });

  it('triggers debounced search on input', async () => {
    mockSearchCommits.mockResolvedValue({
      success: true,
      data: [
        {
          hash: 'abc123',
          shortHash: 'abc123d',
          author: 'Alice',
          authorEmail: 'alice@test.com',
          date: '2025-01-15',
          message: 'fix: resolve bug',
        },
      ],
    });

    render(<GitCommitSearch repoPath="/repo" />);
    const input = screen.getByPlaceholderText('search.placeholder');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'fix' } });
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(mockSearchCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          repoPath: '/repo',
          mode: 'message',
          query: 'fix',
        })
      );
    });
  });

  it('shows no results state', async () => {
    mockSearchCommits.mockResolvedValue({ success: true, data: [] });

    render(<GitCommitSearch repoPath="/repo" />);
    const input = screen.getByPlaceholderText('search.placeholder');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'nonexistent' } });
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('search.noResults')).toBeInTheDocument();
    });
  });

  it('shows error from search API', async () => {
    mockSearchCommits.mockResolvedValue({
      success: false,
      error: 'Search failed',
    });

    render(<GitCommitSearch repoPath="/repo" />);
    const input = screen.getByPlaceholderText('search.placeholder');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  it('renders search results', async () => {
    mockSearchCommits.mockResolvedValue({
      success: true,
      data: [
        {
          hash: 'abc123def',
          shortHash: 'abc123d',
          author: 'Alice',
          authorEmail: 'alice@test.com',
          date: '2025-01-15',
          message: 'fix: resolve bug',
        },
        {
          hash: 'def456abc',
          shortHash: 'def456a',
          author: 'Bob',
          authorEmail: 'bob@test.com',
          date: '2025-01-14',
          message: 'fix: another bug',
        },
      ],
    });

    render(<GitCommitSearch repoPath="/repo" />);
    const input = screen.getByPlaceholderText('search.placeholder');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'fix' } });
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('fix: resolve bug')).toBeInTheDocument();
      expect(screen.getByText('fix: another bug')).toBeInTheDocument();
    });
  });

  it('calls onCommitClick when result is clicked', async () => {
    const mockOnClick = jest.fn();
    mockSearchCommits.mockResolvedValue({
      success: true,
      data: [
        {
          hash: 'abc123',
          shortHash: 'abc123d',
          author: 'Alice',
          authorEmail: 'alice@test.com',
          date: '2025-01-15',
          message: 'fix: resolve bug',
        },
      ],
    });

    render(<GitCommitSearch repoPath="/repo" onCommitClick={mockOnClick} />);
    const input = screen.getByPlaceholderText('search.placeholder');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'fix' } });
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('fix: resolve bug')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('fix: resolve bug'));
    expect(mockOnClick).toHaveBeenCalledWith(
      expect.objectContaining({ hash: 'abc123' })
    );
  });

  it('clears results when input is cleared', async () => {
    mockSearchCommits.mockResolvedValue({
      success: true,
      data: [
        {
          hash: 'abc123',
          shortHash: 'abc123d',
          author: 'Alice',
          authorEmail: 'alice@test.com',
          date: '2025-01-15',
          message: 'fix: resolve bug',
        },
      ],
    });

    render(<GitCommitSearch repoPath="/repo" />);
    const input = screen.getByPlaceholderText('search.placeholder');

    // Type and search
    await act(async () => {
      fireEvent.change(input, { target: { value: 'fix' } });
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('fix: resolve bug')).toBeInTheDocument();
    });

    // Clear input
    await act(async () => {
      fireEvent.change(input, { target: { value: '' } });
      jest.advanceTimersByTime(350);
    });

    // Should show hint again
    await waitFor(() => {
      expect(screen.getByText('search.hint')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <GitCommitSearch repoPath="/repo" className="my-search" />
    );
    expect(container.firstChild).toHaveClass('my-search');
  });
});
