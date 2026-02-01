import { render, screen, waitFor } from '@testing-library/react';
import { VegaLiteBlock } from './vegalite-block';

// Mock react-vega VegaEmbed component
jest.mock('react-vega', () => ({
  VegaEmbed: jest.fn(({ onEmbed, onError, spec }) => {
    // Simulate async embedding
    setTimeout(() => {
      try {
        if (spec && typeof spec === 'object') {
          onEmbed?.({
            view: {
              toImageURL: jest.fn().mockResolvedValue('data:image/png;base64,test'),
            },
          });
        }
      } catch (err) {
        onError?.(err);
      }
    }, 0);
    return <div data-testid="vega-embed">VegaEmbed Mock</div>;
  }),
}));

// Mock diagram export utilities
jest.mock('@/lib/export/diagram-export', () => ({
  exportDiagram: jest.fn().mockResolvedValue(undefined),
  generateDiagramFilename: jest.fn(() => 'bar_chart'),
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
      // LoadingAnimation uses "Rendering chart..." as the aria-label
      expect(screen.getByLabelText('Rendering chart...')).toBeInTheDocument();
    });

    it('displays loading animation during loading', () => {
      const { container } = render(<VegaLiteBlock content={validSpec} />);
      // The component uses LoadingAnimation with wave variant, not spin
      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
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
        // Actual button has aria-label="Retry" (from translations)
        expect(screen.getByLabelText('Retry')).toBeInTheDocument();
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

    it('renders loading state with valid spec', () => {
      render(<VegaLiteBlock content={validSpec} />);
      // Component starts in loading state
      expect(screen.getByText('Rendering chart...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders error state for invalid JSON', async () => {
      render(<VegaLiteBlock content="not valid json" />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Action Buttons', () => {
    it('shows loading state initially', () => {
      render(<VegaLiteBlock content={validSpec} />);
      // Component starts in loading state - buttons appear after load
      expect(screen.getByText('Rendering chart...')).toBeInTheDocument();
    });
    
    it('shows action buttons in error state', async () => {
      render(<VegaLiteBlock content="invalid" />);
      
      await waitFor(() => {
        // Error state shows retry and copy buttons
        expect(screen.getByLabelText('Retry')).toBeInTheDocument();
        expect(screen.getByLabelText('Copy spec')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Source Toggle', () => {
    it('error state shows original content', async () => {
      const invalidContent = "some invalid json";
      render(<VegaLiteBlock content={invalidContent} />);
      
      await waitFor(() => {
        // Error state displays the original content
        expect(screen.getByText(invalidContent)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Fullscreen Dialog', () => {
    it('error state has alert role and error message', async () => {
      render(<VegaLiteBlock content="{bad json}" />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('VegaLite Error')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
