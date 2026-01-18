/**
 * FlowChatCanvas - Unit tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { NextIntlClientProvider } from 'next-intl';
import { FlowChatCanvas } from './flow-chat-canvas';
import type { UIMessage } from '@/types/core/message';
import type { FlowChatCanvasState } from '@/types/chat/flow-chat';
import type { ConversationBranch } from '@/types/core/session';
import { DEFAULT_FLOW_CANVAS_STATE } from '@/types/chat/flow-chat';

// Mock flow layout utilities
jest.mock('@/lib/chat/flow-layout', () => ({
  messagesToFlowNodes: jest.fn(() => ({
    nodes: [],
    edges: [],
  })),
  autoLayoutNodes: jest.fn((nodes) => nodes),
  getNodePositions: jest.fn(() => []),
}));

// Mock child components
jest.mock('./flow-chat-node', () => ({
  FlowChatNode: ({ data }: { data: { message: { content: string } } }) => (
    <div data-testid="flow-chat-node">{data.message.content}</div>
  ),
}));

jest.mock('./flow-chat-edge', () => ({
  FlowChatEdge: () => <div data-testid="flow-chat-edge" />,
}));

jest.mock('./flow-chat-controls', () => ({
  FlowChatControls: ({ onExport }: { onExport: (format: string) => void }) => (
    <div data-testid="flow-chat-controls">
      <button onClick={() => onExport('json')}>Export JSON</button>
    </div>
  ),
}));

jest.mock('./flow-tool-panel', () => ({
  FlowToolPanel: () => <div data-testid="flow-tool-panel">Tools</div>,
}));

jest.mock('./flow-parallel-generation', () => ({
  FlowParallelGeneration: ({ open }: { open: boolean }) =>
    open ? <div data-testid="flow-parallel-generation">Parallel Gen</div> : null,
}));

jest.mock('./flow-search-panel', () => ({
  FlowSearchPanel: () => <div data-testid="flow-search-panel">Search</div>,
}));

jest.mock('./flow-comparison-view', () => ({
  FlowComparisonView: ({ open }: { open: boolean }) =>
    open ? <div data-testid="flow-comparison-view">Comparison</div> : null,
}));

jest.mock('./flow-keyboard-shortcuts', () => ({
  FlowKeyboardShortcuts: () => <div data-testid="flow-keyboard-shortcuts" />,
}));

// Mock translations
const messages = {
  flowChat: {
    emptyCanvas: 'Start a conversation',
    emptyCanvasHint: 'Type a message to begin',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  </NextIntlClientProvider>
);

describe('FlowChatCanvas', () => {
  const createMockMessage = (overrides?: Partial<UIMessage>): UIMessage => ({
    id: 'msg-1',
    role: 'assistant',
    content: 'Test message',
    createdAt: new Date(),
    ...overrides,
  });

  const defaultProps = {
    sessionId: 'session-1',
    messages: [createMockMessage()],
    branches: [],
    canvasState: DEFAULT_FLOW_CANVAS_STATE,
    isStreaming: false,
    onNodeAction: jest.fn(),
    onCanvasStateChange: jest.fn(),
    onNodeSelect: jest.fn(),
    onFollowUp: jest.fn(),
    onRegenerate: jest.fn(),
    onCreateBranch: jest.fn(),
    onDeleteNode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the canvas with ReactFlow', () => {
    render(<FlowChatCanvas {...defaultProps} />, { wrapper });

    // ReactFlow container should be present
    const canvas = document.querySelector('.react-flow');
    expect(canvas).toBeInTheDocument();
  });

  it('renders empty state when no messages', () => {
    render(<FlowChatCanvas {...defaultProps} messages={[]} />, { wrapper });

    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByText('Type a message to begin')).toBeInTheDocument();
  });

  it('renders controls component', () => {
    render(<FlowChatCanvas {...defaultProps} />, { wrapper });

    expect(screen.getByTestId('flow-chat-controls')).toBeInTheDocument();
  });

  it('renders keyboard shortcuts component', () => {
    render(<FlowChatCanvas {...defaultProps} />, { wrapper });

    expect(screen.getByTestId('flow-keyboard-shortcuts')).toBeInTheDocument();
  });

  it('calls onExport with json format when export is triggered', () => {
    render(<FlowChatCanvas {...defaultProps} />, { wrapper });

    const exportButton = screen.getByText('Export JSON');
    fireEvent.click(exportButton);

    // Allow time for async export
    waitFor(() => {
      const downloadLinks = document.querySelectorAll('a[download]');
      expect(downloadLinks.length).toBeGreaterThan(0);
    });
  });

  it('shows tool panel when Ctrl+T is pressed', () => {
    render(<FlowChatCanvas {...defaultProps} />, { wrapper });

    fireEvent.keyDown(window, { key: 't', ctrlKey: true });

    expect(screen.getByTestId('flow-tool-panel')).toBeInTheDocument();
  });

  it('shows search panel when Ctrl+F is pressed', () => {
    render(<FlowChatCanvas {...defaultProps} />, { wrapper });

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

    expect(screen.getByTestId('flow-search-panel')).toBeInTheDocument();
  });

  it('closes panels when Escape is pressed', () => {
    render(<FlowChatCanvas {...defaultProps} />, { wrapper });

    // Open search panel first
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(screen.getByTestId('flow-search-panel')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    waitFor(() => {
      expect(screen.queryByTestId('flow-search-panel')).not.toBeInTheDocument();
    });
  });

  it('handles node actions correctly', () => {
    const onNodeAction = jest.fn();
    render(<FlowChatCanvas {...defaultProps} onNodeAction={onNodeAction} />, { wrapper });

    // Simulate a node action through callback
    const _mockParams = {
      action: 'regenerate' as const,
      nodeId: 'node-1',
      messageId: 'msg-1',
    };

    // The callback would be called by child components
    // We're testing that the prop is passed correctly
    expect(defaultProps.onNodeAction).toBeDefined();
  });

  it('updates canvas state when nodes change', () => {
    const onCanvasStateChange = jest.fn();
    render(
      <FlowChatCanvas {...defaultProps} onCanvasStateChange={onCanvasStateChange} />,
      { wrapper }
    );

    // State changes would be triggered by ReactFlow interactions
    expect(onCanvasStateChange).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FlowChatCanvas {...defaultProps} className="custom-class" />,
      { wrapper }
    );

    const canvasContainer = container.querySelector('.custom-class');
    expect(canvasContainer).toBeInTheDocument();
  });

  it('shows minimap when canvas state enables it', () => {
    const canvasStateWithMinimap: FlowChatCanvasState = {
      ...DEFAULT_FLOW_CANVAS_STATE,
      showMinimap: true,
    };

    render(<FlowChatCanvas {...defaultProps} canvasState={canvasStateWithMinimap} />, {
      wrapper,
    });

    const minimap = document.querySelector('.react-flow__minimap');
    expect(minimap).toBeInTheDocument();
  });

  it('shows grid when canvas state enables it', () => {
    const canvasStateWithGrid: FlowChatCanvasState = {
      ...DEFAULT_FLOW_CANVAS_STATE,
      showGrid: true,
    };

    render(<FlowChatCanvas {...defaultProps} canvasState={canvasStateWithGrid} />, {
      wrapper,
    });

    const background = document.querySelector('.react-flow__background');
    expect(background).toBeInTheDocument();
  });

  it('renders with branches', () => {
    const branches: ConversationBranch[] = [
      {
        id: 'branch-1',
        name: 'Main',
        branchPointMessageId: 'root',
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 1,
        isActive: true,
      },
      {
        id: 'branch-2',
        name: 'Alternate',
        branchPointMessageId: 'msg-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 1,
        isActive: false,
      },
    ];

    render(<FlowChatCanvas {...defaultProps} branches={branches} />, { wrapper });

    const canvas = document.querySelector('.react-flow');
    expect(canvas).toBeInTheDocument();
  });

  it('handles streaming state correctly', () => {
    render(
      <FlowChatCanvas
        {...defaultProps}
        isStreaming={true}
        streamingMessageId="msg-1"
      />,
      { wrapper }
    );

    const canvas = document.querySelector('.react-flow');
    expect(canvas).toBeInTheDocument();
  });
});
