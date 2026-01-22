'use client';

/**
 * MermaidEditorModal - Standalone modal for editing Mermaid diagrams
 * Full-screen editing experience with all features
 */

import { useState, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import { X, Save, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MermaidEditor, type MermaidEditorViewMode } from './mermaid-editor';

export interface MermaidEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
  onSave?: (code: string) => void;
  title?: string;
}

export const MermaidEditorModal = memo(function MermaidEditorModal({
  open,
  onOpenChange,
  initialCode = '',
  onSave,
  title,
}: MermaidEditorModalProps) {
  const t = useTranslations('mermaidEditor');
  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<MermaidEditorViewMode>('split');
  const [hasChanges, setHasChanges] = useState(false);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setHasChanges(newCode !== initialCode);
    },
    [initialCode]
  );

  const handleSave = useCallback(() => {
    onSave?.(code);
    setHasChanges(false);
  }, [code, onSave]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      // Could add confirmation dialog here
      const confirmed = window.confirm(t('unsavedChangesConfirm'));
      if (!confirmed) return;
    }
    onOpenChange(false);
  }, [hasChanges, onOpenChange, t]);

  const handleSaveAndClose = useCallback(() => {
    handleSave();
    onOpenChange(false);
  }, [handleSave, onOpenChange]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Sync initial code when modal opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setCode(initialCode);
        setHasChanges(false);
      }
      onOpenChange(newOpen);
    },
    [initialCode, onOpenChange]
  );

  const dialogContentClass = isFullscreen
    ? 'max-w-[100vw] max-h-[100vh] w-screen h-screen rounded-none'
    : 'max-w-[90vw] max-h-[90vh] w-[1200px] h-[800px]';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 gap-0 overflow-hidden',
          dialogContentClass
        )}
        onPointerDownOutside={(e) => {
          if (hasChanges) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="flex-shrink-0 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">
              {title || t('editDiagram')}
              {hasChanges && <span className="ml-2 text-xs text-muted-foreground">({t('unsaved')})</span>}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
                </TooltipContent>
              </Tooltip>

              {onSave && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="h-8"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {t('save')}
                </Button>
              )}

              {onSave && (
                <Button
                  size="sm"
                  onClick={handleSaveAndClose}
                  disabled={!hasChanges}
                  className="h-8"
                >
                  {t('saveAndClose')}
                </Button>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('close')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <MermaidEditor
            initialCode={code}
            onChange={handleCodeChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showToolbar={true}
            showTemplates={true}
            className="h-full border-0 rounded-none"
            minHeight="100%"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default MermaidEditorModal;
