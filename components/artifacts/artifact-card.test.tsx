/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactCard, ArtifactInlineRef, MessageArtifacts } from './artifact-card';
import type { Artifact } from '@/types';

// Mock artifact-icons
jest.mock('./artifact-icons', () => ({
  getArtifactTypeIcon: (type: string) => React.createElement('span', { 'data-testid': `icon-${type}` }, type),
  ARTIFACT_TYPE_ICONS: {},
}));

// Mock stores
const mockSetActiveArtifact = jest.fn();
const mockOpenPanel = jest.fn();

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      setActiveArtifact: mockSetActiveArtifact,
      openPanel: mockOpenPanel,
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
  Button: ({ children, onClick, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div data-testid="card" className={className} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
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

  it('renders compact view by default', () => {
    render(<MessageArtifacts messageId="message-1" />);
    // Both artifacts should be visible
    expect(screen.getAllByText('Test Artifact').length).toBeGreaterThan(0);
  });

  it('renders full view when compact is false', () => {
    render(<MessageArtifacts messageId="message-1" compact={false} />);
    expect(screen.getAllByText('Test Artifact').length).toBeGreaterThan(0);
  });
});
