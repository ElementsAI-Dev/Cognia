/**
 * GitFileHistory Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitFileHistory } from './git-file-history';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock tauri dialog
jest.mock('@tauri-apps/plugin-dialog', () => ({
  open: jest.fn(),
}));

// Mock file history API
const mockGetFileHistory = jest.fn();
jest.mock('@/lib/native/git/file-history', () => ({
  getFileHistory: (...args: unknown[]) => mockGetFileHistory(...args),
}));

// Mock formatCommitDate
jest.mock('@/types/system/git', () => ({
  ...jest.requireActual('@/types/system/git'),
  formatCommitDate: jest.fn((date: string) => date),
}));

describe('GitFileHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state', () => {
    render(<GitFileHistory repoPath="/repo" />);
    expect(screen.getByText('fileHistory.noHistory')).toBeInTheDocument();
    expect(screen.getByText('fileHistory.noHistoryHint')).toBeInTheDocument();
  });

  it('renders title and file input', () => {
    render(<GitFileHistory repoPath="/repo" />);
    expect(screen.getByText('fileHistory.title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('fileHistory.filePlaceholder')).toBeInTheDocument();
  });

  it('renders initial file path in input', () => {
    render(<GitFileHistory repoPath="/repo" initialFilePath="src/main.ts" />);
    const input = screen.getByPlaceholderText('fileHistory.filePlaceholder') as HTMLInputElement;
    expect(input.value).toBe('src/main.ts');
  });

  it('loads file history on enter key', async () => {
    mockGetFileHistory.mockResolvedValue({
      success: true,
      data: [
        {
          commit: {
            hash: 'abc123',
            shortHash: 'abc123d',
            author: 'Alice Smith',
            authorEmail: 'alice@test.com',
            date: '2025-01-15T10:00:00Z',
            message: 'feat: add feature',
          },
          additions: 10,
          deletions: 5,
          oldPath: null,
        },
      ],
    });

    render(<GitFileHistory repoPath="/repo" />);
    const input = screen.getByPlaceholderText('fileHistory.filePlaceholder');
    fireEvent.change(input, { target: { value: 'src/index.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockGetFileHistory).toHaveBeenCalledWith('/repo', 'src/index.ts');
    });

    await waitFor(() => {
      expect(screen.getByText('feat: add feature')).toBeInTheDocument();
    });
  });

  it('shows error when API fails', async () => {
    mockGetFileHistory.mockResolvedValue({
      success: false,
      error: 'File not found in repository',
    });

    render(<GitFileHistory repoPath="/repo" />);
    const input = screen.getByPlaceholderText('fileHistory.filePlaceholder');
    fireEvent.change(input, { target: { value: 'missing.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('File not found in repository')).toBeInTheDocument();
    });
  });

  it('shows rename indicator when oldPath is present', async () => {
    mockGetFileHistory.mockResolvedValue({
      success: true,
      data: [
        {
          commit: {
            hash: 'abc123',
            shortHash: 'abc123d',
            author: 'Alice',
            authorEmail: 'alice@test.com',
            date: '2025-01-15',
            message: 'refactor: rename file',
          },
          additions: 0,
          deletions: 0,
          oldPath: 'src/old-name.ts',
        },
      ],
    });

    render(<GitFileHistory repoPath="/repo" />);
    const input = screen.getByPlaceholderText('fileHistory.filePlaceholder');
    fireEvent.change(input, { target: { value: 'src/new-name.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/src\/old-name\.ts/)).toBeInTheDocument();
    });
  });

  it('calls onCommitClick when entry is clicked', async () => {
    const mockOnClick = jest.fn();
    mockGetFileHistory.mockResolvedValue({
      success: true,
      data: [
        {
          commit: {
            hash: 'abc123',
            shortHash: 'abc123d',
            author: 'Alice',
            authorEmail: 'alice@test.com',
            date: '2025-01-15',
            message: 'feat: add feature',
          },
          additions: 10,
          deletions: 5,
          oldPath: null,
        },
      ],
    });

    render(<GitFileHistory repoPath="/repo" onCommitClick={mockOnClick} />);
    const input = screen.getByPlaceholderText('fileHistory.filePlaceholder');
    fireEvent.change(input, { target: { value: 'src/index.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('feat: add feature')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('feat: add feature'));
    expect(mockOnClick).toHaveBeenCalledWith('abc123');
  });

  it('applies custom className', () => {
    const { container } = render(
      <GitFileHistory repoPath="/repo" className="my-class" />
    );
    expect(container.firstChild).toHaveClass('my-class');
  });
});
