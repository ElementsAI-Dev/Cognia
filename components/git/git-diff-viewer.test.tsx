/**
 * GitDiffViewer Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitDiffViewer } from './git-diff-viewer';
import type { GitDiffInfo, GitFileStatus } from '@/types/system/git';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe('GitDiffViewer', () => {
  const mockDiffs: GitDiffInfo[] = [
    {
      path: 'src/app.tsx',
      additions: 10,
      deletions: 5,
      content: `@@ -1,5 +1,10 @@
-import React from 'react';
+import React, { useState } from 'react';
 
 function App() {
+  const [count, setCount] = useState(0);
   return <div>Hello</div>;
 }`,
    },
    {
      path: 'src/utils.ts',
      additions: 3,
      deletions: 0,
      content: `@@ -1,3 +1,6 @@
 export function helper() {
   return true;
 }
+
+export function newHelper() {
+  return false;
+}`,
    },
  ];

  const mockFileStatus: GitFileStatus[] = [
    { path: 'src/app.tsx', status: 'modified', staged: false },
    { path: 'src/utils.ts', status: 'modified', staged: true },
  ];

  const mockOnStageFile = jest.fn().mockResolvedValue(true);
  const mockOnUnstageFile = jest.fn().mockResolvedValue(true);
  const mockOnDiscardFile = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no diffs provided', () => {
    render(<GitDiffViewer diffs={[]} />);
    expect(screen.getByText('noChanges')).toBeInTheDocument();
  });

  it('should render diff list with file count', () => {
    render(<GitDiffViewer diffs={mockDiffs} />);
    expect(screen.getByText('filesChanged')).toBeInTheDocument();
  });

  it('should render file paths', () => {
    render(<GitDiffViewer diffs={mockDiffs} />);
    expect(screen.getByText('src/app.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/utils.ts')).toBeInTheDocument();
  });

  it('should show additions and deletions count', () => {
    render(<GitDiffViewer diffs={mockDiffs} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('should expand diff when clicking on file', async () => {
    render(<GitDiffViewer diffs={mockDiffs} fileStatus={mockFileStatus} />);

    const fileButton = screen.getByText('src/app.tsx').closest('button');
    if (fileButton) {
      fireEvent.click(fileButton);
    }

    await waitFor(() => {
      expect(screen.getByText('copyPath')).toBeInTheDocument();
    });
  });

  it('should show expand all and collapse all buttons', () => {
    render(<GitDiffViewer diffs={mockDiffs} />);
    expect(screen.getByText('expandAll')).toBeInTheDocument();
    expect(screen.getByText('collapseAll')).toBeInTheDocument();
  });

  it('should expand all diffs when clicking expand all', async () => {
    render(<GitDiffViewer diffs={mockDiffs} />);

    const expandAllButton = screen.getByText('expandAll');
    fireEvent.click(expandAllButton);

    await waitFor(() => {
      const copyPathButtons = screen.getAllByText('copyPath');
      expect(copyPathButtons.length).toBe(2);
    });
  });

  it('should show stage button for unstaged files', async () => {
    render(
      <GitDiffViewer diffs={mockDiffs} fileStatus={mockFileStatus} onStageFile={mockOnStageFile} />
    );

    const expandAllButton = screen.getByText('expandAll');
    fireEvent.click(expandAllButton);

    await waitFor(() => {
      expect(screen.getByText('stage')).toBeInTheDocument();
    });
  });

  it('should show unstage button for staged files', async () => {
    render(
      <GitDiffViewer
        diffs={mockDiffs}
        fileStatus={mockFileStatus}
        onUnstageFile={mockOnUnstageFile}
      />
    );

    const expandAllButton = screen.getByText('expandAll');
    fireEvent.click(expandAllButton);

    await waitFor(() => {
      expect(screen.getByText('unstage')).toBeInTheDocument();
    });
  });

  it('should call onStageFile when clicking stage button', async () => {
    render(
      <GitDiffViewer diffs={mockDiffs} fileStatus={mockFileStatus} onStageFile={mockOnStageFile} />
    );

    const expandAllButton = screen.getByText('expandAll');
    fireEvent.click(expandAllButton);

    await waitFor(() => {
      const stageButton = screen.getByText('stage');
      fireEvent.click(stageButton);
      expect(mockOnStageFile).toHaveBeenCalledWith('src/app.tsx');
    });
  });

  it('should call onDiscardFile when clicking discard button', async () => {
    render(
      <GitDiffViewer
        diffs={mockDiffs}
        fileStatus={mockFileStatus}
        onDiscardFile={mockOnDiscardFile}
      />
    );

    const expandAllButton = screen.getByText('expandAll');
    fireEvent.click(expandAllButton);

    await waitFor(() => {
      const discardButtons = screen.getAllByText('discard');
      fireEvent.click(discardButtons[0]);
      expect(mockOnDiscardFile).toHaveBeenCalled();
    });
  });

  it('should copy path to clipboard when clicking copy button', async () => {
    render(<GitDiffViewer diffs={mockDiffs} />);

    const expandAllButton = screen.getByText('expandAll');
    fireEvent.click(expandAllButton);

    await waitFor(() => {
      const copyButtons = screen.getAllByText('copyPath');
      fireEvent.click(copyButtons[0]);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('src/app.tsx');
    });
  });

  it('should show fullscreen button', async () => {
    render(<GitDiffViewer diffs={mockDiffs} />);

    const expandAllButton = screen.getByText('expandAll');
    fireEvent.click(expandAllButton);

    await waitFor(() => {
      expect(screen.getAllByText('fullscreen').length).toBeGreaterThan(0);
    });
  });

  it('should handle binary files without content', () => {
    const binaryDiff: GitDiffInfo[] = [
      {
        path: 'image.png',
        additions: 0,
        deletions: 0,
        content: '',
      },
    ];

    render(<GitDiffViewer diffs={binaryDiff} />);

    const fileButton = screen.getByText('image.png').closest('button');
    if (fileButton) {
      fireEvent.click(fileButton);
    }

    expect(screen.getByText('binaryOrEmpty')).toBeInTheDocument();
  });

  it('should display status badge for files with status', () => {
    render(<GitDiffViewer diffs={mockDiffs} fileStatus={mockFileStatus} />);

    // Modified files should show 'M' badge
    const badges = screen.getAllByText('M');
    expect(badges.length).toBeGreaterThan(0);
  });
});
