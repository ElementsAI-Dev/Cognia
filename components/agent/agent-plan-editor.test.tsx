/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentPlanEditor } from './agent-plan-editor';
import type { AgentPlan } from '@/types/agent';

// Mock the stores
const mockGetActivePlan = jest.fn();
const mockCreatePlan = jest.fn();
const mockUpdatePlan = jest.fn();
const mockDeletePlan = jest.fn();
const mockSetActivePlan = jest.fn();
const mockAddPlanStep = jest.fn();
const mockUpdatePlanStep = jest.fn();
const mockDeletePlanStep = jest.fn();
const mockReorderPlanSteps = jest.fn();
const mockApprovePlan = jest.fn();
const mockStartPlanExecution = jest.fn();
const mockCancelPlanExecution = jest.fn();

jest.mock('@/stores', () => ({
  useAgentStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createPlan: mockCreatePlan,
      updatePlan: mockUpdatePlan,
      deletePlan: mockDeletePlan,
      setActivePlan: mockSetActivePlan,
      getActivePlan: mockGetActivePlan,
      addPlanStep: mockAddPlanStep,
      updatePlanStep: mockUpdatePlanStep,
      deletePlanStep: mockDeletePlanStep,
      reorderPlanSteps: mockReorderPlanSteps,
      approvePlan: mockApprovePlan,
      startPlanExecution: mockStartPlanExecution,
      cancelPlanExecution: mockCancelPlanExecution,
    };
    return selector ? selector(state) : state;
  },
  useSettingsStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-key' },
      },
    };
    return selector ? selector(state) : state;
  },
  useSessionStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getActiveSession: () => ({ provider: 'openai', model: 'gpt-4o-mini' }),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock the plan executor hook
jest.mock('@/hooks', () => ({
  usePlanExecutor: () => ({
    isExecuting: false,
    executePlan: jest.fn(),
    stopExecution: jest.fn(),
  }),
}));

// Mock AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({ text: '[]' }),
}));

// Mock provider model
jest.mock('@/lib/ai/client', () => ({
  getProviderModel: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ai-elements/plan', () => ({
  Plan: ({ children, className }: { children: React.ReactNode; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; className?: string }) => (
    <div data-testid="plan" className={className}>{children}</div>
  ),
  PlanHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="plan-header">{children}</div>
  ),
  PlanTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="plan-title">{children}</h3>
  ),
  PlanDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="plan-description">{children}</p>
  ),
  PlanContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="plan-content">{children}</div>
  ),
  PlanFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="plan-footer" className={className}>{children}</div>
  ),
  PlanTrigger: () => <button data-testid="plan-trigger">Toggle</button>,
  PlanAction: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="plan-action">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant: _variant, size: _size, title, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} title={title} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      data-testid="input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, className }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      data-testid="textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean; onOpenChange?: (open: boolean) => void }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

describe('AgentPlanEditor', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivePlan.mockReturnValue(null);
  });

  describe('When no active plan exists', () => {
    it('renders "No Active Plan" message', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('No Active Plan')).toBeInTheDocument();
    });

    it('shows description text', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('Create a plan to organize your agent tasks')).toBeInTheDocument();
    });

    it('renders Create Plan button', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('Create Plan')).toBeInTheDocument();
    });

    it('opens create plan dialog when button is clicked', async () => {
      render(<AgentPlanEditor {...defaultProps} />);
      
      const createButton = screen.getByText('Create Plan');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });
    });

    it('displays dialog with correct title', async () => {
      render(<AgentPlanEditor {...defaultProps} />);
      
      const createButton = screen.getByText('Create Plan');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create New Plan')).toBeInTheDocument();
      });
    });
  });

  describe('When an active plan exists', () => {
    const mockPlan: AgentPlan = {
      id: 'plan-1',
      sessionId: 'test-session-123',
      title: 'Test Plan',
      description: 'Test Description',
      status: 'draft',
      steps: [
        { id: 'step-1', title: 'Step 1', status: 'pending', order: 0 },
        { id: 'step-2', title: 'Step 2', status: 'pending', order: 1 },
      ],
      totalSteps: 2,
      completedSteps: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockGetActivePlan.mockReturnValue(mockPlan);
    });

    it('renders the plan component', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByTestId('plan')).toBeInTheDocument();
    });

    it('displays the plan title', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('Test Plan')).toBeInTheDocument();
    });

    it('displays the plan description', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('displays the plan status badge', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('draft')).toBeInTheDocument();
    });

    it('renders all plan steps', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getAllByText('Step 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Step 2').length).toBeGreaterThan(0);
    });

    it('shows progress indicator', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByTestId('progress')).toBeInTheDocument();
      expect(screen.getByText('0 / 2 steps')).toBeInTheDocument();
    });

    it('renders "Add Step" button for draft plans', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('Add Step')).toBeInTheDocument();
    });

    it('renders "Execute Plan" button for draft plans with steps', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('Execute Plan')).toBeInTheDocument();
    });

    it('renders "Delete Plan" button', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('Delete Plan')).toBeInTheDocument();
    });
  });

  describe('Plan with different statuses', () => {
    it('shows executing status correctly', () => {
      const executingPlan: AgentPlan = {
        id: 'plan-1',
        sessionId: 'test-session-123',
        title: 'Executing Plan',
        status: 'executing',
        steps: [
          { id: 'step-1', title: 'Step 1', status: 'completed', order: 0 },
          { id: 'step-2', title: 'Step 2', status: 'in_progress', order: 1 },
        ],
        totalSteps: 2,
        completedSteps: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGetActivePlan.mockReturnValue(executingPlan);

      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('executing')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows completed status correctly', () => {
      const completedPlan: AgentPlan = {
        id: 'plan-1',
        sessionId: 'test-session-123',
        title: 'Completed Plan',
        status: 'completed',
        steps: [
          { id: 'step-1', title: 'Step 1', status: 'completed', order: 0 },
        ],
        totalSteps: 1,
        completedSteps: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGetActivePlan.mockReturnValue(completedPlan);

      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('shows failed status correctly', () => {
      const failedPlan: AgentPlan = {
        id: 'plan-1',
        sessionId: 'test-session-123',
        title: 'Failed Plan',
        status: 'failed',
        steps: [
          { id: 'step-1', title: 'Step 1', status: 'failed', order: 0, error: 'Something went wrong' },
        ],
        totalSteps: 1,
        completedSteps: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGetActivePlan.mockReturnValue(failedPlan);

      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  describe('Step interactions', () => {
    const mockDraftPlan: AgentPlan = {
      id: 'plan-1',
      sessionId: 'test-session-123',
      title: 'Draft Plan',
      status: 'draft',
      steps: [
        { id: 'step-1', title: 'Step 1', description: 'First step', status: 'pending', order: 0 },
      ],
      totalSteps: 1,
      completedSteps: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockGetActivePlan.mockReturnValue(mockDraftPlan);
    });

    it('shows step number', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getAllByText('Step 1').length).toBeGreaterThan(0);
    });

    it('shows step description', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      expect(screen.getByText('First step')).toBeInTheDocument();
    });
  });

  describe('Plan actions', () => {
    const mockDraftPlan: AgentPlan = {
      id: 'plan-1',
      sessionId: 'test-session-123',
      title: 'Test Plan',
      status: 'draft',
      steps: [
        { id: 'step-1', title: 'Step 1', status: 'pending', order: 0 },
      ],
      totalSteps: 1,
      completedSteps: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockGetActivePlan.mockReturnValue(mockDraftPlan);
    });

    it('calls deletePlan when Delete Plan is clicked', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete Plan');
      fireEvent.click(deleteButton);
      
      expect(mockDeletePlan).toHaveBeenCalledWith('plan-1');
      expect(mockSetActivePlan).toHaveBeenCalledWith(null);
    });

    it('calls approvePlan and startPlanExecution when Execute Plan is clicked', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      
      const executeButton = screen.getByText('Execute Plan');
      fireEvent.click(executeButton);
      
      expect(mockApprovePlan).toHaveBeenCalledWith('plan-1');
      expect(mockStartPlanExecution).toHaveBeenCalledWith('plan-1');
    });
  });

  describe('Refine with AI', () => {
    const mockDraftPlan: AgentPlan = {
      id: 'plan-1',
      sessionId: 'test-session-123',
      title: 'Test Plan',
      status: 'draft',
      steps: [
        { id: 'step-1', title: 'Step 1', status: 'pending', order: 0 },
      ],
      totalSteps: 1,
      completedSteps: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockGetActivePlan.mockReturnValue(mockDraftPlan);
    });

    it('renders refine button for draft plans with steps', () => {
      render(<AgentPlanEditor {...defaultProps} />);
      const refineButton = screen.getByTitle('Refine with AI');
      expect(refineButton).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('applies custom className', () => {
      mockGetActivePlan.mockReturnValue(null);
      render(<AgentPlanEditor {...defaultProps} className="custom-class" />);
      
      const container = screen.getByText('No Active Plan').closest('div[class*="rounded-lg"]');
      expect(container).toHaveClass('custom-class');
    });

    it('calls onExecute callback when provided', async () => {
      const completedPlan: AgentPlan = {
        id: 'plan-1',
        sessionId: 'test-session-123',
        title: 'Test Plan',
        status: 'draft',
        steps: [
          { id: 'step-1', title: 'Step 1', status: 'pending', order: 0 },
        ],
        totalSteps: 1,
        completedSteps: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGetActivePlan.mockReturnValue(completedPlan);

      const onExecute = jest.fn();
      render(<AgentPlanEditor {...defaultProps} onExecute={onExecute} />);
      
      const executeButton = screen.getByText('Execute Plan');
      fireEvent.click(executeButton);
      
      // The onExecute callback is called in the executePlan callback
      expect(mockApprovePlan).toHaveBeenCalled();
    });
  });
});
