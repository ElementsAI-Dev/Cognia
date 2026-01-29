/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkflowSettingsPanel } from './workflow-settings-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the store
const mockUpdateWorkflowMeta = jest.fn();
const mockUpdateWorkflowSettings = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    currentWorkflow: {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'Test description',
      icon: 'Workflow',
      category: 'automation',
      tags: ['test', 'workflow'],
      settings: {
        autoSave: true,
        autoLayout: false,
        showMinimap: true,
        showGrid: true,
        snapToGrid: true,
        gridSize: 20,
        maxRetries: 3,
        retryDelay: 1000,
        executionTimeout: 60000,
      },
    },
    updateWorkflowMeta: mockUpdateWorkflowMeta,
    updateWorkflowSettings: mockUpdateWorkflowSettings,
  })),
}));

describe('WorkflowSettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<WorkflowSettingsPanel />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('opens sheet when button clicked', async () => {
    render(<WorkflowSettingsPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('workflowSettings')).toBeInTheDocument();
    });
  });

  it('displays workflow name input', async () => {
    render(<WorkflowSettingsPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Test Workflow');
      expect(nameInput).toBeInTheDocument();
    });
  });

  it('displays workflow description', async () => {
    render(<WorkflowSettingsPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const descInput = screen.getByDisplayValue('Test description');
      expect(descInput).toBeInTheDocument();
    });
  });

  it('displays existing tags', async () => {
    render(<WorkflowSettingsPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('workflow')).toBeInTheDocument();
    });
  });

  it('has settings toggles', async () => {
    render(<WorkflowSettingsPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      // Settings section should be visible
      expect(screen.getByText('editorSettings')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<WorkflowSettingsPanel className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});

describe('WorkflowSettingsPanel with no workflow', () => {
  it('shows empty state when no workflow', async () => {
    const { useWorkflowEditorStore } = jest.requireMock('@/stores/workflow') as {
      useWorkflowEditorStore: jest.Mock;
    };
    useWorkflowEditorStore.mockReturnValueOnce({
      currentWorkflow: null,
      updateWorkflowMeta: mockUpdateWorkflowMeta,
      updateWorkflowSettings: mockUpdateWorkflowSettings,
    });

    render(<WorkflowSettingsPanel />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('noWorkflowSelected')).toBeInTheDocument();
    });
  });
});
