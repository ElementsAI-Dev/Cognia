import { render, screen, waitFor } from '@testing-library/react';
import { VegaLiteBlock } from './vegalite-block';

// Mock vega-embed - dynamic import pattern
jest.mock('vega-embed', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ view: {} }),
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

  it('renders loading state initially', () => {
    render(<VegaLiteBlock content={validSpec} />);
    expect(screen.getByText('Rendering chart...')).toBeInTheDocument();
  });

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

  it('applies custom className to loading state', () => {
    const { container } = render(
      <VegaLiteBlock content={validSpec} className="custom-chart" />
    );

    expect(container.querySelector('.custom-chart')).toBeInTheDocument();
  });

  it('displays original content in error state', async () => {
    const invalidContent = "invalid json here";
    render(<VegaLiteBlock content={invalidContent} />);

    await waitFor(() => {
      expect(screen.getByText(invalidContent)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
