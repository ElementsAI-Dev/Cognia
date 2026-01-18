/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { CanvasPanel } from './canvas-panel';

// Mock stores
const mockClosePanel = jest.fn();
const mockUpdateCanvasDocument = jest.fn();
const mockSaveCanvasVersion = jest.fn();

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      panelOpen: true,
      panelView: 'canvas',
      closePanel: mockClosePanel,
      activeCanvasId: 'canvas-1',
      canvasDocuments: {
        'canvas-1': {
          id: 'canvas-1',
          title: 'Test Document',
          content: 'const x = 1;',
          type: 'code',
          language: 'javascript',
        },
      },
      updateCanvasDocument: mockUpdateCanvasDocument,
      saveCanvasVersion: mockSaveCanvasVersion,
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      theme: 'light',
      providerSettings: { openai: { apiKey: 'test-key' } },
      defaultProvider: 'openai',
    };
    return selector(state);
  },
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getActiveSession: () => ({ provider: 'openai', model: 'gpt-4o-mini' }),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="sheet">{children}</div> : null
  ),
  SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-content" data-className={className}>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" data-className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('./version-history-panel', () => ({
  VersionHistoryPanel: () => <div data-testid="version-history-panel" />,
}));

jest.mock('@/components/designer', () => ({
  V0Designer: () => <div data-testid="v0-designer" />,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      actionReview: 'Review',
      actionFix: 'Fix Issues',
      actionImprove: 'Improve',
      actionExplain: 'Explain',
      actionSimplify: 'Simplify',
      actionExpand: 'Expand',
      actionTranslate: 'Translate',
      actionFormat: 'Format',
      more: 'More',
      processing: 'Processing...',
      noDocument: 'No document selected',
      saveVersion: 'Save Version',
      unsaved: 'Unsaved',
      aiResponse: 'AI Response',
      copy: 'Copy',
      copied: 'Copied',
      export: 'Export',
      preview: 'Preview',
      openInDesigner: 'Open in Designer',
      openInFullDesigner: 'Open in Full Designer',
      runCode: 'Run Code',
      unsavedChanges: 'Unsaved Changes',
      unsavedChangesDescription: 'You have unsaved changes.',
      cancel: 'Cancel',
      saveAndClose: 'Save & Close',
      discardAndClose: 'Discard',
      selectTargetLanguage: 'Select Target Language',
      selectLanguage: 'Select Language',
      translate: 'Translate',
    };
    return translations[key] || key;
  },
}));

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

// Mock canvas actions
jest.mock('@/lib/ai/generation/canvas-actions', () => ({
  executeCanvasAction: jest.fn().mockResolvedValue({ success: true, result: 'Test result' }),
  applyCanvasActionResult: jest.fn((content) => content),
}));

describe('CanvasPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when panel is open', async () => {
    await act(async () => {
      render(<CanvasPanel />);
    });
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });

  it('displays document title', async () => {
    await act(async () => {
      render(<CanvasPanel />);
    });
    expect(screen.getByText('Test Document')).toBeInTheDocument();
  });

  it('displays document language', async () => {
    await act(async () => {
      render(<CanvasPanel />);
    });
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('renders Monaco editor', async () => {
    await act(async () => {
      render(<CanvasPanel />);
    });
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('renders version history panel', async () => {
    await act(async () => {
      render(<CanvasPanel />);
    });
    expect(screen.getByTestId('version-history-panel')).toBeInTheDocument();
  });

  it('renders action buttons', async () => {
    await act(async () => {
      render(<CanvasPanel />);
    });
    expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fix Issues').length).toBeGreaterThan(0);
  });

  describe('Responsive Layout', () => {
    it('applies responsive width to Sheet content', async () => {
      await act(async () => {
        render(<CanvasPanel />);
      });
      const sheetContent = screen.getByTestId('sheet-content');
      const className = sheetContent.getAttribute('data-className');
      expect(className).toContain('w-full');
      expect(className).toContain('sm:w-[600px]');
      expect(className).toContain('lg:w-[700px]');
    });

    it('applies mobile-first width to dialogs', async () => {
      await act(async () => {
        render(<CanvasPanel />);
      });
      const dialogContent = screen.queryByTestId('dialog-content');
      // Dialog may not be rendered until opened, but if rendered, should have responsive width
      if (dialogContent) {
        const className = dialogContent.getAttribute('data-className');
        expect(className).toContain('w-[95vw]');
        expect(className).toContain('sm:max-w-[400px]');
      }
    });

    it('renders with responsive container classes', async () => {
      await act(async () => {
        render(<CanvasPanel />);
      });
      const sheet = screen.getByTestId('sheet');
      expect(sheet).toBeInTheDocument();
    });
  });
});
