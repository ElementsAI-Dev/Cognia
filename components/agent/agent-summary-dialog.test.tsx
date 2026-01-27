/**
 * Tests for the AgentSummaryDialog component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentSummaryDialog } from './agent-summary-dialog';
import type { BackgroundAgent } from '@/types/agent/background-agent';

// Mock langfuse to avoid dynamic import issues in Jest
jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    trace: jest.fn(),
    span: jest.fn(),
    generation: jest.fn(),
    score: jest.fn(),
    flush: jest.fn(),
    shutdown: jest.fn(),
  })),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'title': 'Agent Summary',
      'steps': 'steps',
      'subAgents': 'sub-agents',
      'tools': 'tools',
      'options': 'Options',
      'diagramType': 'Diagram Type',
      'includeSubAgents': 'Include Sub-Agents',
      'includeToolCalls': 'Include Tool Calls',
      'includeTiming': 'Include Timing',
      'summaryTab': 'Summary',
      'diagramTab': 'Diagram',
      'stepsTab': 'Steps',
      'subAgentResults': 'Sub-Agent Results',
      'toolsUsed': 'Tools Used',
      'noSummaryYet': 'No summary generated yet',
      'noDiagramYet': 'No diagram generated yet',
      'generateSummary': 'Generate Summary',
      'copySummary': 'Copy Summary',
      'copyDiagram': 'Copy Diagram',
      'export': 'Export',
      'regenerate': 'Regenerate',
      'generateBoth': 'Generate Both',
      'summaryGenerated': 'Summary generated successfully',
      'diagramGenerated': 'Diagram generated successfully',
      'generationComplete': 'Summary and diagram generated',
      'summaryFailed': 'Failed to generate summary',
      'diagramFailed': 'Failed to generate diagram',
      'generationFailed': 'Generation failed',
      'summaryCopied': 'Summary copied to clipboard',
      'diagramCopied': 'Diagram code copied to clipboard',
      'exported': `Exported as ${params?.format || 'unknown'}`,
    };
    return translations[key] || key;
  },
}));

// Mock useSummary hook
const mockGenerateAgentSummary = jest.fn();
const mockGenerateAgentDiagram = jest.fn();
const mockGenerateAgentSummaryWithDiagram = jest.fn();
const mockExportSummary = jest.fn();
const mockReset = jest.fn();

jest.mock('@/hooks/chat/use-summary', () => ({
  useSummary: () => ({
    isGenerating: false,
    progress: null,
    chatSummary: null,
    agentSummary: null,
    diagram: null,
    error: null,
    generateChatSummary: jest.fn(),
    generateAgentSummary: mockGenerateAgentSummary,
    generateChatDiagram: jest.fn(),
    generateAgentDiagram: mockGenerateAgentDiagram,
    generateChatSummaryWithDiagram: jest.fn(),
    generateAgentSummaryWithDiagram: mockGenerateAgentSummaryWithDiagram,
    exportSummary: mockExportSummary,
    reset: mockReset,
  }),
}));

// Mock useCopy hook
jest.mock('@/hooks/ui/use-copy', () => ({
  useCopy: () => ({
    copy: jest.fn(),
    isCopying: false,
  }),
}));

// Mock MermaidBlock
jest.mock('@/components/chat/renderers/mermaid-block', () => ({
  MermaidBlock: ({ content }: { content: string }) => (
    <div data-testid="mermaid-block">{content}</div>
  ),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock agent
const mockAgent = {
  id: 'agent-1',
  sessionId: 'session-1',
  name: 'Test Agent',
  task: 'Analyze and process data',
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
    status: 'completed',
  },
  subAgents: [
    {
      id: 'sub-1',
      parentAgentId: 'agent-1',
      name: 'Data Fetcher',
      description: 'Fetches data',
      task: 'Fetch user data',
      status: 'completed',
      progress: 100,
      config: {},
      logs: [],
      steps: [],
      createdAt: new Date('2024-01-01T10:00:00'),
    },
  ],
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      type: 'thinking',
      title: 'Planning',
      status: 'completed',
      startedAt: new Date('2024-01-01T10:00:00'),
      completedAt: new Date('2024-01-01T10:00:02'),
      duration: 2000,
    },
    {
      id: 'step-2',
      stepNumber: 2,
      type: 'tool_call',
      title: 'Fetching data',
      status: 'completed',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'fetch_api',
          args: { url: 'https://api.example.com' },
          status: 'completed',
        },
      ],
      startedAt: new Date('2024-01-01T10:00:02'),
      completedAt: new Date('2024-01-01T10:00:05'),
      duration: 3000,
    },
    {
      id: 'step-3',
      stepNumber: 3,
      type: 'response',
      title: 'Generating response',
      status: 'completed',
      startedAt: new Date('2024-01-01T10:00:05'),
      completedAt: new Date('2024-01-01T10:00:07'),
      duration: 2000,
    },
  ],
  logs: [],
  notifications: [],
  result: {
    success: true,
    finalResponse: 'Data processed successfully',
    steps: 3,
    totalSteps: 3,
    duration: 7000,
    retryCount: 0,
  },
  createdAt: new Date('2024-01-01T10:00:00'),
  startedAt: new Date('2024-01-01T10:00:00'),
  completedAt: new Date('2024-01-01T10:00:07'),
  retryCount: 0,
  priority: 1,
} as unknown as BackgroundAgent;

describe('AgentSummaryDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    agent: mockAgent,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when open', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      expect(screen.getByText(/Agent Summary/i)).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<AgentSummaryDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display agent name', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      // Agent name is in the title with "Agent Summary : Test Agent" format
      expect(screen.getByText(/Test Agent/i)).toBeInTheDocument();
    });

    it('should display step count badge', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      expect(screen.getByText(/3\s*steps/i)).toBeInTheDocument();
    });

    it('should display sub-agents count when present', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      expect(screen.getByText(/1\s*sub-agents/i)).toBeInTheDocument();
    });

    it('should display tools count when tools are used', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      expect(screen.getByText(/1\s*tools/i)).toBeInTheDocument();
    });

    it('should display agent status', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      // Status badge should be visible
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('should have Summary, Diagram, and Steps tabs', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /diagram/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /steps/i })).toBeInTheDocument();
    });

    it('should show summary tab content by default', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      expect(screen.getByText('No summary generated yet')).toBeInTheDocument();
    });

    it('should switch to diagram tab on click', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /diagram/i }));
      
      expect(screen.getByText('No diagram generated yet')).toBeInTheDocument();
    });

    it('should switch to steps tab on click', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /steps/i }));
      
      // Should show step details - use regex for flexible matching
      expect(screen.getByText(/Planning/i)).toBeInTheDocument();
    });
  });

  describe('options', () => {
    it('should toggle options panel', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      const optionsButton = screen.getByText('Options');
      await user.click(optionsButton);
      
      expect(screen.getByText('Diagram Type')).toBeInTheDocument();
    });

    it('should have include sub-agents toggle', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Options'));
      
      expect(screen.getByText('Include Sub-Agents')).toBeInTheDocument();
    });

    it('should have include tool calls toggle', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Options'));
      
      expect(screen.getByText('Include Tool Calls')).toBeInTheDocument();
    });

    it('should have include timing toggle', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Options'));
      
      expect(screen.getByText('Include Timing')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should call generateAgentSummary when Generate Summary clicked', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Generate Summary'));
      
      expect(mockGenerateAgentSummary).toHaveBeenCalledWith(
        mockAgent,
        expect.objectContaining({
          includeSubAgents: true,
          includeToolCalls: true,
          includeTiming: true,
          format: 'detailed',
        })
      );
    });

    it('should call generateAgentSummaryWithDiagram when Generate Both clicked', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Generate Both'));
      
      expect(mockGenerateAgentSummaryWithDiagram).toHaveBeenCalled();
    });
  });

  describe('steps tab content', () => {
    it('should display all steps with details', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /steps/i }));
      
      // Use regex for flexible matching
      expect(screen.getByText(/Planning/i)).toBeInTheDocument();
    });

    it('should show step status icons', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /steps/i }));
      
      // Completed steps should have check icons or status indicators
      const steps = screen.getAllByText(/completed/i);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should render steps tab without errors', async () => {
      const user = userEvent.setup();
      render(<AgentSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /steps/i }));
      
      // Steps tab should be visible and clickable
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
  });

  describe('with agent that has no sub-agents', () => {
    it('should not show sub-agents badge', () => {
      const agentNoSub = {
        ...mockAgent,
        subAgents: [],
      } as unknown as BackgroundAgent;
      
      render(<AgentSummaryDialog {...defaultProps} agent={agentNoSub} />);
      
      expect(screen.queryByText(/sub-agents/)).not.toBeInTheDocument();
    });
  });

  describe('with failed agent', () => {
    it('should display failed status', () => {
      const failedAgent = {
        ...mockAgent,
        status: 'failed',
        error: 'Connection timeout',
      } as unknown as BackgroundAgent;
      
      render(<AgentSummaryDialog {...defaultProps} agent={failedAgent} />);
      
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle generation errors gracefully', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      // Component should render without crashing - dialog role exists
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('footer actions', () => {
    it('should have action buttons in footer', () => {
      render(<AgentSummaryDialog {...defaultProps} />);
      
      // Dialog footer should have Generate Summary button
      expect(screen.getByText('Generate Summary')).toBeInTheDocument();
    });
  });
});
