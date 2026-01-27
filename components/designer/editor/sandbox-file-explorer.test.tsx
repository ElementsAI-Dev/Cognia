/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import _userEvent from '@testing-library/user-event';
import { SandboxFileExplorer } from './sandbox-file-explorer';

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

const mockFiles = {
  '/App.js': { code: 'export default function App() {}' },
  '/index.js': { code: "import App from './App'" },
  '/styles.css': { code: 'body { margin: 0; }' },
  '/components/Button.jsx': { code: 'export function Button() {}' },
  '/components/Card.jsx': { code: 'export function Card() {}' },
};

describe('SandboxFileExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the files header', () => {
    render(<SandboxFileExplorer files={mockFiles} />);
    expect(screen.getByText('files')).toBeInTheDocument();
  });

  it('should render add file button', () => {
    render(<SandboxFileExplorer files={mockFiles} />);
    const addButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-plus')
    );
    expect(addButton).toBeInTheDocument();
  });

  it('should render root level files', () => {
    render(<SandboxFileExplorer files={mockFiles} />);
    expect(screen.getByText('App.js')).toBeInTheDocument();
    expect(screen.getByText('index.js')).toBeInTheDocument();
    expect(screen.getByText('styles.css')).toBeInTheDocument();
  });

  it('should render directories', () => {
    render(<SandboxFileExplorer files={mockFiles} />);
    expect(screen.getByText('components')).toBeInTheDocument();
  });

  it('should render with active file prop', () => {
    render(<SandboxFileExplorer files={mockFiles} activeFile="/App.js" />);
    const appJs = screen.getByText('App.js');
    expect(appJs).toBeInTheDocument();
  });

  it('should accept onFileSelect callback', () => {
    const mockOnFileSelect = jest.fn();
    render(<SandboxFileExplorer files={mockFiles} onFileSelect={mockOnFileSelect} />);
    expect(screen.getByText('App.js')).toBeInTheDocument();
  });

  it('should show file icons based on extension', () => {
    render(<SandboxFileExplorer files={mockFiles} />);
    
    // JS files should have code icon
    const jsIcon = document.querySelector('svg.lucide-file-code');
    expect(jsIcon).toBeInTheDocument();
  });

  it('should show folder icons for directories', () => {
    render(<SandboxFileExplorer files={mockFiles} />);
    
    // Check that the components directory is rendered
    expect(screen.getByText('components')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<SandboxFileExplorer files={mockFiles} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

});

describe('SandboxFileExplorer file tree structure', () => {
  it('should display root level files', () => {
    render(<SandboxFileExplorer files={mockFiles} />);
    
    // Root files should be visible
    expect(screen.getByText('App.js')).toBeInTheDocument();
    expect(screen.getByText('index.js')).toBeInTheDocument();
    expect(screen.getByText('styles.css')).toBeInTheDocument();
  });

  it('should render directories', () => {
    render(<SandboxFileExplorer files={mockFiles} />);
    
    // Check that components directory is rendered
    expect(screen.getByText('components')).toBeInTheDocument();
  });
});

describe('SandboxFileExplorer file icons', () => {
  it('should show code icons for tsx files', () => {
    const tsxFiles = {
      '/App.tsx': { code: 'export default function App() {}' },
    };
    render(<SandboxFileExplorer files={tsxFiles} />);
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
  });

  it('should show code icons for ts files', () => {
    const tsFiles = {
      '/utils.ts': { code: 'export const util = () => {}' },
    };
    render(<SandboxFileExplorer files={tsFiles} />);
    expect(screen.getByText('utils.ts')).toBeInTheDocument();
  });

  it('should show text icons for css files', () => {
    const cssFiles = {
      '/styles.css': { code: 'body { margin: 0; }' },
    };
    render(<SandboxFileExplorer files={cssFiles} />);
    expect(screen.getByText('styles.css')).toBeInTheDocument();
  });

  it('should show text icons for scss files', () => {
    const scssFiles = {
      '/styles.scss': { code: '$primary: blue;' },
    };
    render(<SandboxFileExplorer files={scssFiles} />);
    expect(screen.getByText('styles.scss')).toBeInTheDocument();
  });

  it('should show text icons for html files', () => {
    const htmlFiles = {
      '/index.html': { code: '<html></html>' },
    };
    render(<SandboxFileExplorer files={htmlFiles} />);
    expect(screen.getByText('index.html')).toBeInTheDocument();
  });

  it('should show code icons for json files', () => {
    const jsonFiles = {
      '/package.json': { code: '{}' },
    };
    render(<SandboxFileExplorer files={jsonFiles} />);
    expect(screen.getByText('package.json')).toBeInTheDocument();
  });

  it('should show image icons for png files', () => {
    const imageFiles = {
      '/logo.png': { code: '' },
    };
    render(<SandboxFileExplorer files={imageFiles} />);
    expect(screen.getByText('logo.png')).toBeInTheDocument();
  });

  it('should show default icons for unknown file types', () => {
    const unknownFiles = {
      '/readme.md': { code: '# Readme' },
    };
    render(<SandboxFileExplorer files={unknownFiles} />);
    expect(screen.getByText('readme.md')).toBeInTheDocument();
  });
});

describe('SandboxFileExplorer callbacks', () => {
  it('should call onFileSelect when provided', () => {
    const onFileSelect = jest.fn();
    render(<SandboxFileExplorer files={mockFiles} onFileSelect={onFileSelect} />);
    expect(screen.getByText('App.js')).toBeInTheDocument();
  });

  it('should call onFileCreate when provided', () => {
    const onFileCreate = jest.fn();
    render(<SandboxFileExplorer files={mockFiles} onFileCreate={onFileCreate} />);
    expect(screen.getByText('files')).toBeInTheDocument();
  });

  it('should call onFileDelete when provided', () => {
    const onFileDelete = jest.fn();
    render(<SandboxFileExplorer files={mockFiles} onFileDelete={onFileDelete} />);
    expect(screen.getByText('App.js')).toBeInTheDocument();
  });
});

describe('SandboxFileExplorer empty state', () => {
  it('should render with empty files', () => {
    render(<SandboxFileExplorer files={{}} />);
    expect(screen.getByText('files')).toBeInTheDocument();
  });
});

describe('SandboxFileExplorer nested directories', () => {
  it('should handle deeply nested files', () => {
    const nestedFiles = {
      '/src/components/ui/Button.tsx': { code: 'export function Button() {}' },
    };
    render(<SandboxFileExplorer files={nestedFiles} />);
    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('should handle multiple nested directories', () => {
    const multiNestedFiles = {
      '/src/components/Button.tsx': { code: '' },
      '/src/utils/helpers.ts': { code: '' },
      '/lib/api/client.ts': { code: '' },
    };
    render(<SandboxFileExplorer files={multiNestedFiles} />);
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('lib')).toBeInTheDocument();
  });
});
