/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SidebarWorkflows } from './sidebar-workflows';
import type { VisualWorkflow } from '@/types/workflow/workflow-editor';

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock workflow repository
const mockGetAll = jest.fn();
jest.mock('@/lib/db/repositories', () => ({
  workflowRepository: {
    getAll: () => mockGetAll(),
  },
}));

// Mock workflow editor store
const mockLoadWorkflow = jest.fn();
const mockStartExecution = jest.fn();
let mockIsExecuting = false;
let mockExecutionState: { workflowId?: string; progress?: number } | null = null;

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      loadWorkflow: mockLoadWorkflow,
      startExecution: mockStartExecution,
      isExecuting: mockIsExecuting,
      executionState: mockExecutionState,
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  },
  useWorkflowStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      activeExecution: null,
      executionProgress: null,
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  },
  selectActiveExecution: (state: Record<string, unknown>) => state.activeExecution,
  selectExecutionProgress: (state: Record<string, unknown>) => state.executionProgress,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, asChild, ...props }: any) => {
    if (asChild && React.isValidElement(children)) {
      return children;
    }
    return <button onClick={onClick} {...props}>{children}</button>;
  },
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CollapsibleTrigger: ({ children, asChild, ...props }: any) => {
    if (asChild && React.isValidElement(children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return React.cloneElement(children as React.ReactElement, { 'data-testid': 'collapsible-trigger' } as any);
    }
    return <button data-testid="collapsible-trigger" {...props}>{children}</button>;
  },
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SidebarWorkflows', () => {
  const mockWorkflows: Partial<VisualWorkflow>[] = [
    {
      id: 'wf-1',
      name: 'Test Workflow 1',
      icon: '🔄',
      description: 'A test workflow',
      nodes: [],
      edges: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 'wf-2',
      name: 'Test Workflow 2',
      icon: '⚡',
      description: 'Another test workflow',
      nodes: [],
      edges: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-03'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAll.mockResolvedValue(mockWorkflows);
    mockIsExecuting = false;
    mockExecutionState = null;
  });

  it('renders without crashing', async () => {
    render(<SidebarWorkflows />);
    await waitFor(() => {
      expect(screen.getByTestId('collapsible')).toBeInTheDocument();
    });
  });

  it('shows Workflows label', async () => {
    render(<SidebarWorkflows />);
    await waitFor(() => {
      expect(screen.getByText(/Workflows/i)).toBeInTheDocument();
    });
  });

  it('loads and displays workflows', async () => {
    render(<SidebarWorkflows />);
    await waitFor(() => {
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
    });
  });

  it('shows workflow count in badge', async () => {
    render(<SidebarWorkflows />);
    await waitFor(() => {
      expect(screen.getByTestId('badge')).toHaveTextContent('2');
    });
  });

  it('respects limit prop', async () => {
    const manyWorkflows = [...mockWorkflows, {
      id: 'wf-3',
      name: 'Test Workflow 3',
      icon: '🎯',
      description: 'Third workflow',
      nodes: [],
      edges: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-04'),
    }];
    mockGetAll.mockResolvedValue(manyWorkflows);

    render(<SidebarWorkflows limit={2} />);
    await waitFor(() => {
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
      expect(screen.queryByText('Test Workflow 3')).not.toBeInTheDocument();
    });
  });

  it('respects defaultOpen prop', async () => {
    render(<SidebarWorkflows defaultOpen />);
    await waitFor(() => {
      const collapsible = screen.getByTestId('collapsible');
      expect(collapsible).toHaveAttribute('data-open', 'true');
    });
  });

  it('shows empty state when no workflows', async () => {
    mockGetAll.mockResolvedValue([]);
    render(<SidebarWorkflows />);
    await waitFor(() => {
      // Component renders actual text or i18n key depending on mock
      expect(screen.getByText(/No workflows yet|noWorkflows/i)).toBeInTheDocument();
    });
  });

  it('shows create workflow button when empty', async () => {
    mockGetAll.mockResolvedValue([]);
    render(<SidebarWorkflows />);
    await waitFor(() => {
      // Component renders actual text or i18n key depending on mock
      expect(screen.getByText(/Create Workflow|createWorkflow/i)).toBeInTheDocument();
    });
  });

  it('navigates to workflow when clicked', async () => {
    render(<SidebarWorkflows />);
    await waitFor(() => {
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Workflow 1'));
    
    expect(mockLoadWorkflow).toHaveBeenCalledWith(mockWorkflows[0]);
    expect(mockPush).toHaveBeenCalledWith('/workflows?id=wf-1');
  });

  it('shows View All link', async () => {
    render(<SidebarWorkflows />);
    await waitFor(() => {
      expect(screen.getByText(/View All/i)).toBeInTheDocument();
    });
  });

  it('links View All to workflows page', async () => {
    render(<SidebarWorkflows />);
    await waitFor(() => {
      // The text is 'viewAll' (translation key)
      const links = screen.getAllByRole('link');
      const viewAllLink = links.find(link => link.getAttribute('href') === '/workflows');
      expect(viewAllLink).toBeTruthy();
    });
  });

  it('displays workflow icons', async () => {
    render(<SidebarWorkflows />);
    await waitFor(() => {
      expect(screen.getByText('🔄')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });
  });

  it('renders collapsed view correctly', async () => {
    render(<SidebarWorkflows collapsed />);
    await waitFor(() => {
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });
  });

  it('links to workflows page in collapsed mode', async () => {
    render(<SidebarWorkflows collapsed />);
    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/workflows');
    });
  });

  it('handles load error gracefully', async () => {
    mockGetAll.mockRejectedValue(new Error('Failed to load'));
    render(<SidebarWorkflows />);
    
    // Should not crash and eventually show empty state or error
    await waitFor(() => {
      expect(screen.getByTestId('collapsible')).toBeInTheDocument();
    });
  });

  it('shows running progress only for workflow matching editor executionState.workflowId', async () => {
    mockIsExecuting = true;
    mockExecutionState = { workflowId: 'wf-1', progress: 66 };

    render(<SidebarWorkflows />);

    await waitFor(() => {
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
    });

    // Progress bar is rendered only for the matching workflow.
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('does not show running progress when active execution belongs to another workflow', async () => {
    mockIsExecuting = true;
    mockExecutionState = { workflowId: 'wf-x', progress: 80 };

    render(<SidebarWorkflows />);

    await waitFor(() => {
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    // Create a promise that doesn't resolve immediately
    let resolveGetAll: (value: VisualWorkflow[]) => void;
    mockGetAll.mockReturnValue(new Promise((resolve) => {
      resolveGetAll = resolve;
    }));

    render(<SidebarWorkflows />);
    
    // Check for loading indicator (spinner)
    const { container } = render(<SidebarWorkflows />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    // Resolve the promise
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolveGetAll!(mockWorkflows as any);
    
    await waitFor(() => {
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
    });
  });
});
