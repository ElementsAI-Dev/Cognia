/**
 * GitBlameViewer Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitBlameViewer } from './git-blame-viewer';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock tauri dialog
jest.mock('@tauri-apps/plugin-dialog', () => ({
  open: jest.fn(),
}));

// Mock blame API
const mockGetBlame = jest.fn();
jest.mock('@/lib/native/git/advanced', () => ({
  getBlame: (...args: unknown[]) => mockGetBlame(...args),
}));

// Mock blame utils
jest.mock('@/lib/git/blame-utils', () => ({
  groupBlameByCommit: jest.fn(() => []),
  getBlameAgeColor: jest.fn(() => 'hsl(210, 70%, 94%)'),
  formatBlameRelativeDate: jest.fn(() => '2d ago'),
  assignBlameColors: jest.fn(() => new Map()),
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
});

describe('GitBlameViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state with no file selected', () => {
    render(<GitBlameViewer repoPath="/repo" />);
    expect(screen.getByText('blame.noFile')).toBeInTheDocument();
    expect(screen.getByText('blame.noFileHint')).toBeInTheDocument();
  });

  it('renders title and file input', () => {
    render(<GitBlameViewer repoPath="/repo" />);
    expect(screen.getByText('blame.title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('blame.filePlaceholder')).toBeInTheDocument();
  });

  it('loads blame data when enter is pressed on input', async () => {
    mockGetBlame.mockResolvedValue({
      success: true,
      data: { filePath: 'src/index.ts', lines: [] },
    });

    render(<GitBlameViewer repoPath="/repo" />);
    const input = screen.getByPlaceholderText('blame.filePlaceholder');
    fireEvent.change(input, { target: { value: 'src/index.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockGetBlame).toHaveBeenCalled();
    });
  });

  it('shows error when blame fails', async () => {
    mockGetBlame.mockResolvedValue({
      success: false,
      error: 'File not found',
    });

    render(<GitBlameViewer repoPath="/repo" />);
    const input = screen.getByPlaceholderText('blame.filePlaceholder');
    fireEvent.change(input, { target: { value: 'missing.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('File not found')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <GitBlameViewer repoPath="/repo" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders initial file path in input', () => {
    render(<GitBlameViewer repoPath="/repo" initialFilePath="src/main.ts" />);
    const input = screen.getByPlaceholderText('blame.filePlaceholder') as HTMLInputElement;
    expect(input.value).toBe('src/main.ts');
  });
});
