/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { NodeConfigPanel } from './node-config-panel';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the store
const mockUpdateNode = jest.fn();

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    currentWorkflow: {
      id: 'test-workflow',
      nodes: [
        {
          id: 'node-1',
          type: 'ai',
          data: {
            nodeType: 'ai',
            label: 'AI Node',
            prompt: 'Test prompt',
          },
        },
        {
          id: 'node-2',
          type: 'tool',
          data: {
            nodeType: 'tool',
            label: 'Tool Node',
            toolId: 'test-tool',
          },
        },
      ],
    },
    selectedNodes: ['node-1'],
    updateNode: mockUpdateNode,
    showConfigPanel: true,
    toggleConfigPanel: jest.fn(),
  })),
}));

// Mock lazy-loaded config components
jest.mock('./node-config/ai-config', () => ({
  __esModule: true,
  default: () => <div data-testid="ai-config">AI Config</div>,
}));

jest.mock('./node-config/tool-config', () => ({
  __esModule: true,
  default: () => <div data-testid="tool-config">Tool Config</div>,
}));

describe('NodeConfigPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when showConfigPanel is true', () => {
    render(<NodeConfigPanel />);
    
    expect(screen.getByText('nodeConfig')).toBeInTheDocument();
  });

  it('displays selected node label', async () => {
    render(<NodeConfigPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('AI Node')).toBeInTheDocument();
    });
  });

  it('shows node type badge', async () => {
    render(<NodeConfigPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('ai')).toBeInTheDocument();
    });
  });

  it('loads appropriate config component for node type', async () => {
    render(<NodeConfigPanel />);
    
    await waitFor(() => {
      expect(screen.getByTestId('ai-config')).toBeInTheDocument();
    });
  });
});

describe('NodeConfigPanel with no selection', () => {
  it('shows no selection message when no node selected', () => {
    const { useWorkflowEditorStore } = jest.requireMock('@/stores/workflow') as {
      useWorkflowEditorStore: jest.Mock;
    };
    useWorkflowEditorStore.mockReturnValueOnce({
      currentWorkflow: { id: 'test', nodes: [] },
      selectedNodes: [],
      updateNode: mockUpdateNode,
      showConfigPanel: true,
      toggleConfigPanel: jest.fn(),
    });

    render(<NodeConfigPanel />);
    
    expect(screen.getByText('selectNodeToConfig')).toBeInTheDocument();
  });
});

describe('NodeConfigPanel hidden', () => {
  it('does not render when showConfigPanel is false', () => {
    const { useWorkflowEditorStore } = jest.requireMock('@/stores/workflow') as {
      useWorkflowEditorStore: jest.Mock;
    };
    useWorkflowEditorStore.mockReturnValueOnce({
      currentWorkflow: { id: 'test', nodes: [] },
      selectedNodes: ['node-1'],
      updateNode: mockUpdateNode,
      showConfigPanel: false,
      toggleConfigPanel: jest.fn(),
    });

    const { container } = render(<NodeConfigPanel />);
    
    expect(container.firstChild).toBeNull();
  });
});
