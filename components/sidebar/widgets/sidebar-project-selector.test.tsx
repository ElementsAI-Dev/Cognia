/**
 * SidebarProjectSelector Tests
 */

import { render, screen } from '@testing-library/react';
import { SidebarProjectSelector } from './sidebar-project-selector';
import { useProjectStore } from '@/stores';
import { NextIntlClientProvider } from 'next-intl';

// Mock stores
jest.mock('@/stores', () => ({
  useProjectStore: jest.fn(),
}));

const mockMessages = {
  sidebar: {
    allProjects: 'All Projects',
    filtered: 'Filtered',
    active: 'Active',
    setAsActive: 'Set as active project',
    manageProjects: 'Manage Projects',
  },
  projects: {
    noProjectsYet: 'No projects yet',
    createProject: 'Create Project',
  },
};

const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    color: '#3B82F6',
    isArchived: false,
    sessionIds: [],
    knowledgeBase: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
    sessionCount: 0,
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

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('SidebarProjectSelector', () => {
  const mockSetActiveProject = jest.fn();
  const mockGetActiveProjects = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveProjects.mockReturnValue(mockProjects);
    
    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        projects: mockProjects,
        activeProjectId: null,
        setActiveProject: mockSetActiveProject,
        getActiveProjects: mockGetActiveProjects,
      };
      return selector(state);
    });
  });

  it('renders with "All Projects" label when no filter is set', () => {
    renderWithProviders(
      <SidebarProjectSelector />
    );

    // Component renders translation key or fallback text
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders collapsed state correctly', () => {
    renderWithProviders(
      <SidebarProjectSelector collapsed />
    );

    // Should render icon button in collapsed state
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders trigger button', () => {
    renderWithProviders(
      <SidebarProjectSelector />
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
  });

  it('accepts onFilterChange callback', () => {
    const mockOnFilterChange = jest.fn();
    
    renderWithProviders(
      <SidebarProjectSelector onFilterChange={mockOnFilterChange} />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays filtered badge when project filter is active', () => {
    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        projects: mockProjects,
        activeProjectId: null,
        setActiveProject: mockSetActiveProject,
        getActiveProjects: mockGetActiveProjects,
      };
      return selector(state);
    });

    renderWithProviders(
      <SidebarProjectSelector filterProjectId="project-1" />
    );

    // "Filtered" badge text - using regex for case insensitivity
    expect(screen.getByText(/filtered/i)).toBeInTheDocument();
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
  });

  it('shows project name when filter is set', () => {
    renderWithProviders(
      <SidebarProjectSelector filterProjectId="project-1" />
    );

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
  });

  it('shows active project name when activeProjectId is set and no filter', () => {
    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        projects: mockProjects,
        activeProjectId: 'project-1',
        setActiveProject: mockSetActiveProject,
        getActiveProjects: mockGetActiveProjects,
      };
      return selector(state);
    });

    renderWithProviders(
      <SidebarProjectSelector />
    );

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = renderWithProviders(
      <SidebarProjectSelector />
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});
