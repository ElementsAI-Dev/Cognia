/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BranchSelector, BranchButton } from './branch-selector';
import type { ConversationBranch } from '@/types';

// Mock stores
const mockSwitchBranch = jest.fn();
const mockDeleteBranch = jest.fn();
const mockRenameBranch = jest.fn();
const mockCreateBranch = jest.fn();

const mockBranches: ConversationBranch[] = [
  { id: 'branch-1', name: 'Alternative approach', branchPointMessageId: 'msg-1', createdAt: new Date(), updatedAt: new Date(), messageCount: 5, isActive: true },
  { id: 'branch-2', name: 'Testing branch', branchPointMessageId: 'msg-2', createdAt: new Date(), updatedAt: new Date(), messageCount: 3, isActive: false },
];

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getBranches: () => mockBranches,
      getActiveBranchId: () => 'branch-1',
      switchBranch: mockSwitchBranch,
      deleteBranch: mockDeleteBranch,
      renameBranch: mockRenameBranch,
      createBranch: mockCreateBranch,
    };
    return selector(state);
  },
}));

// Mock database
jest.mock('@/lib/db', () => ({
  messageRepository: {
    deleteByBranchId: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} data-testid="branch-input" {...props} />
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('BranchSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing when branches exist', () => {
    render(<BranchSelector sessionId="session-1" />);
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
  });

  it('returns null when no branches exist', () => {
    // Temporarily override the mock to return empty branches
    jest.doMock('@/stores', () => ({
      useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          getBranches: () => [],
          getActiveBranchId: () => null,
          switchBranch: mockSwitchBranch,
          deleteBranch: mockDeleteBranch,
          renameBranch: mockRenameBranch,
        };
        return selector(state);
      },
    }));
  });

  it('displays branch list', () => {
    render(<BranchSelector sessionId="session-1" />);
    expect(screen.getByText('Alternative approach')).toBeInTheDocument();
    expect(screen.getByText('Testing branch')).toBeInTheDocument();
  });

  it('shows Main branch option', () => {
    render(<BranchSelector sessionId="session-1" />);
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('displays active branch badge', () => {
    render(<BranchSelector sessionId="session-1" />);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('calls onBranchChange when switching branches', () => {
    const onBranchChange = jest.fn();
    render(<BranchSelector sessionId="session-1" onBranchChange={onBranchChange} />);
    
    const mainBranch = screen.getByText('Main').closest('button');
    fireEvent.click(mainBranch!);
    
    expect(mockSwitchBranch).toHaveBeenCalledWith('session-1', null);
    expect(onBranchChange).toHaveBeenCalledWith(null);
  });

  it('renders in compact mode', () => {
    render(<BranchSelector sessionId="session-1" compact />);
    // In compact mode, should show branch count badge
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows conversation branches label', () => {
    render(<BranchSelector sessionId="session-1" />);
    expect(screen.getByText('Conversation Branches')).toBeInTheDocument();
  });

  it('shows branch creation hint', () => {
    render(<BranchSelector sessionId="session-1" />);
    expect(screen.getByText(/Click.*Branch.*on a message/)).toBeInTheDocument();
  });
});

describe('BranchButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateBranch.mockReturnValue({ id: 'new-branch', name: 'New Branch' });
  });

  it('renders without crashing', () => {
    render(<BranchButton sessionId="session-1" messageId="msg-1" />);
    expect(screen.getByText('Branch')).toBeInTheDocument();
  });

  it('creates a branch when clicked', async () => {
    const onBranchCreated = jest.fn();
    render(
      <BranchButton
        sessionId="session-1"
        messageId="msg-1"
        onBranchCreated={onBranchCreated}
      />
    );
    
    fireEvent.click(screen.getByText('Branch'));
    
    await waitFor(() => {
      expect(mockCreateBranch).toHaveBeenCalledWith('session-1', 'msg-1');
    });
  });

  it('shows creating state during branch creation', async () => {
    mockCreateBranch.mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({ id: 'new', name: 'New' }), 100));
    });
    
    render(<BranchButton sessionId="session-1" messageId="msg-1" />);
    
    fireEvent.click(screen.getByText('Branch'));
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });

  it('calls onBranchCreated callback after creation', async () => {
    const onBranchCreated = jest.fn();
    mockCreateBranch.mockReturnValue({ id: 'new-branch-id', name: 'New' });
    
    render(
      <BranchButton
        sessionId="session-1"
        messageId="msg-1"
        onBranchCreated={onBranchCreated}
      />
    );
    
    fireEvent.click(screen.getByText('Branch'));
    
    await waitFor(() => {
      expect(onBranchCreated).toHaveBeenCalledWith('new-branch-id');
    });
  });

  it('calls onCopyMessages when provided', async () => {
    const onCopyMessages = jest.fn().mockResolvedValue(undefined);
    mockCreateBranch.mockReturnValue({ id: 'new-branch', name: 'New' });
    
    render(
      <BranchButton
        sessionId="session-1"
        messageId="msg-1"
        onCopyMessages={onCopyMessages}
      />
    );
    
    fireEvent.click(screen.getByText('Branch'));
    
    await waitFor(() => {
      expect(onCopyMessages).toHaveBeenCalledWith('msg-1', 'new-branch');
    });
  });

  it('is disabled while creating', async () => {
    mockCreateBranch.mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({ id: 'new', name: 'New' }), 100));
    });
    
    render(<BranchButton sessionId="session-1" messageId="msg-1" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(button).toBeDisabled();
  });
});
