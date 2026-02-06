import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalSearch } from './global-search';

// Mock stores
const mockSetActiveSession = jest.fn();
const mockSetActiveProject = jest.fn();
const mockSetGlobalSearchOpen = jest.fn();

const mockSessions = [
  {
    id: '1',
    title: 'Test Session Alpha',
    lastMessagePreview: 'Hello world',
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Test Session Beta',
    lastMessagePreview: 'Goodbye world',
    updatedAt: new Date(Date.now() - 86400000),
  },
];

const mockProjects = [
  {
    id: 'p1',
    name: 'Project Alpha',
    description: 'First project',
    updatedAt: new Date(),
  },
  {
    id: 'p2',
    name: 'Project Beta',
    description: 'Second project',
    updatedAt: new Date(Date.now() - 172800000),
  },
];

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: mockSessions,
      setActiveSession: mockSetActiveSession,
    };
    return selector(state);
  },
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: mockProjects,
      setActiveProject: mockSetActiveProject,
    };
    return selector(state);
  },
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      commandPaletteOpen: true,
      setCommandPaletteOpen: mockSetGlobalSearchOpen,
    };
    return selector(state);
  },
}));

describe('GlobalSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<GlobalSearch />);
    expect(screen.getByPlaceholderText('Search sessions, projects...')).toBeInTheDocument();
  });

  it('displays recent sessions when no query', () => {
    render(<GlobalSearch />);
    expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
    expect(screen.getByText('Test Session Alpha')).toBeInTheDocument();
  });

  it('displays recent projects when no query', () => {
    render(<GlobalSearch />);
    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
  });

  it('shows keyboard shortcuts hint', () => {
    render(<GlobalSearch />);
    // The component has keyboard hints with symbols and text together
    expect(screen.getByText(/navigate/)).toBeInTheDocument();
    expect(screen.getByText(/select/)).toBeInTheDocument();
    expect(screen.getByText(/close/)).toBeInTheDocument();
  });

  it('filters results when typing', () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Search sessions, projects...');
    fireEvent.change(input, { target: { value: 'Alpha' } });

    // Should show tabs when query is entered
    expect(screen.getByText(/All/)).toBeInTheDocument();
    expect(screen.getByText(/Sessions/)).toBeInTheDocument();
    expect(screen.getByText(/Projects/)).toBeInTheDocument();
  });

  it('shows no results message for unmatched query', () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Search sessions, projects...');
    fireEvent.change(input, { target: { value: 'xyz123nonexistent' } });

    expect(screen.getByText(/No results found/)).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Search sessions, projects...');
    fireEvent.change(input, { target: { value: 'test' } });

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
  });

  it('calls setActiveSession when clicking a session result', () => {
    render(<GlobalSearch />);

    // Click on a recent session (when no query)
    const sessionButton = screen.getByText('Test Session Alpha').closest('button');
    if (sessionButton) {
      fireEvent.click(sessionButton);
    }

    expect(mockSetActiveSession).toHaveBeenCalledWith('1');
    expect(mockSetGlobalSearchOpen).toHaveBeenCalledWith(false);
  });

  it('calls setActiveProject when clicking a project result', () => {
    render(<GlobalSearch />);

    // Click on a recent project (when no query)
    const projectButton = screen.getByText('Project Alpha').closest('button');
    if (projectButton) {
      fireEvent.click(projectButton);
    }

    expect(mockSetActiveProject).toHaveBeenCalledWith('p1');
    expect(mockSetGlobalSearchOpen).toHaveBeenCalledWith(false);
  });

  it('displays tabs when query is entered', () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Search sessions, projects...');
    fireEvent.change(input, { target: { value: 'Test' } });

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});

describe('GlobalSearch - Date Formatting', () => {
  it('displays "Today" for recent items', () => {
    render(<GlobalSearch />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});

describe('GlobalSearch - Search Results', () => {
  it('shows session and project badges in results', () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Search sessions, projects...');
    fireEvent.change(input, { target: { value: 'Alpha' } });

    // Should show badges for both types
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
  });
});
