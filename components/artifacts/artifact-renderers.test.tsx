/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  MermaidRenderer,
  ChartRenderer,
  MathRenderer,
  MarkdownRenderer,
  CodeRenderer,
  ArtifactRenderer,
} from './artifact-renderers';

// Mock mermaid
jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg>mermaid diagram</svg>' }),
  },
}));

// Mock katex
jest.mock('katex', () => ({
  renderToString: jest.fn((content) => `<span class="katex">${content}</span>`),
}));

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

// Mock remark/rehype plugins
jest.mock('remark-gfm', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => null,
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Cell: () => null,
}));

describe('MermaidRenderer', () => {
  it('shows loading state initially', async () => {
    render(<MermaidRenderer content="graph TD; A-->B;" />);
    expect(screen.getByText('Loading diagram...')).toBeInTheDocument();
    // Wait for async rendering to complete to avoid act() warnings
    await waitFor(() => {
      expect(screen.queryByText('Loading diagram...')).not.toBeInTheDocument();
    });
  });

  it('renders mermaid diagram after loading', async () => {
    render(<MermaidRenderer content="graph TD; A-->B;" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading diagram...')).not.toBeInTheDocument();
    });
  });
});

describe('ChartRenderer', () => {
  it('renders line chart by default', () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    render(<ChartRenderer content={chartData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders bar chart when specified', () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    render(<ChartRenderer content={chartData} chartType="bar" />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders pie chart when specified', () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    render(<ChartRenderer content={chartData} chartType="pie" />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders area chart when specified', () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    render(<ChartRenderer content={chartData} chartType="area" />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders scatter chart when specified', () => {
    const chartData = JSON.stringify([
      { name: 'A', x: 10, y: 20 },
      { name: 'B', x: 30, y: 40 },
    ]);
    render(<ChartRenderer content={chartData} chartType="scatter" />);
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
  });

  it('renders radar chart when specified', () => {
    const chartData = JSON.stringify([
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ]);
    render(<ChartRenderer content={chartData} chartType="radar" />);
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('handles chartData prop directly', () => {
    const chartData = [
      { name: 'A', value: 10 },
      { name: 'B', value: 20 },
    ];
    render(<ChartRenderer content="" chartData={chartData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows error for invalid JSON', () => {
    const { container } = render(<ChartRenderer content="invalid json" />);
    // Component should handle invalid JSON gracefully
    expect(container).toBeInTheDocument();
  });

  it('shows no data message for empty array', () => {
    render(<ChartRenderer content="[]" />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('detects chart type from JSON data', () => {
    const chartData = JSON.stringify({
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
    });
    render(<ChartRenderer content={chartData} />);
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
    render(<CodeRenderer content="const x = 1;" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(<CodeRenderer content="code" className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('ArtifactRenderer', () => {
  it('routes mermaid type to MermaidRenderer', async () => {
    render(<ArtifactRenderer type="mermaid" content="graph TD; A-->B;" />);
    expect(screen.getByText('Loading diagram...')).toBeInTheDocument();
    // Wait for async rendering to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading diagram...')).not.toBeInTheDocument();
    });
  });

  it('routes chart type to ChartRenderer', () => {
    render(<ArtifactRenderer type="chart" content="[]" />);
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
