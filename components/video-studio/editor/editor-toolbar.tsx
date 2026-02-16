'use client';

/**
 * EditorToolbar - Toolbar for the video editor panel
 *
 * Extracted from VideoEditorPanel to reduce component size.
 * Contains all toolbar buttons for editing modes, side panels, zoom, and dialogs.
 */

import { useTranslations } from 'next-intl';
import {
  Scissors,
  Sparkles,
  Undo,
  Redo,
  FolderOpen,
  Type,
  ArrowRight,
  Download,
  Palette,
  Timer,
  Flag,
  Settings,
  Keyboard,
  Layers,
  Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ZoomControls } from '../common/zoom-controls';
import type { EditorMode, SidePanelTab } from '@/types/video-studio/types';

export interface EditorToolbarProps {
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  showSidePanel: boolean;
  sidePanelTab: SidePanelTab;
  onToggleSidePanel: (tab: SidePanelTab) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onImportVideo: () => void;
  onOpenTrim: () => void;
  hasSelectedClip: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToView: () => void;
  onShowKeyboardShortcuts: () => void;
  onShowProjectSettings: () => void;
  onShowExportDialog: () => void;
}

export function EditorToolbar({
  editorMode,
  setEditorMode,
  showSidePanel,
  sidePanelTab,
  onToggleSidePanel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onImportVideo,
  onOpenTrim,
  hasSelectedClip,
  zoom,
  onZoomChange,
  onFitToView,
  onShowKeyboardShortcuts,
  onShowProjectSettings,
  onShowExportDialog,
}: EditorToolbarProps) {
  const t = useTranslations('editorPanel');

  return (
    <div className="flex items-center justify-between p-2 border-b gap-2">
      <div className="flex items-center gap-1 sm:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onImportVideo}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('importVideo')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('undo')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('redo')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editorMode === 'trim' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={onOpenTrim}
              disabled={!hasSelectedClip}
            >
              <Scissors className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trimClip')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editorMode === 'effects' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditorMode('effects')}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('effects')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editorMode === 'transitions' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditorMode('transitions')}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('transitions')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editorMode === 'subtitles' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditorMode('subtitles')}
            >
              <Type className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('subtitles')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showSidePanel && sidePanelTab === 'color' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onToggleSidePanel('color')}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('colorCorrection')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editorMode === 'speed' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditorMode(editorMode === 'speed' ? 'timeline' : 'speed')}
            >
              <Timer className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('speedControls')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editorMode === 'markers' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setEditorMode(editorMode === 'markers' ? 'timeline' : 'markers')}
            >
              <Flag className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('markers')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showSidePanel && sidePanelTab === 'audio' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onToggleSidePanel('audio')}
            >
              <Music className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('audioMixer')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showSidePanel && sidePanelTab === 'layers' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onToggleSidePanel('layers')}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('layers')}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ZoomControls
          zoom={zoom}
          minZoom={0.1}
          maxZoom={10}
          step={0.25}
          onZoomChange={onZoomChange}
          onFitToView={onFitToView}
          compact
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onShowKeyboardShortcuts}>
              <Keyboard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('keyboardShortcuts')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onShowProjectSettings}>
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('projectSettings')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="default" size="icon" onClick={onShowExportDialog}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('export')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
