/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartNode } from './chart-node';
import type { ChartNodeData } from '@/types/workflow/workflow-editor';

jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
  }: {
    data: { label: string };
    children?: React.ReactNode;
  }) => (
    <div data-testid="base-node">
      <h3>{data.label}</h3>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

const baseProps = {
  id: 'chart-1',
  type: 'chart',
  selected: false,
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

const mockData: ChartNodeData = {
  id: 'chart-1',
  nodeType: 'chart',
  label: 'Sales Chart',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: { data: { type: 'array', description: 'Chart data' } },
  outputs: { chart: { type: 'object', description: 'Rendered chart' } },
  chartType: 'bar',
  title: 'Monthly Sales',
  series: [
    { name: 'Revenue', dataKey: 'revenue', color: '#8884d8' },
    { name: 'Profit', dataKey: 'profit', color: '#82ca9d' },
  ],
  xAxisKey: 'month',
  stacked: false,
  showLegend: true,
  showGrid: true,
  showTooltip: true,
};

describe('ChartNode', () => {
  it('renders without crashing', () => {
    render(<ChartNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Sales Chart')).toBeInTheDocument();
  });

  it('renders chart type badge', () => {
    render(<ChartNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Bar')).toBeInTheDocument();
  });

  it('renders different chart types', () => {
    const lineData = { ...mockData, chartType: 'line' as const };
    render(<ChartNode {...baseProps} data={lineData} />);
    expect(screen.getByText('Line')).toBeInTheDocument();
  });

  it('renders stacked badge when stacked', () => {
    const stackedData = { ...mockData, stacked: true };
    render(<ChartNode {...baseProps} data={stackedData} />);
    expect(screen.getByText('Stacked')).toBeInTheDocument();
  });

  it('does not render stacked badge when not stacked', () => {
    render(<ChartNode {...baseProps} data={mockData} />);
    expect(screen.queryByText('Stacked')).not.toBeInTheDocument();
  });

  it('renders title', () => {
    render(<ChartNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Monthly Sales')).toBeInTheDocument();
  });

  it('renders series names', () => {
    render(<ChartNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Profit')).toBeInTheDocument();
  });

  it('shows overflow for many series', () => {
    const manySeries = {
      ...mockData,
      series: Array.from({ length: 5 }, (_, i) => ({
        name: `Series ${i}`,
        dataKey: `key${i}`,
        color: '#000',
      })),
    };
    render(<ChartNode {...baseProps} data={manySeries} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows empty state when no series', () => {
    const noSeries = { ...mockData, series: [] };
    render(<ChartNode {...baseProps} data={noSeries} />);
    expect(screen.getByText('No series configured')).toBeInTheDocument();
  });

  it('renders IO indicators', () => {
    render(<ChartNode {...baseProps} data={mockData} />);
    expect(screen.getByText('1 in')).toBeInTheDocument();
    expect(screen.getByText('1 out')).toBeInTheDocument();
  });

  it('does not render title when not set', () => {
    const noTitle = { ...mockData, title: '' };
    render(<ChartNode {...baseProps} data={noTitle} />);
    expect(screen.queryByText('Monthly Sales')).not.toBeInTheDocument();
  });
});
