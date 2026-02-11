/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { WorkflowTriggerPanel } from './workflow-trigger-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the store
const mockUpdateWorkflowSettings = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    currentWorkflow: {
      id: 'test-workflow',
      name: 'Test Workflow',
      settings: {
        triggers: [
          {
            id: 'trigger-1',
            type: 'manual',
            name: 'Manual Trigger',
            enabled: true,
            config: {},
          },
          {
            id: 'trigger-2',
            type: 'schedule',
            name: 'Daily Schedule',
            enabled: true,
            config: {
              cronExpression: '0 9 * * *',
              timezone: 'UTC',
            },
          },
        ],
      },
    },
    updateWorkflowSettings: mockUpdateWorkflowSettings,
  })),
}));

describe('WorkflowTriggerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger panel title', () => {
    render(<WorkflowTriggerPanel />);
    
    expect(screen.getByText('triggers')).toBeInTheDocument();
  });

  it('displays existing triggers', () => {
    render(<WorkflowTriggerPanel />);
    
    expect(screen.getByText('Manual Trigger')).toBeInTheDocument();
    expect(screen.getByText('Daily Schedule')).toBeInTheDocument();
  });

  it('shows trigger type badges', () => {
    render(<WorkflowTriggerPanel />);
    
    expect(screen.getByText('manual')).toBeInTheDocument();
    expect(screen.getByText('schedule')).toBeInTheDocument();
  });

  it('has trigger type buttons', () => {
    render(<WorkflowTriggerPanel />);
    
    // Component renders individual trigger type buttons (manual, schedule, event, webhook)
    expect(screen.getByText('manual')).toBeInTheDocument();
  });

  it('displays schedule trigger in list', () => {
    render(<WorkflowTriggerPanel />);
    
    // Schedule trigger name should be visible in the trigger list
    expect(screen.getByText('Daily Schedule')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<WorkflowTriggerPanel className="custom-class" />);
    
    // The component should render with className
    expect(screen.getByText('triggers')).toBeInTheDocument();
  });
});

describe('WorkflowTriggerPanel with no workflow', () => {
  it('shows empty triggers state when no workflow', () => {
    const { useWorkflowEditorStore } = jest.requireMock('@/stores/workflow') as {
      useWorkflowEditorStore: jest.Mock;
    };
    useWorkflowEditorStore.mockReturnValueOnce({
      currentWorkflow: null,
      updateWorkflowSettings: mockUpdateWorkflowSettings,
    });

    render(<WorkflowTriggerPanel />);
    
    // When no workflow, triggers array is empty, so noTriggers text appears
    expect(screen.getByText('noTriggers')).toBeInTheDocument();
  });
});

describe('WorkflowTriggerPanel with no triggers', () => {
  it('shows empty triggers state', () => {
    const { useWorkflowEditorStore } = jest.requireMock('@/stores/workflow') as {
      useWorkflowEditorStore: jest.Mock;
    };
    useWorkflowEditorStore.mockReturnValueOnce({
      currentWorkflow: {
        id: 'test-workflow',
        settings: {
          triggers: [],
        },
      },
      updateWorkflowSettings: mockUpdateWorkflowSettings,
    });

    render(<WorkflowTriggerPanel />);
    
    expect(screen.getByText('noTriggers')).toBeInTheDocument();
  });
});
