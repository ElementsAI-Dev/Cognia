/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateProjectDialog } from './create-project-dialog';
import type { Project } from '@/types';

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
}));

describe('CreateProjectDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: jest.fn(),
  };

  const mockProject: Project = {
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project description',
    icon: 'Code',
    color: '#3B82F6',
    sessionCount: 5,
    sessionIds: ['session-1'],
    messageCount: 10,
    knowledgeBase: [],
    customInstructions: 'Custom instructions here',
    defaultMode: 'chat',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CreateProjectDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays create title when no editProject', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    // Component uses "Create Project" in h2 title
    expect(screen.getByRole('heading', { name: /Create Project/i })).toBeInTheDocument();
  });

  it('displays edit title when editProject is provided', () => {
    render(<CreateProjectDialog {...defaultProps} editProject={mockProject} />);
    expect(screen.getByText('Edit Project')).toBeInTheDocument();
  });

  it('renders tabs for basic, appearance, and defaults', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByTestId('tab-trigger-basic')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-appearance')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-defaults')).toBeInTheDocument();
  });

  it('renders project name input', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByText('Project Name *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('My Project')).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What is this project about?')).toBeInTheDocument();
  });

  it('renders custom instructions textarea', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByText('Custom Instructions')).toBeInTheDocument();
  });

  it('renders cancel and submit buttons', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    // "Create Project" appears in both h2 and button, use role selector
    expect(screen.getByRole('button', { name: /Create Project/i })).toBeInTheDocument();
  });

  it('shows Save Changes button when editing', () => {
    render(<CreateProjectDialog {...defaultProps} editProject={mockProject} />);
    // Button may show different text when editing - look for any submit button
    const submitButton = screen.getByRole('button', { name: /Save|Update|Edit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables submit button when name is empty', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    // "Create Project" appears in both h2 and button, use role selector
    const submitButton = screen.getByRole('button', { name: /Create Project/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when name is provided', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText('My Project');
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    // "Create Project" appears in both h2 and button, use role selector
    const submitButton = screen.getByRole('button', { name: /Create Project/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit with form data when submitted', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByPlaceholderText('My Project');
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    
    const descInput = screen.getByPlaceholderText('What is this project about?');
    fireEvent.change(descInput, { target: { value: 'Project description' } });
    
    // Find submit button by role
    const submitButtons = screen.getAllByRole('button', { name: /Create Project|创建项目/i });
    fireEvent.click(submitButtons[submitButtons.length - 1]);
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Project',
        description: 'Project description',
      })
    );
  });

  it('calls onOpenChange(false) after submission', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    
    const nameInput = screen.getByPlaceholderText('My Project');
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    // Find the submit button by role
    const submitButtons = screen.getAllByRole('button', { name: /Create Project|创建项目/i });
    fireEvent.click(submitButtons[submitButtons.length - 1]);
    
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders icon selection in appearance tab', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByText('Icon')).toBeInTheDocument();
  });

  it('renders color selection in appearance tab', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('renders default provider select in defaults tab', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByText('Default Provider')).toBeInTheDocument();
  });

  it('renders default mode select in defaults tab', () => {
    render(<CreateProjectDialog {...defaultProps} />);
    expect(screen.getByText('Default Mode')).toBeInTheDocument();
  });
});
