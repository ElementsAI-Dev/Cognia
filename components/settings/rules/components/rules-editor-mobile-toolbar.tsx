'use client';

import {
  Save,
  Copy,
  Wand2,
  Eye,
  EyeOff,
  RotateCcw,
  Undo2,
  Redo2,
  Upload,
  Download,
  RefreshCw,
  WrapText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RulesEditorMobileToolbarProps {
  // State
  canUndo: boolean;
  canRedo: boolean;
  showPreview: boolean;
  wordWrap: boolean;
  isOptimizing: boolean;
  isDirty: boolean;
  activeContent: string;

  // Actions
  onUndo: () => void;
  onRedo: () => void;
  onTogglePreview: () => void;
  onToggleWordWrap: () => void;
  onOptimize: () => void;
  onImport: () => void;
  onExport: () => void;
  onReset: () => void;
  onCopy: () => void;
  onSave: () => void;
}

export function RulesEditorMobileToolbar({
  canUndo,
  canRedo,
  showPreview,
  wordWrap,
  isOptimizing,
  isDirty,
  activeContent,
  onUndo,
  onRedo,
  onTogglePreview,
  onToggleWordWrap,
  onOptimize,
  onImport,
  onExport,
  onReset,
  onCopy,
  onSave,
}: RulesEditorMobileToolbarProps) {
  const t = useTranslations('rules');

  return (
    <div className="md:hidden px-3 py-2 border-b bg-muted/30 flex flex-wrap gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={t('ariaLabels.undo')}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={t('ariaLabels.redo')}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn('h-10 w-10 p-0', showPreview && 'bg-accent')}
        onClick={onTogglePreview}
        aria-label={t('ariaLabels.togglePreview')}
      >
        {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn('h-10 w-10 p-0', wordWrap && 'bg-accent')}
        onClick={onToggleWordWrap}
        aria-label={t('ariaLabels.toggleWordWrap')}
      >
        <WrapText className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={onOptimize}
        disabled={isOptimizing || !activeContent}
        aria-label={t('ariaLabels.aiOptimize')}
      >
        {isOptimizing ? (
          <RotateCcw className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={onImport}
        aria-label={t('ariaLabels.import')}
      >
        <Upload className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={onExport}
        aria-label={t('ariaLabels.export')}
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={onReset}
        aria-label={t('ariaLabels.reset')}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={onCopy}
        aria-label={t('ariaLabels.copy')}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        className="h-10 w-10 p-0"
        onClick={onSave}
        disabled={!isDirty}
        aria-label={t('ariaLabels.save')}
      >
        <Save className="h-4 w-4" />
      </Button>
    </div>
  );
}
