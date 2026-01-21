'use client';

import {
  Save,
  Copy,
  Wand2,
  Eye,
  EyeOff,
  RotateCcw,
  BookOpen,
  Undo2,
  Redo2,
  Upload,
  Download,
  RefreshCw,
  WrapText,
  Variable,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RULE_TEMPLATES, EDITOR_VARIABLES } from '../constants';

interface RulesEditorToolbarProps {
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
  onApplyTemplate: (category: string, templateKey: string) => void;
  onInsertVariable: (variable: string) => void;
  onImport: () => void;
  onExport: () => void;
  onReset: () => void;
  onCopy: () => void;
  onSave: () => void;
}

export function RulesEditorToolbar({
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
  onApplyTemplate,
  onInsertVariable,
  onImport,
  onExport,
  onReset,
  onCopy,
  onSave,
}: RulesEditorToolbarProps) {
  const t = useTranslations('rules');

  return (
    <div className="hidden md:flex items-center gap-1.5">
      <TooltipProvider>
        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('undo')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('redo')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Show/Hide Preview */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn('h-8 w-8', showPreview && 'bg-accent')}
              onClick={onTogglePreview}
            >
              {showPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('preview')}</TooltipContent>
        </Tooltip>

        {/* Word Wrap Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn('h-8 w-8', wordWrap && 'bg-accent')}
              onClick={onToggleWordWrap}
            >
              <WrapText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('wordWrap')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* AI Optimization */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 text-xs bg-primary/10 hover:bg-primary/20 hover:text-primary transition-all duration-300 border-primary/20"
              onClick={onOptimize}
              disabled={isOptimizing || !activeContent}
            >
              {isOptimizing ? (
                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {isOptimizing ? t('optimizing') : t('optimize')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('optimize')}</TooltipContent>
        </Tooltip>

        {/* Template Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  {t('templates')}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('templates')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            {Object.entries(RULE_TEMPLATES).map(([catId, templates]) => (
              <DropdownMenuGroup key={catId}>
                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                  {t(`categories.${catId}`) || catId}
                </DropdownMenuLabel>
                {Object.entries(templates).map(([key, template]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onApplyTemplate(catId, key)}
                    className="text-xs cursor-pointer"
                  >
                    {template.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Variables Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Variable className="h-3.5 w-3.5" />
                  {t('variables')}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('variables')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs">{t('insert')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {EDITOR_VARIABLES.map((v) => (
              <DropdownMenuItem
                key={v.value}
                onClick={() => onInsertVariable(v.value)}
                className="flex flex-col items-start gap-1 p-2 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full font-mono text-[11px] text-primary">
                  <span>{v.value}</span>
                  <Badge variant="outline" className="text-[9px] h-4 py-0 font-normal">
                    {v.label}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">{v.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Import/Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onImport}>
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('import')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('export')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onReset}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('reset')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Action Buttons */}
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
          {t('copy')}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onSave} disabled={!isDirty}>
          <Save className="h-3.5 w-3.5" />
          {t('save')}
        </Button>
      </TooltipProvider>
    </div>
  );
}
