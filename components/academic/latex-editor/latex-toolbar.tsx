'use client';

/**
 * LaTeX Toolbar Component
 * Provides quick access to common LaTeX commands and formatting
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { LatexAIDropdown, type LatexAIFeature } from './latex-ai-dropdown';
import { SymbolPicker } from './symbol-picker';
import type { LatexAITextAction } from '@/hooks/latex/use-latex-ai';
import type { LaTeXEditMode } from '@/types/latex';
import {
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Subscript,
  Superscript,
  Sigma,
  Pi,
  Divide,
  Radical,
  Undo,
  Redo,
  Eye,
  SplitSquareHorizontal,
  FileCode,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';

interface LaTeXToolbarProps {
  onInsert: (text: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  mode: LaTeXEditMode;
  onModeChange: (mode: LaTeXEditMode) => void;
  onImport: () => void;
  onExport: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  onOpenAIChat?: () => void;
  onOpenEquationDialog?: () => void;
  onOpenAISettings?: () => void;
  onAITextAction?: (action: LatexAITextAction) => void;
  readOnly?: boolean;
  className?: string;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  disabled?: boolean;
}

export function LaTeXToolbar({
  onInsert,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  mode,
  onModeChange,
  onImport,
  onExport,
  onFullscreen,
  isFullscreen,
  onOpenAIChat,
  onOpenEquationDialog,
  onOpenAISettings,
  onAITextAction,
  readOnly = false,
  className,
}: LaTeXToolbarProps) {
  const t = useTranslations('latex');

  const formatButtons: ToolbarButton[] = [
    { icon: <Bold className="h-4 w-4" />, label: 'Bold', action: () => onInsert('\\textbf{}') },
    { icon: <Italic className="h-4 w-4" />, label: 'Italic', action: () => onInsert('\\textit{}') },
    { icon: <Underline className="h-4 w-4" />, label: 'Underline', action: () => onInsert('\\underline{}') },
    { icon: <Code className="h-4 w-4" />, label: 'Code', action: () => onInsert('\\texttt{}') },
  ];

  const listButtons: ToolbarButton[] = [
    { icon: <List className="h-4 w-4" />, label: 'Bullet List', action: () => onInsert('\\begin{itemize}\n  \\item \n\\end{itemize}') },
    { icon: <ListOrdered className="h-4 w-4" />, label: 'Numbered List', action: () => onInsert('\\begin{enumerate}\n  \\item \n\\end{enumerate}') },
  ];

  const mathButtons: ToolbarButton[] = [
    { icon: <Subscript className="h-4 w-4" />, label: 'Subscript', action: () => onInsert('_{}') },
    { icon: <Superscript className="h-4 w-4" />, label: 'Superscript', action: () => onInsert('^{}') },
    { icon: <Divide className="h-4 w-4" />, label: 'Fraction', action: () => onInsert('\\frac{}{}') },
    { icon: <Radical className="h-4 w-4" />, label: 'Square Root', action: () => onInsert('\\sqrt{}') },
    { icon: <Sigma className="h-4 w-4" />, label: 'Sum', action: () => onInsert('\\sum_{i=1}^{n}') },
    { icon: <Pi className="h-4 w-4" />, label: 'Product', action: () => onInsert('\\prod_{i=1}^{n}') },
  ];

  const mathEnvironments = [
    { label: 'Inline Math', insert: '$$' },
    { label: 'Display Math', insert: '\\[\n\n\\]' },
    { label: 'Equation', insert: '\\begin{equation}\n\n\\end{equation}' },
    { label: 'Align', insert: '\\begin{align}\n\n\\end{align}' },
    { label: 'Matrix', insert: '\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}' },
    { label: 'Cases', insert: '\\begin{cases}\nx & \\text{if } x > 0 \\\\\n-x & \\text{otherwise}\n\\end{cases}' },
  ];

  const handleAISelect = (feature: LatexAIFeature) => {
    if (
      feature === 'improveWriting' ||
      feature === 'fixGrammar' ||
      feature === 'makeConcise' ||
      feature === 'expandText' ||
      feature === 'translate'
    ) {
      onAITextAction?.(feature);
      return;
    }

    if (feature === 'equationGenerator') {
      onOpenEquationDialog?.();
      return;
    }

    if (feature === 'settings') {
      onOpenAISettings?.();
      return;
    }

    onOpenAIChat?.();
  };

  const renderButton = (btn: ToolbarButton) => (
    <TooltipProvider key={btn.label}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={btn.action}
            disabled={btn.disabled || readOnly}
          >
            {btn.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{btn.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className={cn('flex items-center gap-1 p-2 border-b bg-muted/30', className)}>
      {/* Undo/Redo */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onUndo}
              disabled={!canUndo || readOnly}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toolbar.undo')} (Ctrl+Z)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onRedo}
              disabled={!canRedo || readOnly}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toolbar.redo')} (Ctrl+Y)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Format buttons */}
      {formatButtons.map(renderButton)}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* List buttons */}
      {listButtons.map(renderButton)}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Math buttons */}
      {mathButtons.map(renderButton)}

      {/* Math environments dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2" disabled={readOnly}>
            <span className="text-xs">{t('toolbar.math')}</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {mathEnvironments.map((env) => (
            <DropdownMenuItem key={env.label} onClick={() => onInsert(env.insert)}>
              {env.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Symbol picker dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2" disabled={readOnly}>
            <span className="text-xs">{t('toolbar.symbol')}</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-2 w-[360px]" align="start">
          <SymbolPicker
            onSelect={(symbol) => {
              onInsert(symbol.command);
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <LatexAIDropdown
        onSelect={handleAISelect}
        className="h-8"
      />

      <div className="flex-1" />

      {/* View mode buttons */}
      <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === 'source' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => onModeChange('source')}
              >
                <FileCode className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toolbar.sourceView')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === 'split' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => onModeChange('split')}
              >
                <SplitSquareHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toolbar.splitView')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mode === 'visual' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => onModeChange('visual')}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toolbar.preview')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* File operations */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onImport}>
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toolbar.import')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('toolbar.export')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isFullscreen ? t('toolbar.exitFullscreen') : t('toolbar.fullscreen')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default LaTeXToolbar;
