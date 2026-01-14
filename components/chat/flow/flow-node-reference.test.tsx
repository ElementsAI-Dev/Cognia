/**
 * FlowNodeReference - Unit tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { FlowNodeReference, formatReferencesForPrompt, createReferenceEdge } from './flow-node-reference';
import { NextIntlClientProvider } from 'next-intl';
import type { UIMessage } from '@/types';

// Mock translations
const messages = {
  flowChat: {
    reference: 'Reference',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {children}
  </NextIntlClientProvider>
);

describe('FlowNodeReference', () => {
  const mockMessages: UIMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, this is a test message from the user.',
      createdAt: new Date(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'This is an assistant response with helpful information.',
      createdAt: new Date(),
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'Another user message for testing purposes.',
      createdAt: new Date(),
    },
  ];

  it('renders reference button', () => {
    render(
      <FlowNodeReference
        messages={mockMessages}
        selectedReferences={[]}
        onReferencesChange={jest.fn()}
      />,
      { wrapper }
    );

    expect(screen.getByText('Reference')).toBeInTheDocument();
  });

  it('opens popover when button is clicked', () => {
    render(
      <FlowNodeReference
        messages={mockMessages}
        selectedReferences={[]}
        onReferencesChange={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('Reference'));

    expect(screen.getByPlaceholderText('Search messages...')).toBeInTheDocument();
  });

  it('displays messages in popover', () => {
    render(
      <FlowNodeReference
        messages={mockMessages}
        selectedReferences={[]}
        onReferencesChange={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('Reference'));

    expect(screen.getByText(/Hello, this is a test message/)).toBeInTheDocument();
    expect(screen.getByText(/This is an assistant response/)).toBeInTheDocument();
  });

  it('filters messages by search query', () => {
    render(
      <FlowNodeReference
        messages={mockMessages}
        selectedReferences={[]}
        onReferencesChange={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('Reference'));
    
    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.change(searchInput, { target: { value: 'assistant' } });

    expect(screen.getByText(/This is an assistant response/)).toBeInTheDocument();
    expect(screen.queryByText(/Hello, this is a test message/)).not.toBeInTheDocument();
  });

  it('adds reference when message is clicked', () => {
    const onReferencesChange = jest.fn();
    
    render(
      <FlowNodeReference
        messages={mockMessages}
        selectedReferences={[]}
        onReferencesChange={onReferencesChange}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('Reference'));
    
    // Click on first message
    const messageButtons = screen.getAllByRole('button');
    const userMessageButton = messageButtons.find(btn => 
      btn.textContent?.includes('Hello, this is a test message')
    );
    
    if (userMessageButton) {
      fireEvent.click(userMessageButton);
    }

    expect(onReferencesChange).toHaveBeenCalled();
    const call = onReferencesChange.mock.calls[0][0];
    expect(call).toHaveLength(1);
    expect(call[0].messageId).toBe('msg-1');
    expect(call[0].role).toBe('user');
  });

  it('displays selected references as badges', () => {
    const selectedReferences = [
      {
        id: 'ref-1',
        messageId: 'msg-1',
        content: 'Hello, this is a test message',
        role: 'user' as const,
        label: 'user message',
      },
    ];

    render(
      <FlowNodeReference
        messages={mockMessages}
        selectedReferences={selectedReferences}
        onReferencesChange={jest.fn()}
      />,
      { wrapper }
    );

    expect(screen.getByText('user message')).toBeInTheDocument();
  });

  it('removes reference when X button is clicked', () => {
    const onReferencesChange = jest.fn();
    const selectedReferences = [
      {
        id: 'ref-1',
        messageId: 'msg-1',
        content: 'Hello, this is a test message',
        role: 'user' as const,
        label: 'user message',
      },
    ];

    render(
      <FlowNodeReference
        messages={mockMessages}
        selectedReferences={selectedReferences}
        onReferencesChange={onReferencesChange}
      />,
      { wrapper }
    );

    // Find and click the remove button (X)
    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find(btn => btn.querySelector('svg'));
    
    if (removeButton) {
      fireEvent.click(removeButton);
    }

    expect(onReferencesChange).toHaveBeenCalledWith([]);
  });

  it('shows reference count badge when references exist', () => {
    const selectedReferences = [
      { id: 'ref-1', messageId: 'msg-1', content: 'Test', role: 'user' as const },
      { id: 'ref-2', messageId: 'msg-2', content: 'Test 2', role: 'assistant' as const },
    ];

    render(
      <FlowNodeReference
        messages={mockMessages}
        selectedReferences={selectedReferences}
        onReferencesChange={jest.fn()}
      />,
      { wrapper }
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows empty state when no messages available', () => {
    render(
      <FlowNodeReference
        messages={[]}
        selectedReferences={[]}
        onReferencesChange={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('Reference'));

    expect(screen.getByText('No messages to reference')).toBeInTheDocument();
  });
});

describe('formatReferencesForPrompt', () => {
  it('returns empty string when no references', () => {
    expect(formatReferencesForPrompt([])).toBe('');
  });

  it('formats single reference correctly', () => {
    const references = [
      { id: 'ref-1', messageId: 'msg-1', content: 'Test content', role: 'user' as const },
    ];

    const result = formatReferencesForPrompt(references);

    expect(result).toContain('--- Referenced Content ---');
    expect(result).toContain('[Reference 1 - user]:');
    expect(result).toContain('Test content');
    expect(result).toContain('--- End References ---');
  });

  it('formats multiple references correctly', () => {
    const references = [
      { id: 'ref-1', messageId: 'msg-1', content: 'User content', role: 'user' as const },
      { id: 'ref-2', messageId: 'msg-2', content: 'Assistant content', role: 'assistant' as const },
    ];

    const result = formatReferencesForPrompt(references);

    expect(result).toContain('[Reference 1 - user]:');
    expect(result).toContain('User content');
    expect(result).toContain('[Reference 2 - assistant]:');
    expect(result).toContain('Assistant content');
  });
});

describe('createReferenceEdge', () => {
  it('creates reference edge with correct structure', () => {
    const edge = createReferenceEdge('node-1', 'node-2');

    expect(edge.id).toBe('ref-edge-node-1-node-2');
    expect(edge.source).toBe('node-1');
    expect(edge.target).toBe('node-2');
    expect(edge.type).toBe('reference');
    expect(edge.animated).toBe(true);
    expect(edge.data.edgeType).toBe('reference');
  });

  it('includes custom label when provided', () => {
    const edge = createReferenceEdge('node-1', 'node-2', 'custom label');

    expect(edge.data.label).toBe('custom label');
  });

  it('uses default label when not provided', () => {
    const edge = createReferenceEdge('node-1', 'node-2');

    expect(edge.data.label).toBe('references');
  });
});
