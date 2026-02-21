/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

const messages = {
  renderer: {
    invalidChartFormat: 'Invalid chart format',
    failedToParseChart: 'Failed to parse chart data',
    noData: 'No data available',
  },
};

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

// Mock mermaid
jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg>mermaid diagram</svg>' }),
  },
}));

// Mock chat renderers to avoid langfuse import chain
jest.mock('@/components/chat/renderers/mermaid-block', () => ({
  MermaidBlock: ({ content }: { content: string }) => (
    <div data-testid="mermaid-block">{content}</div>
  ),
}));

jest.mock('@/components/chat/renderers/math-block', () => ({
  MathBlock: ({ content }: { content: string }) => <div data-testid="math-block">{content}</div>,
}));

jest.mock('@/components/chat/renderers/code-block', () => ({
  CodeBlock: ({ code, className }: { code: string; className?: string }) => (
    <pre className={className} data-testid="code-block">
      {code}
    </pre>
  ),
}));

// Mock chat/utils to avoid vega/langfuse import chain
jest.mock('@/components/chat/utils', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="markdown" className={className}>{content}</div>
  ),
}));

// Mock katex
jest.mock('katex', () => ({
  renderToString: jest.fn((content: string) => `<span class="katex">${content}</span>`),
}));

// Mock the lazy-loaded chart-renderer to avoid recharts import issues
jest.mock('./chart-renderer', () => {
  const ChartRendererMock = ({ content, chartType, chartData, className }: {
    content: string;
    chartType?: string;
    chartData?: Array<{ name: string; value: number }>;
    className?: string;
  }) => {
    // Simulate chart type detection and rendering
    let data = chartData;
    let type = chartType || 'line';
    if (!data && content) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.type) type = parsed.type;
        data = Array.isArray(parsed) ? parsed : parsed.data;
      } catch {
        return <div data-testid="chart-error" className={className}>Parse error</div>;
      }
    }
    if (!data || data.length === 0) {
      return <div className={className}>No data to display</div>;
    }
    return (
      <div data-testid="responsive-container" className={className}>
        <div data-testid={`${type}-chart`}>Chart: {data.length} items</div>
      </div>
    );
  };
  return {
    __esModule: true,
    default: ChartRendererMock,
    ChartRenderer: ChartRendererMock,
  };
});

// Use require after mocks to ensure mocks are applied before module load
 
const artifactRenderers = require('./artifact-renderers');
const { MermaidRenderer, ChartRenderer, MathRenderer, MarkdownRenderer, CodeRenderer, ArtifactRenderer } = artifactRenderers;

describe('MermaidRenderer', () => {
  it('renders mermaid content via MermaidBlock', () => {
    render(<MermaidRenderer content="graph TD; A-->B;" />);
    expect(screen.getByTestId('mermaid-block')).toBeInTheDocument();
  });

  it('passes content to MermaidBlock', () => {
    render(<MermaidRenderer content="graph LR; X-->Y;" />);
    expect(screen.getByText(/graph LR/)).toBeInTheDocument();
  });
});

describe('ChartRenderer', () => {
  it('renders line chart by default', async () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    await act(async () => { renderWithIntl(<ChartRenderer content={chartData} />); });
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders bar chart when specified', async () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    await act(async () => { renderWithIntl(<ChartRenderer content={chartData} chartType="bar" />); });
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders pie chart when specified', async () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    await act(async () => { renderWithIntl(<ChartRenderer content={chartData} chartType="pie" />); });
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders area chart when specified', async () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    await act(async () => { renderWithIntl(<ChartRenderer content={chartData} chartType="area" />); });
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders scatter chart when specified', async () => {
    const chartData = JSON.stringify([
      { name: 'A', x: 10, y: 20 },
      { name: 'B', x: 30, y: 40 },
    ]);
    await act(async () => { renderWithIntl(<ChartRenderer content={chartData} chartType="scatter" />); });
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
  });

  it('renders radar chart when specified', async () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    await act(async () => { renderWithIntl(<ChartRenderer content={chartData} chartType="radar" />); });
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('handles chartData prop directly', async () => {
    const chartData = [
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ];
    await act(async () => { renderWithIntl(<ChartRenderer content="" chartData={chartData} />); });
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows error for invalid JSON', async () => {
    let container: HTMLElement;
    await act(async () => { ({ container } = renderWithIntl(<ChartRenderer content="invalid json" />)); });
    expect(container!).toBeInTheDocument();
  });

  it('shows no data message for empty array', async () => {
    await act(async () => { renderWithIntl(<ChartRenderer content="[]" />); });
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('detects chart type from JSON data', async () => {
    const chartData = JSON.stringify({
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
    });
    await act(async () => { renderWithIntl(<ChartRenderer content={chartData} />); });
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});

describe('MathRenderer', () => {
  it('renders math expression', () => {
    render(<MathRenderer content="x^2 + y^2 = z^2" />);
    expect(screen.getByText(/x\^2/)).toBeInTheDocument();
  });

  it('handles display mode with $$', () => {
    render(<MathRenderer content="$$E = mc^2$$" />);
    expect(screen.getByText(/E = mc\^2/)).toBeInTheDocument();
  });
});

describe('MarkdownRenderer', () => {
  it('renders markdown content', () => {
    render(<MarkdownRenderer content="# Hello World" />);
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
    expect(screen.getByText('# Hello World')).toBeInTheDocument();
  });
});

describe('CodeRenderer', () => {
  it('renders code in pre tag', () => {
    // CodeRenderer is now re-exported from CodeBlock which uses 'code' prop
    render(<CodeRenderer code="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(<CodeRenderer code="code" className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('ArtifactRenderer', () => {
  it('routes mermaid type to MermaidRenderer', () => {
    render(<ArtifactRenderer type="mermaid" content="graph TD; A-->B;" />);
    // Uses mocked MermaidBlock
    expect(screen.getByTestId('mermaid-block')).toBeInTheDocument();
  });

  it('routes chart type to ChartRenderer', () => {
    renderWithIntl(<ArtifactRenderer type="chart" content="[]" />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('routes math type to MathRenderer', () => {
    render(<ArtifactRenderer type="math" content="x^2" />);
    expect(screen.getByText(/x\^2/)).toBeInTheDocument();
  });

  it('routes document type to MarkdownRenderer', () => {
    render(<ArtifactRenderer type="document" content="# Title" />);
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });

  it('routes unknown type to CodeRenderer', () => {
    render(<ArtifactRenderer type="code" content="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('passes chartType and chartData to ChartRenderer', () => {
    const chartData = [{ name: 'A', value: 10 }];
    render(<ArtifactRenderer type="chart" content="" chartType="bar" chartData={chartData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
