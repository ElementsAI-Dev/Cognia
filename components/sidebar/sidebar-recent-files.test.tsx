/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarRecentFiles } from './sidebar-recent-files';
import type { RecentFile } from '@/stores/system/recent-files-store';

const removeFile = jest.fn();
const updateFileUsage = jest.fn();

let currentFiles: RecentFile[] = [
  {
    id: 'file-1',
    name: 'Sample Document',
    path: '/docs/sample.pdf',
    type: 'document',
    mimeType: 'application/pdf',
    size: 2048,
    url: 'https://example.com/doc',
    usedAt: new Date(),
    usageCount: 1,
  },
];

jest.mock('@/stores/system/recent-files-store', () => ({
  useRecentFilesStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getRecentFiles: (limit?: number) => currentFiles.slice(0, limit ?? currentFiles.length),
      removeFile,
      updateFileUsage,
    };
    return selector(state);
  },
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SidebarRecentFiles', () => {
  beforeEach(() => {
    currentFiles = [
      {
        id: 'file-1',
        name: 'Sample Document',
        path: '/docs/sample.pdf',
        type: 'document',
        mimeType: 'application/pdf',
        size: 2048,
        url: 'https://example.com/doc',
        usedAt: new Date(),
        usageCount: 1,
      },
    ];
    removeFile.mockClear();
    updateFileUsage.mockClear();
    Object.defineProperty(window, 'open', {
      value: jest.fn(),
      writable: true,
    });
  });

  it('renders recent files list when open', () => {
    render(<SidebarRecentFiles defaultOpen />);
    expect(screen.getByText('Sample Document')).toBeInTheDocument();
  });

  it('limits displayed files based on limit prop', () => {
    currentFiles = [
      ...currentFiles,
      {
        id: 'file-2',
        name: 'Another File',
        path: '/docs/another.pdf',
        type: 'document',
        mimeType: 'application/pdf',
        size: 1024,
        usedAt: new Date(),
        usageCount: 1,
      },
    ];
    render(<SidebarRecentFiles defaultOpen limit={1} />);
    expect(screen.getByText('Sample Document')).toBeInTheDocument();
    expect(screen.queryByText('Another File')).not.toBeInTheDocument();
  });

  it('calls update usage and optional click handler when file is clicked', () => {
    const onFileClick = jest.fn();
    render(<SidebarRecentFiles defaultOpen onFileClick={onFileClick} />);
    fireEvent.click(screen.getByText('Sample Document'));
    expect(updateFileUsage).toHaveBeenCalledWith('file-1');
    expect(onFileClick).toHaveBeenCalled();
  });

  it('removes file when delete button clicked', () => {
    render(<SidebarRecentFiles defaultOpen />);
    const deleteButtons = screen.getAllByRole('button');
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(removeFile).toHaveBeenCalledWith('file-1');
  });
});
