'use client';

/**
 * FlowKeyboardShortcuts - Keyboard shortcut handler for flow canvas
 * Provides keyboard navigation and actions
 */

import { useEffect, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import { useReactFlow } from '@xyflow/react';
import {
  Keyboard,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  Search,
  Copy,
  Trash2,
  GitBranch,
  ChevronUp,
} from 'lucide-react';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NodeAction } from '@/types/chat/flow-chat';

interface ShortcutDefinition {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
  action: string;
  icon?: React.ReactNode;
}

interface FlowKeyboardShortcutsProps {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Selected node IDs */
  selectedNodeIds: string[];
  /** Callback for node actions */
  onNodeAction?: (action: NodeAction, nodeId: string) => void;
  /** Callback for canvas actions */
  onCanvasAction?: (action: string) => void;
  /** Callback to open search */
  onOpenSearch?: () => void;
  /** Callback to auto layout */
  onAutoLayout?: () => void;
  /** Callback to fit view */
  onFitView?: () => void;
  /** Show help dialog */
  showHelp?: boolean;
  onShowHelpChange?: (show: boolean) => void;
}

const SHORTCUTS: ShortcutDefinition[] = [
  { key: 'f', modifiers: ['ctrl'], description: 'Search nodes', action: 'search', icon: <Search className="h-3.5 w-3.5" /> },
  { key: 'l', modifiers: ['ctrl'], description: 'Auto layout', action: 'layout', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { key: '0', modifiers: ['ctrl'], description: 'Fit view', action: 'fitView', icon: <Maximize2 className="h-3.5 w-3.5" /> },
  { key: '+', modifiers: ['ctrl'], description: 'Zoom in', action: 'zoomIn', icon: <ZoomIn className="h-3.5 w-3.5" /> },
  { key: '-', modifiers: ['ctrl'], description: 'Zoom out', action: 'zoomOut', icon: <ZoomOut className="h-3.5 w-3.5" /> },
  { key: 'c', modifiers: ['ctrl'], description: 'Copy selected node content', action: 'copy', icon: <Copy className="h-3.5 w-3.5" /> },
  { key: 'b', description: 'Create branch from selected', action: 'branch', icon: <GitBranch className="h-3.5 w-3.5" /> },
  { key: 'e', description: 'Expand/collapse selected node', action: 'collapse', icon: <ChevronUp className="h-3.5 w-3.5" /> },
  { key: 'Delete', description: 'Delete selected node', action: 'delete', icon: <Trash2 className="h-3.5 w-3.5" /> },
  { key: 'Escape', description: 'Clear selection', action: 'clearSelection' },
  { key: '?', modifiers: ['shift'], description: 'Show keyboard shortcuts', action: 'showHelp', icon: <Keyboard className="h-3.5 w-3.5" /> },
];

function ShortcutBadge({ shortcut }: { shortcut: ShortcutDefinition }) {
  return (
    <KbdGroup>
      {shortcut.modifiers?.includes('ctrl') && <Kbd>Ctrl</Kbd>}
      {shortcut.modifiers?.includes('shift') && <Kbd>Shift</Kbd>}
      {shortcut.modifiers?.includes('alt') && <Kbd>Alt</Kbd>}
      <Kbd>{shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key}</Kbd>
    </KbdGroup>
  );
}

function FlowKeyboardShortcutsComponent({
  enabled = true,
  selectedNodeIds,
  onNodeAction,
  onCanvasAction,
  onOpenSearch,
  onAutoLayout,
  onFitView,
  showHelp = false,
  onShowHelpChange,
}: FlowKeyboardShortcutsProps) {
  const t = useTranslations('flowChat');
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't capture when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;
    const key = event.key.toLowerCase();

    // Find matching shortcut
    for (const shortcut of SHORTCUTS) {
      const ctrlMatch = shortcut.modifiers?.includes('ctrl') ? isCtrl : !isCtrl;
      const shiftMatch = shortcut.modifiers?.includes('shift') ? isShift : !isShift;
      const keyMatch = shortcut.key.toLowerCase() === key;

      if (ctrlMatch && shiftMatch && keyMatch) {
        event.preventDefault();
        
        switch (shortcut.action) {
          case 'search':
            onOpenSearch?.();
            break;
          case 'layout':
            onAutoLayout?.();
            break;
          case 'fitView':
            if (onFitView) {
              onFitView();
            } else {
              fitView({ padding: 0.2, duration: 300 });
            }
            break;
          case 'zoomIn':
            zoomIn({ duration: 200 });
            break;
          case 'zoomOut':
            zoomOut({ duration: 200 });
            break;
          case 'copy':
          case 'branch':
          case 'collapse':
          case 'delete':
            if (selectedNodeIds.length > 0) {
              onNodeAction?.(shortcut.action as NodeAction, selectedNodeIds[0]);
            }
            break;
          case 'clearSelection':
            onCanvasAction?.('clearSelection');
            break;
          case 'showHelp':
            onShowHelpChange?.(!showHelp);
            break;
        }
        return;
      }
    }
  }, [enabled, selectedNodeIds, onNodeAction, onCanvasAction, onOpenSearch, onAutoLayout, onFitView, showHelp, onShowHelpChange, zoomIn, zoomOut, fitView]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={onShowHelpChange}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              {t('keyboardShortcuts')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Available keyboard shortcuts for the flow canvas
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1 pr-4">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between py-2 px-1 rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {shortcut.icon && (
                      <span className="text-muted-foreground">{shortcut.icon}</span>
                    )}
                    <span className="text-sm">{shortcut.description}</span>
                  </div>
                  <ShortcutBadge shortcut={shortcut} />
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Floating help button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm border shadow-sm"
            onClick={() => onShowHelpChange?.(!showHelp)}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {t('keyboardShortcuts')} (Shift + ?)
        </TooltipContent>
      </Tooltip>
    </>
  );
}

export const FlowKeyboardShortcuts = memo(FlowKeyboardShortcutsComponent);
export default FlowKeyboardShortcuts;
