'use client';

/**
 * Chart Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { ChartNodeData, ChartSeriesConfig, ChartType } from '@/types/workflow/workflow-editor';
import type { NodeConfigProps } from './types';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'Line Chart' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'scatter', label: 'Scatter Chart' },
  { value: 'radar', label: 'Radar Chart' },
  { value: 'composed', label: 'Composed Chart' },
];

const DEFAULT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
  '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57',
];

export function ChartNodeConfig({ data, onUpdate }: NodeConfigProps<ChartNodeData>) {
  const t = useTranslations('workflowEditor');

  const handleAddSeries = () => {
    const newSeries: ChartSeriesConfig = {
      dataKey: '',
      name: `Series ${data.series.length + 1}`,
      color: DEFAULT_COLORS[data.series.length % DEFAULT_COLORS.length],
    };
    onUpdate({ series: [...data.series, newSeries] } as Partial<ChartNodeData>);
  };

  const handleUpdateSeries = (index: number, updates: Partial<ChartSeriesConfig>) => {
    const newSeries = [...data.series];
    newSeries[index] = { ...newSeries[index], ...updates };
    onUpdate({ series: newSeries } as Partial<ChartNodeData>);
  };

  const handleRemoveSeries = (index: number) => {
    const newSeries = data.series.filter((_, i) => i !== index);
    onUpdate({ series: newSeries } as Partial<ChartNodeData>);
  };

  return (
    <div className="space-y-4">
      {/* Chart Type */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t('chartType') || 'Chart Type'}</Label>
        <Select
          value={data.chartType}
          onValueChange={(value) => onUpdate({ chartType: value as ChartType } as Partial<ChartNodeData>)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPES.map((ct) => (
              <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t('chartTitle') || 'Title'}</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value } as Partial<ChartNodeData>)}
          placeholder="Chart Title"
          className="h-8 text-sm"
        />
      </div>

      {/* Axis keys (not for pie/radar) */}
      {data.chartType !== 'pie' && data.chartType !== 'radar' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('xAxisKey') || 'X Axis Key'}</Label>
            <Input
              value={data.xAxisKey || ''}
              onChange={(e) => onUpdate({ xAxisKey: e.target.value } as Partial<ChartNodeData>)}
              placeholder="name"
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('yAxisKey') || 'Y Axis Key'}</Label>
            <Input
              value={data.yAxisKey || ''}
              onChange={(e) => onUpdate({ yAxisKey: e.target.value } as Partial<ChartNodeData>)}
              placeholder="value"
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>
      )}

      {/* Data Series */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('dataSeries') || 'Data Series'}</Label>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleAddSeries}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {data.series.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No series defined. Add a series to configure chart data.
          </p>
        )}
        {data.series.map((series, index) => (
          <div key={index} className="p-2 border rounded-md space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: series.color || DEFAULT_COLORS[0] }}
                />
                {series.name || `Series ${index + 1}`}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveSeries(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={series.dataKey}
                onChange={(e) => handleUpdateSeries(index, { dataKey: e.target.value })}
                placeholder="dataKey"
                className="h-7 text-xs font-mono"
              />
              <Input
                value={series.name}
                onChange={(e) => handleUpdateSeries(index, { name: e.target.value })}
                placeholder="Name"
                className="h-7 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={series.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                onChange={(e) => handleUpdateSeries(index, { color: e.target.value })}
                className="h-7 w-10 p-0.5 cursor-pointer"
              />
              {data.chartType === 'composed' && (
                <Select
                  value={series.type || 'line'}
                  onValueChange={(value) => handleUpdateSeries(index, { type: value as 'line' | 'bar' | 'area' })}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Display Options */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium">{t('displayOptions') || 'Display Options'}</Label>
        <div className="grid grid-cols-2 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={data.showLegend}
              onCheckedChange={(checked) => onUpdate({ showLegend: checked } as Partial<ChartNodeData>)}
              className="scale-75"
            />
            <Label className="text-xs">Legend</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={data.showGrid}
              onCheckedChange={(checked) => onUpdate({ showGrid: checked } as Partial<ChartNodeData>)}
              className="scale-75"
            />
            <Label className="text-xs">Grid</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={data.showTooltip}
              onCheckedChange={(checked) => onUpdate({ showTooltip: checked } as Partial<ChartNodeData>)}
              className="scale-75"
            />
            <Label className="text-xs">Tooltip</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={data.stacked}
              onCheckedChange={(checked) => onUpdate({ stacked: checked } as Partial<ChartNodeData>)}
              className="scale-75"
            />
            <Label className="text-xs">Stacked</Label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartNodeConfig;
