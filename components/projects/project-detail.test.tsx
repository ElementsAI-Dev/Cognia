/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectDetail } from './project-detail';
import type { Project, Session } from '@/types';

// Mock data
const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project description',
  icon: 'Folder',
  color: '#3B82F6',
  sessionCount: 2,
  sessionIds: ['session-1', 'session-2'],
  messageCount: 10,
  knowledgeBase: [
    { id: 'file-1', name: 'file.md', type: 'markdown', content: 'content', size: 100, createdAt: new Date(), updatedAt: new Date() },
  ],
  customInstructions: 'Test instructions',
  defaultMode: 'chat',
  defaultProvider: 'openai',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastAccessedAt: new Date(),
};

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
  {
    id: 'session-2',
    title: 'Session 2',
    mode: 'agent',
    provider: 'anthropic',
    model: 'claude-3',
    messageCount: 3,
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock stores
const mockUpdateProject = jest.fn();
const mockDeleteProject = jest.fn();
const mockRemoveSessionFromProject = jest.fn();

jest.mock('@/stores', () => ({
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getProject: (id: string) => (id === 'project-1' ? mockProject : null),
      updateProject: mockUpdateProject,
      deleteProject: mockDeleteProject,
      removeSessionFromProject: mockRemoveSessionFromProject,
    };
    return selector(state);
  },
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: mockSessions,
      deleteSession: jest.fn(),
    };
    return selector(state);
  },
  useProjectActivityStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getActivitiesForProject: () => [],
      addActivity: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock child components
jest.mock('./knowledge-base', () => ({
  KnowledgeBase: () => <div data-testid="knowledge-base">Knowledge Base Component</div>,
}));

jest.mock('./create-project-dialog', () => ({
  CreateProjectDialog: ({ open, onSubmit }: { open: boolean; onSubmit: (input: unknown) => void }) => (
    open ? (
      <div data-testid="create-project-dialog">
        <button onClick={() => onSubmit({ name: 'Updated' })}>Save</button>
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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('ProjectDetail', () => {
  const defaultProps = {
    projectId: 'project-1',
    onBack: jest.fn(),
    onNewChat: jest.fn(),
    onSelectSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('displays project name and description', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project description')).toBeInTheDocument();
  });

  it('displays session count', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('2 sessions')).toBeInTheDocument();
  });

  it('displays knowledge base file count', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('1 files')).toBeInTheDocument();
  });

  it('displays settings button', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays new chat button when onNewChat is provided', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<ProjectDetail {...defaultProps} />);
    const backButtons = screen.getAllByRole('button');
    const backButton = backButtons[0];
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('calls onNewChat when new chat button is clicked', () => {
    render(<ProjectDetail {...defaultProps} />);
    fireEvent.click(screen.getByText('New Chat'));
    expect(defaultProps.onNewChat).toHaveBeenCalledWith('project-1');
  });

  it('renders tabs for sessions and knowledge', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByTestId('tab-trigger-sessions')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-knowledge')).toBeInTheDocument();
  });

  it('displays project sessions', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.getByText('Session 2')).toBeInTheDocument();
  });

  it('displays custom instructions badge when set', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Custom Instructions')).toBeInTheDocument();
  });

  it('displays default mode badge when set', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Default: chat')).toBeInTheDocument();
  });

  it('displays provider badge when set', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Provider: openai')).toBeInTheDocument();
  });

  it('renders danger zone with delete button', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Delete Project')).toBeInTheDocument();
  });

  it('opens edit dialog when settings button is clicked', () => {
    render(<ProjectDetail {...defaultProps} />);
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByTestId('create-project-dialog')).toBeInTheDocument();
  });

  it('opens delete confirmation when delete button is clicked', () => {
    render(<ProjectDetail {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete Project'));
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
  });

  it('shows project not found when project does not exist', () => {
    render(<ProjectDetail {...defaultProps} projectId="nonexistent" />);
    expect(screen.getByText('Project not found')).toBeInTheDocument();
    expect(screen.getByText('Back to Projects')).toBeInTheDocument();
  });

  it('renders knowledge base component in knowledge tab', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByTestId('knowledge-base')).toBeInTheDocument();
  });

  it('displays stats cards', () => {
    render(<ProjectDetail {...defaultProps} />);
    expect(screen.getByText('Chat Sessions')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Files')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
  });
});
