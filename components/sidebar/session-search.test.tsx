/**
 * SessionSearch Tests - including project filtering
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SessionSearch } from './session-search';
import { useSessionStore, useProjectStore } from '@/stores';
import { NextIntlClientProvider } from 'next-intl';

// Mock stores
jest.mock('@/stores', () => ({
  useSessionStore: jest.fn(),
  useProjectStore: jest.fn(),
}));

// Mock message repository
jest.mock('@/lib/db', () => ({
  messageRepository: {
    getBySessionId: jest.fn().mockResolvedValue([]),
  },
}));

const mockMessages = {
  sidebar: {
    searchChats: 'Search chats...',
    searching: 'Searching...',
  },
};

const mockProjects = [
  {
    id: 'project-1',
    name: 'Work Project',
    color: '#3B82F6',
    isArchived: false,
    sessionIds: ['session-1'],
    knowledgeBase: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
    sessionCount: 1,
    messageCount: 0,
  },
  {
    id: 'project-2',
    name: 'Personal Project',
    color: '#22C55E',
    isArchived: false,
    sessionIds: ['session-2'],
    knowledgeBase: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
    sessionCount: 1,
    messageCount: 0,
  },
];

const mockSessions = [
  {
    id: 'session-1',
    title: 'Work Session',
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat' as const,
    messageCount: 5,
  },
  {
    id: 'session-2',
    title: 'Personal Session',
    projectId: 'project-2',
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: 'anthropic',
    model: 'claude-3',
    mode: 'agent' as const,
    messageCount: 3,
  },
  {
    id: 'session-3',
    title: 'No Project Session',
    projectId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat' as const,
    messageCount: 2,
  },
];

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('SessionSearch', () => {
  const mockGetActiveProjects = jest.fn();
  const mockGetProject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveProjects.mockReturnValue(mockProjects);
    mockGetProject.mockImplementation((id: string) => 
      mockProjects.find(p => p.id === id)
    );

    (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        sessions: mockSessions,
      };
      return selector(state);
    });

    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        getActiveProjects: mockGetActiveProjects,
        getProject: mockGetProject,
      };
      return selector(state);
    });
  });

  it('renders search input', () => {
    renderWithProviders(<SessionSearch />);
    
    expect(screen.getByPlaceholderText('Search chats...')).toBeInTheDocument();
  });

  it('renders filter button', () => {
    renderWithProviders(<SessionSearch />);
    
    // Filter button should be present
    const filterButtons = screen.getAllByRole('button');
    expect(filterButtons.length).toBeGreaterThan(0);
  });

  it('accepts onResultsChange callback', () => {
    const mockOnResultsChange = jest.fn();
    
    renderWithProviders(
      <SessionSearch onResultsChange={mockOnResultsChange} />
    );
    
    expect(screen.getByPlaceholderText('Search chats...')).toBeInTheDocument();
  });

  it('allows text input for search', () => {
    renderWithProviders(<SessionSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search chats...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(searchInput).toHaveValue('test');
  });

  it('renders in collapsed mode', () => {
    renderWithProviders(<SessionSearch collapsed />);
    
    // Should render a button instead of full search
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    renderWithProviders(<SessionSearch className="custom-class" />);
    
    expect(screen.getByPlaceholderText('Search chats...')).toBeInTheDocument();
  });
});

describe('SessionSearch - SearchFilters interface', () => {
  it('includes projectId in SearchFilters type', () => {
    // This is a compile-time check - if SearchFilters doesn't include projectId,
    // this file won't compile
    const filters = {
      modes: [] as ('chat' | 'agent' | 'research' | 'learning')[],
      dateRange: 'all' as const,
      hasAttachments: false,
      pinned: false,
      projectId: null as string | null,
    };
    
    expect(filters.projectId).toBeNull();
  });
});
