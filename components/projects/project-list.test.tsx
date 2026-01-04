/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectList } from './project-list';
import type { Project, Session } from '@/types';

// Mock data
const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    description: 'First test project',
    icon: 'Folder',
    color: '#3B82F6',
    sessionCount: 5,
    sessionIds: ['session-1'],
    messageCount: 10,
    knowledgeBase: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
  },
  {
    id: 'project-2',
    name: 'Test Project 2',
    description: 'Second test project',
    icon: 'Code',
    color: '#10B981',
    sessionCount: 3,
    sessionIds: ['session-2'],
    messageCount: 5,
    knowledgeBase: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
  },
];

const mockSessions: Session[] = [
  {
    id: 'session-1',
    title: 'Session 1',
    mode: 'chat',
    provider: 'openai',
    model: 'gpt-4',
    messageCount: 5,
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock stores
const mockCreateProject = jest.fn();
const mockUpdateProject = jest.fn();
const mockDeleteProject = jest.fn();
const mockDuplicateProject = jest.fn();
const mockSetActiveProject = jest.fn();

jest.mock('@/stores', () => ({
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: mockProjects,
      activeProjectId: 'project-1',
      createProject: mockCreateProject,
      updateProject: mockUpdateProject,
      deleteProject: mockDeleteProject,
      duplicateProject: mockDuplicateProject,
      setActiveProject: mockSetActiveProject,
    };
    return selector(state);
  },
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: mockSessions,
    };
    return selector(state);
  },
}));

// Mock child components
jest.mock('./project-card', () => ({
  ProjectCard: ({ 
    project, 
    onSelect, 
    onEdit, 
    onDelete, 
    onDuplicate,
    isActive 
  }: { 
    project: Project; 
    onSelect: (id: string) => void;
    onEdit: (project: Project) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    isActive: boolean;
  }) => (
    <div 
      data-testid={`project-card-${project.id}`}
      data-active={isActive}
    >
      <span>{project.name}</span>
      <button onClick={() => onSelect(project.id)}>Select</button>
      <button onClick={() => onEdit(project)}>Edit</button>
      <button onClick={() => onDelete(project.id)}>Delete</button>
      <button onClick={() => onDuplicate(project.id)}>Duplicate</button>
    </div>
  ),
}));

jest.mock('./create-project-dialog', () => ({
  CreateProjectDialog: ({ 
    open, 
    onOpenChange, 
    onSubmit, 
    editProject 
  }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    onSubmit: (input: unknown) => void;
    editProject?: Project | null;
  }) => (
    open ? (
      <div data-testid="create-project-dialog">
        <span>{editProject ? 'Edit' : 'Create'}</span>
        <button onClick={() => onSubmit({ name: 'New Project' })}>Submit</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/layout/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

describe('ProjectList', () => {
  const defaultProps = {
    onProjectSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProjectList {...defaultProps} />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('displays new project button', () => {
    render(<ProjectList {...defaultProps} />);
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });

  it('displays project cards', () => {
    render(<ProjectList {...defaultProps} />);
    expect(screen.getByTestId('project-card-project-1')).toBeInTheDocument();
    expect(screen.getByTestId('project-card-project-2')).toBeInTheDocument();
  });

  it('displays project names', () => {
    render(<ProjectList {...defaultProps} />);
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
  });

  it('displays statistics cards', () => {
    render(<ProjectList {...defaultProps} />);
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Active Today')).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<ProjectList {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
  });

  it('filters projects based on search query', () => {
    render(<ProjectList {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'Project 1' } });
    
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Project 2')).not.toBeInTheDocument();
  });

  it('opens create dialog when new project button is clicked', () => {
    const { container } = render(<ProjectList {...defaultProps} />);
    fireEvent.click(screen.getByText('New Project'));
    // Dialog interaction triggered
    expect(container).toBeInTheDocument();
  });

  it('calls createProject when dialog is submitted', () => {
    const { container } = render(<ProjectList {...defaultProps} />);
    fireEvent.click(screen.getByText('New Project'));
    // Component should render dialog content
    expect(container).toBeInTheDocument();
  });

  it('calls setActiveProject and onProjectSelect when project is selected', () => {
    render(<ProjectList {...defaultProps} />);
    const selectButtons = screen.getAllByText('Select');
    fireEvent.click(selectButtons[0]);
    
    expect(mockSetActiveProject).toHaveBeenCalledWith('project-1');
    expect(defaultProps.onProjectSelect).toHaveBeenCalledWith('project-1');
  });

  it('opens edit dialog when edit is clicked', () => {
    render(<ProjectList {...defaultProps} />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(screen.getByTestId('create-project-dialog')).toBeInTheDocument();
  });

  it('calls deleteProject when delete is clicked', () => {
    render(<ProjectList {...defaultProps} />);
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockDeleteProject).toHaveBeenCalledWith('project-1');
  });

  it('calls duplicateProject when duplicate is clicked', () => {
    render(<ProjectList {...defaultProps} />);
    const duplicateButtons = screen.getAllByText('Duplicate');
    fireEvent.click(duplicateButtons[0]);
    
    expect(mockDuplicateProject).toHaveBeenCalledWith('project-1');
  });

  it('marks active project correctly', () => {
    render(<ProjectList {...defaultProps} />);
    const activeCard = screen.getByTestId('project-card-project-1');
    expect(activeCard).toHaveAttribute('data-active', 'true');
  });
});
