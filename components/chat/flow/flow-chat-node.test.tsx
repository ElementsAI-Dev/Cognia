/**
 * FlowChatNode - Unit tests
 */

import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { NextIntlClientProvider } from 'next-intl';
import type { FlowChatNodeData } from '@/types/chat/flow-chat';
import type { UIMessage } from '@/types';

// Import after mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FlowChatNode } = require('./flow-chat-node');

// Mock A2UI components
jest.mock('@/components/a2ui', () => ({
  A2UIMessageRenderer: ({ content }: { content: string }) => (
    <div data-testid="a2ui-message">{content}</div>
  ),
  hasA2UIContent: (content: string) => content.includes('a2ui'),
}));

// Mock message parts
jest.mock('@/components/chat/message-parts', () => ({
  ReasoningPart: ({ part }: { part: { reasoning: string } }) => (
    <div data-testid="reasoning-part">{part.reasoning}</div>
  ),
  SourcesPart: ({ part }: { part: { sources: unknown[] } }) => (
    <div data-testid="sources-part">Sources: {part.sources?.length || 0}</div>
  ),
}));

// Mock translations
const messages = {
  flowChat: {
    followUp: 'Follow Up',
    regenerate: 'Regenerate',
    createBranch: 'Create Branch',
    reference: 'Reference',
    parallelGenerate: 'Parallel Generate',
    copy: 'Copy',
    copied: 'Copied',
    delete: 'Delete',
    expand: 'Expand',
    collapse: 'Collapse',
    branchPoint: 'Branch Point',
    branchPointHint: 'This message has conversation branches',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  </NextIntlClientProvider>
);

describe('FlowChatNode', () => {
  const createMockMessage = (overrides?: Partial<UIMessage>): UIMessage => ({
    id: 'msg-1',
    role: 'assistant',
    content: 'Test message content',
    createdAt: new Date(),
    ...overrides,
  });

  const createNodeData = (overrides?: Partial<FlowChatNodeData>): FlowChatNodeData => ({
    message: createMockMessage(),
    role: 'assistant',
    collapseState: 'expanded',
    isBranchPoint: false,
    isStreaming: false,
    ...overrides,
  });

  // Default props for ReactFlow node
  const defaultNodeProps = {
    type: 'assistant',
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    sourcePosition: 'bottom',
    targetPosition: 'top',
  };

  it('renders user message with correct styling', () => {
    const data = createNodeData({
      message: createMockMessage({ role: 'user', content: 'User message' }),
      role: 'user',
    });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('User message')).toBeInTheDocument();
  });

  it('renders assistant message with correct styling', () => {
    const data = createNodeData({
      message: createMockMessage({ role: 'assistant', content: 'Assistant message' }),
      role: 'assistant',
    });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.getByText('Assistant message')).toBeInTheDocument();
  });

  it('displays model badge when model is provided', () => {
    const data = createNodeData({ model: 'gpt-4o' });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('shows branch point indicator when isBranchPoint is true', () => {
    const data = createNodeData({ isBranchPoint: true });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    expect(screen.getByText('Branch Point')).toBeInTheDocument();
  });

  it('shows expand button for long content', () => {
    const longContent = 'A'.repeat(200);
    const data = createNodeData({
      message: createMockMessage({ content: longContent }),
      collapseState: 'collapsed',
    });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    expect(screen.getByText('Expand')).toBeInTheDocument();
  });

  it('applies streaming animation when isStreaming is true', () => {
    const data = createNodeData({ isStreaming: true });

    const { container } = render(
      <FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, 
      { wrapper }
    );

    const node = container.querySelector('.animate-pulse');
    expect(node).toBeInTheDocument();
  });

  it('applies selected styling when selected prop is true', () => {
    const data = createNodeData();

    const { container } = render(
      <FlowChatNode data={data} id="node-1" {...defaultNodeProps} selected={true} />,
      { wrapper }
    );

    const node = container.querySelector('.ring-2');
    expect(node).toBeInTheDocument();
  });
});
