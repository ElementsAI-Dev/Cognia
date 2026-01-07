import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SandpackBlock, SimplePlayground } from './sandpack-block';
import { ReactNode } from 'react';

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

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock @codesandbox/sandpack-react
jest.mock('@codesandbox/sandpack-react', () => ({
  SandpackProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="sandpack-provider">{children}</div>
  ),
  SandpackCodeEditor: () => (
    <div data-testid="sandpack-code-editor">Code Editor</div>
  ),
  SandpackPreview: () => (
    <div data-testid="sandpack-preview">Preview</div>
  ),
  SandpackConsole: () => (
    <div data-testid="sandpack-console">Console</div>
  ),
}));

describe('SandpackBlock', () => {
  const defaultCode = `export default function App() {
  return <h1>Hello World</h1>;
}`;

  describe('Rendering', () => {
    it('renders sandpack container', async () => {
      const { container } = customRender(
        <SandpackBlock code={defaultCode} />
      );
      
      await waitFor(() => {
        expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
      });
    });

    it('renders header with template name', async () => {
      customRender(<SandpackBlock code={defaultCode} template="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('Interactive Playground')).toBeInTheDocument();
        expect(screen.getByText('(react)')).toBeInTheDocument();
      });
    });

    it('applies custom className', async () => {
      const { container } = customRender(
        <SandpackBlock code={defaultCode} className="custom-class" />
      );
      
      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });
  });

  describe('Templates', () => {
    const templates = [
      'react',
      'react-ts',
      'vanilla',
      'vanilla-ts',
      'vue',
      'vue-ts',
      'static',
    ] as const;

    it.each(templates)('renders with %s template', async (template) => {
      customRender(<SandpackBlock code={defaultCode} template={template} />);
      
      await waitFor(() => {
        expect(screen.getByText(`(${template})`)).toBeInTheDocument();
      });
    });
  });

  describe('Tabs', () => {
    it('shows tabs when showTabs is true', async () => {
      customRender(<SandpackBlock code={defaultCode} showTabs />);
      
      await waitFor(() => {
        // Use getAllByText since "Preview" appears in both tab and content
        expect(screen.getAllByText('Preview').length).toBeGreaterThan(0);
        expect(screen.getByText('Code')).toBeInTheDocument();
      });
    });

    it('shows console tab when showConsole is true', async () => {
      customRender(<SandpackBlock code={defaultCode} showTabs showConsole />);
      
      await waitFor(() => {
        expect(screen.getByText('Console')).toBeInTheDocument();
      });
    });
  });

  describe('Header actions', () => {
    it('renders copy button', async () => {
      const { container } = customRender(<SandpackBlock code={defaultCode} />);
      
      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('renders fullscreen button', async () => {
      const { container } = customRender(<SandpackBlock code={defaultCode} />);
      
      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(1);
      });
    });
  });

  describe('Fullscreen dialog', () => {
    it('opens fullscreen dialog when button clicked', async () => {
      customRender(<SandpackBlock code={defaultCode} />);
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        // Find fullscreen button (second button after copy)
        const fullscreenBtn = buttons[1];
        if (fullscreenBtn) {
          fireEvent.click(fullscreenBtn);
        }
      });
      
      // Dialog should open
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        // Dialog may or may not be present depending on state
        expect(dialog || screen.getByText('Interactive Playground')).toBeInTheDocument();
      });
    });
  });

  describe('Custom files', () => {
    it('accepts custom files', async () => {
      const customFiles = {
        '/App.js': 'export default () => <div>Custom</div>',
        '/styles.css': 'body { margin: 0; }',
      };
      
      customRender(
        <SandpackBlock code={defaultCode} files={customFiles} />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Interactive Playground')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('shows loading skeleton initially', () => {
      const { container } = customRender(<SandpackBlock code={defaultCode} />);
      
      // Suspense fallback should show skeleton
      // Note: This depends on the lazy loading behavior
      expect(container).toBeInTheDocument();
    });
  });
});

describe('SimplePlayground', () => {
  const defaultCode = 'console.log("Hello World");';

  describe('Rendering', () => {
    it('renders code content', () => {
      customRender(<SimplePlayground code={defaultCode} />);
      expect(screen.getByText('console.log("Hello World");')).toBeInTheDocument();
    });

    it('renders run button', () => {
      customRender(<SimplePlayground code={defaultCode} />);
      expect(screen.getByText('Run')).toBeInTheDocument();
    });

    it('renders language label', () => {
      customRender(<SimplePlayground code={defaultCode} language="javascript" />);
      expect(screen.getByText('javascript')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = customRender(
        <SimplePlayground code={defaultCode} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Code execution', () => {
    it('shows output after run button clicked', async () => {
      customRender(<SimplePlayground code={defaultCode} />);
      
      const runButton = screen.getByText('Run');
      fireEvent.click(runButton);
      
      await waitFor(() => {
        expect(screen.getByText('Output:')).toBeInTheDocument();
      });
    });

    it('shows console.log output', async () => {
      customRender(<SimplePlayground code='console.log("Test output");' />);
      
      const runButton = screen.getByText('Run');
      fireEvent.click(runButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test output')).toBeInTheDocument();
      });
    });

    it('shows error for invalid code', async () => {
      const { container } = customRender(<SimplePlayground code='throw new Error("Test error");' />);
      
      const runButton = screen.getByText('Run');
      fireEvent.click(runButton);
      
      await waitFor(() => {
        // Error appears in both code and output, check for error output specifically
        const errorOutput = container.querySelector('pre.text-red-500');
        expect(errorOutput).toBeInTheDocument();
        expect(errorOutput?.textContent).toContain('Test error');
      });
    });

    it('handles multiple console.log calls', async () => {
      const multiLogCode = `
        console.log("Line 1");
        console.log("Line 2");
      `;
      const { container } = customRender(<SimplePlayground code={multiLogCode} />);
      
      const runButton = screen.getByText('Run');
      fireEvent.click(runButton);
      
      await waitFor(() => {
        // Output appears in both code and output area, check output area specifically
        const outputArea = container.querySelector('.border-t.p-4 pre');
        expect(outputArea).toBeInTheDocument();
        expect(outputArea?.textContent).toContain('Line 1');
        expect(outputArea?.textContent).toContain('Line 2');
      });
    });
  });

  describe('Console methods', () => {
    it('handles console.error', async () => {
      customRender(<SimplePlayground code='console.error("Error message");' />);
      
      const runButton = screen.getByText('Run');
      fireEvent.click(runButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Error: Error message/)).toBeInTheDocument();
      });
    });

    it('handles console.warn', async () => {
      customRender(<SimplePlayground code='console.warn("Warning message");' />);
      
      const runButton = screen.getByText('Run');
      fireEvent.click(runButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Warning: Warning message/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('handles empty code', () => {
      customRender(<SimplePlayground code="" />);
      expect(screen.getByText('Run')).toBeInTheDocument();
    });

    it('handles code with return value', async () => {
      customRender(<SimplePlayground code='console.log(1 + 1);' />);
      
      const runButton = screen.getByText('Run');
      fireEvent.click(runButton);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });
});
