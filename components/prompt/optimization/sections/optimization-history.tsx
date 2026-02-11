'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface HistoryEntry {
  id: string;
  mode: string;
  style?: string;
  optimized: string;
  timestamp: number;
}

interface OptimizationHistoryProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
  onApplyFromHistory: (optimized: string) => void;
}

export function OptimizationHistory({
  history,
  onClearHistory,
  onApplyFromHistory,
}: OptimizationHistoryProps) {
  const t = useTranslations('promptOptimizer');

  return (
    <div className="space-y-2 rounded-lg border p-3 max-h-[200px] overflow-y-auto">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{t('historyTitle')}</Label>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHistory}
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {t('historyClear')}
          </Button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t('historyEmpty')}</p>
      ) : (
        <div className="space-y-1.5">
          {history.slice(0, 10).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-card p-2 text-xs hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {entry.mode === 'mcp' ? 'MCP' : entry.style || 'local'}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="truncate text-foreground">{entry.optimized.slice(0, 80)}...</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 shrink-0"
                onClick={() => onApplyFromHistory(entry.optimized)}
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
