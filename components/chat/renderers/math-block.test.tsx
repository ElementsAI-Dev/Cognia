import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MathBlock } from './math-block';

// Mock KaTeX
jest.mock('katex', () => ({
  renderToString: jest.fn((content: string) => {
    if (content.includes('invalid')) {
      throw new Error('KaTeX parse error');
    }
    return `<span class="katex">${content}</span>`;
  }),
}));

// Mock math export utilities
jest.mock('@/lib/export/math-export', () => ({
  exportMath: jest.fn().mockResolvedValue(undefined),
  generateMathFilename: jest.fn((content: string) => content.slice(0, 10)),
}));

// Mock useCopy hook
jest.mock('@/hooks/use-copy', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MathBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders LaTeX content correctly', () => {
      render(<MathBlock content="$$E = mc^2$$" />);
      
      const mathElement = document.querySelector('.katex-block');
      expect(mathElement).toBeInTheDocument();
      expect(mathElement?.innerHTML).toContain('E = mc^2');
    });

    it('strips $$ delimiters from content', () => {
      const katex = jest.requireMock('katex');
      render(<MathBlock content="$$x^2 + y^2 = z^2$$" />);
      
      expect(katex.renderToString).toHaveBeenCalledWith(
        'x^2 + y^2 = z^2',
        expect.objectContaining({ displayMode: true })
      );
    });

    it('strips \\[ \\] delimiters from content', () => {
      const katex = jest.requireMock('katex');
      render(<MathBlock content="\\[a + b = c\\]" />);
      
      expect(katex.renderToString).toHaveBeenCalledWith(
        'a + b = c',
        expect.any(Object)
      );
    });

    it('applies custom className', () => {
      const { container } = render(
        <MathBlock content="$$x$$" className="custom-math" />
      );

      expect(container.querySelector('.custom-math')).toBeInTheDocument();
    });

    it('applies scale prop', () => {
      const { container } = render(
        <MathBlock content="$$x$$" scale={1.5} />
      );

      const mathElement = container.querySelector('.katex-block');
      expect(mathElement).toHaveStyle({ fontSize: '1.5em' });
    });
  });

  describe('Error Handling', () => {
    it('renders error state for invalid LaTeX', () => {
      render(<MathBlock content="$$invalid$$" />);
      
      expect(screen.getByText('LaTeX Error')).toBeInTheDocument();
      expect(screen.getByText('KaTeX parse error')).toBeInTheDocument();
    });

    it('shows source code in error state', () => {
      render(<MathBlock content="$$invalid$$" />);
      
      expect(screen.getByText('invalid')).toBeInTheDocument();
    });

    it('has alert role for error state', () => {
      render(<MathBlock content="$$invalid$$" />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders action buttons on hover', async () => {
      const { container } = render(<MathBlock content="$$x$$" />);
      
      const wrapper = container.querySelector('.group');
      expect(wrapper).toBeInTheDocument();
      
      // Buttons exist but are hidden by opacity
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has copy button with aria-label', () => {
      render(<MathBlock content="$$x$$" />);
      
      expect(screen.getByLabelText('Copy LaTeX')).toBeInTheDocument();
    });

    it('has fullscreen button with aria-label', () => {
      render(<MathBlock content="$$x$$" />);
      
      expect(screen.getByLabelText('View fullscreen')).toBeInTheDocument();
    });

    it('has source toggle button with aria-label', () => {
      render(<MathBlock content="$$x$$" />);
      
      expect(screen.getByLabelText('Show source')).toBeInTheDocument();
    });

    it('has export button with aria-label', () => {
      render(<MathBlock content="$$x$$" />);
      
      expect(screen.getByLabelText('Export options')).toBeInTheDocument();
    });
  });

  describe('Source Toggle', () => {
    it('shows source code when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<MathBlock content="$$x^2$$" />);
      
      const toggleButton = screen.getByLabelText('Show source');
      await user.click(toggleButton);
      
      // Source code should now be visible
      const sourceCode = document.querySelector('pre code');
      expect(sourceCode).toBeInTheDocument();
      expect(sourceCode?.textContent).toBe('x^2');
    });

    it('toggles aria-pressed on source button', async () => {
      const user = userEvent.setup();
      render(<MathBlock content="$$x$$" />);
      
      const toggleButton = screen.getByLabelText('Show source');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
      
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Fullscreen Dialog', () => {
    it('opens fullscreen dialog when button is clicked', async () => {
      const user = userEvent.setup();
      render(<MathBlock content="$$x$$" />);
      
      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Mathematical Expression')).toBeInTheDocument();
    });

    it('renders math in fullscreen dialog', async () => {
      const user = userEvent.setup();
      render(<MathBlock content="$$x^2$$" />);
      
      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);
      
      // Dialog should contain rendered math
      const dialog = screen.getByRole('dialog');
      expect(dialog.querySelector('.katex')).toBeInTheDocument();
    });

    it('shows source code section in fullscreen', async () => {
      const user = userEvent.setup();
      render(<MathBlock content="$$x$$" />);
      
      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);
      
      // Text may be translated, check for any source-related text
      const sourceElements = screen.queryAllByText(/LaTeX|Source|viewSource/i);
      expect(sourceElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has math role on container', () => {
      render(<MathBlock content="$$x$$" />);
      
      expect(screen.getByRole('math')).toBeInTheDocument();
    });

    it('has aria-label on container', () => {
      render(<MathBlock content="$$x$$" />);
      
      expect(screen.getByLabelText('Mathematical expression')).toBeInTheDocument();
    });

    it('has aria-hidden on decorative icons in error state', () => {
      render(<MathBlock content="$$invalid$$" />);
      
      // AlertCircle icon should have aria-hidden
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });
});
