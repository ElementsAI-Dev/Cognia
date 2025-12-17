/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from './project-card';
import type { Project } from '@/types';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div data-testid="card" className={className} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('ProjectCard', () => {
  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project',
    icon: 'Folder',
    color: '#3B82F6',
    sessionCount: 10,
    sessionIds: ['session-1'],
    messageCount: 20,
    knowledgeBase: [
      { id: 'file-1', name: 'file1.txt', type: 'text', size: 100, content: '' },
      { id: 'file-2', name: 'file2.txt', type: 'text', size: 200, content: '' },
    ],
    customInstructions: 'Test instructions',
    defaultMode: 'chat',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
  } as Project;

  const defaultProps = {
    project: mockProject,
    onSelect: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onDuplicate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays project name', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('displays project description', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('A test project')).toBeInTheDocument();
  });

  it('displays session count', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('10 sessions')).toBeInTheDocument();
  });

  it('displays knowledge base file count', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('2 files')).toBeInTheDocument();
  });

  it('shows Instructions badge when custom instructions exist', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('Instructions')).toBeInTheDocument();
  });

  it('shows mode badge when default mode is set', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('chat')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    render(<ProjectCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('card'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('project-1');
  });

  it('shows active state when isActive is true', () => {
    render(<ProjectCard {...defaultProps} isActive />);
    expect(screen.getByTestId('card')).toHaveClass('ring-2');
  });

  it('renders dropdown menu with actions', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('displays "Today" for recent projects', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('displays "Yesterday" for yesterday projects', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayProject = { ...mockProject, lastAccessedAt: yesterday };
    render(<ProjectCard {...defaultProps} project={yesterdayProject} />);
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('displays days ago for older projects', () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 3);
    const olderProject = { ...mockProject, lastAccessedAt: daysAgo };
    render(<ProjectCard {...defaultProps} project={olderProject} />);
    expect(screen.getByText('3 days ago')).toBeInTheDocument();
  });
});
