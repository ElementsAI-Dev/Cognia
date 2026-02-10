'use client';

/**
 * CanvasContextMenu - Right-click context menu for the workflow canvas blank area
 * Renders at a given position when triggered via onPaneContextMenu
 */

import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useReactFlow } from '@xyflow/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Undo2,
  Redo2,
  Clipboard,
  LayoutGrid,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Save,
  FileDown,
  Sparkles,
  Wrench,
  Code,
  GitBranch,
  Timer,
  Merge,
  Repeat,
  Users,
  Webhook,
  ArrowRightFromLine,
  Flag,
} from 'lucide-react';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import type { WorkflowNodeType } from '@/types/workflow/workflow-editor';

interface CanvasContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddNode: (type: WorkflowNodeType, position: { x: number; y: number }) => void;
}

const NODE_MENU_ITEMS: { type: WorkflowNodeType; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { type: 'start', icon: Flag, label: 'Start Node' },
  { type: 'end', icon: ArrowRightFromLine, label: 'End Node' },
  { type: 'ai', icon: Sparkles, label: 'AI Node' },
  { type: 'tool', icon: Wrench, label: 'Tool Node' },
  { type: 'code', icon: Code, label: 'Code Node' },
  { type: 'conditional', icon: GitBranch, label: 'Conditional Node' },
  { type: 'delay', icon: Timer, label: 'Delay Node' },
  { type: 'merge', icon: Merge, label: 'Merge Node' },
  { type: 'loop', icon: Repeat, label: 'Loop Node' },
  { type: 'human', icon: Users, label: 'Human Node' },
  { type: 'webhook', icon: Webhook, label: 'Webhook Node' },
];

export function CanvasContextMenu({ open, position, onClose, onAddNode }: CanvasContextMenuProps) {
  const t = useTranslations('workflowEditor');
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();

  const {
    undo,
    redo,
    pasteSelection,
    selectAll,
    autoLayout,
    copiedNodes,
    historyLength,
    historyIndex,
    saveWorkflow,
    exportToFile,
  } = useWorkflowEditorStore(
    useShallow((state) => ({
      undo: state.undo,
      redo: state.redo,
      pasteSelection: state.pasteSelection,
      selectAll: state.selectAll,
      autoLayout: state.autoLayout,
      copiedNodes: state.copiedNodes,
      historyLength: state.history.length,
      historyIndex: state.historyIndex,
      saveWorkflow: state.saveWorkflow,
      exportToFile: state.exportToFile,
    }))
  );

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const handleAddNode = useCallback(
    (type: WorkflowNodeType) => {
      const flowPos = screenToFlowPosition({ x: position.x, y: position.y });
      onAddNode(type, flowPos);
      onClose();
    },
    [screenToFlowPosition, position, onAddNode, onClose]
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const hasCopied = copiedNodes.length > 0;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={(v) => !v && onClose()}>
        <DropdownMenuContent
          className="w-56"
          style={{ position: 'fixed', left: position.x, top: position.y }}
          align="start"
          side="bottom"
          sideOffset={0}
        >
          {/* Add Node submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Plus className="h-4 w-4 mr-2" />
              {t('addNode')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {NODE_MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.type}
                    onClick={() => handleAddNode(item.type)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Edit operations */}
          <DropdownMenuItem onClick={() => { undo(); onClose(); }} disabled={!canUndo}>
            <Undo2 className="h-4 w-4 mr-2" />
            {t('undo')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { redo(); onClose(); }} disabled={!canRedo}>
            <Redo2 className="h-4 w-4 mr-2" />
            {t('redo')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { pasteSelection(); onClose(); }} disabled={!hasCopied}>
            <Clipboard className="h-4 w-4 mr-2" />
            {t('paste')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { selectAll(); onClose(); }}>
            <MousePointer2 className="h-4 w-4 mr-2" />
            {t('selectAll')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Layout & View */}
          <DropdownMenuItem onClick={() => { autoLayout(); onClose(); }}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            {t('autoLayout')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { fitView({ padding: 0.2 }); onClose(); }}>
            <Maximize2 className="h-4 w-4 mr-2" />
            {t('fitView')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { zoomIn(); onClose(); }}>
            <ZoomIn className="h-4 w-4 mr-2" />
            {t('zoomIn')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { zoomOut(); onClose(); }}>
            <ZoomOut className="h-4 w-4 mr-2" />
            {t('zoomOut')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* File operations */}
          <DropdownMenuItem onClick={() => { void saveWorkflow(); onClose(); }}>
            <Save className="h-4 w-4 mr-2" />
            {t('save')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { exportToFile(); onClose(); }}>
            <FileDown className="h-4 w-4 mr-2" />
            {t('exportWorkflow')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default CanvasContextMenu;
