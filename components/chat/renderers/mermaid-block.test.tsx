import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MermaidBlock } from './mermaid-block';

// Mock mermaid - dynamic import pattern
jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg data-testid="mermaid-svg">mock</svg>' }),
  },
}));

// Mock diagram export utilities
jest.mock('@/lib/export/diagram/diagram-export', () => ({
  exportDiagram: jest.fn().mockResolvedValue(undefined),
  generateDiagramFilename: jest.fn(() => 'flowchart_diagram'),
}));

// Mock useCopy hook
jest.mock('@/hooks/ui/use-copy', () => ({
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

describe('MermaidBlock', () => {
  const mockContent = `graph TD
    A[Start] --> B[End]`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading state initially', () => {
      render(<MermaidBlock content={mockContent} />);
      expect(screen.getByText('Rendering diagram...')).toBeInTheDocument();
    });

    it('has status role during loading', () => {
      render(<MermaidBlock content={mockContent} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label during loading', () => {
      render(<MermaidBlock content={mockContent} />);
      expect(screen.getByLabelText('Rendering diagram...')).toBeInTheDocument();
    });

    it('displays spinner during loading', () => {
      const { container } = render(<MermaidBlock content={mockContent} />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('renders mermaid diagram after loading', async () => {
      render(<MermaidBlock content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByTestId('mermaid-svg')).toBeInTheDocument();
    });

    it('applies custom className', async () => {
      const { container } = render(
        <MermaidBlock content={mockContent} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('has figure role when rendered', async () => {
      render(<MermaidBlock content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByRole('figure')).toBeInTheDocument();
    });

    it('has aria-label for diagram', async () => {
      render(<MermaidBlock content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByLabelText('Mermaid diagram')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders action buttons after loading', async () => {
      render(<MermaidBlock content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByLabelText('Copy source code')).toBeInTheDocument();
      expect(screen.getByLabelText('View fullscreen')).toBeInTheDocument();
      expect(screen.getByLabelText('Show spec')).toBeInTheDocument();
      expect(screen.getByLabelText('Export options')).toBeInTheDocument();
    });
  });

  describe('Source Toggle', () => {
    it('shows source code when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<MermaidBlock content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const toggleButton = screen.getByLabelText('Show spec');
      await user.click(toggleButton);

      // Source code should now be visible
      const sourceCode = document.querySelector('pre code');
      expect(sourceCode).toBeInTheDocument();
    });

    it('toggles aria-pressed on source button', async () => {
      const user = userEvent.setup();
      render(<MermaidBlock content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const toggleButton = screen.getByLabelText('Show spec');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
      
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Fullscreen Dialog', () => {
    it('opens fullscreen dialog when button is clicked', async () => {
      const user = userEvent.setup();
      render(<MermaidBlock content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Check for diagram in the dialog (title might be rendered differently)
      expect(screen.getByLabelText('Mermaid diagram')).toBeInTheDocument();
    });

    it('shows source code section in fullscreen', async () => {
      const user = userEvent.setup();
      render(<MermaidBlock content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);

      expect(screen.getByText('View Source Code')).toBeInTheDocument();
    });
  });
});
