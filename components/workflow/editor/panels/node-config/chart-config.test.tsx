import { fireEvent, screen } from '@testing-library/react';
import { ChartNodeConfig } from './chart-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);

describe('ChartNodeConfig', () => {
  it('adds and updates series', () => {
    const { onUpdate } = renderNodeConfig(ChartNodeConfig, {
      id: 'n1',
      nodeType: 'chart',
      label: 'Chart',
      chartType: 'line',
      title: 'Sales',
      xAxisKey: 'name',
      yAxisKey: 'value',
      series: [],
      showLegend: true,
      showGrid: true,
      showTooltip: true,
      stacked: false,
    } as any);

    fireEvent.click(screen.getByText('Add'));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ series: expect.any(Array) }));
  });

  it('updates title and display options', () => {
    const { onUpdate } = renderNodeConfig(ChartNodeConfig, {
      id: 'n1',
      nodeType: 'chart',
      label: 'Chart',
      chartType: 'line',
      title: 'Sales',
      xAxisKey: 'name',
      yAxisKey: 'value',
      series: [{ dataKey: 'value', name: 'Revenue', color: '#8884d8' }],
      showLegend: true,
      showGrid: true,
      showTooltip: true,
      stacked: false,
    } as any);

    fireEvent.change(screen.getByDisplayValue('Sales'), { target: { value: 'Revenue Trend' } });
    fireEvent.click(screen.getAllByRole('switch')[0]);

    expect(onUpdate).toHaveBeenCalledWith({ title: 'Revenue Trend' });
    expect(onUpdate).toHaveBeenCalledWith({ showLegend: false });
  });
});
