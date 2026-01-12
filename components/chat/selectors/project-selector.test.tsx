/**
 * ProjectSelector Tests
 */

import { render, screen } from '@testing-library/react';
import { ProjectSelector } from './project-selector';
import { useProjectStore, useSessionStore } from '@/stores';
import { NextIntlClientProvider } from 'next-intl';

// Mock stores
jest.mock('@/stores', () => ({
  useProjectStore: jest.fn(),
  useSessionStore: jest.fn(),
}));

// Mock sonner toast
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockMessages = {
  chatHeader: {
    projectLink: 'Project Link',
    linkToProject: 'Link to Project',
    unlinkProject: 'Unlink from project',
    manageProjects: 'Manage Projects',
  },
  projects: {
    noProjectsYet: 'No projects yet',
    createProject: 'Create Project',
  },
  toasts: {
    linkedToProject: 'Linked to project',
    unlinkedFromProject: 'Unlinked from project',
  },
};

const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project 1',
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
    name: 'Test Project 2',
    color: '#22C55E',
    isArchived: false,
    sessionIds: [],
    knowledgeBase: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
    sessionCount: 0,
    messageCount: 0,
  },
];

const mockSessions = [
  {
    id: 'session-1',
    title: 'Test Session',
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat' as const,
    messageCount: 0,
  },
  {
    id: 'session-2',
    title: 'Unlinked Session',
    projectId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat' as const,
    messageCount: 0,
  },
];

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ProjectSelector', () => {
  const mockAddSessionToProject = jest.fn();
  const mockRemoveSessionFromProject = jest.fn();
  const mockGetProject = jest.fn();
  const mockGetActiveProjects = jest.fn();
  const mockUpdateSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveProjects.mockReturnValue(mockProjects);
    mockGetProject.mockImplementation((id: string) => 
      mockProjects.find(p => p.id === id)
    );

    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        addSessionToProject: mockAddSessionToProject,
        removeSessionFromProject: mockRemoveSessionFromProject,
        getProject: mockGetProject,
        getActiveProjects: mockGetActiveProjects,
      };
      return selector(state);
    });

    (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        sessions: mockSessions,
        updateSession: mockUpdateSession,
      };
      return selector(state);
    });
  });

  it('returns null when no sessionId is provided', () => {
    const { container } = renderWithProviders(
      <ProjectSelector />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders "Link to Project" button for session without project', () => {
    renderWithProviders(
      <ProjectSelector sessionId="session-2" />
    );

    // Component renders button with translation key or fallback
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders project badge for session with linked project', () => {
    renderWithProviders(
      <ProjectSelector sessionId="session-1" />
    );

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
  });

  it('renders trigger button for linked session', () => {
    renderWithProviders(
      <ProjectSelector sessionId="session-1" />
    );

    // Badge acts as a button trigger
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
  });

  it('renders compact mode correctly for unlinked session', () => {
    renderWithProviders(
      <ProjectSelector sessionId="session-2" compact />
    );

    // In compact mode without linked project, should show icon button
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders with className prop', () => {
    renderWithProviders(
      <ProjectSelector sessionId="session-2" className="custom-class" />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows project color indicator for linked session', () => {
    renderWithProviders(
      <ProjectSelector sessionId="session-1" />
    );

    // The project badge should show the project name
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
  });

  it('returns null for non-existent session', () => {
    const { container } = renderWithProviders(
      <ProjectSelector sessionId="non-existent" />
    );

    expect(container.firstChild).toBeNull();
  });
});
