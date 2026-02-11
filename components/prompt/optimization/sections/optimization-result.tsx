'use client';

import { useTranslations } from 'next-intl';
import {
  Check,
  Copy,
  RefreshCw,
  Columns2,
  Pencil,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OptimizationResultProps {
  result: {
    optimized: string;
    improvements: string[];
    mode?: string;
  };
  initialPrompt: string;
  optimizeDuration: number | null;
  isEditing: boolean;
  editedResult: string;
  showComparison: boolean;
  copied: boolean;
  onEditToggle: () => void;
  onEditedResultChange: (value: string) => void;
  onComparisonToggle: () => void;
  onCopy: () => void;
  onReset: () => void;
}

export function OptimizationResult({
  result,
  initialPrompt,
  optimizeDuration,
  isEditing,
  editedResult,
  showComparison,
  copied,
  onEditToggle,
  onEditedResultChange,
  onComparisonToggle,
  onCopy,
  onReset,
}: OptimizationResultProps) {
  const t = useTranslations('promptOptimizer');

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-primary">{t('optimizedPrompt')}</Label>
          {'mode' in result && result.mode === 'mcp' && (
            <Badge variant="outline" className="text-xs">
              MCP
            </Badge>
          )}
          {optimizeDuration !== null && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-muted-foreground">
              <Timer className="h-3 w-3" />
              {(optimizeDuration / 1000).toFixed(1)}s
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEditing ? 'secondary' : 'ghost'}
                size="sm"
                onClick={onEditToggle}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('editToggle')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showComparison ? 'secondary' : 'ghost'}
                size="sm"
                onClick={onComparisonToggle}
              >
                <Columns2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('compareToggle')}</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editable / Comparison / Normal View */}
      {isEditing ? (
        <Textarea
          value={editedResult}
          onChange={(e) => onEditedResultChange(e.target.value)}
          className="min-h-[120px] max-h-[300px] text-sm"
        />
      ) : showComparison ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('originalPrompt')}</Label>
            <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {initialPrompt}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-primary">{t('optimizedPrompt')}</Label>
            <div className="rounded-lg bg-primary/5 border-primary/20 border p-3 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {result.optimized}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
          {result.optimized}
        </div>
      )}

      {result.improvements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.improvements.map((improvement, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {improvement}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
