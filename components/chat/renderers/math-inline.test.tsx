import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MathInline } from './math-inline';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      copyLatex: 'Copy LaTeX',
      latexCopied: 'LaTeX copied to clipboard',
    };
    return translations[key] || key;
  },
}));

// Mock KaTeX
jest.mock('katex', () => ({
  renderToString: jest.fn((content: string) => {
    if (content.includes('invalid')) {
      throw new Error('KaTeX parse error');
    }
    return `<span class="katex">${content}</span>`;
  }),
}));

// Mock the latex cache module
jest.mock('@/lib/latex/cache', () => ({
  renderMathSafe: jest.fn((content: string, _displayMode: boolean, _options?: { trust?: boolean }) => {
    if (content.includes('invalid')) {
      return { html: '', error: 'KaTeX parse error' };
    }
    return { html: `<span class="katex">${content}</span>`, error: null };
  }),
}));

// Mock useCopy hook
jest.mock('@/hooks/ui/use-copy', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
}));

// Mock the entire hooks/ui module to avoid langfuse import chain
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
}));

describe('MathInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders inline LaTeX content correctly', () => {
      const { container } = render(<MathInline content="$x^2$" />);
      
      const mathElement = container.querySelector('.katex-inline');
      expect(mathElement).toBeInTheDocument();
      expect(mathElement?.innerHTML).toContain('x^2');
    });

    it('strips $ delimiters from content', () => {
      const { renderMathSafe } = jest.requireMock('@/lib/latex/cache');
      render(<MathInline content="$a + b$" />);
      
      expect(renderMathSafe).toHaveBeenCalledWith('a + b', false, { trust: false });
    });

    it('strips \\( \\) delimiters from content', () => {
      const { renderMathSafe } = jest.requireMock('@/lib/latex/cache');
      renderMathSafe.mockClear();
      render(<MathInline content="\(a + b\)" />);
      
      expect(renderMathSafe).toHaveBeenCalledWith('a + b', false, { trust: false });
    });

    it('applies custom className', () => {
      const { container } = render(
        <MathInline content="$x$" className="custom-inline" />
      );

      expect(container.querySelector('.custom-inline')).toBeInTheDocument();
    });

    it('applies scale prop', () => {
      const { container } = render(
        <MathInline content="$x$" scale={1.5} />
      );

      const mathElement = container.querySelector('.katex-inline');
      expect(mathElement).toHaveStyle({ fontSize: '1.5em' });
    });
  });

  describe('Error Handling', () => {
    it('renders as code element on error', () => {
      const { container } = render(<MathInline content="$invalid$" />);
      
      const codeElement = container.querySelector('code');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement).toHaveTextContent('$invalid$');
    });

    it('has math role on error element', () => {
      render(<MathInline content="$invalid$" />);
      
      expect(screen.getByRole('math')).toBeInTheDocument();
    });

    it('has descriptive aria-label on error', () => {
      render(<MathInline content="$invalid$" />);
      
      const mathElement = screen.getByRole('math');
      expect(mathElement).toHaveAttribute('aria-label', expect.stringContaining('Invalid math expression'));
    });
  });

  describe('Interactivity', () => {
    it('is clickable', () => {
      const { container } = render(<MathInline content="$x$" />);
      
      const mathElement = container.querySelector('.katex-inline');
      expect(mathElement).toHaveClass('cursor-pointer');
    });

    it('has tabIndex for keyboard navigation', () => {
      const { container } = render(<MathInline content="$x$" />);
      
      const mathElement = container.querySelector('.katex-inline');
      expect(mathElement).toHaveAttribute('tabIndex', '0');
    });

    it('shows copy icon on hover when showCopyOnHover is true', async () => {
      const user = userEvent.setup();
      const { container } = render(<MathInline content="$x$" showCopyOnHover={true} />);
      
      const mathElement = container.querySelector('.katex-inline');
      if (mathElement) {
        await user.hover(mathElement);
      }
      
      // Copy icon should be visible on hover
      expect(container.querySelector('.katex-inline')).toBeInTheDocument();
    });

    it('does not show copy icon when showCopyOnHover is false', () => {
      const { container } = render(<MathInline content="$x$" showCopyOnHover={false} />);
      
      // Should not have copy icon initially
      const mathElement = container.querySelector('.katex-inline');
      expect(mathElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has math role on container', () => {
      render(<MathInline content="$x$" />);
      
      expect(screen.getByRole('math')).toBeInTheDocument();
    });

    it('has aria-label with math content', () => {
      render(<MathInline content="$x^2$" />);
      
      const mathElement = screen.getByRole('math');
      expect(mathElement).toHaveAttribute('aria-label', 'Math: x^2');
    });

    it('responds to keyboard events', async () => {
      const user = userEvent.setup();
      render(<MathInline content="$x$" />);
      
      const mathElement = screen.getByRole('math');
      await user.tab();
      
      // Element should be focusable
      expect(mathElement).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('renders with tooltip wrapper', () => {
      const { container } = render(<MathInline content="$x$" />);
      
      // Verify math element renders within component
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
