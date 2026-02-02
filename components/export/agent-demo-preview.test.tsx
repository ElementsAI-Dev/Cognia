/**
 * Tests for AgentDemoPreview component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AgentDemoPreview } from './agent-demo-preview';
import type { BackgroundAgent } from '@/types/agent/background-agent';

// Mock the export functions
jest.mock('@/lib/export/agent/agent-demo-export', () => ({
  exportAgentDemo: jest.fn().mockReturnValue('<!DOCTYPE html><html></html>'),
  exportAgentAsMarkdown: jest.fn().mockReturnValue('# Agent Demo'),
}));

jest.mock('@/lib/export', () => ({
  downloadFile: jest.fn(),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock agent for testing
const mockAgent = ({
  id: 'agent-1',
  sessionId: 'session-1',
  name: 'Test Agent',
  task: 'Perform a test task',
  status: 'completed',
  progress: 100,
  config: {
    runInBackground: true,
    notifyOnProgress: true,
    notifyOnComplete: true,
    notifyOnError: true,
    autoRetry: false,
    maxRetries: 3,
    retryDelay: 1000,
    persistState: true,
    maxConcurrentSubAgents: 3,
  },
  executionState: {
    currentStep: 3,
    totalSteps: 3,
    currentPhase: 'completed' as const,
    activeSubAgents: [],
    completedSubAgents: [],
    failedSubAgents: [],
    pendingApprovals: [],
    lastActivity: new Date(),
  },
  subAgents: [],
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      type: 'thinking' as const,
      status: 'completed' as const,
      title: 'Analyzing request',
      description: 'Understanding the user request',
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 5000,
    },
    {
      id: 'step-2',
      stepNumber: 2,
      type: 'tool_call' as const,
      status: 'completed' as const,
      title: 'Calling web search',
      description: 'Searching for relevant information',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'web_search',
          args: { query: 'test query' },
          status: 'completed' as const,
          result: { data: 'search results' },
        },
      ],
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 5000,
    },
    {
      id: 'step-3',
      stepNumber: 3,
      type: 'response' as const,
      status: 'completed' as const,
      title: 'Generating response',
      response: 'Here is the result of your request.',
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 5000,
    },
  ],
  logs: [],
  notifications: [],
  createdAt: new Date(),
  startedAt: new Date(),
  completedAt: new Date(),
  retryCount: 0,
  priority: 1,
} as unknown as BackgroundAgent);

const messages = {
  export: {
    share: 'Share',
    agentDemoExport: 'Export Agent Demo',
    agentWorkflowDemo: 'Agent Workflow Demo',
    agentWorkflowDemoDesc: 'Export interactive demonstration of agent execution',
    executionProgress: 'Execution Progress',
    steps: 'steps',
    stepsPreview: 'Steps Preview',
    toolCalls: 'tool calls',
    failed: 'failed',
    exportFormatDemo: 'Export Format',
    interactiveHtml: 'Interactive HTML',
    interactiveHtmlDesc: 'Animated playback with controls',
    markdownDemo: 'Markdown',
    markdownDemoDesc: 'Simple text documentation',
    autoPlayDemo: 'Auto Play',
    showTimelineDemo: 'Show Timeline',
    showToolDetailsDemo: 'Show Tool Details',
    showThinkingDemo: 'Show Thinking',
    exportDemo: 'Export Demo',
    exportingDemo: 'Exporting...',
    demoExported: 'Demo exported',
    markdownExported: 'Markdown exported',
    exportFailed: 'Export failed',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('AgentDemoPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render trigger button', () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Export Agent Demo')).toBeInTheDocument();
  });

  it('should render custom trigger when provided', () => {
    renderWithProviders(
      <AgentDemoPreview
        agent={mockAgent}
        trigger={<button data-testid="custom-trigger">Custom Demo</button>}
      />
    );
    
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Agent Workflow Demo')).toBeInTheDocument();
    });
  });

  it('should display agent info', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText(mockAgent.name)).toBeInTheDocument();
      expect(screen.getByText(mockAgent.task)).toBeInTheDocument();
    });
  });

  it('should display agent status', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  it('should display progress bar', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Execution Progress')).toBeInTheDocument();
      expect(screen.getByText(/\d+\/\d+ steps/)).toBeInTheDocument();
    });
  });

  it('should display steps preview', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      // Dialog should be open with agent info visible
      expect(screen.getByText('Agent Workflow Demo')).toBeInTheDocument();
      expect(screen.getByText(mockAgent.name)).toBeInTheDocument();
    });
    
    // Steps preview section should show step titles
    await waitFor(() => {
      expect(screen.getByText('Analyzing request')).toBeInTheDocument();
    });
  });

  it('should display export format options', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Export Format')).toBeInTheDocument();
      expect(screen.getByText('Interactive HTML')).toBeInTheDocument();
      expect(screen.getByText('Markdown')).toBeInTheDocument();
    });
  });

  it('should display HTML export options when HTML is selected', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      // Check that at least one HTML option is displayed
      expect(screen.getByText('Auto Play')).toBeInTheDocument();
    });
    
    // Other HTML options should also be present
    expect(screen.getByText('Show Timeline')).toBeInTheDocument();
  });

  it('should display export button', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Export Demo')).toBeInTheDocument();
    });
  });

  it('should call exportAgentDemo when export button is clicked for HTML', async () => {
    const agentExport = await import('@/lib/export/agent/agent-demo-export');
    const libExport = await import('@/lib/export');
    
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Export Demo')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Export Demo'));
    
    await waitFor(() => {
      expect(agentExport.exportAgentDemo).toHaveBeenCalledWith(
        mockAgent,
        expect.objectContaining({
          autoPlay: false,
          showTimeline: true,
          showToolDetails: true,
          showThinkingProcess: true,
        })
      );
      expect(libExport.downloadFile).toHaveBeenCalled();
    });
  });

  it('should expand step details when step is clicked', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Analyzing request')).toBeInTheDocument();
    });
    
    // Click on the first step to expand it
    fireEvent.click(screen.getByText('Analyzing request'));
    
    await waitFor(() => {
      // Should show description when expanded
      expect(screen.getByText('Understanding the user request')).toBeInTheDocument();
    });
  });

  it('should show tool calls in expanded step', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Calling web search')).toBeInTheDocument();
    });
    
    // Click on the tool call step to expand it
    fireEvent.click(screen.getByText('Calling web search'));
    
    await waitFor(() => {
      // Should show tool name when expanded
      expect(screen.getByText('web_search')).toBeInTheDocument();
    });
  });

  it('should display duration statistics', async () => {
    renderWithProviders(<AgentDemoPreview agent={mockAgent} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      // Check for duration/time info
      expect(screen.getByText(/⏱/)).toBeInTheDocument();
      expect(screen.getByText(/🔧 \d+ tool calls/)).toBeInTheDocument();
    });
  });
});
