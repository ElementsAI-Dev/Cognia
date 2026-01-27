/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiPopover } from './emoji-popover';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      searchPlaceholder: 'Search emoji...',
      noResults: 'No emoji found.',
      frequent: 'Frequently Used',
      searchResults: 'Search Results',
    };
    return translations[key] || key;
  },
}));

// Mock emoji data - defined inline in mock to avoid hoisting issues
jest.mock('@/lib/chat/emoji-data', () => {
  const emojiData = [
    { emoji: '😀', name: 'grinning', keywords: ['smile', 'happy'], category: 'smileys' },
    { emoji: '😂', name: 'joy', keywords: ['laugh', 'tears', 'funny'], category: 'smileys' },
    { emoji: '👍', name: 'thumbsup', keywords: ['yes', 'ok', 'good'], category: 'people' },
    { emoji: '❤️', name: 'heart', keywords: ['love', 'like'], category: 'people' },
    { emoji: '🔥', name: 'fire', keywords: ['hot', 'lit'], category: 'people' },
  ];

  const frequentEmojis = [
    { emoji: '👍', name: 'thumbsup', keywords: ['yes', 'ok'], category: 'people' },
    { emoji: '❤️', name: 'heart', keywords: ['love'], category: 'people' },
  ];

  return {
    searchEmojis: (query: string, limit: number) => {
      if (!query) return emojiData.slice(0, limit);
      return emojiData.filter(
        (e: { name: string; keywords: string[] }) =>
          e.name.includes(query.toLowerCase()) ||
          e.keywords.some((k) => k.includes(query.toLowerCase()))
      );
    },
    FREQUENT_EMOJIS: frequentEmojis,
    EMOJI_CATEGORY_LABELS: {
      smileys: 'Smileys & Emotion',
      people: 'People & Body',
      animals: 'Animals & Nature',
      food: 'Food & Drink',
      activities: 'Activities',
      travel: 'Travel & Places',
      objects: 'Objects',
      symbols: 'Symbols',
      flags: 'Flags',
    },
  };
});

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
    title,
    value,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    className?: string;
    title?: string;
    value?: string;
  }) => (
    <div
      data-testid="command-item"
      data-value={value}
      onClick={onSelect}
      className={className}
      title={title}
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
    onKeyDown,
    className,
  }: {
    children: React.ReactNode;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    className?: string;
  }) => (
    <div data-testid="popover-content" onKeyDown={onKeyDown} className={className}>
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

describe('EmojiPopover', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
    query: '',
    selectedIndex: 0,
    onSelectedIndexChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = render(<EmojiPopover {...defaultProps} open={false} />);
      expect(container.querySelector('[data-testid="popover"]')).not.toBeInTheDocument();
    });

    it('renders popover when open', () => {
      render(<EmojiPopover {...defaultProps} />);
      expect(screen.getByTestId('popover')).toBeInTheDocument();
      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });

    it('renders search input with placeholder', () => {
      render(<EmojiPopover {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search emoji...')).toBeInTheDocument();
    });

    it('renders command groups with emojis', () => {
      render(<EmojiPopover {...defaultProps} />);
      expect(screen.getAllByTestId('command-group').length).toBeGreaterThan(0);
    });

    it('shows emoji items', () => {
      render(<EmojiPopover {...defaultProps} />);
      const items = screen.getAllByTestId('command-item');
      expect(items.length).toBeGreaterThan(0);
    });

    it('displays frequent emojis section when no query', () => {
      render(<EmojiPopover {...defaultProps} query="" />);
      const headings = screen.getAllByTestId('command-group-heading');
      const frequentHeading = headings.find((h) => h.textContent === 'Frequently Used');
      expect(frequentHeading).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('filters emojis based on query', () => {
      render(<EmojiPopover {...defaultProps} query="smile" />);
      const items = screen.getAllByTestId('command-item');
      expect(items.length).toBeGreaterThan(0);
    });

    it('shows search results heading when query is provided', () => {
      render(<EmojiPopover {...defaultProps} query="smile" />);
      const headings = screen.getAllByTestId('command-group-heading');
      const searchHeading = headings.find((h) => h.textContent === 'Search Results');
      expect(searchHeading).toBeInTheDocument();
    });

    it('displays empty message when no results', () => {
      render(<EmojiPopover {...defaultProps} query="zzzznonexistent" />);
      expect(screen.getByTestId('command-empty')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelect when emoji is clicked', () => {
      const onSelect = jest.fn();
      render(<EmojiPopover {...defaultProps} onSelect={onSelect} />);

      const items = screen.getAllByTestId('command-item');
      fireEvent.click(items[0]);

      expect(onSelect).toHaveBeenCalled();
    });

    it('shows selected state for current index', () => {
      render(<EmojiPopover {...defaultProps} selectedIndex={0} />);
      // The selected item should have ring-2 ring-primary in className
      const items = screen.getAllByTestId('command-item');
      expect(items[0].className).toContain('ring');
    });
  });

  describe('Keyboard navigation', () => {
    it('handles ArrowDown key', () => {
      const onSelectedIndexChange = jest.fn();
      render(
        <EmojiPopover
          {...defaultProps}
          selectedIndex={0}
          onSelectedIndexChange={onSelectedIndexChange}
        />
      );

      const popoverContent = screen.getByTestId('popover-content');
      fireEvent.keyDown(popoverContent, { key: 'ArrowDown' });

      expect(onSelectedIndexChange).toHaveBeenCalledWith(1);
    });

    it('handles ArrowUp key', () => {
      const onSelectedIndexChange = jest.fn();
      render(
        <EmojiPopover
          {...defaultProps}
          selectedIndex={1}
          onSelectedIndexChange={onSelectedIndexChange}
        />
      );

      const popoverContent = screen.getByTestId('popover-content');
      fireEvent.keyDown(popoverContent, { key: 'ArrowUp' });

      expect(onSelectedIndexChange).toHaveBeenCalledWith(0);
    });

    it('wraps to end on ArrowUp from first item', () => {
      const onSelectedIndexChange = jest.fn();
      render(
        <EmojiPopover
          {...defaultProps}
          selectedIndex={0}
          onSelectedIndexChange={onSelectedIndexChange}
        />
      );

      const popoverContent = screen.getByTestId('popover-content');
      fireEvent.keyDown(popoverContent, { key: 'ArrowUp' });

      // Should wrap to last item
      expect(onSelectedIndexChange).toHaveBeenCalled();
    });

    it('handles Enter key to select', () => {
      const onSelect = jest.fn();
      render(<EmojiPopover {...defaultProps} selectedIndex={0} onSelect={onSelect} />);

      const popoverContent = screen.getByTestId('popover-content');
      fireEvent.keyDown(popoverContent, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalled();
    });

    it('handles Tab key to select', () => {
      const onSelect = jest.fn();
      render(<EmojiPopover {...defaultProps} selectedIndex={0} onSelect={onSelect} />);

      const popoverContent = screen.getByTestId('popover-content');
      fireEvent.keyDown(popoverContent, { key: 'Tab' });

      expect(onSelect).toHaveBeenCalled();
    });

    it('handles Escape key to close', () => {
      const onClose = jest.fn();
      render(<EmojiPopover {...defaultProps} onClose={onClose} />);

      const popoverContent = screen.getByTestId('popover-content');
      fireEvent.keyDown(popoverContent, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Close behavior', () => {
    it('calls onClose when popover closes', () => {
      const onClose = jest.fn();
      render(<EmojiPopover {...defaultProps} onClose={onClose} />);

      const popover = screen.getByTestId('popover');
      fireEvent.click(popover);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Emoji display', () => {
    it('shows emoji character in items', () => {
      render(<EmojiPopover {...defaultProps} />);
      const items = screen.getAllByTestId('command-item');
      // Items should contain emoji characters
      expect(items[0].textContent).toBeTruthy();
    });

    it('has title attribute with emoji shortcode', () => {
      render(<EmojiPopover {...defaultProps} />);
      const items = screen.getAllByTestId('command-item');
      // Some items should have title attributes starting with :
      const hasTitle = items.some((item) => item.getAttribute('title')?.startsWith(':'));
      expect(hasTitle).toBe(true);
    });
  });
});
