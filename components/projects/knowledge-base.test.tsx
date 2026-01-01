/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeBase } from './knowledge-base';
import type { KnowledgeFile, Project } from '@/types';

// Mock project store
const mockAddKnowledgeFile = jest.fn();
const mockRemoveKnowledgeFile = jest.fn();

const mockKnowledgeFiles: KnowledgeFile[] = [
  {
    id: 'file-1',
    name: 'document.md',
    type: 'markdown',
    content: '# Test Document\nThis is test content.',
    size: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'file-2',
    name: 'code.ts',
    type: 'code',
    content: 'const x = 1;',
    size: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test description',
  icon: 'Folder',
  color: '#3B82F6',
  sessionCount: 0,
  sessionIds: [],
  messageCount: 0,
  knowledgeBase: mockKnowledgeFiles,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastAccessedAt: new Date(),
};

jest.mock('@/stores', () => ({
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getProject: () => mockProject,
      addKnowledgeFile: mockAddKnowledgeFile,
      removeKnowledgeFile: mockRemoveKnowledgeFile,
    };
    return selector(state);
  },
}));

jest.mock('@/lib/document', () => ({
  processDocumentAsync: jest.fn().mockResolvedValue({
    content: 'processed content',
    embeddableContent: 'embeddable content',
    metadata: {},
  }),
  detectDocumentType: jest.fn().mockReturnValue('text'),
}));

// Mock UI components
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

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

describe('KnowledgeBase', () => {
  const defaultProps = {
    projectId: 'project-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<KnowledgeBase {...defaultProps} />);
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
  });

  it('displays upload and add buttons', () => {
    render(<KnowledgeBase {...defaultProps} />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('displays knowledge files', () => {
    render(<KnowledgeBase {...defaultProps} />);
    expect(screen.getByText('document.md')).toBeInTheDocument();
    expect(screen.getByText('code.ts')).toBeInTheDocument();
  });

  it('displays file type badges', () => {
    render(<KnowledgeBase {...defaultProps} />);
    expect(screen.getByText('markdown')).toBeInTheDocument();
    expect(screen.getByText('code')).toBeInTheDocument();
  });

  it('displays search input when files exist', () => {
    render(<KnowledgeBase {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();
  });

  it('filters files based on search query', () => {
    render(<KnowledgeBase {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'document' } });
    
    expect(screen.getByText('document.md')).toBeInTheDocument();
    expect(screen.queryByText('code.ts')).not.toBeInTheDocument();
  });

  it('opens add dialog when Add button is clicked', () => {
    render(<KnowledgeBase {...defaultProps} />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add Knowledge File')).toBeInTheDocument();
  });

  it('renders file name and content inputs in add dialog', () => {
    render(<KnowledgeBase {...defaultProps} />);
    fireEvent.click(screen.getByText('Add'));
    
    expect(screen.getByText('File Name')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('knowledge.md')).toBeInTheDocument();
  });

  it('has disabled Add File button when inputs are empty', () => {
    render(<KnowledgeBase {...defaultProps} />);
    fireEvent.click(screen.getByText('Add'));
    
    const addFileButton = screen.getByText('Add File');
    expect(addFileButton).toBeDisabled();
  });

  it('enables Add File button when inputs are filled', () => {
    render(<KnowledgeBase {...defaultProps} />);
    fireEvent.click(screen.getByText('Add'));
    
    const fileNameInput = screen.getByPlaceholderText('knowledge.md');
    const contentInput = screen.getByPlaceholderText('Enter your knowledge content here...');
    
    fireEvent.change(fileNameInput, { target: { value: 'test.md' } });
    fireEvent.change(contentInput, { target: { value: 'Test content' } });
    
    const addFileButton = screen.getByText('Add File');
    expect(addFileButton).not.toBeDisabled();
  });

  it('calls addKnowledgeFile when adding manual file', () => {
    render(<KnowledgeBase {...defaultProps} />);
    fireEvent.click(screen.getByText('Add'));
    
    const fileNameInput = screen.getByPlaceholderText('knowledge.md');
    const contentInput = screen.getByPlaceholderText('Enter your knowledge content here...');
    
    fireEvent.change(fileNameInput, { target: { value: 'test.md' } });
    fireEvent.change(contentInput, { target: { value: 'Test content' } });
    // Use getAllByText and get the specific button
    const addButtons = screen.getAllByRole('button', { name: /Add File|添加文件/i });
    fireEvent.click(addButtons[addButtons.length - 1]);
    
    expect(mockAddKnowledgeFile).toHaveBeenCalledWith('project-1', expect.objectContaining({
      name: 'test.md',
      content: 'Test content',
    }));
  });

  it('shows no files message when search yields no results', () => {
    render(<KnowledgeBase {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No files found')).toBeInTheDocument();
  });
});
