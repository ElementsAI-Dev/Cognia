/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactPanel } from './artifact-panel';

// Mock the extracted hook directly — avoids useShallow compatibility issues
const mockClosePanel = jest.fn();
const mockHandleEditMode = jest.fn();
const mockHandleSaveEdit = jest.fn();
const mockHandleCancelEdit = jest.fn();
const mockHandleCopy = jest.fn();
const mockHandleDownload = jest.fn();
const mockHandleOpenInCanvas = jest.fn();
const mockHandleRevealInExplorer = jest.fn();
const mockToggleFullscreen = jest.fn();
const mockHandleEditorChange = jest.fn();
const mockSetViewMode = jest.fn();
const mockSetDesignerOpen = jest.fn();
const mockSetShowVersionHistory = jest.fn();

const defaultHookReturn = {
  t: (key: string) => key,
  tCommon: (key: string) => key,
  panelOpen: true,
  panelView: 'artifact' as const,
  activeArtifact: {
    id: 'artifact-1',
    title: 'Test Artifact',
    content: '<div>Test Content</div>',
    type: 'html' as const,
    language: 'html',
    version: 1,
  },
  theme: 'light',
  isDesktop: false,
  viewMode: 'code' as 'code' | 'preview' | 'edit',
  setViewMode: mockSetViewMode,
  copied: false,
  designerOpen: false,
  setDesignerOpen: mockSetDesignerOpen,
  editContent: '<div>Test Content</div>',
  hasChanges: false,
  isFullscreen: false,
  showVersionHistory: false,
  setShowVersionHistory: mockSetShowVersionHistory,
  lastDownloadPath: null as string | null,
  isPreviewable: true,
  isDesignable: false,
  panelWidth: 'w-full sm:w-[600px] sm:max-w-[600px]',
  closePanel: mockClosePanel,
  handleOpenInCanvas: mockHandleOpenInCanvas,
  handleEditMode: mockHandleEditMode,
  handleSaveEdit: mockHandleSaveEdit,
  handleCancelEdit: mockHandleCancelEdit,
  handleEditorChange: mockHandleEditorChange,
  toggleFullscreen: mockToggleFullscreen,
  handleCopy: mockHandleCopy,
  handleDownload: mockHandleDownload,
  handleRevealInExplorer: mockHandleRevealInExplorer,
};

let hookReturnOverrides: Partial<typeof defaultHookReturn> = {};

jest.mock('@/hooks/artifacts', () => ({
  useArtifactPanelState: () => ({ ...defaultHookReturn, ...hookReturnOverrides }),
}));

// Mock UI components
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="sheet-title">{children}</span>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('@/components/ai-elements/artifact', () => ({
  Artifact: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="artifact" className={className}>
      {children}
    </div>
  ),
  ArtifactHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="artifact-header">{children}</div>
  ),
  ArtifactTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="artifact-title">{children}</h2>
  ),
  ArtifactActions: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="artifact-actions">{children}</div>
  ),
  ArtifactAction: ({
    tooltip,
    onClick,
  }: {
    tooltip?: string;
    icon?: React.ComponentType;
    onClick?: () => void;
  }) => (
    <button data-testid={`action-${tooltip}`} onClick={onClick}>
      {tooltip}
    </button>
  ),
  ArtifactContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="artifact-content">{children}</div>
  ),
  ArtifactClose: ({ onClick }: { onClick?: () => void }) => (
    <button data-testid="artifact-close" onClick={onClick}>
      Close
    </button>
  ),
}));

jest.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

jest.mock('@/components/designer', () => ({
  V0Designer: () => <div data-testid="v0-designer" />,
}));

jest.mock('@/lib/artifacts', () => ({
  getShikiLanguage: () => 'javascript',
  getMonacoLanguage: () => 'javascript',
  getArtifactExtension: () => '.js',
  canPreview: () => true,
  canDesign: () => false,
  MERMAID_TYPE_NAMES: {},
  DESIGNABLE_TYPES: [],
}));

jest.mock('./artifact-list', () => ({
  ArtifactList: () => <div data-testid="artifact-list" />,
}));

jest.mock('./panel-version-history', () => ({
  PanelVersionHistory: () => <div data-testid="version-history" />,
}));

jest.mock('./panel-designer-wrapper', () => ({
  ArtifactDesignerWrapper: () => <div data-testid="designer-wrapper" />,
}));

jest.mock('next/dynamic', () => {
  return function dynamic(_loader: () => Promise<{ default: React.ComponentType }>) {
    const Component = (props: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Comp = require('@monaco-editor/react').default;
      return <Comp {...props} />;
    };
    Component.displayName = 'DynamicComponent';
    return Component;
  };
});

jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <pre data-testid="monaco-editor">{value}</pre>,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('./artifact-icons', () => ({
  getArtifactTypeIcon: () => <span data-testid="artifact-icon" />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/loading-states', () => ({
  ArtifactPanelLoading: () => <div data-testid="loading" />,
}));

jest.mock('@/lib/monaco', () => ({
  createEditorOptions: () => ({}),
  getMonacoTheme: () => 'vs-light',
  getMonacoLanguage: () => 'html',
}));

jest.mock('./artifact-preview', () => ({
  ArtifactPreview: ({ artifact }: { artifact: { title: string } }) => (
    <div data-testid="artifact-preview">{artifact.title}</div>
  ),
}));

describe('ArtifactPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hookReturnOverrides = {};
  });

  it('renders when panel is open', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });

  it('displays artifact title', () => {
    render(<ArtifactPanel />);
    expect(screen.getByText('Test Artifact')).toBeInTheDocument();
  });

  it('displays artifact version and language', () => {
    render(<ArtifactPanel />);
    expect(screen.getByText(/v1/)).toBeInTheDocument();
  });

  it('renders code view by default', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('code-block')).toBeInTheDocument();
  });

  it('shows Code and Preview tabs for previewable artifacts', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('tab-code')).toBeInTheDocument();
    expect(screen.getByTestId('tab-preview')).toBeInTheDocument();
  });

  it('calls closePanel when close button is clicked', () => {
    render(<ArtifactPanel />);
    fireEvent.click(screen.getByTestId('artifact-close'));
    expect(mockClosePanel).toHaveBeenCalled();
  });

  it('renders copy action button', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('action-copy')).toBeInTheDocument();
  });

  it('renders download action button', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('action-download')).toBeInTheDocument();
  });

  it('renders edit action button', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('action-edit')).toBeInTheDocument();
  });

  it('renders fullscreen action button', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('action-fullscreen')).toBeInTheDocument();
  });

  it('renders editInCanvas action button', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('action-editInCanvas')).toBeInTheDocument();
  });

  it('renders artifact type icon', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('artifact-icon')).toBeInTheDocument();
  });

  it('displays artifact content in code block', () => {
    render(<ArtifactPanel />);
    const codeBlock = screen.getByTestId('code-block');
    expect(codeBlock).toHaveTextContent('<div>Test Content</div>');
  });

  it('does not render when panel is closed', () => {
    hookReturnOverrides = { panelOpen: false };
    render(<ArtifactPanel />);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('shows artifact list when no active artifact', () => {
    hookReturnOverrides = { activeArtifact: undefined };
    render(<ArtifactPanel />);
    expect(screen.getByTestId('artifact-list')).toBeInTheDocument();
  });
});

describe('ArtifactPanel fullscreen mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hookReturnOverrides = {};
  });

  it('calls toggleFullscreen when fullscreen button is clicked', () => {
    render(<ArtifactPanel />);
    const fullscreenButton = screen.getByTestId('action-fullscreen');
    fireEvent.click(fullscreenButton);
    expect(mockToggleFullscreen).toHaveBeenCalled();
  });

  it('renders with fullscreen width when isFullscreen is true', () => {
    hookReturnOverrides = {
      isFullscreen: true,
      panelWidth: 'w-full sm:w-full sm:max-w-full',
    };
    render(<ArtifactPanel />);
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });
});

describe('ArtifactPanel edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hookReturnOverrides = {};
  });

  it('calls handleEditMode when edit button is clicked', () => {
    render(<ArtifactPanel />);
    const editButton = screen.getByTestId('action-edit');
    fireEvent.click(editButton);
    expect(mockHandleEditMode).toHaveBeenCalled();
  });

  it('shows monaco editor in edit mode', () => {
    hookReturnOverrides = { viewMode: 'edit' };
    render(<ArtifactPanel />);
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('shows save and cancel buttons in edit mode', () => {
    hookReturnOverrides = { viewMode: 'edit' };
    render(<ArtifactPanel />);
    expect(screen.getByText('save')).toBeInTheDocument();
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });

  it('calls handleCancelEdit when cancel is clicked in edit mode', () => {
    hookReturnOverrides = { viewMode: 'edit' };
    render(<ArtifactPanel />);
    const cancelButton = screen.getByText('cancel');
    fireEvent.click(cancelButton);
    expect(mockHandleCancelEdit).toHaveBeenCalled();
  });

  it('calls handleSaveEdit when save is clicked in edit mode', () => {
    hookReturnOverrides = { viewMode: 'edit', hasChanges: true };
    render(<ArtifactPanel />);
    const saveButton = screen.getByText('save');
    fireEvent.click(saveButton);
    expect(mockHandleSaveEdit).toHaveBeenCalled();
  });

  it('disables save button when no changes', () => {
    hookReturnOverrides = { viewMode: 'edit', hasChanges: false };
    render(<ArtifactPanel />);
    const saveButton = screen.getByText('save');
    expect(saveButton).toBeDisabled();
  });
});

describe('ArtifactPanel preview mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hookReturnOverrides = {};
  });

  it('renders ArtifactPreview when viewMode is preview', () => {
    hookReturnOverrides = { viewMode: 'preview' };
    render(<ArtifactPanel />);
    expect(screen.getByTestId('artifact-preview')).toBeInTheDocument();
  });
});

describe('ArtifactPanel version history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hookReturnOverrides = {};
  });

  it('renders version history when showVersionHistory is true', () => {
    hookReturnOverrides = { showVersionHistory: true };
    render(<ArtifactPanel />);
    expect(screen.getByTestId('version-history')).toBeInTheDocument();
  });

  it('calls setShowVersionHistory when version history button is clicked', () => {
    render(<ArtifactPanel />);
    const versionButton = screen.getByTestId('action-versionHistory');
    fireEvent.click(versionButton);
    expect(mockSetShowVersionHistory).toHaveBeenCalled();
  });
});

describe('ArtifactPanel actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hookReturnOverrides = {};
  });

  it('calls handleCopy when copy button is clicked', () => {
    render(<ArtifactPanel />);
    fireEvent.click(screen.getByTestId('action-copy'));
    expect(mockHandleCopy).toHaveBeenCalled();
  });

  it('calls handleDownload when download button is clicked', () => {
    render(<ArtifactPanel />);
    fireEvent.click(screen.getByTestId('action-download'));
    expect(mockHandleDownload).toHaveBeenCalled();
  });

  it('calls handleOpenInCanvas when editInCanvas button is clicked', () => {
    render(<ArtifactPanel />);
    fireEvent.click(screen.getByTestId('action-editInCanvas'));
    expect(mockHandleOpenInCanvas).toHaveBeenCalled();
  });

  it('shows reveal in explorer button when desktop and has download path', () => {
    hookReturnOverrides = { isDesktop: true, lastDownloadPath: 'test.html' };
    render(<ArtifactPanel />);
    expect(screen.getByTestId('action-revealInExplorer')).toBeInTheDocument();
  });

  it('shows designer button for designable artifacts', () => {
    hookReturnOverrides = { isDesignable: true };
    render(<ArtifactPanel />);
    expect(screen.getByTestId('action-previewInDesigner')).toBeInTheDocument();
    expect(screen.getByTestId('action-openFullDesigner')).toBeInTheDocument();
  });
});
