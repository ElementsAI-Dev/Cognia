import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReactNode } from 'react';

// Mock langfuse before importing CodeBlock (breaks import chain otherwise)
jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    trace: jest.fn(),
    span: jest.fn(),
    shutdown: jest.fn(),
  })),
}));

// Mock the observability module to prevent langfuse import chain issue
jest.mock('@/lib/ai/observability/langfuse-client', () => ({
  getLangfuseClient: jest.fn(() => null),
  createLangfuseTrace: jest.fn(),
  shutdownLangfuse: jest.fn(),
}));

jest.mock('@/lib/ai/observability/chat-observability', () => ({
  trackChatEvent: jest.fn(),
  createChatTrace: jest.fn(),
}));

// Mock hooks/ui barrel to avoid pulling in use-selection-toolbar -> use-ai-chat -> langfuse
jest.mock('@/hooks/ui', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
  useKeyboardShortcut: jest.fn(),
  useMediaQuery: jest.fn(() => false),
  useDebounce: jest.fn((v: unknown) => v),
  useLocalStorage: jest.fn(() => [null, jest.fn()]),
}));

// Now import CodeBlock after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CodeBlock } = require('./code-block');

// Wrapper with TooltipProvider
const Wrapper = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// Custom render with TooltipProvider
const customRender = (ui: React.ReactElement) => 
  render(ui, { wrapper: Wrapper });

// Mock useCopy hook
jest.mock('@/hooks/ui/use-copy', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
}));

// Mock sandbox hook to prevent act() warnings
jest.mock('@/hooks/sandbox/use-sandbox', () => ({
  useSandbox: () => ({
    isAvailable: false,
    isLoading: false,
    status: null,
    execute: jest.fn(),
  }),
}));

// Mock Shiki
jest.mock('shiki', () => ({
  codeToHtml: jest.fn().mockImplementation((code: string, options: { theme: string }) => 
    Promise.resolve(`<pre class="shiki ${options.theme}"><code>${code}</code></pre>`)
  ),
}));

describe('CodeBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders code content', () => {
      customRender(<CodeBlock code="const x = 1;" />);
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('renders with language label when provided', () => {
      customRender(<CodeBlock code="const x = 1;" language="javascript" />);
      expect(screen.getByText('javascript')).toBeInTheDocument();
    });

    it('renders without language label when not provided', () => {
      customRender(<CodeBlock code="const x = 1;" />);
      expect(screen.queryByText('javascript')).not.toBeInTheDocument();
    });

    it('renders line numbers by default', () => {
      const code = `line1
line2
line3`;
      customRender(<CodeBlock code={code} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('hides line numbers when showLineNumbers is false', () => {
      const code = `line1
line2`;
      customRender(<CodeBlock code={code} showLineNumbers={false} />);
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <CodeBlock code="test" className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies language class to code element', () => {
      const { container } = customRender(
        <CodeBlock code="test" language="typescript" />
      );
      
      const codeElement = container.querySelector('code');
      expect(codeElement).toHaveClass('language-typescript');
    });

    it('renders pre element', () => {
      const { container } = customRender(<CodeBlock code="test" />);
      expect(container.querySelector('pre')).toBeInTheDocument();
    });

    it('renders multiline code with correct line count', () => {
      const code = `line1
line2
line3
line4
line5`;
      customRender(<CodeBlock code={code} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('handles empty lines in code', () => {
      const code = `line1

line3`;
      customRender(<CodeBlock code={code} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders filename when provided', () => {
      customRender(<CodeBlock code="test" filename="example.js" />);
      expect(screen.getByText('example.js')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders copy button', () => {
      customRender(<CodeBlock code="test" />);
      expect(screen.getByLabelText('Copy code')).toBeInTheDocument();
    });

    it('renders download button', () => {
      customRender(<CodeBlock code="test" />);
      expect(screen.getByLabelText('Download code')).toBeInTheDocument();
    });

    it('renders fullscreen button', () => {
      customRender(<CodeBlock code="test" />);
      expect(screen.getByLabelText('View fullscreen')).toBeInTheDocument();
    });

    it('renders line numbers toggle button', () => {
      customRender(<CodeBlock code="test" />);
      expect(screen.getByLabelText(/line numbers/i)).toBeInTheDocument();
    });

    it('renders word wrap toggle button', () => {
      customRender(<CodeBlock code="test" />);
      expect(screen.getByLabelText(/word wrap/i)).toBeInTheDocument();
    });
  });

  describe('Line Numbers Toggle', () => {
    it('toggles line numbers when button is clicked', async () => {
      const user = userEvent.setup();
      const code = `line1
line2`;
      customRender(<CodeBlock code={code} />);
      
      // Initially shows line numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      
      const toggleButton = screen.getByLabelText(/line numbers/i);
      await user.click(toggleButton);
      
      // After toggle, should hide line numbers
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('has correct aria-pressed state', async () => {
      const user = userEvent.setup();
      customRender(<CodeBlock code="test" />);
      
      const toggleButton = screen.getByLabelText(/line numbers/i);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
      
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Word Wrap Toggle', () => {
    it('has correct aria-pressed state', async () => {
      const user = userEvent.setup();
      customRender(<CodeBlock code="test" />);
      
      const toggleButton = screen.getByLabelText(/word wrap/i);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
      
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Fullscreen Dialog', () => {
    it('opens fullscreen dialog when button is clicked', async () => {
      const user = userEvent.setup();
      customRender(<CodeBlock code="test" language="javascript" />);
      
      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows language in fullscreen dialog title', async () => {
      const user = userEvent.setup();
      customRender(<CodeBlock code="test" language="javascript" />);
      
      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);
      
      expect(screen.getAllByText('javascript').length).toBeGreaterThan(0);
    });

    it('shows line and character count in fullscreen', async () => {
      const user = userEvent.setup();
      const code = `line1
line2`;
      customRender(<CodeBlock code={code} />);
      
      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);
      
      expect(screen.getByText(/2 lines/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has figure role on container', () => {
      customRender(<CodeBlock code="test" />);
      expect(screen.getByRole('figure')).toBeInTheDocument();
    });

    it('has aria-label on container', () => {
      customRender(<CodeBlock code="test" language="python" />);
      expect(screen.getByLabelText(/code block.*python/i)).toBeInTheDocument();
    });

    it('has aria-label on code element', () => {
      const { container } = customRender(<CodeBlock code="test" language="rust" />);
      const codeElement = container.querySelector('code');
      expect(codeElement).toHaveAttribute('aria-label', 'Code in rust');
    });

    it('has aria-hidden on line numbers', () => {
      const code = `line1
line2`;
      const { container } = customRender(<CodeBlock code={code} />);
      
      const lineNumberCells = container.querySelectorAll('td[aria-hidden="true"]');
      expect(lineNumberCells.length).toBe(2);
    });
  });

  describe('Line Highlighting', () => {
    it('highlights specified lines', () => {
      const code = `line1
line2
line3`;
      const { container } = customRender(
        <CodeBlock code={code} highlightLines={[2]} />
      );
      
      const rows = container.querySelectorAll('tr');
      expect(rows[1]).toHaveClass('bg-primary/10');
    });

    it('does not highlight non-specified lines', () => {
      const code = `line1
line2
line3`;
      const { container } = customRender(
        <CodeBlock code={code} highlightLines={[2]} />
      );
      
      const rows = container.querySelectorAll('tr');
      expect(rows[0]).not.toHaveClass('bg-primary/10');
      expect(rows[2]).not.toHaveClass('bg-primary/10');
    });
  });

  describe('Syntax Highlighting', () => {
    it('calls shiki for syntax highlighting when language is provided', async () => {
      const shiki = jest.requireMock('shiki') as { codeToHtml: jest.Mock };
      customRender(<CodeBlock code="const x = 1;" language="javascript" />);
      
      // Wait for async highlighting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(shiki.codeToHtml).toHaveBeenCalled();
    });

    it('does not call shiki when no language is provided', async () => {
      const shiki = jest.requireMock('shiki') as { codeToHtml: jest.Mock };
      shiki.codeToHtml.mockClear();
      
      customRender(<CodeBlock code="plain text" />);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(shiki.codeToHtml).not.toHaveBeenCalled();
    });

    it('renders light and dark theme versions', async () => {
      const shiki = jest.requireMock('shiki') as { codeToHtml: jest.Mock };
      customRender(<CodeBlock code="const x = 1;" language="typescript" showLineNumbers={false} />);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should call for both light and dark themes
      expect(shiki.codeToHtml).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ theme: 'one-light' })
      );
      expect(shiki.codeToHtml).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ theme: 'one-dark-pro' })
      );
    });
  });
});
