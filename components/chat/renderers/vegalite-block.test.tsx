import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VegaLiteBlock } from './vegalite-block';

// Mock vega-embed - dynamic import pattern
jest.mock('vega-embed', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ view: {} }),
}));

// Mock diagram export utilities
jest.mock('@/lib/export/diagram-export', () => ({
  exportDiagram: jest.fn().mockResolvedValue(undefined),
  generateDiagramFilename: jest.fn(() => 'bar_chart'),
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

describe('VegaLiteBlock', () => {
  const validSpec = JSON.stringify({
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": { "values": [{ "a": 1, "b": 2 }] },
    "mark": "bar",
    "encoding": {
      "x": { "field": "a", "type": "quantitative" },
      "y": { "field": "b", "type": "quantitative" }
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading state initially', () => {
      render(<VegaLiteBlock content={validSpec} />);
      expect(screen.getByText('Rendering chart...')).toBeInTheDocument();
    });

    it('has status role during loading', () => {
      render(<VegaLiteBlock content={validSpec} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label during loading', () => {
      render(<VegaLiteBlock content={validSpec} />);
      expect(screen.getByLabelText('Loading chart')).toBeInTheDocument();
    });

    it('displays spinner during loading', () => {
      const { container } = render(<VegaLiteBlock content={validSpec} />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders error state for invalid JSON', async () => {
      render(<VegaLiteBlock content="not valid json" />);

      await waitFor(() => {
        expect(screen.getByText('VegaLite Error')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows JSON parse error message', async () => {
      render(<VegaLiteBlock content="{invalid}" />);

      await waitFor(() => {
        expect(screen.getByText(/VegaLite Error/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays original content in error state', async () => {
      const invalidContent = "invalid json here";
      render(<VegaLiteBlock content={invalidContent} />);

      await waitFor(() => {
        expect(screen.getByText(invalidContent)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('has alert role for error state', async () => {
      render(<VegaLiteBlock content="invalid" />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('has retry button in error state', async () => {
      render(<VegaLiteBlock content="invalid" />);

      await waitFor(() => {
        expect(screen.getByLabelText('Retry rendering')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Rendering', () => {
    it('applies custom className', () => {
      const { container } = render(
        <VegaLiteBlock content={validSpec} className="custom-chart" />
      );

      expect(container.querySelector('.custom-chart')).toBeInTheDocument();
    });

    it('renders chart after loading', async () => {
      const { container } = render(<VegaLiteBlock content={validSpec} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering chart...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container.querySelector('[role="figure"]')).toBeInTheDocument();
    });

    it('has aria-label for chart', async () => {
      render(<VegaLiteBlock content={validSpec} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering chart...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByLabelText('VegaLite chart')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders action buttons after loading', async () => {
      render(<VegaLiteBlock content={validSpec} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering chart...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByLabelText('Copy spec')).toBeInTheDocument();
      expect(screen.getByLabelText('View fullscreen')).toBeInTheDocument();
      expect(screen.getByLabelText('Show spec')).toBeInTheDocument();
      expect(screen.getByLabelText('Export options')).toBeInTheDocument();
    });
  });

  describe('Source Toggle', () => {
    it('shows spec when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<VegaLiteBlock content={validSpec} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering chart...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const toggleButton = screen.getByLabelText('Show spec');
      await user.click(toggleButton);

      // Spec should now be visible
      const sourceCode = document.querySelector('pre code');
      expect(sourceCode).toBeInTheDocument();
    });

    it('toggles aria-pressed on spec button', async () => {
      const user = userEvent.setup();
      render(<VegaLiteBlock content={validSpec} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering chart...')).not.toBeInTheDocument();
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
      render(<VegaLiteBlock content={validSpec} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering chart...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('VegaLite Chart')).toBeInTheDocument();
    });

    it('shows spec JSON section in fullscreen', async () => {
      const user = userEvent.setup();
      render(<VegaLiteBlock content={validSpec} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Rendering chart...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const fullscreenButton = screen.getByLabelText('View fullscreen');
      await user.click(fullscreenButton);

      expect(screen.getByText('View Spec JSON')).toBeInTheDocument();
    });
  });
});
