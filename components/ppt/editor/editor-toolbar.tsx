'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import type { PPTSlideLayout, PPTPresentation, PPTSlideElement } from '@/types/workflow';
import { SLIDE_LAYOUT_INFO, DEFAULT_PPT_THEMES } from '@/types/workflow';
import { AlignmentToolbar } from './alignment-toolbar';
import { ThemeCustomizer } from '../theme';
import {
  Plus,
  Undo2,
  Redo2,
  Save,
  Download,
  Grid3X3,
  AlignLeft,
  Play,
  Palette,
  Layout,
  FileText,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Settings,
  Globe,
  Theater,
  File,
  BarChart3,
} from 'lucide-react';

export interface EditorToolbarProps {
  presentation: PPTPresentation;
  selectedElements: PPTSlideElement[];
  isDirty: boolean;
  zoom: number;
  showSlidePanel: boolean;
  showNotes: boolean;
  showThemeCustomizer: boolean;
  effectiveFullscreen: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAddSlide: (layout: PPTSlideLayout) => void;
  onSetThemeById: (id: string) => void;
  onThemeChange: (theme: PPTPresentation['theme']) => void;
  onSetShowThemeCustomizer: (show: boolean) => void;
  onSetZoom: (zoom: number) => void;
  onSetShowSlidePanel: (show: boolean) => void;
  onToggleNotes: () => void;
  onStartPresentation: () => void;
  onExport?: (format: string) => void;
  onToggleFullscreen: () => void;
  onAlign: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute: (direction: 'horizontal' | 'vertical') => void;
  onAutoArrange: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export function EditorToolbar({
  presentation,
  selectedElements,
  isDirty,
  zoom,
  showSlidePanel,
  showNotes,
  showThemeCustomizer,
  effectiveFullscreen,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddSlide,
  onSetThemeById,
  onThemeChange,
  onSetShowThemeCustomizer,
  onSetZoom,
  onSetShowSlidePanel,
  onToggleNotes,
  onStartPresentation,
  onExport,
  onToggleFullscreen,
  onAlign,
  onDistribute,
  onAutoArrange,
  onBringToFront,
  onSendToBack,
}: EditorToolbarProps) {
  const t = useTranslations('pptEditor');
  const tGen = useTranslations('pptGenerator');

  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        {/* File operations */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onSave}>
                <Save className={`h-4 w-4 ${isDirty ? 'text-primary' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('save')} (Ctrl+S)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('undo')} (Ctrl+Z)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('redo')} (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Add slide dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t('addSlide')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {Object.entries(SLIDE_LAYOUT_INFO).map(([layout, info]) => (
              <DropdownMenuItem
                key={layout}
                onClick={() => onAddSlide(layout as PPTSlideLayout)}
              >
                <Layout className="h-4 w-4 mr-2" />
                {info.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
            {DEFAULT_PPT_THEMES.map((theme) => (
              <DropdownMenuItem
                key={theme.id}
                onClick={() => onSetThemeById(theme.id)}
              >
                <div
                  className="h-4 w-4 rounded-full mr-2"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                {theme.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Customizer */}
        <Popover open={showThemeCustomizer} onOpenChange={onSetShowThemeCustomizer}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <ThemeCustomizer
              theme={presentation.theme}
              onChange={onThemeChange}
              onReset={() => onSetThemeById('modern-light')}
            />
          </PopoverContent>
        </Popover>

        {/* Aspect ratio selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2">
              {presentation.aspectRatio || '16:9'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(['16:9', '4:3', '16:10'] as const).map(ratio => (
              <DropdownMenuItem
                key={ratio}
                onClick={() => {
                  const store = usePPTEditorStore.getState();
                  if (store.presentation) {
                    usePPTEditorStore.setState({
                      presentation: { ...store.presentation, aspectRatio: ratio },
                      isDirty: true,
                    });
                    store.pushHistory('Change aspect ratio');
                  }
                }}
              >
                <span className={presentation.aspectRatio === ratio ? 'font-semibold' : ''}>
                  {ratio}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment Toolbar - shown when elements are selected */}
        {selectedElements.length > 0 && (
          <AlignmentToolbar
            onAlign={onAlign}
            onDistribute={onDistribute}
            onAutoArrange={onAutoArrange}
            onBringToFront={onBringToFront}
            onSendToBack={onSendToBack}
            disabled={selectedElements.length < 2}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onSetZoom(zoom - 10)} disabled={zoom <= 25}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" onClick={() => onSetZoom(zoom + 10)} disabled={zoom >= 200}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* View toggles */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showSlidePanel ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onSetShowSlidePanel(!showSlidePanel)}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toggleSlidePanel')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showNotes ? 'secondary' : 'ghost'}
                size="icon"
                onClick={onToggleNotes}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toggleNotes')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Slideshow */}
        <Button variant="default" size="sm" onClick={onStartPresentation}>
          <Play className="h-4 w-4 mr-1" />
          {t('present')}
        </Button>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              {t('export')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport?.('marp')}>
              <FileText className="h-4 w-4 mr-2" />
              {tGen('exportFormatMarp')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.('html')}>
              <Globe className="h-4 w-4 mr-2" />
              {tGen('exportFormatHtml')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.('reveal')}>
              <Theater className="h-4 w-4 mr-2" />
              {tGen('exportFormatReveal')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport?.('pdf')}>
              <File className="h-4 w-4 mr-2" />
              {tGen('exportFormatPdf')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.('pptx')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {tGen('exportFormatPptx')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fullscreen toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggleFullscreen}>
                {effectiveFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {effectiveFullscreen ? t('exitFullscreen') : t('fullscreen')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
