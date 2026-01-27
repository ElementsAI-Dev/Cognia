/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlashCommandPopover } from './slash-command-popover';
import type { SlashCommandDefinition } from '@/types/chat/slash-commands';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      searchPlaceholder: 'Search commands...',
      noResults: 'No commands found.',
    };
    return translations[key] || key;
  },
}));

// Mock commands
const mockCommands: SlashCommandDefinition[] = [
  {
    id: 'clear',
    command: 'clear',
    description: 'Clear the current conversation',
    category: 'chat',
    aliases: ['cls', 'reset'],
    examples: ['/clear'],
    handler: jest.fn(),
  },
  {
    id: 'new',
    command: 'new',
    description: 'Start a new conversation',
    category: 'chat',
    aliases: ['newchat'],
    examples: ['/new'],
    handler: jest.fn(),
  },
  {
    id: 'image',
    command: 'image',
    description: 'Generate an image from a prompt',
    category: 'media',
    examples: ['/image a sunset'],
    handler: jest.fn(),
  },
  {
    id: 'web',
    command: 'web',
    description: 'Search the web',
    category: 'agent',
    aliases: ['search'],
    examples: ['/web news'],
    handler: jest.fn(),
  },
  {
    id: 'help',
    command: 'help',
    description: 'Show available commands',
    category: 'system',
    aliases: ['?'],
    examples: ['/help'],
    handler: jest.fn(),
  },
  {
    id: 'settings',
    command: 'settings',
    description: 'Open settings panel',
    category: 'navigation',
    aliases: ['config'],
    examples: ['/settings'],
    handler: jest.fn(),
  },
];

const mockGroups = [
  { category: 'chat', label: 'Chat', commands: mockCommands.filter((c) => c.category === 'chat') },
  { category: 'agent', label: 'Agent', commands: mockCommands.filter((c) => c.category === 'agent') },
  { category: 'media', label: 'Media', commands: mockCommands.filter((c) => c.category === 'media') },
  { category: 'system', label: 'System', commands: mockCommands.filter((c) => c.category === 'system') },
  {
    category: 'navigation',
    label: 'Navigation',
    commands: mockCommands.filter((c) => c.category === 'navigation'),
  },
];

jest.mock('@/lib/chat/slash-command-registry', () => ({
  searchCommands: (query: string) => {
    if (!query) return mockCommands;
    return mockCommands.filter(
      (c) =>
        c.command.includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase()) ||
        c.aliases?.some((a) => a.includes(query.toLowerCase()))
    );
  },
  getGroupedCommands: () => mockGroups,
}));

// Mock UI components
jest.mock('@/components/ui/command', () => ({
  Command: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="command" className={className}>
      {children}
    </div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading?: React.ReactNode;
  }) => (
    <div data-testid="command-group">
      {heading && <div data-testid="command-group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandInput: ({
    placeholder,
    value,
    className,
  }: {
    placeholder?: string;
    value?: string;
    className?: string;
  }) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value}
      readOnly
      className={className}
    />
  ),
  CommandItem: ({
    children,
    onSelect,
    className,
    value,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    className?: string;
    value?: string;
  }) => (
    <div
      data-testid="command-item"
      data-value={value}
      onClick={onSelect}
      className={className}
      role="option"
      aria-selected={false}
    >
      {children}
    </div>
  ),
  CommandList: Object.assign(
    React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
      function CommandList({ children, className }, ref) {
        return (
          <div ref={ref} data-testid="command-list" className={className}>
            {children}
          </div>
        );
      }
    ),
    { displayName: 'CommandList' }
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="popover" data-open={open} onClick={() => onOpenChange?.(false)}>
      {children}
    </div>
  ),
  PopoverContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="popover-content" className={className}>
      {children}
    </div>
  ),
  PopoverAnchor: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-anchor">{children}</div>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  MessageCircle: () => <span data-testid="icon-chat">ChatIcon</span>,
  Bot: () => <span data-testid="icon-agent">BotIcon</span>,
  Image: () => <span data-testid="icon-media">ImageIcon</span>,
  Settings: () => <span data-testid="icon-system">SettingsIcon</span>,
  Compass: () => <span data-testid="icon-navigation">CompassIcon</span>,
  Puzzle: () => <span data-testid="icon-custom">PuzzleIcon</span>,
}));

describe('SlashCommandPopover', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    query: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = render(<SlashCommandPopover {...defaultProps} open={false} />);
      expect(container.querySelector('[data-testid="popover"]')).not.toBeInTheDocument();
    });

    it('renders popover when open', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByTestId('popover')).toBeInTheDocument();
      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });

    it('renders search input with placeholder', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
    });

    it('renders command groups', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      const groups = screen.getAllByTestId('command-group');
      expect(groups.length).toBeGreaterThan(0);
    });

    it('renders category headings with icons', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      const headings = screen.getAllByTestId('command-group-heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('shows command items', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      const items = screen.getAllByTestId('command-item');
      expect(items.length).toBe(mockCommands.length);
    });
  });

  describe('Command display', () => {
    it('shows command name with slash prefix', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByText('/clear')).toBeInTheDocument();
      expect(screen.getByText('/new')).toBeInTheDocument();
      expect(screen.getByText('/help')).toBeInTheDocument();
    });

    it('shows command description', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByText('Clear the current conversation')).toBeInTheDocument();
      expect(screen.getByText('Start a new conversation')).toBeInTheDocument();
    });

    it('shows command aliases', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      // Clear has aliases: cls, reset
      expect(screen.getByText('(/cls, /reset)')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('filters commands based on query', () => {
      render(<SlashCommandPopover {...defaultProps} query="clear" />);
      const items = screen.getAllByTestId('command-item');
      // Should show clear command
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by alias', () => {
      render(<SlashCommandPopover {...defaultProps} query="cls" />);
      const items = screen.getAllByTestId('command-item');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('shows empty message when no results', () => {
      render(<SlashCommandPopover {...defaultProps} query="zzzznonexistent" />);
      expect(screen.getByTestId('command-empty')).toBeInTheDocument();
    });

    it('filters by description content', () => {
      render(<SlashCommandPopover {...defaultProps} query="conversation" />);
      const items = screen.getAllByTestId('command-item');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Selection', () => {
    it('calls onSelect when command is clicked', () => {
      const onSelect = jest.fn();
      render(<SlashCommandPopover {...defaultProps} onSelect={onSelect} />);

      const items = screen.getAllByTestId('command-item');
      fireEvent.click(items[0]);

      expect(onSelect).toHaveBeenCalled();
    });

    it('passes correct command to onSelect', () => {
      const onSelect = jest.fn();
      render(<SlashCommandPopover {...defaultProps} onSelect={onSelect} />);

      // Click the clear command (first in chat category)
      const clearItem = screen.getByText('/clear').closest('[data-testid="command-item"]');
      fireEvent.click(clearItem!);

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'clear', id: 'clear' })
      );
    });
  });

  describe('Close behavior', () => {
    it('calls onClose when popover closes', () => {
      const onClose = jest.fn();
      render(<SlashCommandPopover {...defaultProps} onClose={onClose} />);

      const popover = screen.getByTestId('popover');
      fireEvent.click(popover);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Category icons', () => {
    it('renders chat category icon', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByTestId('icon-chat')).toBeInTheDocument();
    });

    it('renders agent category icon', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByTestId('icon-agent')).toBeInTheDocument();
    });

    it('renders media category icon', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByTestId('icon-media')).toBeInTheDocument();
    });

    it('renders system category icon', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByTestId('icon-system')).toBeInTheDocument();
    });

    it('renders navigation category icon', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByTestId('icon-navigation')).toBeInTheDocument();
    });
  });

  describe('Anchor and positioning', () => {
    it('renders popover anchor', () => {
      render(<SlashCommandPopover {...defaultProps} />);
      expect(screen.getByTestId('popover-anchor')).toBeInTheDocument();
    });

    it('accepts anchorRect prop', () => {
      const anchorRect = new DOMRect(100, 200, 50, 20);
      render(<SlashCommandPopover {...defaultProps} anchorRect={anchorRect} />);
      expect(screen.getByTestId('popover')).toBeInTheDocument();
    });

    it('accepts containerRef prop', () => {
      const containerRef = { current: document.createElement('div') };
      render(<SlashCommandPopover {...defaultProps} containerRef={containerRef} />);
      expect(screen.getByTestId('popover')).toBeInTheDocument();
    });
  });

  describe('Command structure', () => {
    it('displays commands in correct categories', () => {
      render(<SlashCommandPopover {...defaultProps} />);

      // Check that groups are rendered
      const groups = screen.getAllByTestId('command-group');
      expect(groups.length).toBe(5); // chat, agent, media, system, navigation
    });

    it('handles empty command groups gracefully', () => {
      // Mock with empty category
      const emptyQuery = 'media'; // Only matches media category
      render(<SlashCommandPopover {...defaultProps} query={emptyQuery} />);

      // Should still render without errors
      expect(screen.getByTestId('command')).toBeInTheDocument();
    });
  });
});
