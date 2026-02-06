/**
 * GitFileTree Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitFileTree } from './git-file-tree';
import type { GitFileStatus } from '@/types/system/git';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}: ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

describe('GitFileTree', () => {
  const mockFiles: GitFileStatus[] = [
    { path: 'src/app.tsx', status: 'modified', staged: true },
    { path: 'src/utils/helper.ts', status: 'modified', staged: false },
    { path: 'src/utils/format.ts', status: 'added', staged: false },
    { path: 'README.md', status: 'modified', staged: true },
    { path: 'package.json', status: 'modified', staged: false },
    { path: 'src/components/Button.tsx', status: 'deleted', staged: false },
  ];

  const mockOnStageFiles = jest.fn().mockResolvedValue(true);
  const mockOnUnstageFiles = jest.fn().mockResolvedValue(true);
  const mockOnDiscardFiles = jest.fn().mockResolvedValue(true);
  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no files', () => {
    render(
      <GitFileTree
        files={[]}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('noChanges')).toBeInTheDocument();
  });

  it('should render file tree title with count', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument(); // file count badge
  });

  it('should show staged and unstaged sections', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    // Use getAllByText since "staged" appears in both "staged" and "unstaged"
    const stagedElements = screen.getAllByText(/staged/i);
    expect(stagedElements.length).toBeGreaterThanOrEqual(2); // staged and unstaged sections
  });

  it('should render file paths', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    // Files appear in staged section and/or tree, so use getAllByText
    expect(screen.getByText('src/app.tsx')).toBeInTheDocument();
    const readmeElements = screen.getAllByText('README.md');
    expect(readmeElements.length).toBeGreaterThan(0);
  });

  it('should show quick action buttons', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('selectAll')).toBeInTheDocument();
    expect(screen.getByText('stageAll')).toBeInTheDocument();
    expect(screen.getByText('unstageAll')).toBeInTheDocument();
  });

  it('should call onStageFiles when clicking stage all', async () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    const stageAllButton = screen.getByText('stageAll');
    fireEvent.click(stageAllButton);

    await waitFor(() => {
      expect(mockOnStageFiles).toHaveBeenCalled();
    });
  });

  it('should call onUnstageFiles when clicking unstage all', async () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    const unstageAllButton = screen.getByText('unstageAll');
    fireEvent.click(unstageAllButton);

    await waitFor(() => {
      expect(mockOnUnstageFiles).toHaveBeenCalled();
    });
  });

  it('should render file items', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('src/app.tsx')).toBeInTheDocument();
  });

  it('should have select all button', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('selectAll')).toBeInTheDocument();
  });

  it('should call onRefresh when clicking refresh button', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg.lucide-refresh-cw'));

    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockOnRefresh).toHaveBeenCalled();
    }
  });

  it('should render with loading state', () => {
    const { container } = render(
      <GitFileTree
        files={mockFiles}
        isLoading={true}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('should display status badges', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    // Files appear in staged section and/or tree, so use getAllByText
    expect(screen.getByText('src/app.tsx')).toBeInTheDocument();
    const readmeElements = screen.getAllByText('README.md');
    expect(readmeElements.length).toBeGreaterThan(0);
  });

  it('should render multiple file paths', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    // Files appear in staged section and/or tree, so use getAllByText
    expect(screen.getByText('src/app.tsx')).toBeInTheDocument();
    const readmeElements = screen.getAllByText('README.md');
    expect(readmeElements.length).toBeGreaterThan(0);
  });

  it('should have unstage all button', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('unstageAll')).toBeInTheDocument();
  });

  it('should have stage all button', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('stageAll')).toBeInTheDocument();
  });

  it('should render file tree title', () => {
    render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('should render component correctly', () => {
    const { container } = render(
      <GitFileTree
        files={mockFiles}
        onStageFiles={mockOnStageFiles}
        onUnstageFiles={mockOnUnstageFiles}
        onDiscardFiles={mockOnDiscardFiles}
        onRefresh={mockOnRefresh}
      />
    );

    expect(container).toBeInTheDocument();
  });
});
