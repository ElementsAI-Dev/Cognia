/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MentionPopover, MentionBadge, MentionChip } from './mention-popover';
import type { MentionItem } from '@/types/mcp';

// Mock UI components - inline to avoid hoisting issues
jest.mock('@/components/ui/command', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Command: ({ children }: { children: React.ReactNode }) => <div data-testid="command">{children}</div>,
    CommandEmpty: ({ children }: { children: React.ReactNode }) => <div data-testid="command-empty">{children}</div>,
    CommandGroup: ({ children, heading }: { children: React.ReactNode; heading?: string }) => (
      <div data-testid="command-group">
        {heading && <div data-testid="group-heading">{heading}</div>}
        {children}
      </div>
    ),
    CommandItem: ({ children, onSelect, value }: { children: React.ReactNode; onSelect?: () => void; value?: string }) => (
      <button data-testid="command-item" data-value={value} onClick={onSelect}>{children}</button>
    ),
    CommandList: React.forwardRef(function MockCommandList({ children }: { children: React.ReactNode }, ref: React.Ref<HTMLDivElement>) {
      return <div ref={ref} data-testid="command-list">{children}</div>;
    }),
  };
});

describe('MentionPopover', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  const createToolMentionItem = (
    id: string,
    label: string,
    serverName: string,
    serverId: string
  ): MentionItem => ({
    id,
    type: 'tool',
    label,
    serverName,
    serverId,
    description: `Description for ${label}`,
    tool: { name: label, description: `Description for ${label}`, inputSchema: {} },
  });

  const createResourceMentionItem = (
    id: string,
    label: string,
    serverName: string,
    serverId: string
  ): MentionItem => ({
    id,
    type: 'resource',
    label,
    serverName,
    serverId,
    description: `Description for ${label}`,
    resource: { uri: `file:///${label}`, name: label },
  });

  const mockGroupedMentions = new Map<string, MentionItem[]>([
    ['Server A', [
      createToolMentionItem('tool-1', 'read-file', 'Server A', 'server-a'),
      createToolMentionItem('tool-2', 'write-file', 'Server A', 'server-a'),
    ]],
    ['Server B', [
      createResourceMentionItem('resource-1', 'config.json', 'Server B', 'server-b'),
    ]],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <MentionPopover
        open={false}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no items', () => {
    const { container } = render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={new Map()}
        query=""
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when open with items', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    expect(screen.getByTestId('command')).toBeInTheDocument();
  });

  it('displays grouped items by server', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    
    expect(screen.getByText('Server A')).toBeInTheDocument();
    expect(screen.getByText('Server B')).toBeInTheDocument();
  });

  it('displays item labels', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    
    expect(screen.getByText('read-file')).toBeInTheDocument();
    expect(screen.getByText('write-file')).toBeInTheDocument();
    expect(screen.getByText('config.json')).toBeInTheDocument();
  });

  it('calls onSelect when item is clicked', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    
    const items = screen.getAllByTestId('command-item');
    fireEvent.click(items[0]);
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('displays search query text', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query="read"
      />
    );
    
    expect(screen.getByText('Searching: read')).toBeInTheDocument();
  });

  it('shows default text when no query', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    
    expect(screen.getByText('Select a tool or resource')).toBeInTheDocument();
  });

  it('displays keyboard shortcuts', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('displays item descriptions', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    
    expect(screen.getByText('Description for read-file')).toBeInTheDocument();
  });

  it('displays item type labels', () => {
    render(
      <MentionPopover
        open={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        groupedMentions={mockGroupedMentions}
        query=""
      />
    );
    
    expect(screen.getAllByText('Tool').length).toBe(2);
    expect(screen.getByText('Resource')).toBeInTheDocument();
  });
});

describe('MentionBadge', () => {
  const mockItem: MentionItem = {
    id: 'tool-1',
    type: 'tool',
    label: 'read-file',
    serverName: 'filesystem',
    serverId: 'filesystem',
    description: 'Read a file',
    tool: { name: 'read-file', description: 'Read a file', inputSchema: {} },
  };

  it('renders without crashing', () => {
    render(<MentionBadge item={mockItem} />);
    expect(screen.getByText('filesystem:read-file')).toBeInTheDocument();
  });

  it('displays server name and label', () => {
    render(<MentionBadge item={mockItem} />);
    expect(screen.getByText('filesystem:read-file')).toBeInTheDocument();
  });

  it('shows remove button when onRemove is provided', () => {
    const onRemove = jest.fn();
    render(<MentionBadge item={mockItem} onRemove={onRemove} />);
    
    const removeButton = screen.getByRole('button', { name: 'Remove mention' });
    expect(removeButton).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = jest.fn();
    render(<MentionBadge item={mockItem} onRemove={onRemove} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Remove mention' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('does not show remove button when onRemove is not provided', () => {
    render(<MentionBadge item={mockItem} />);
    expect(screen.queryByRole('button', { name: 'Remove mention' })).not.toBeInTheDocument();
  });
});

describe('MentionChip', () => {
  it('renders without crashing', () => {
    render(<MentionChip serverId="server" name="tool-name" type="tool" />);
    expect(screen.getByText('@server:tool-name')).toBeInTheDocument();
  });

  it('displays server and name', () => {
    render(<MentionChip serverId="my-server" name="my-tool" type="tool" />);
    expect(screen.getByText('@my-server:my-tool')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<MentionChip serverId="s" name="t" type="tool" onClick={onClick} />);
    
    fireEvent.click(screen.getByText('@s:t'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders different types correctly', () => {
    const { rerender } = render(
      <MentionChip serverId="s" name="t" type="tool" />
    );
    expect(screen.getByText('@s:t')).toBeInTheDocument();
    
    rerender(<MentionChip serverId="s" name="r" type="resource" />);
    expect(screen.getByText('@s:r')).toBeInTheDocument();
    
    rerender(<MentionChip serverId="s" name="p" type="prompt" />);
    expect(screen.getByText('@s:p')).toBeInTheDocument();
  });
});
