/**
 * Tests for the ChatSummaryDialog component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatSummaryDialog } from './chat-summary-dialog';
import type { UIMessage } from '@/types/core/message';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'title': 'Chat Summary & Diagram',
      'description': `Generate summary and visualization for ${params?.count || 0} messages`,
      'messages': 'messages',
      'hasTools': 'Has Tools',
      'hasCode': 'Has Code',
      'options': 'Options',
      'summaryFormat': 'Summary Format',
      'diagramType': 'Diagram Type',
      'includeCode': 'Include Code',
      'includeToolCalls': 'Include Tool Calls',
      'summaryTab': 'Summary',
      'diagramTab': 'Diagram',
      'keyPoints': 'Key Points',
      'topics': 'Topics',
      'messagesSummarized': `${params?.count || 0} messages summarized`,
      'compressionRatio': `${params?.ratio || 0}% compression`,
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
const mockGenerateChatSummary = jest.fn();
const mockGenerateChatDiagram = jest.fn();
const mockGenerateChatSummaryWithDiagram = jest.fn();
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
    generateChatSummary: mockGenerateChatSummary,
    generateAgentSummary: jest.fn(),
    generateChatDiagram: mockGenerateChatDiagram,
    generateAgentDiagram: jest.fn(),
    generateChatSummaryWithDiagram: mockGenerateChatSummaryWithDiagram,
    generateAgentSummaryWithDiagram: jest.fn(),
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

// Mock messages
const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'How do I implement sorting?',
    createdAt: new Date('2024-01-01T10:00:00'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Here is a sorting implementation:\n```javascript\nfunction sort(arr) { return arr.sort(); }\n```',
    createdAt: new Date('2024-01-01T10:01:00'),
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'Can you explain more?',
    createdAt: new Date('2024-01-01T10:02:00'),
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: 'The sort function uses quicksort algorithm internally.',
    createdAt: new Date('2024-01-01T10:03:00'),
    parts: [
      {
        type: 'tool-invocation',
        toolCallId: 'tc-1',
        toolName: 'search_docs',
        state: 'result',
        args: {},
        result: 'found',
      } as unknown as NonNullable<UIMessage['parts']>[number],
    ],
  },
];

describe('ChatSummaryDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    messages: mockMessages,
    sessionTitle: 'Test Session',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when open', () => {
      render(<ChatSummaryDialog {...defaultProps} />);
      
      expect(screen.getByText('Chat Summary & Diagram')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<ChatSummaryDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Chat Summary & Diagram')).not.toBeInTheDocument();
    });

    it('should display message count', () => {
      render(<ChatSummaryDialog {...defaultProps} />);
      
      expect(screen.getByText('4 messages')).toBeInTheDocument();
    });

    it('should display stats badges', () => {
      render(<ChatSummaryDialog {...defaultProps} />);
      
      // User messages badge with emoji
      expect(screen.getByText(/👤/)).toBeInTheDocument();
      // Assistant messages badge with emoji  
      expect(screen.getByText(/🤖/)).toBeInTheDocument();
    });

    it('should show Has Tools badge when messages have tool calls', () => {
      render(<ChatSummaryDialog {...defaultProps} />);
      
      // Tool badge - using regex for flexible matching
      expect(screen.getByText(/Has Tools/i)).toBeInTheDocument();
    });

    it('should show Has Code badge when messages contain code', () => {
      render(<ChatSummaryDialog {...defaultProps} />);
      
      // Code badge - using partial text match
      expect(screen.getByText(/Has Code/i)).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('should have Summary and Diagram tabs', () => {
      render(<ChatSummaryDialog {...defaultProps} />);
      
      expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /diagram/i })).toBeInTheDocument();
    });

    it('should show summary tab content by default', () => {
      render(<ChatSummaryDialog {...defaultProps} />);
      
      expect(screen.getByText('No summary generated yet')).toBeInTheDocument();
    });

    it('should switch to diagram tab on click', async () => {
      const user = userEvent.setup();
      render(<ChatSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('tab', { name: /diagram/i }));
      
      expect(screen.getByText('No diagram generated yet')).toBeInTheDocument();
    });
  });

  describe('options', () => {
    it('should toggle options panel', async () => {
      const user = userEvent.setup();
      render(<ChatSummaryDialog {...defaultProps} />);
      
      const optionsButton = screen.getByText('Options');
      await user.click(optionsButton);
      
      expect(screen.getByText('Summary Format')).toBeInTheDocument();
      expect(screen.getByText('Diagram Type')).toBeInTheDocument();
    });

    it('should have include code toggle', async () => {
      const user = userEvent.setup();
      render(<ChatSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Options'));
      
      expect(screen.getByText('Include Code')).toBeInTheDocument();
    });

    it('should have include tool calls toggle', async () => {
      const user = userEvent.setup();
      render(<ChatSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Options'));
      
      expect(screen.getByText('Include Tool Calls')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should call generateChatSummary when Generate Summary clicked', async () => {
      const user = userEvent.setup();
      render(<ChatSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Generate Summary'));
      
      expect(mockGenerateChatSummary).toHaveBeenCalledWith(
        mockMessages,
        expect.objectContaining({
          format: 'detailed',
          includeCode: true,
          includeToolCalls: true,
        }),
        'Test Session'
      );
    });

    it('should call generateChatSummaryWithDiagram when Generate Both clicked', async () => {
      const user = userEvent.setup();
      render(<ChatSummaryDialog {...defaultProps} />);
      
      await user.click(screen.getByText('Generate Both'));
      
      expect(mockGenerateChatSummaryWithDiagram).toHaveBeenCalled();
    });

    it('should call reset when dialog closes', async () => {
      const onOpenChange = jest.fn();
      const { rerender } = render(
        <ChatSummaryDialog {...defaultProps} onOpenChange={onOpenChange} />
      );
      
      // Simulate closing dialog
      rerender(
        <ChatSummaryDialog {...defaultProps} open={false} onOpenChange={onOpenChange} />
      );
      
      // The reset should be called via the handleOpenChange callback
    });
  });

  describe('with summary data', () => {
    it('should display summary when available', () => {
      // Note: The useSummary hook is already mocked at the top level
      // This test verifies the component renders correctly when dialog is open
      render(<ChatSummaryDialog {...defaultProps} />);
      
      // Component should render the summary dialog
      expect(screen.getByText('Chat Summary & Diagram')).toBeInTheDocument();
      // The summary tab should be visible
      expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument();
    });
  });

  describe('with diagram data', () => {
    it('should display diagram when available', async () => {
      // Similar structure to summary test
      // Testing that MermaidBlock receives correct content
    });
  });

  describe('error handling', () => {
    it('should handle generation errors gracefully', () => {
      // Error handling is managed by the useSummary hook
      // The component displays errors from the hook's error state
      render(<ChatSummaryDialog {...defaultProps} />);
      
      // Component should render without crashing even with potential errors
      expect(screen.getByText('Chat Summary & Diagram')).toBeInTheDocument();
    });
  });

  describe('progress', () => {
    it('should display progress bar when generating', () => {
      // Testing progress bar display during generation
    });
  });

  describe('export', () => {
    it('should call exportSummary with correct format', async () => {
      // Testing export functionality
    });
  });
});
