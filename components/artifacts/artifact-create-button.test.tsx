/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactCreateButton } from './artifact-create-button';

// Mock stores
const mockCreateArtifact = jest.fn();
const mockGetActiveSession = jest.fn(() => ({ id: 'session-1' }));

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createArtifact: mockCreateArtifact,
    };
    return selector(state);
  },
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getActiveSession: mockGetActiveSession,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} className={className} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ArtifactCreateButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders icon variant by default', () => {
    render(<ArtifactCreateButton content="const x = 1;" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders button variant', () => {
    render(<ArtifactCreateButton content="const x = 1;" variant="button" />);
    expect(screen.getByText('Create Artifact')).toBeInTheDocument();
  });

  it('renders dropdown variant', () => {
    render(<ArtifactCreateButton content="const x = 1;" variant="dropdown" />);
    expect(screen.getByTestId('dropdown')).toBeInTheDocument();
  });

  it('calls createArtifact when clicked (icon variant)', () => {
    render(<ArtifactCreateButton content="const x = 1;" language="javascript" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'session-1',
      content: 'const x = 1;',
      type: 'code',
    }));
  });

  it('calls createArtifact when clicked (button variant)', () => {
    render(<ArtifactCreateButton content="const x = 1;" variant="button" />);
    fireEvent.click(screen.getByText('Create Artifact'));
    expect(mockCreateArtifact).toHaveBeenCalled();
  });

  it('detects mermaid type correctly', () => {
    render(<ArtifactCreateButton content="graph TD; A-->B;" language="mermaid" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mermaid',
    }));
  });

  it('detects html type correctly', () => {
    render(<ArtifactCreateButton content="<div>Hello</div>" language="html" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'html',
    }));
  });

  it('detects react type from jsx/tsx', () => {
    render(<ArtifactCreateButton content="export function Component() { return <div /> }" language="tsx" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'react',
    }));
  });

  it('detects math type correctly', () => {
    render(<ArtifactCreateButton content="x^2 + y^2 = z^2" language="latex" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'math',
    }));
  });

  it('detects document type from markdown', () => {
    render(<ArtifactCreateButton content="# Hello World" language="markdown" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'document',
    }));
  });

  it('uses provided title', () => {
    render(<ArtifactCreateButton content="code" title="My Title" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My Title',
    }));
  });

  it('generates title from function name', () => {
    render(<ArtifactCreateButton content="function myFunction() { return 1; }" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      title: 'myFunction',
    }));
  });

  it('generates title from export name', () => {
    render(<ArtifactCreateButton content="export default function MyComponent() {}" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      title: 'MyComponent',
    }));
  });

  it('does not create artifact when no active session', () => {
    mockGetActiveSession.mockReturnValueOnce(undefined as unknown as { id: string });
    render(<ArtifactCreateButton content="test" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).not.toHaveBeenCalled();
  });

  it('includes messageId when provided', () => {
    render(<ArtifactCreateButton content="test" messageId="msg-1" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      messageId: 'msg-1',
    }));
  });

  it('dropdown variant allows selecting specific type', () => {
    render(<ArtifactCreateButton content="test" variant="dropdown" />);
    fireEvent.click(screen.getByText('As React Component'));
    expect(mockCreateArtifact).toHaveBeenCalledWith(expect.objectContaining({
      type: 'react',
    }));
  });
});
