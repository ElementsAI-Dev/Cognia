/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DesignerPanel } from './designer-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockSetCode = jest.fn();
const mockParseCodeToElements = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    activeProvider: 'openai',
    activeModel: 'gpt-4',
  }),
  useArtifactStore: () => ({
    getArtifact: jest.fn(),
  }),
}));

jest.mock('@/lib/designer', () => ({
  executeDesignerAIEdit: jest.fn(),
  getDesignerAIConfig: jest.fn().mockReturnValue({ provider: 'openai', model: 'gpt-4' }),
}));

jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      mode: 'preview',
      code: '<div>Test</div>',
      setCode: mockSetCode,
      showElementTree: true,
      showStylePanel: true,
      parseCodeToElements: mockParseCodeToElements,
      elements: [],
      selectedElementId: null,
      history: [],
      historyIndex: 0,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="sheet">{children}</div> : null
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-title">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/resizable', () => ({
  ResizableHandle: () => <div data-testid="resizable-handle" />,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../toolbar/designer-toolbar', () => ({
  DesignerToolbar: ({ onAIEdit, onExport }: { onAIEdit?: () => void; onExport?: () => void }) => (
    <div data-testid="designer-toolbar">
      <button onClick={onAIEdit}>AI Edit</button>
      <button onClick={onExport}>Export</button>
    </div>
  ),
}));

jest.mock('../preview/designer-preview', () => ({
  DesignerPreview: () => <div data-testid="designer-preview" />,
}));

jest.mock('../panels/element-tree', () => ({
  ElementTree: () => <div data-testid="element-tree" />,
}));

jest.mock('../panels/style-panel', () => ({
  StylePanel: () => <div data-testid="style-panel" />,
}));

jest.mock('../panels/version-history-panel', () => ({
  VersionHistoryPanel: () => <div data-testid="version-history-panel" />,
}));

jest.mock('../ai/ai-chat-panel', () => ({
  AIChatPanel: () => <div data-testid="ai-chat-panel" />,
}));

jest.mock('../dnd', () => ({
  DesignerDndProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-provider">{children}</div>,
  SelectionOverlay: () => <div data-testid="selection-overlay" />,
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

describe('DesignerPanel', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<DesignerPanel {...defaultProps} />);
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<DesignerPanel {...defaultProps} open={false} />);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('renders toolbar', () => {
    render(<DesignerPanel {...defaultProps} />);
    expect(screen.getByTestId('designer-toolbar')).toBeInTheDocument();
  });

  it('renders designer preview in preview mode', () => {
    render(<DesignerPanel {...defaultProps} />);
    expect(screen.getByTestId('sandpack-preview')).toBeInTheDocument();
  });

  it('renders element tree when showElementTree is true', () => {
    render(<DesignerPanel {...defaultProps} />);
    expect(screen.getByTestId('element-tree')).toBeInTheDocument();
  });

  it('shows AI input when AI Edit button is clicked', () => {
    render(<DesignerPanel {...defaultProps} />);
    const toolbar = screen.getByTestId('designer-toolbar');
    fireEvent.click(within(toolbar).getByRole('button', { name: 'AI Edit' }));
    // The placeholder uses the mocked translation key
    expect(screen.getByPlaceholderText('aiPlaceholder')).toBeInTheDocument();
  });

  it('calls onOpenChange when close button is clicked', () => {
    const onOpenChange = jest.fn();
    render(<DesignerPanel {...defaultProps} onOpenChange={onOpenChange} />);
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons[closeButtons.length - 1];
    fireEvent.click(closeButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onCodeChange when code changes', () => {
    const onCodeChange = jest.fn();
    jest.doMock('@/stores/designer', () => ({
      useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          mode: 'code',
          code: '<div>Test</div>',
          setCode: mockSetCode,
          showElementTree: false,
          showStylePanel: false,
          parseCodeToElements: mockParseCodeToElements,
        };
        return selector(state);
      },
    }));
    render(<DesignerPanel {...defaultProps} onCodeChange={onCodeChange} />);
  });
});
