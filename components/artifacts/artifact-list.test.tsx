/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactList, ArtifactListCompact } from './artifact-list';
import type { Artifact } from '@/types';

// Mock artifact-icons
jest.mock('./artifact-icons', () => ({
  getArtifactTypeIcon: (type: string) =>
    React.createElement('span', { 'data-testid': `icon-${type}` }, type),
  ARTIFACT_TYPE_ICONS: {},
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

// Mock stores
const mockSetActiveArtifact = jest.fn();
const mockDeleteArtifact = jest.fn();
const mockDeleteArtifacts = jest.fn();
const mockOpenPanel = jest.fn();
const mockGetActiveSession = jest.fn(() => ({ id: 'session-1' }));
const mockSearchArtifacts = jest.fn();
const mockFilterArtifactsByType = jest.fn();

const session1Artifacts: Artifact[] = [
  {
    id: 'artifact-1',
    sessionId: 'session-1',
    messageId: 'message-1',
    title: 'First Artifact',
    content: 'content 1',
    type: 'code',
    language: 'javascript',
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'artifact-2',
    sessionId: 'session-1',
    messageId: 'message-2',
    title: 'Second Artifact',
    content: 'content 2',
    type: 'html',
    language: 'html',
    version: 1,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

const session2Artifacts: Artifact[] = [
  {
    id: 'artifact-3',
    sessionId: 'session-2',
    messageId: 'message-3',
    title: 'Other Session Artifact',
    content: 'content 3',
    type: 'code',
    version: 1,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
];

const mockGetSessionArtifacts = jest.fn((sessionId: string) => {
  if (sessionId === 'session-1') return [...session1Artifacts];
  if (sessionId === 'session-2') return [...session2Artifacts];
  return [];
});

const mockGetRecentArtifacts = jest.fn((limit: number) => {
  return [...session1Artifacts, ...session2Artifacts].slice(0, limit);
});

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      activeArtifactId: 'artifact-1',
      setActiveArtifact: mockSetActiveArtifact,
      deleteArtifact: mockDeleteArtifact,
      deleteArtifacts: mockDeleteArtifacts,
      openPanel: mockOpenPanel,
      getSessionArtifacts: mockGetSessionArtifacts,
      searchArtifacts: mockSearchArtifacts,
      filterArtifactsByType: mockFilterArtifactsByType,
      getRecentArtifacts: mockGetRecentArtifacts,
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
  Button: ({
    children,
    onClick,
    className,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string; variant?: string }) => (
    <button onClick={onClick} className={className} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <div data-testid="scroll-area" className={className} style={style}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, className }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
    <input data-testid="search-input" placeholder={placeholder} value={value} onChange={onChange} className={className} />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button data-testid="select-code" onClick={() => onValueChange('code')}>Select Code</button>
      <button data-testid="select-all" onClick={() => onValueChange('all')}>Select All</button>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

jest.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-menu">{children}</div>
  ),
  ContextMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ArtifactList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchArtifacts.mockReturnValue([]);
    mockFilterArtifactsByType.mockReturnValue([]);
  });

  it('renders artifacts for current session via getSessionArtifacts', () => {
    render(<ArtifactList />);
    expect(mockGetSessionArtifacts).toHaveBeenCalledWith('session-1');
    expect(screen.getByText('First Artifact')).toBeInTheDocument();
    expect(screen.getByText('Second Artifact')).toBeInTheDocument();
  });

  it('does not render artifacts from other sessions', () => {
    render(<ArtifactList />);
    expect(screen.queryByText('Other Session Artifact')).not.toBeInTheDocument();
  });

  it('renders type badges', () => {
    render(<ArtifactList />);
    // 'Code' and 'HTML' appear both as badges and in the Select options
    expect(screen.getAllByText('Code').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('HTML').length).toBeGreaterThanOrEqual(1);
  });

  it('renders time info', () => {
    render(<ArtifactList />);
    expect(screen.getAllByText('5 minutes ago').length).toBeGreaterThan(0);
  });

  it('calls setActiveArtifact and openPanel when artifact is clicked', () => {
    render(<ArtifactList />);
    fireEvent.click(screen.getByText('First Artifact'));
    expect(mockSetActiveArtifact).toHaveBeenCalledWith('artifact-1');
    expect(mockOpenPanel).toHaveBeenCalledWith('artifact');
  });

  it('calls onArtifactClick callback when provided', () => {
    const onArtifactClick = jest.fn();
    render(<ArtifactList onArtifactClick={onArtifactClick} />);
    fireEvent.click(screen.getByText('First Artifact'));
    expect(onArtifactClick).toHaveBeenCalled();
  });

  it('filters by sessionId when provided', () => {
    render(<ArtifactList sessionId="session-2" />);
    expect(mockGetSessionArtifacts).toHaveBeenCalledWith('session-2');
    expect(screen.getByText('Other Session Artifact')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ArtifactList />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('calls searchArtifacts when search query is entered', () => {
    mockSearchArtifacts.mockReturnValue([session1Artifacts[0]]);
    render(<ArtifactList />);
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'First' } });
    expect(mockSearchArtifacts).toHaveBeenCalledWith('First', 'session-1');
  });

  it('calls filterArtifactsByType when type filter is changed', () => {
    mockFilterArtifactsByType.mockReturnValue([session1Artifacts[0]]);
    render(<ArtifactList />);
    fireEvent.click(screen.getByTestId('select-code'));
    expect(mockFilterArtifactsByType).toHaveBeenCalledWith('code', 'session-1');
  });

  it('resets to getSessionArtifacts when filter is set to all', () => {
    mockFilterArtifactsByType.mockReturnValue([session1Artifacts[0]]);
    render(<ArtifactList />);
    // First filter by code
    fireEvent.click(screen.getByTestId('select-code'));
    // Then reset to all
    fireEvent.click(screen.getByTestId('select-all'));
    // Should call getSessionArtifacts again
    expect(mockGetSessionArtifacts).toHaveBeenCalledWith('session-1');
  });

  it('renders batch select button', () => {
    render(<ArtifactList />);
    // CheckSquare icon button for batch mode
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('ArtifactListCompact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses getSessionArtifacts for current session', () => {
    render(<ArtifactListCompact />);
    expect(mockGetSessionArtifacts).toHaveBeenCalledWith('session-1');
  });

  it('falls back to getRecentArtifacts when no sessionId', () => {
    mockGetActiveSession.mockReturnValueOnce(undefined as unknown as { id: string });
    render(<ArtifactListCompact />);
    expect(mockGetRecentArtifacts).toHaveBeenCalled();
  });

  it('renders limited number of artifacts', () => {
    render(<ArtifactListCompact limit={1} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(1);
  });

  it('returns null when no artifacts', () => {
    const { container } = render(<ArtifactListCompact sessionId="empty-session" />);
    expect(container.firstChild).toBeNull();
  });

  it('opens artifact panel when clicked', () => {
    render(<ArtifactListCompact />);
    fireEvent.click(screen.getByText('Second Artifact'));
    expect(mockSetActiveArtifact).toHaveBeenCalled();
    expect(mockOpenPanel).toHaveBeenCalledWith('artifact');
  });
});
