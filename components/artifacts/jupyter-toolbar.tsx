'use client';

/**
 * NotebookToolbar - Toolbar for Jupyter notebook actions
 * Export, collapse/expand, and clear outputs
 */

import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  FileCode,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
interface NotebookToolbarProps {
  language: string;
  stats: { code: number; markdown: number; outputs: number };
  onExportScript: () => void;
  onExportMarkdown: () => void;
  onExportNotebook: () => void;
  onClearOutputs?: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  t: ReturnType<typeof useTranslations>;
}

export function NotebookToolbar({
  language,
  stats,
  onExportScript,
  onExportMarkdown,
  onExportNotebook,
  onClearOutputs,
  onCollapseAll,
  onExpandAll,
  t,
}: NotebookToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
      {/* Notebook info */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-mono">
          {language}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {stats.code} {t('codeCells')} · {stats.markdown} {t('markdownCells')}
          {stats.outputs > 0 && ` · ${stats.outputs} ${t('outputs')}`}
        </span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandAll}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('expandAll')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCollapseAll}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('collapseAll')}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExportScript}>
                <FileCode className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('exportScript')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExportMarkdown}>
                <FileText className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('exportMarkdown')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExportNotebook}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('exportNotebook')}</TooltipContent>
          </Tooltip>

          {onClearOutputs && (
            <>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={onClearOutputs}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('clearOutputs')}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
