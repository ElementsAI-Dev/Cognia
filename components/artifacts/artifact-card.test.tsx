/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactCard, ArtifactInlineRef, MessageArtifacts, MessageAnalysisResults } from './artifact-card';
import type { Artifact } from '@/types';

// Mock artifact-icons
jest.mock('./artifact-icons', () => ({
  getArtifactTypeIcon: (type: string) =>
    React.createElement('span', { 'data-testid': `icon-${type}` }, type),
  ARTIFACT_TYPE_ICONS: {},
}));

// Mock stores
const mockSetActiveArtifact = jest.fn();
const mockOpenPanel = jest.fn();
const mockDuplicateArtifact = jest.fn();
const mockGetMessageAnalysis = jest.fn(() => [] as Record<string, unknown>[]);

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      setActiveArtifact: mockSetActiveArtifact,
      openPanel: mockOpenPanel,
      duplicateArtifact: mockDuplicateArtifact,
      getMessageAnalysis: mockGetMessageAnalysis,
      artifacts: {
        'artifact-1': {
          id: 'artifact-1',
          sessionId: 'session-1',
          messageId: 'message-1',
          title: 'Test Artifact',
          content: '<div>Test Content</div>',
          type: 'html',
          language: 'html',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'artifact-2': {
          id: 'artifact-2',
          sessionId: 'session-1',
          messageId: 'message-1',
          title: 'Another Artifact',
          content: 'const x = 1;',
          type: 'code',
          language: 'javascript',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ArtifactCard', () => {
  const mockArtifact: Artifact = {
    id: 'artifact-1',
    sessionId: 'session-1',
    messageId: 'message-1',
    title: 'Test Artifact',
    content: '<div>Test Content that is long enough to be truncated in the preview</div>',
    type: 'html',
    language: 'html',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders card with artifact title', () => {
    render(<ArtifactCard artifact={mockArtifact} />);
    expect(screen.getByText('Test Artifact')).toBeInTheDocument();
  });

  it('renders type badge', () => {
    render(<ArtifactCard artifact={mockArtifact} />);
    expect(screen.getByText('HTML')).toBeInTheDocument();
  });

  it('renders version info', () => {
    render(<ArtifactCard artifact={mockArtifact} />);
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('renders language info when available', () => {
    render(<ArtifactCard artifact={mockArtifact} />);
    // Multiple 'html' elements: icon mock and language label
    expect(screen.getAllByText('html').length).toBeGreaterThanOrEqual(1);
  });

  it('calls setActiveArtifact and openPanel when clicked', () => {
    render(<ArtifactCard artifact={mockArtifact} />);
    fireEvent.click(screen.getByTestId('card'));
    expect(mockSetActiveArtifact).toHaveBeenCalledWith('artifact-1');
    expect(mockOpenPanel).toHaveBeenCalledWith('artifact');
  });

  it('renders compact variant correctly', () => {
    render(<ArtifactCard artifact={mockArtifact} compact />);
    expect(screen.getAllByText('Test Artifact').length).toBeGreaterThan(0);
  });

  it('shows preview when showPreview is true', () => {
    render(<ArtifactCard artifact={mockArtifact} showPreview />);
    expect(screen.getByText(/Test Content/)).toBeInTheDocument();
  });

  it('renders different artifact types correctly', () => {
    const codeArtifact: Artifact = {
      ...mockArtifact,
      type: 'code',
      title: 'Code Artifact',
    };
    render(<ArtifactCard artifact={codeArtifact} />);
    expect(screen.getByText('Code')).toBeInTheDocument();
  });

  it('renders duplicate button', () => {
    render(<ArtifactCard artifact={mockArtifact} />);
    const buttons = screen.getAllByRole('button');
    // Should have eye button and copy/duplicate button
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls duplicateArtifact when duplicate button is clicked', () => {
    mockDuplicateArtifact.mockReturnValue({ ...mockArtifact, id: 'artifact-dup' });
    render(<ArtifactCard artifact={mockArtifact} />);
    // Find the duplicate button by its title attribute
    const dupButton = screen.getByTitle('Duplicate');
    fireEvent.click(dupButton);
    expect(mockDuplicateArtifact).toHaveBeenCalledWith('artifact-1');
  });

  it('displays runnable metadata when available', () => {
    const runnableArtifact: Artifact = {
      ...mockArtifact,
      metadata: { runnable: true },
    };
    render(<ArtifactCard artifact={runnableArtifact} />);
    expect(screen.getByText('Runnable')).toBeInTheDocument();
  });

  it('displays wordCount metadata when available', () => {
    const docArtifact: Artifact = {
      ...mockArtifact,
      type: 'document',
      metadata: { wordCount: 150 },
    };
    render(<ArtifactCard artifact={docArtifact} />);
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });
});

describe('ArtifactInlineRef', () => {
  const mockArtifact: Artifact = {
    id: 'artifact-1',
    sessionId: 'session-1',
    messageId: 'message-1',
    title: 'Inline Test',
    content: 'test content',
    type: 'code',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders inline reference with title', () => {
    render(<ArtifactInlineRef artifact={mockArtifact} />);
    expect(screen.getByText('Inline Test')).toBeInTheDocument();
  });

  it('calls setActiveArtifact and openPanel when clicked', () => {
    render(<ArtifactInlineRef artifact={mockArtifact} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetActiveArtifact).toHaveBeenCalledWith('artifact-1');
    expect(mockOpenPanel).toHaveBeenCalledWith('artifact');
  });
});

describe('MessageArtifacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders artifacts for a message', () => {
    render(<MessageArtifacts messageId="message-1" />);
    expect(screen.getAllByText('Test Artifact').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Another Artifact').length).toBeGreaterThan(0);
  });

  it('returns null when no artifacts for message', () => {
    const { container } = render(<MessageArtifacts messageId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders compact view using ArtifactInlineRef by default', () => {
    render(<MessageArtifacts messageId="message-1" />);
    // Both artifacts should be visible as inline refs
    expect(screen.getAllByText('Test Artifact').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Another Artifact').length).toBeGreaterThan(0);
  });

  it('renders full view when compact is false', () => {
    render(<MessageArtifacts messageId="message-1" compact={false} />);
    expect(screen.getAllByText('Test Artifact').length).toBeGreaterThan(0);
  });
});

describe('MessageAnalysisResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no analysis results', () => {
    mockGetMessageAnalysis.mockReturnValue([]);
    const { container } = render(<MessageAnalysisResults messageId="msg-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders analysis results when available', () => {
    mockGetMessageAnalysis.mockReturnValue([
      { id: 'a1', sessionId: 's1', messageId: 'msg-1', type: 'math' as const, content: 'x^2', output: { summary: 'Quadratic' }, createdAt: new Date(), updatedAt: new Date() },
    ]);
    render(<MessageAnalysisResults messageId="msg-1" />);
    expect(mockGetMessageAnalysis).toHaveBeenCalledWith('msg-1');
    expect(screen.getByText('Quadratic')).toBeInTheDocument();
  });

  it('renders Lucide icon for math results', () => {
    mockGetMessageAnalysis.mockReturnValue([
      { id: 'a1', sessionId: 's1', messageId: 'msg-1', type: 'math' as const, content: 'x^2', output: {}, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const { container } = render(<MessageAnalysisResults messageId="msg-1" />);
    // Lucide Ruler icon renders as an SVG element
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders Lucide icon for chart results', () => {
    mockGetMessageAnalysis.mockReturnValue([
      { id: 'a2', sessionId: 's1', messageId: 'msg-1', type: 'chart' as const, content: '{}', output: {}, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const { container } = render(<MessageAnalysisResults messageId="msg-1" />);
    // Lucide BarChart3 icon renders as an SVG element
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('calls openPanel when analysis result is clicked', () => {
    mockGetMessageAnalysis.mockReturnValue([
      { id: 'a1', sessionId: 's1', messageId: 'msg-1', type: 'data' as const, content: 'data', output: { summary: 'Stats' }, createdAt: new Date(), updatedAt: new Date() },
    ]);
    render(<MessageAnalysisResults messageId="msg-1" />);
    fireEvent.click(screen.getByText('Stats'));
    expect(mockOpenPanel).toHaveBeenCalledWith('analysis');
  });
});
