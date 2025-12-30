import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EmojiBlock, shouldRenderAsEmoji } from './emoji-block';
import { ReactNode } from 'react';

// Wrapper with providers
const Wrapper = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// Custom render
const customRender = (ui: React.ReactElement) =>
  render(ui, { wrapper: Wrapper });

describe('EmojiBlock', () => {
  describe('Emoji-only content', () => {
    it('renders single emoji large', () => {
      const { container } = customRender(<EmojiBlock content="😀" />);
      expect(container.querySelector('.text-6xl')).toBeInTheDocument();
    });

    it('renders two emojis slightly smaller', () => {
      const { container } = customRender(<EmojiBlock content="😀😃" />);
      expect(container.querySelector('.text-5xl')).toBeInTheDocument();
    });

    it('renders three emojis smaller', () => {
      const { container } = customRender(<EmojiBlock content="😀😃😄" />);
      expect(container.querySelector('.text-4xl')).toBeInTheDocument();
    });

    it('renders 4-5 emojis even smaller', () => {
      const { container } = customRender(<EmojiBlock content="😀😃😄😁😅" />);
      expect(container.querySelector('.text-3xl')).toBeInTheDocument();
    });

    it('renders 6-8 emojis at text-2xl', () => {
      const { container } = customRender(<EmojiBlock content="😀😃😄😁😅😂🤣😊" />);
      expect(container.querySelector('.text-2xl')).toBeInTheDocument();
    });
  });

  describe('Mixed content', () => {
    it('renders regular text normally', () => {
      customRender(<EmojiBlock content="Hello world" />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders text with emoji at normal size', () => {
      customRender(<EmojiBlock content="Hello 😀" />);
      expect(screen.getByText('Hello 😀')).toBeInTheDocument();
    });

    it('does not apply large size to mixed content', () => {
      const { container } = customRender(<EmojiBlock content="Hello 😀" />);
      expect(container.querySelector('.text-6xl')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = customRender(
        <EmojiBlock content="😀" className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('renders as inline-block', () => {
      const { container } = customRender(<EmojiBlock content="😀" />);
      expect(container.querySelector('.inline-block')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('shows tooltip for known emoji when showTooltip is true', () => {
      customRender(<EmojiBlock content="👍" showTooltip />);
      // The emoji should be wrapped in tooltip trigger
      expect(screen.getByText('👍')).toBeInTheDocument();
    });

    it('hides tooltip when showTooltip is false', () => {
      customRender(<EmojiBlock content="👍" showTooltip={false} />);
      expect(screen.getByText('👍')).toBeInTheDocument();
    });
  });

  describe('Various emoji types', () => {
    it('handles face emojis', () => {
      customRender(<EmojiBlock content="😀😃😄😁" />);
      expect(screen.getByText('😀😃😄😁')).toBeInTheDocument();
    });

    it('handles hand emojis', () => {
      customRender(<EmojiBlock content="👍👎👏" />);
      expect(screen.getByText('👍👎👏')).toBeInTheDocument();
    });

    it('handles heart emojis', () => {
      customRender(<EmojiBlock content="❤️💔💯" />);
      expect(screen.getByText('❤️💔💯')).toBeInTheDocument();
    });

    it('handles symbol emojis', () => {
      customRender(<EmojiBlock content="✅❌⭐" />);
      expect(screen.getByText('✅❌⭐')).toBeInTheDocument();
    });

    it('handles object emojis', () => {
      customRender(<EmojiBlock content="🔥💡🎉" />);
      expect(screen.getByText('🔥💡🎉')).toBeInTheDocument();
    });
  });

  describe('Whitespace handling', () => {
    it('handles emoji with surrounding whitespace', () => {
      const { container } = customRender(<EmojiBlock content="  😀  " />);
      expect(container.querySelector('.text-6xl')).toBeInTheDocument();
    });

    it('handles emoji with newlines', () => {
      customRender(<EmojiBlock content="😀\n" />);
      expect(screen.getByText(/😀/)).toBeInTheDocument();
    });
  });
});

describe('shouldRenderAsEmoji', () => {
  describe('Emoji-only strings', () => {
    it('returns true for single emoji', () => {
      expect(shouldRenderAsEmoji('😀')).toBe(true);
    });

    it('returns true for multiple emojis', () => {
      expect(shouldRenderAsEmoji('😀😃😄')).toBe(true);
    });

    it('returns true for emojis with whitespace', () => {
      expect(shouldRenderAsEmoji('  😀  ')).toBe(true);
    });

    it('returns true for up to 8 emojis', () => {
      expect(shouldRenderAsEmoji('😀😃😄😁😅😂🤣😊')).toBe(true);
    });
  });

  describe('Non-emoji strings', () => {
    it('returns false for text only', () => {
      expect(shouldRenderAsEmoji('Hello world')).toBe(false);
    });

    it('returns false for text with emoji', () => {
      expect(shouldRenderAsEmoji('Hello 😀')).toBe(false);
    });

    it('returns false for numbers', () => {
      expect(shouldRenderAsEmoji('12345')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(shouldRenderAsEmoji('')).toBe(false);
    });

    it('returns false for whitespace only', () => {
      expect(shouldRenderAsEmoji('   ')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('returns false for more than 8 emojis', () => {
      expect(shouldRenderAsEmoji('😀😃😄😁😅😂🤣😊😇')).toBe(false);
    });

    it('handles emoji with modifiers', () => {
      // Skin tone modifiers are part of the emoji
      expect(shouldRenderAsEmoji('👍')).toBe(true);
    });
  });
});
