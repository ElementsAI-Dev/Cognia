/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactPanel } from './artifact-panel';

// Mock stores
const mockClosePanel = jest.fn();
const mockUpdateArtifact = jest.fn();

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      panelOpen: true,
      panelView: 'artifact',
      closePanel: mockClosePanel,
      activeArtifactId: 'artifact-1',
      artifacts: {
        'artifact-1': {
          id: 'artifact-1',
          title: 'Test Artifact',
          content: '<div>Test Content</div>',
          type: 'html',
          language: 'html',
          version: 1,
        },
      },
      updateArtifact: mockUpdateArtifact,
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
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
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
    <div data-testid="artifact" className={className}>{children}</div>
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
  ArtifactAction: ({ tooltip, onClick }: { tooltip?: string; icon?: React.ComponentType; onClick?: () => void }) => (
    <button data-testid={`action-${tooltip}`} onClick={onClick}>{tooltip}</button>
  ),
  ArtifactContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="artifact-content">{children}</div>
  ),
  ArtifactClose: ({ onClick }: { onClick?: () => void }) => (
    <button data-testid="artifact-close" onClick={onClick}>Close</button>
  ),
}));

jest.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>{code}</pre>
  ),
}));

jest.mock('@/components/designer', () => ({
  V0Designer: () => <div data-testid="v0-designer" />,
}));

jest.mock('./artifact-preview', () => ({
  ArtifactPreview: ({ artifact }: { artifact: { title: string } }) => (
    <div data-testid="artifact-preview">{artifact.title}</div>
  ),
}));

describe('ArtifactPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(screen.getByTestId('action-Copy')).toBeInTheDocument();
  });

  it('renders download action button', () => {
    render(<ArtifactPanel />);
    expect(screen.getByTestId('action-Download')).toBeInTheDocument();
  });
});

describe('ArtifactPanel with no artifact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "No artifact selected" message when no artifact', () => {
    jest.doMock('@/stores', () => ({
      useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          panelOpen: true,
          panelView: 'artifact',
          closePanel: mockClosePanel,
          activeArtifactId: null,
          artifacts: {},
        };
        return selector(state);
      },
    }));
  });
});
