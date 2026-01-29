'use client';

/**
 * KeyboardShortcuts - Keyboard shortcut manager for the designer
 * Provides centralized shortcut handling and a help dialog
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Keyboard,
  Undo2,
  Redo2,
  Save,
  Copy,
  Trash2,
  Eye,
  Pencil,
  Code2,
  ZoomIn,
  ZoomOut,
  Layers,
  PanelRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';

interface ShortcutConfig {
  id: string;
  keys: string[];
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'editing' | 'view' | 'navigation' | 'ai';
  action: () => void;
}

interface KeyboardShortcutsProps {
  className?: string;
  onAIEdit?: () => void;
  onSave?: () => void;
}

export function KeyboardShortcuts({
  className,
  onAIEdit,
  onSave,
}: KeyboardShortcutsProps) {
  const t = useTranslations('designer');
  const [isOpen, setIsOpen] = useState(false);

  // Designer store actions
  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);
  const setMode = useDesignerStore((state) => state.setMode);
  const setZoom = useDesignerStore((state) => state.setZoom);
  const zoom = useDesignerStore((state) => state.zoom);
  const toggleElementTree = useDesignerStore((state) => state.toggleElementTree);
  const toggleStylePanel = useDesignerStore((state) => state.toggleStylePanel);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const deleteElement = useDesignerStore((state) => state.deleteElement);
  const duplicateElement = useDesignerStore((state) => state.duplicateElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  // Define shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Editing
    {
      id: 'undo',
      keys: ['Ctrl', 'Z'],
      label: t('undo') || 'Undo',
      description: t('undoDesc') || 'Undo last action',
      icon: <Undo2 className="h-4 w-4" />,
      category: 'editing',
      action: undo,
    },
    {
      id: 'redo',
      keys: ['Ctrl', 'Shift', 'Z'],
      label: t('redo') || 'Redo',
      description: t('redoDesc') || 'Redo last undone action',
      icon: <Redo2 className="h-4 w-4" />,
      category: 'editing',
      action: redo,
    },
    {
      id: 'save',
      keys: ['Ctrl', 'S'],
      label: t('save') || 'Save',
      description: t('saveDesc') || 'Save current design',
      icon: <Save className="h-4 w-4" />,
      category: 'editing',
      action: () => onSave?.(),
    },
    {
      id: 'duplicate',
      keys: ['Ctrl', 'D'],
      label: t('duplicate') || 'Duplicate',
      description: t('duplicateDesc') || 'Duplicate selected element',
      icon: <Copy className="h-4 w-4" />,
      category: 'editing',
      action: () => {
        if (selectedElementId) {
          duplicateElement(selectedElementId);
          syncCodeFromElements();
        }
      },
    },
    {
      id: 'delete',
      keys: ['Delete'],
      label: t('delete') || 'Delete',
      description: t('deleteDesc') || 'Delete selected element',
      icon: <Trash2 className="h-4 w-4" />,
      category: 'editing',
      action: () => {
        if (selectedElementId) {
          deleteElement(selectedElementId);
          syncCodeFromElements();
        }
      },
    },
    // View
    {
      id: 'preview-mode',
      keys: ['1'],
      label: t('previewMode') || 'Preview Mode',
      description: t('previewModeDesc') || 'Switch to preview mode',
      icon: <Eye className="h-4 w-4" />,
      category: 'view',
      action: () => setMode('preview'),
    },
    {
      id: 'design-mode',
      keys: ['2'],
      label: t('designMode') || 'Design Mode',
      description: t('designModeDesc') || 'Switch to design mode',
      icon: <Pencil className="h-4 w-4" />,
      category: 'view',
      action: () => setMode('design'),
    },
    {
      id: 'code-mode',
      keys: ['3'],
      label: t('codeMode') || 'Code Mode',
      description: t('codeModeDesc') || 'Switch to code mode',
      icon: <Code2 className="h-4 w-4" />,
      category: 'view',
      action: () => setMode('code'),
    },
    {
      id: 'zoom-in',
      keys: ['Ctrl', '+'],
      label: t('zoomIn') || 'Zoom In',
      description: t('zoomInDesc') || 'Increase zoom level',
      icon: <ZoomIn className="h-4 w-4" />,
      category: 'view',
      action: () => setZoom(Math.min(zoom + 10, 200)),
    },
    {
      id: 'zoom-out',
      keys: ['Ctrl', '-'],
      label: t('zoomOut') || 'Zoom Out',
      description: t('zoomOutDesc') || 'Decrease zoom level',
      icon: <ZoomOut className="h-4 w-4" />,
      category: 'view',
      action: () => setZoom(Math.max(zoom - 10, 25)),
    },
    {
      id: 'reset-zoom',
      keys: ['Ctrl', '0'],
      label: t('resetZoom') || 'Reset Zoom',
      description: t('resetZoomDesc') || 'Reset zoom to 100%',
      icon: <ZoomIn className="h-4 w-4" />,
      category: 'view',
      action: () => setZoom(100),
    },
    // Navigation
    {
      id: 'toggle-layers',
      keys: ['Ctrl', 'L'],
      label: t('toggleLayers') || 'Toggle Layers',
      description: t('toggleLayersDesc') || 'Show/hide element tree',
      icon: <Layers className="h-4 w-4" />,
      category: 'navigation',
      action: toggleElementTree,
    },
    {
      id: 'toggle-styles',
      keys: ['Ctrl', 'P'],
      label: t('toggleStyles') || 'Toggle Styles',
      description: t('toggleStylesDesc') || 'Show/hide style panel',
      icon: <PanelRight className="h-4 w-4" />,
      category: 'navigation',
      action: toggleStylePanel,
    },
    {
      id: 'shortcuts-help',
      keys: ['?'],
      label: t('shortcutsHelp') || 'Shortcuts Help',
      description: t('shortcutsHelpDesc') || 'Show keyboard shortcuts',
      icon: <Keyboard className="h-4 w-4" />,
      category: 'navigation',
      action: () => setIsOpen(true),
    },
    // AI
    {
      id: 'ai-edit',
      keys: ['Ctrl', 'K'],
      label: t('aiEdit') || 'AI Edit',
      description: t('aiEditDesc') || 'Open AI edit prompt',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'ai',
      action: () => onAIEdit?.(),
    },
  ];

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);

  const categoryLabels: Record<string, string> = {
    editing: t('editingShortcuts') || 'Editing',
    view: t('viewShortcuts') || 'View',
    navigation: t('navigationShortcuts') || 'Navigation',
    ai: t('aiShortcuts') || 'AI',
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('h-8 w-8', className)}>
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t('keyboardShortcuts') || 'Keyboard Shortcuts'}
          </DialogTitle>
          <DialogDescription>
            {t('keyboardShortcutsDesc') || 'Quick actions to speed up your workflow'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {categoryLabels[category]}
                </h4>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground">
                          {shortcut.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{shortcut.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {shortcut.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="font-mono text-xs px-2"
                          >
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {category !== Object.keys(groupedShortcuts).slice(-1)[0] && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to register and handle keyboard shortcuts
 */
export function useDesignerShortcuts(config: {
  enabled?: boolean;
  onAIEdit?: () => void;
  onSave?: () => void;
}) {
  const { enabled = true, onAIEdit, onSave } = config;

  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);
  const setMode = useDesignerStore((state) => state.setMode);
  const setZoom = useDesignerStore((state) => state.setZoom);
  const zoom = useDesignerStore((state) => state.zoom);
  const toggleElementTree = useDesignerStore((state) => state.toggleElementTree);
  const toggleStylePanel = useDesignerStore((state) => state.toggleStylePanel);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const deleteElement = useDesignerStore((state) => state.deleteElement);
  const duplicateElement = useDesignerStore((state) => state.duplicateElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);
  const history = useDesignerStore((state) => state.history);
  const historyIndex = useDesignerStore((state) => state.historyIndex);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Allow some shortcuts even in inputs
        if (!e.ctrlKey && !e.metaKey) return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (isMod && e.key === 'z' && !e.shiftKey) {
        if (historyIndex >= 0) {
          e.preventDefault();
          undo();
        }
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (historyIndex < history.length - 1) {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Save: Ctrl+S
      if (isMod && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Duplicate: Ctrl+D
      if (isMod && e.key === 'd') {
        if (selectedElementId) {
          e.preventDefault();
          duplicateElement(selectedElementId);
          syncCodeFromElements();
        }
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteElement(selectedElementId);
          syncCodeFromElements();
        }
        return;
      }

      // Mode switches: 1, 2, 3
      if (e.key === '1' && !isMod) {
        setMode('preview');
        return;
      }
      if (e.key === '2' && !isMod) {
        setMode('design');
        return;
      }
      if (e.key === '3' && !isMod) {
        setMode('code');
        return;
      }

      // Zoom: Ctrl++, Ctrl+-, Ctrl+0
      if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(Math.min(zoom + 10, 200));
        return;
      }
      if (isMod && e.key === '-') {
        e.preventDefault();
        setZoom(Math.max(zoom - 10, 25));
        return;
      }
      if (isMod && e.key === '0') {
        e.preventDefault();
        setZoom(100);
        return;
      }

      // Toggle panels: Ctrl+L, Ctrl+P
      if (isMod && e.key === 'l') {
        e.preventDefault();
        toggleElementTree();
        return;
      }
      if (isMod && e.key === 'p') {
        e.preventDefault();
        toggleStylePanel();
        return;
      }

      // AI Edit: Ctrl+K
      if (isMod && e.key === 'k') {
        e.preventDefault();
        onAIEdit?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    undo,
    redo,
    setMode,
    setZoom,
    zoom,
    toggleElementTree,
    toggleStylePanel,
    selectedElementId,
    deleteElement,
    duplicateElement,
    syncCodeFromElements,
    history.length,
    historyIndex,
    onAIEdit,
    onSave,
  ]);
}

export default KeyboardShortcuts;
