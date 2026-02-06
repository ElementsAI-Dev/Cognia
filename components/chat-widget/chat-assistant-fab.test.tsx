import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatAssistantFab } from './chat-assistant-fab';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      openAssistant: 'Open chat assistant',
      closeAssistant: 'Close chat assistant',
      title: 'AI 助手',
      clickToStart: '点击开始对话',
      shortcutHint: '快捷键: Ctrl+Shift+Space',
    };
    return translations[key] || key;
  },
}));

// Mock framer-motion
jest.mock('motion/react', () => ({
  motion: {
    button: ({ children, ...props }: React.ComponentProps<'button'>) => (
      <button {...props}>{children}</button>
    ),
    span: ({ children, ...props }: React.ComponentProps<'span'>) => (
      <span {...props}>{children}</span>
    ),
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ChatAssistantFab', () => {
  const defaultProps = {
    isOpen: false,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders button element', () => {
      render(<ChatAssistantFab {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with correct default position classes', () => {
      render(<ChatAssistantFab {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bottom-6', 'right-6');
    });

    it('renders with custom position', () => {
      render(<ChatAssistantFab {...defaultProps} position="top-left" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('top-6', 'left-6');
    });

    it('renders with custom offset', () => {
      render(<ChatAssistantFab {...defaultProps} offset={{ x: 10, y: 20 }} />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ transform: 'translate(10px, 20px)' });
    });

    it('renders with custom className', () => {
      render(<ChatAssistantFab {...defaultProps} className="custom-class" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Icons', () => {
    it('renders MessageCircle icon when closed', () => {
      render(<ChatAssistantFab {...defaultProps} isOpen={false} />);
      const button = screen.getByRole('button');
      // Check for lucide-message-circle class instead
      expect(button.innerHTML).toContain('lucide-message-circle');
    });

    it('renders X icon when open', () => {
      render(<ChatAssistantFab {...defaultProps} isOpen={true} />);
      const button = screen.getByRole('button');
      // Check for lucide-x class instead
      expect(button.innerHTML).toContain('lucide-x');
    });

    it('renders Sparkles icon when closed', () => {
      render(<ChatAssistantFab {...defaultProps} isOpen={false} />);
      const button = screen.getByRole('button');
      // Check for lucide-sparkles class instead
      expect(button.innerHTML).toContain('lucide-sparkles');
    });
  });

  describe('Interactions', () => {
    it('calls onClick when button is clicked', () => {
      const handleClick = jest.fn();
      render(<ChatAssistantFab {...defaultProps} onClick={handleClick} />);
      const button = screen.getByRole('button');
      button.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onMouseDown when mouse is pressed', () => {
      const handleMouseDown = jest.fn();
      render(<ChatAssistantFab {...defaultProps} onMouseDown={handleMouseDown} />);
      const button = screen.getByRole('button');
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(handleMouseDown).toHaveBeenCalledTimes(1);
    });

    it('calls onTouchStart when touch is started', () => {
      const handleTouchStart = jest.fn();
      render(<ChatAssistantFab {...defaultProps} onTouchStart={handleTouchStart} />);
      const button = screen.getByRole('button');
      button.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
      expect(handleTouchStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct aria-label when closed', () => {
      render(<ChatAssistantFab {...defaultProps} isOpen={false} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Open chat assistant');
    });

    it('has correct aria-label when open', () => {
      render(<ChatAssistantFab {...defaultProps} isOpen={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Close chat assistant');
    });

    it('has correct aria-expanded attribute', () => {
      render(<ChatAssistantFab {...defaultProps} isOpen={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Unread Badge', () => {
    it('does not render unread badge when count is 0', () => {
      render(<ChatAssistantFab {...defaultProps} unreadCount={0} />);
      const button = screen.getByRole('button');
      expect(button.textContent).not.toContain('0');
    });

    it('renders unread badge when count is greater than 0', () => {
      render(<ChatAssistantFab {...defaultProps} unreadCount={5} isOpen={false} />);
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('5');
    });

    it('renders 99+ when count is greater than 99', () => {
      render(<ChatAssistantFab {...defaultProps} unreadCount={150} isOpen={false} />);
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('99+');
    });

    it('does not render unread badge when open', () => {
      render(<ChatAssistantFab {...defaultProps} unreadCount={5} isOpen={true} />);
      const button = screen.getByRole('button');
      expect(button.textContent).not.toContain('5');
    });
  });

  describe('Loading State', () => {
    it('renders loading indicator when loading and closed', () => {
      render(<ChatAssistantFab {...defaultProps} isLoading={true} isOpen={false} />);
      const button = screen.getByRole('button');
      expect(button.innerHTML).toContain('border-2');
    });

    it('does not render loading indicator when not loading', () => {
      render(<ChatAssistantFab {...defaultProps} isLoading={false} isOpen={false} />);
      const button = screen.getByRole('button');
      expect(button.innerHTML).not.toContain('border-2');
    });

    it('does not render loading indicator when open', () => {
      render(<ChatAssistantFab {...defaultProps} isLoading={true} isOpen={true} />);
      const button = screen.getByRole('button');
      expect(button.innerHTML).not.toContain('border-2');
    });
  });

  describe('Tooltip', () => {
    it('renders tooltip when showTooltip is true and closed', () => {
      render(<ChatAssistantFab {...defaultProps} showTooltip={true} isOpen={false} />);
      expect(screen.getByText('AI 助手')).toBeInTheDocument();
      expect(screen.getByText('点击开始对话')).toBeInTheDocument();
    });

    it('does not render tooltip when showTooltip is false', () => {
      render(<ChatAssistantFab {...defaultProps} showTooltip={false} isOpen={false} />);
      expect(screen.queryByText('AI 助手')).not.toBeInTheDocument();
    });

    it('does not render tooltip when open', () => {
      render(<ChatAssistantFab {...defaultProps} showTooltip={true} isOpen={true} />);
      expect(screen.queryByText('AI 助手')).not.toBeInTheDocument();
    });
  });

  describe('Position Variants', () => {
    it('applies bottom-right position classes', () => {
      render(<ChatAssistantFab {...defaultProps} position="bottom-right" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bottom-6', 'right-6');
    });

    it('applies bottom-left position classes', () => {
      render(<ChatAssistantFab {...defaultProps} position="bottom-left" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bottom-6', 'left-6');
    });

    it('applies top-right position classes', () => {
      render(<ChatAssistantFab {...defaultProps} position="top-right" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('top-6', 'right-6');
    });

    it('applies top-left position classes', () => {
      render(<ChatAssistantFab {...defaultProps} position="top-left" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('top-6', 'left-6');
    });
  });

  describe('Styling', () => {
    it('has correct base classes', () => {
      render(<ChatAssistantFab {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'fixed',
        'z-[9999]',
        'flex',
        'items-center',
        'justify-center',
        'h-14',
        'w-14',
        'rounded-full',
        'bg-primary',
        'text-primary-foreground'
      );
    });

    it('has focus-visible styles', () => {
      render(<ChatAssistantFab {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'focus:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-primary',
        'focus-visible:ring-offset-2'
      );
    });
  });
});
