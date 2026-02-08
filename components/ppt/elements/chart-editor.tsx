'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, BarChart3 } from 'lucide-react';
import type { ChartType, ChartData } from './chart-element';

interface ChartEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartType?: string;
  chartData?: ChartData;
  onSave: (chartType: string, chartData: ChartData) => void;
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'horizontal-bar', label: 'Horizontal Bar' },
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'doughnut', label: 'Doughnut Chart' },
  { value: 'scatter', label: 'Scatter Plot' },
];

const DEFAULT_DATA: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'Series 1',
    data: [30, 50, 40, 60, 45],
  }],
};

/**
 * ChartEditor - Dialog for editing chart type and data
 */
export function ChartEditor({
  open,
  onOpenChange,
  chartType: initialType,
  chartData: initialData,
  onSave,
}: ChartEditorProps) {
  const t = useTranslations('pptEditor');
  const [chartType, setChartType] = useState<string>(initialType || 'bar');
  const [labels, setLabels] = useState<string[]>(
    initialData?.labels || DEFAULT_DATA.labels
  );
  const [datasets, setDatasets] = useState<Array<{ label: string; data: number[] }>>(
    initialData?.datasets?.map(d => ({ label: d.label, data: [...d.data] })) ||
    DEFAULT_DATA.datasets.map(d => ({ label: d.label, data: [...d.data] }))
  );

  const updateLabel = useCallback((index: number, value: string) => {
    setLabels(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const updateDataPoint = useCallback((datasetIdx: number, pointIdx: number, value: string) => {
    setDatasets(prev => {
      const next = prev.map(d => ({ ...d, data: [...d.data] }));
      next[datasetIdx].data[pointIdx] = parseFloat(value) || 0;
      return next;
    });
  }, []);

  const updateDatasetLabel = useCallback((datasetIdx: number, value: string) => {
    setDatasets(prev => {
      const next = prev.map(d => ({ ...d, data: [...d.data] }));
      next[datasetIdx].label = value;
      return next;
    });
  }, []);

  const addDataPoint = useCallback(() => {
    setLabels(prev => [...prev, `Item ${prev.length + 1}`]);
    setDatasets(prev => prev.map(d => ({ ...d, data: [...d.data, 0] })));
  }, []);

  const removeDataPoint = useCallback(() => {
    if (labels.length <= 2) return;
    setLabels(prev => prev.slice(0, -1));
    setDatasets(prev => prev.map(d => ({ ...d, data: d.data.slice(0, -1) })));
  }, [labels.length]);

  const addDataset = useCallback(() => {
    setDatasets(prev => [
      ...prev,
      { label: `Series ${prev.length + 1}`, data: Array(labels.length).fill(0) },
    ]);
  }, [labels.length]);

  const removeDataset = useCallback(() => {
    if (datasets.length <= 1) return;
    setDatasets(prev => prev.slice(0, -1));
  }, [datasets.length]);

  const handleSave = useCallback(() => {
    const chartData: ChartData = {
      labels,
      datasets: datasets.map(d => ({
        label: d.label,
        data: d.data,
      })),
    };
    onSave(chartType, chartData);
    onOpenChange(false);
  }, [labels, datasets, chartType, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('editChart') || 'Edit Chart'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chart type selector */}
          <div className="space-y-1.5">
            <Label>{t('chartType') || 'Chart Type'}</Label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('chartData') || 'Data'}</Label>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addDataPoint}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t('addPoint') || 'Point'}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={removeDataPoint} disabled={labels.length <= 2}>
                  <Minus className="h-3 w-3 mr-1" />
                  {t('removePoint') || 'Point'}
                </Button>
                <span className="text-muted-foreground mx-1">|</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addDataset}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t('addSeries') || 'Series'}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={removeDataset} disabled={datasets.length <= 1}>
                  <Minus className="h-3 w-3 mr-1" />
                  {t('removeSeries') || 'Series'}
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[250px]">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-1 py-1 text-xs font-medium text-muted-foreground w-24">
                      {t('label') || 'Label'}
                    </th>
                    {datasets.map((ds, di) => (
                      <th key={di} className="px-1 py-1">
                        <Input
                          value={ds.label}
                          onChange={(e) => updateDatasetLabel(di, e.target.value)}
                          className="h-7 text-xs text-center"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labels.map((label, li) => (
                    <tr key={li}>
                      <td className="px-1 py-0.5">
                        <Input
                          value={label}
                          onChange={(e) => updateLabel(li, e.target.value)}
                          className="h-7 text-xs"
                        />
                      </td>
                      {datasets.map((ds, di) => (
                        <td key={di} className="px-1 py-0.5">
                          <Input
                            type="number"
                            value={ds.data[li] ?? 0}
                            onChange={(e) => updateDataPoint(di, li, e.target.value)}
                            className="h-7 text-xs text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave}>
            {t('save') || 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ChartEditor;
