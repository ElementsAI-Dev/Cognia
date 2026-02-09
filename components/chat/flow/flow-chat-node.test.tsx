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

// Mock MarkdownRenderer
jest.mock('@/components/chat/utils/markdown-renderer', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="markdown-renderer" className={`markdown-renderer ${className || ''}`}>
      {content}
    </div>
  ),
}));

// Mock FlowNodeTags
jest.mock('./flow-node-tags', () => ({
  FlowNodeTags: ({ tags }: { tags: Array<{ id: string; label: string; color: string }> }) => (
    <div data-testid="flow-node-tags">
      {tags?.map((tag: { id: string; label: string }) => (
        <span key={tag.id}>{tag.label}</span>
      ))}
    </div>
  ),
}));

// Mock FlowNodeThumbnailStrip
jest.mock('./flow-node-thumbnail-strip', () => ({
  FlowNodeThumbnailStrip: () => <div data-testid="flow-node-thumbnail-strip" />,
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
    addBookmark: 'Add Bookmark',
    removeBookmark: 'Remove Bookmark',
    bookmarked: 'Bookmarked',
    addToCompare: 'Add to Compare',
    rateResponse: 'Rate Response',
    addNote: 'Add Note',
    cancel: 'Cancel',
    done: 'Done',
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

  it('applies highlight styling when isHighlighted is true', () => {
    const data = createNodeData({ isHighlighted: true });

    const { container } = render(
      <FlowChatNode data={data} id="node-1" {...defaultNodeProps} />,
      { wrapper }
    );

    const node = container.querySelector('.ring-yellow-400');
    expect(node).toBeInTheDocument();
  });

  it('does not apply highlight styling when isHighlighted is false', () => {
    const data = createNodeData({ isHighlighted: false });

    const { container } = render(
      <FlowChatNode data={data} id="node-1" {...defaultNodeProps} />,
      { wrapper }
    );

    const node = container.querySelector('.ring-yellow-400');
    expect(node).not.toBeInTheDocument();
  });

  it('displays bookmark indicator when isBookmarked is true', () => {
    const data = createNodeData({ isBookmarked: true });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    // BookmarkCheck icon should be present (checked bookmark)
    const bookmarkIcon = document.querySelector('.lucide-bookmark-check');
    expect(bookmarkIcon).toBeInTheDocument();
  });

  it('displays rating stars when rating is provided', () => {
    const data = createNodeData({ rating: 3 });

    const { container } = render(
      <FlowChatNode data={data} id="node-1" {...defaultNodeProps} />,
      { wrapper }
    );

    // Should have 3 filled star icons in the header
    const starIcons = container.querySelectorAll('.lucide-star.fill-yellow-500');
    expect(starIcons.length).toBe(3);
  });

  it('displays notes section when notes are provided and expanded', () => {
    const data = createNodeData({
      notes: 'This is a test note',
      collapseState: 'expanded',
    });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    expect(screen.getByText('This is a test note')).toBeInTheDocument();
    expect(screen.getByText('Note')).toBeInTheDocument();
  });

  it('does not display notes section when collapsed', () => {
    const data = createNodeData({
      notes: 'This is a test note',
      collapseState: 'collapsed',
    });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    expect(screen.queryByText('This is a test note')).not.toBeInTheDocument();
  });

  it('renders markdown content for expanded assistant messages', () => {
    const data = createNodeData({
      message: createMockMessage({
        role: 'assistant',
        content: '**Bold text** and `inline code`',
      }),
      role: 'assistant',
      collapseState: 'expanded',
    });

    const { container } = render(
      <FlowChatNode data={data} id="node-1" {...defaultNodeProps} />,
      { wrapper }
    );

    // MarkdownRenderer should be rendered for expanded assistant
    const markdownContainer = container.querySelector('.markdown-renderer');
    expect(markdownContainer).toBeInTheDocument();
  });

  it('renders plain text for user messages even when expanded', () => {
    const data = createNodeData({
      message: createMockMessage({
        role: 'user',
        content: '**Not rendered as markdown**',
      }),
      role: 'user',
      collapseState: 'expanded',
    });

    const { container } = render(
      <FlowChatNode data={data} id="node-1" {...defaultNodeProps} />,
      { wrapper }
    );

    // MarkdownRenderer should NOT be rendered for user messages
    const markdownContainer = container.querySelector('.markdown-renderer');
    expect(markdownContainer).not.toBeInTheDocument();
    expect(screen.getByText('**Not rendered as markdown**')).toBeInTheDocument();
  });

  it('renders plain text for collapsed assistant messages', () => {
    const data = createNodeData({
      message: createMockMessage({
        role: 'assistant',
        content: '**Bold text** should be plain when collapsed',
      }),
      role: 'assistant',
      collapseState: 'collapsed',
    });

    const { container } = render(
      <FlowChatNode data={data} id="node-1" {...defaultNodeProps} />,
      { wrapper }
    );

    const markdownContainer = container.querySelector('.markdown-renderer');
    expect(markdownContainer).not.toBeInTheDocument();
  });

  it('displays tags when provided', () => {
    const data = createNodeData({
      tags: [
        { id: 'tag-1', label: 'Important', color: '#ff0000' },
        { id: 'tag-2', label: 'Question', color: '#00ff00' },
      ],
    });

    render(<FlowChatNode data={data} id="node-1" {...defaultNodeProps} />, { wrapper });

    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Question')).toBeInTheDocument();
  });
});
