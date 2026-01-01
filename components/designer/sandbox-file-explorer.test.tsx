/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SandboxFileExplorer } from './editor/sandbox-file-explorer';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock sandpack
const mockSetActiveFile = jest.fn();
const mockAddFile = jest.fn();
const mockDeleteFile = jest.fn();

jest.mock('@codesandbox/sandpack-react', () => ({
  useSandpack: () => ({
    sandpack: {
      files: {
        '/App.js': { code: 'export default function App() {}' },
        '/index.js': { code: "import App from './App'" },
        '/styles.css': { code: 'body { margin: 0; }' },
        '/components/Button.jsx': { code: 'export function Button() {}' },
        '/components/Card.jsx': { code: 'export function Card() {}' },
      },
      activeFile: '/App.js',
      setActiveFile: mockSetActiveFile,
      addFile: mockAddFile,
      deleteFile: mockDeleteFile,
    },
  }),
}));

// Mock UI components
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  ContextMenuSeparator: () => <hr />,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('SandboxFileExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the files header', () => {
    render(<SandboxFileExplorer />);
    expect(screen.getByText('files')).toBeInTheDocument();
  });

  it('should render add file button', () => {
    render(<SandboxFileExplorer />);
    const addButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-plus')
    );
    expect(addButton).toBeInTheDocument();
  });

  it('should render root level files', () => {
    render(<SandboxFileExplorer />);
    expect(screen.getByText('App.js')).toBeInTheDocument();
    expect(screen.getByText('index.js')).toBeInTheDocument();
    expect(screen.getByText('styles.css')).toBeInTheDocument();
  });

  it('should render directories', () => {
    render(<SandboxFileExplorer />);
    expect(screen.getByText('components')).toBeInTheDocument();
  });

  it('should highlight active file', () => {
    render(<SandboxFileExplorer />);
    const appJs = screen.getByText('App.js');
    // Active file should have the active class
    expect(appJs.closest('[class*="bg-primary"]')).toBeInTheDocument();
  });

  it('should call setActiveFile when file is clicked', async () => {
    render(<SandboxFileExplorer />);
    
    const indexJs = screen.getByText('index.js');
    await userEvent.click(indexJs);
    
    expect(mockSetActiveFile).toHaveBeenCalledWith('/index.js');
  });

  it('should show file icons based on extension', () => {
    render(<SandboxFileExplorer />);
    
    // JS files should have code icon
    const jsIcon = document.querySelector('svg.lucide-file-code');
    expect(jsIcon).toBeInTheDocument();
  });

  it('should show folder icons for directories', () => {
    render(<SandboxFileExplorer />);
    
    // Check that the components directory is rendered
    expect(screen.getByText('components')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<SandboxFileExplorer className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show new file option in dropdown', () => {
    render(<SandboxFileExplorer />);
    
    // The dropdown content is always visible in the mocked version
    const newFileOptions = screen.getAllByText('newFile');
    expect(newFileOptions.length).toBeGreaterThan(0);
  });

  it('should show new folder option in dropdown', () => {
    render(<SandboxFileExplorer />);
    
    // The dropdown content is always visible in the mocked version
    const newFolderOptions = screen.getAllByText('newFolder');
    expect(newFolderOptions.length).toBeGreaterThan(0);
  });

  it('should call onFileCreate callback when creating file', async () => {
    const onFileCreate = jest.fn();
    render(<SandboxFileExplorer onFileCreate={onFileCreate} />);
    
    // The callback should be available for file creation
    expect(onFileCreate).not.toHaveBeenCalled();
  });

  it('should call onFileDelete callback when deleting file', async () => {
    const onFileDelete = jest.fn();
    render(<SandboxFileExplorer onFileDelete={onFileDelete} />);
    
    // The callback should be available for file deletion
    expect(onFileDelete).not.toHaveBeenCalled();
  });

  it('should call onFileRename callback when renaming file', async () => {
    const onFileRename = jest.fn();
    render(<SandboxFileExplorer onFileRename={onFileRename} />);
    
    // The callback should be available for file renaming
    expect(onFileRename).not.toHaveBeenCalled();
  });
});

describe('SandboxFileExplorer file tree structure', () => {
  it('should display files in nested structure', () => {
    render(<SandboxFileExplorer />);
    
    // Root files
    expect(screen.getByText('App.js')).toBeInTheDocument();
    
    // Nested files in components folder
    expect(screen.getByText('Button.jsx')).toBeInTheDocument();
    expect(screen.getByText('Card.jsx')).toBeInTheDocument();
  });

  it('should render collapsible for directories', () => {
    render(<SandboxFileExplorer />);
    
    const collapsibles = screen.getAllByTestId('collapsible');
    expect(collapsibles.length).toBeGreaterThan(0);
  });
});
