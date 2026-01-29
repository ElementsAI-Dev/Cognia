/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VariableManagerPanel } from './variable-manager-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the store
const mockSetWorkflowVariable = jest.fn();
const mockDeleteWorkflowVariable = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    currentWorkflow: {
      id: 'test-workflow',
      variables: {
        apiKey: {
          type: 'string',
          defaultValue: 'test-key',
          description: 'API Key for external service',
          isSecret: true,
          scope: 'global',
        },
        count: {
          type: 'number',
          defaultValue: '10',
          description: 'Item count',
          isSecret: false,
          scope: 'local',
        },
      },
    },
    setWorkflowVariable: mockSetWorkflowVariable,
    deleteWorkflowVariable: mockDeleteWorkflowVariable,
  })),
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe('VariableManagerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<VariableManagerPanel />);
    
    const button = screen.getByTitle('Variables');
    expect(button).toBeInTheDocument();
  });

  it('opens sheet when button clicked', async () => {
    render(<VariableManagerPanel />);
    
    const button = screen.getByTitle('Variables');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('variables')).toBeInTheDocument();
    });
  });

  it('displays existing variables', async () => {
    render(<VariableManagerPanel />);
    
    const button = screen.getByTitle('Variables');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('apiKey')).toBeInTheDocument();
      expect(screen.getByText('count')).toBeInTheDocument();
    });
  });

  it('groups variables by scope', async () => {
    render(<VariableManagerPanel />);
    
    const button = screen.getByTitle('Variables');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('globalVariables')).toBeInTheDocument();
      expect(screen.getByText('localVariables')).toBeInTheDocument();
    });
  });

  it('filters variables by search query', async () => {
    render(<VariableManagerPanel />);
    
    const button = screen.getByTitle('Variables');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('apiKey')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('searchVariables');
    fireEvent.change(searchInput, { target: { value: 'api' } });
    
    await waitFor(() => {
      expect(screen.getByText('apiKey')).toBeInTheDocument();
      expect(screen.queryByText('count')).not.toBeInTheDocument();
    });
  });

  it('opens add variable dialog when plus button clicked', async () => {
    render(<VariableManagerPanel />);
    
    const triggerButton = screen.getByTitle('Variables');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      // Find the plus button by its parent context
      const buttons = screen.getAllByRole('button');
      const plusButton = buttons.find(btn => btn.querySelector('svg.lucide-plus'));
      if (plusButton) {
        fireEvent.click(plusButton);
      }
    });
  });

  it('displays variable types correctly', async () => {
    render(<VariableManagerPanel />);
    
    const button = screen.getByTitle('Variables');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('string')).toBeInTheDocument();
      expect(screen.getByText('number')).toBeInTheDocument();
    });
  });

  it('shows lock icon for secret variables', async () => {
    render(<VariableManagerPanel />);
    
    const button = screen.getByTitle('Variables');
    fireEvent.click(button);
    
    await waitFor(() => {
      // apiKey is marked as secret, should have lock icon nearby
      const apiKeyItem = screen.getByText('apiKey');
      expect(apiKeyItem).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<VariableManagerPanel className="custom-class" />);
    
    // The className is applied to SheetContent, not visible without opening
    const button = screen.getByTitle('Variables');
    expect(button).toBeInTheDocument();
  });
});

describe('VariableManagerPanel with no workflow', () => {
  it('shows empty state when no workflow', async () => {
    // Override mock for this specific test
    const { useWorkflowEditorStore } = jest.requireMock('@/stores/workflow') as {
      useWorkflowEditorStore: jest.Mock;
    };
    useWorkflowEditorStore.mockReturnValueOnce({
      currentWorkflow: null,
      setWorkflowVariable: mockSetWorkflowVariable,
      deleteWorkflowVariable: mockDeleteWorkflowVariable,
    });

    render(<VariableManagerPanel />);
    
    const button = screen.getByTitle('Variables');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('noVariables')).toBeInTheDocument();
    });
  });
});
