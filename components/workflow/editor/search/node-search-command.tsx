'use client';

/**
 * NodeSearchCommand - Global search and command palette for workflow editor
 * Supports searching nodes, executing commands, and quick navigation
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useReactFlow } from '@xyflow/react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  queryWorkflowNodeCatalog,
  type WorkflowNodeCatalogQueryResult,
} from '@/lib/workflow-editor';
import { NODE_ICONS } from '@/lib/workflow-editor/constants';
import {
  selectWorkflowEditorShellState,
  selectWorkflowNodeCatalogState,
  useWorkflowEditorStore,
} from '@/stores/workflow';
import {
  Play,
  Square,
  Workflow,
  Save,
  Undo2,
  Redo2,
  Trash2,
  LayoutGrid,
  Settings,
  Plus,
  FolderOpen,
  Target,
  MousePointer,
  Bookmark,
} from 'lucide-react';
import { NODE_TYPE_COLORS, type WorkflowNodeType } from '@/types/workflow/workflow-editor';
import { Kbd } from '@/components/ui/kbd';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string[];
  action: () => void;
  category: 'action' | 'navigation' | 'view';
}

export function NodeSearchCommand() {
  const t = useTranslations('workflowEditor');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const {
    currentWorkflow,
    selectNodes,
    saveWorkflow,
    undo,
    redo,
    deleteNodes,
    addNode,
    insertNodeFromIntent,
    addRecentNode,
    addNodeFromTemplate,
    nodeTemplates,
    recentNodes,
    favoriteNodes,
    insertionIntent,
    clearInsertionIntent,
    selectedNodes,
    autoLayout,
    toggleNodePalette,
    toggleConfigPanel,
    toggleMinimap,
    startExecution,
    cancelExecution,
    isExecuting,
    createWorkflow,
  } = useWorkflowEditorStore((state) => ({
    ...selectWorkflowNodeCatalogState(state),
    ...selectWorkflowEditorShellState(state),
    currentWorkflow: state.currentWorkflow,
    selectNodes: state.selectNodes,
    saveWorkflow: state.saveWorkflow,
    undo: state.undo,
    redo: state.redo,
    deleteNodes: state.deleteNodes,
    addNode: state.addNode,
    insertNodeFromIntent: state.insertNodeFromIntent,
    addRecentNode: state.addRecentNode,
    addNodeFromTemplate: state.addNodeFromTemplate,
    clearInsertionIntent: state.clearInsertionIntent,
    selectedNodes: state.selectedNodes,
    autoLayout: state.autoLayout,
    toggleNodePalette: state.toggleNodePalette,
    toggleConfigPanel: state.toggleConfigPanel,
    toggleMinimap: state.toggleMinimap,
    startExecution: state.startExecution,
    cancelExecution: state.cancelExecution,
    isExecuting: state.isExecuting,
    createWorkflow: state.createWorkflow,
  }));

  // Listen for keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === 'f' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Commands
  const commands: Command[] = useMemo(() => [
    {
      id: 'save',
      label: t('saveWorkflow'),
      icon: Save,
      shortcut: ['Ctrl', 'S'],
      action: () => { void saveWorkflow(); setOpen(false); },
      category: 'action',
    },
    {
      id: 'new',
      label: t('newWorkflow'),
      icon: Plus,
      shortcut: ['Ctrl', 'N'],
      action: () => { createWorkflow(); setOpen(false); },
      category: 'action',
    },
    {
      id: 'undo',
      label: t('undo'),
      icon: Undo2,
      shortcut: ['Ctrl', 'Z'],
      action: () => { undo(); setOpen(false); },
      category: 'action',
    },
    {
      id: 'redo',
      label: t('redo'),
      icon: Redo2,
      shortcut: ['Ctrl', 'Shift', 'Z'],
      action: () => { redo(); setOpen(false); },
      category: 'action',
    },
    {
      id: 'delete',
      label: t('deleteSelection'),
      icon: Trash2,
      shortcut: ['Delete'],
      action: () => { if (selectedNodes.length) deleteNodes(selectedNodes); setOpen(false); },
      category: 'action',
    },
    {
      id: 'autoLayout',
      label: t('autoLayout'),
      icon: LayoutGrid,
      shortcut: ['Ctrl', 'L'],
      action: () => { autoLayout(); setOpen(false); },
      category: 'action',
    },
    {
      id: 'run',
      label: isExecuting ? t('stop') : t('runWorkflow'),
      icon: isExecuting ? Square : Play,
      shortcut: ['F5'],
      action: () => { 
        if (isExecuting) cancelExecution();
        else startExecution({});
        setOpen(false);
      },
      category: 'action',
    },
    {
      id: 'togglePalette',
      label: t('toggleNodePalette'),
      icon: FolderOpen,
      shortcut: ['Ctrl', 'B'],
      action: () => { toggleNodePalette(); setOpen(false); },
      category: 'view',
    },
    {
      id: 'toggleConfig',
      label: t('toggleConfigPanel'),
      icon: Settings,
      shortcut: ['Ctrl', 'I'],
      action: () => { toggleConfigPanel(); setOpen(false); },
      category: 'view',
    },
    {
      id: 'toggleMinimap',
      label: t('toggleMinimap'),
      icon: Target,
      shortcut: ['Ctrl', 'M'],
      action: () => { toggleMinimap(); setOpen(false); },
      category: 'view',
    },
  ], [
    t, saveWorkflow, createWorkflow, undo, redo, deleteNodes, selectedNodes,
    autoLayout, toggleNodePalette, toggleConfigPanel, toggleMinimap,
    startExecution, cancelExecution, isExecuting
  ]);

  // Filter nodes based on search
  const filteredNodes = useMemo(() => {
    if (!currentWorkflow || !search) return [];
    const query = search.toLowerCase();
    return currentWorkflow.nodes.filter(node =>
      node.data.label.toLowerCase().includes(query) ||
      node.type?.toLowerCase().includes(query) ||
      node.data.description?.toLowerCase().includes(query)
    );
  }, [currentWorkflow, search]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const query = search.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(query) ||
      cmd.description?.toLowerCase().includes(query)
    );
  }, [commands, search]);

  const filteredCatalogEntries = useMemo(
    () =>
      search.trim()
        ? queryWorkflowNodeCatalog({
            searchQuery: search,
            nodeTemplates,
            recentNodes,
            favoriteNodes,
            includeTemplates: !insertionIntent,
            limit: 12,
          })
        : [],
    [favoriteNodes, insertionIntent, nodeTemplates, recentNodes, search]
  );

  const { setCenter, getNode } = useReactFlow();

  const handleSelectNode = useCallback((nodeId: string) => {
    selectNodes([nodeId]);
    setOpen(false);
    
    // Pan to node location
    const node = getNode(nodeId);
    if (node) {
      // Calculate center of node (position is top-left corner)
      const nodeWidth = node.measured?.width ?? 200;
      const nodeHeight = node.measured?.height ?? 100;
      const x = node.position.x + nodeWidth / 2;
      const y = node.position.y + nodeHeight / 2;
      
      // Smoothly pan to node center with zoom level 1
      setTimeout(() => {
        setCenter(x, y, { zoom: 1, duration: 500 });
      }, 50);
    }
  }, [selectNodes, setCenter, getNode]);

  const handleAddCatalogEntry = useCallback(
    (entry: WorkflowNodeCatalogQueryResult) => {
      if (insertionIntent && entry.kind === 'node') {
        insertNodeFromIntent(entry.type);
        addRecentNode(entry.type);
        setOpen(false);
        return;
      }

      if (entry.kind === 'template') {
        addNodeFromTemplate(entry.templateId, { x: 250, y: 250 });
        addRecentNode(entry.nodeType);
        clearInsertionIntent();
        setOpen(false);
        return;
      }

      addNode(entry.type, { x: 250, y: 250 });
      addRecentNode(entry.type);
      setOpen(false);
    },
    [
      addNode,
      addNodeFromTemplate,
      addRecentNode,
      clearInsertionIntent,
      insertionIntent,
      insertNodeFromIntent,
    ]
  );

  const dialogOpen = open || Boolean(insertionIntent);

  const renderShortcut = (shortcut: string[]) => (
    <div className="flex items-center gap-0.5 ml-auto">
      {shortcut.map((key, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <Kbd>
            {key === 'Ctrl' && navigator.platform.includes('Mac') ? '⌘' : key}
          </Kbd>
          {i < shortcut.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
        </span>
      ))}
    </div>
  );

  return (
      <CommandDialog
      open={dialogOpen}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && insertionIntent) {
          clearInsertionIntent();
        }
      }}
    >
      <CommandInput
        placeholder={t('searchNodesCommands')}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>{t('noResultsFound')}</CommandEmpty>

        {/* Nodes */}
        {filteredNodes.length > 0 && (
          <CommandGroup heading={t('nodes')}>
            {filteredNodes.slice(0, 10).map((node) => {
              const nodeType = node.type as WorkflowNodeType;
              const Icon = NODE_ICONS[nodeType] || Workflow;
              const color = NODE_TYPE_COLORS[nodeType];

              return (
                <CommandItem
                  key={node.id}
                  value={`node-${node.id}`}
                  onSelect={() => handleSelectNode(node.id)}
                  className="flex items-center gap-2"
                >
                  <div
                    className="p-1 rounded"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{node.data.label}</div>
                    {node.data.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {node.data.description}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {nodeType}
                  </Badge>
                  <MousePointer className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              );
            })}
            {filteredNodes.length > 10 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                +{filteredNodes.length - 10} more nodes...
              </div>
            )}
          </CommandGroup>
        )}

        {filteredNodes.length > 0 && filteredCommands.length > 0 && (
          <CommandSeparator />
        )}

        {filteredCatalogEntries.length > 0 && (
          <>
            <CommandGroup heading={t('add') || 'Add'}>
              {filteredCatalogEntries.map((entry) => {
                const entryType = entry.kind === 'template' ? entry.nodeType : entry.type;
                const Icon = NODE_ICONS[entryType] || Workflow;
                const color = NODE_TYPE_COLORS[entryType];
                return (
                  <CommandItem
                    key={entry.id}
                    value={entry.id}
                    onSelect={() => handleAddCatalogEntry(entry)}
                  >
                    <div
                      className="mr-2 rounded p-1"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span>{entry.name}</span>
                      {entry.description && (
                        <span className="text-xs text-muted-foreground">{entry.description}</span>
                      )}
                    </div>
                    {entry.kind === 'template' ? (
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        <Bookmark className="mr-1 h-3 w-3" />
                        Template
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {entryType}
                      </Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {filteredCommands.length > 0 && <CommandSeparator />}
          </>
        )}

        {/* Actions */}
        {filteredCommands.filter(c => c.category === 'action').length > 0 && (
          <CommandGroup heading={t('actions')}>
            {filteredCommands
              .filter(c => c.category === 'action')
              .map((command) => (
                <CommandItem
                  key={command.id}
                  value={command.id}
                  onSelect={command.action}
                >
                  <command.icon className="h-4 w-4 mr-2" />
                  <span>{command.label}</span>
                  {command.shortcut && renderShortcut(command.shortcut)}
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {/* View */}
        {filteredCommands.filter(c => c.category === 'view').length > 0 && (
          <CommandGroup heading={t('viewMenu')}>
            {filteredCommands
              .filter(c => c.category === 'view')
              .map((command) => (
                <CommandItem
                  key={command.id}
                  value={command.id}
                  onSelect={command.action}
                >
                  <command.icon className="h-4 w-4 mr-2" />
                  <span>{command.label}</span>
                  {command.shortcut && renderShortcut(command.shortcut)}
                </CommandItem>
              ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default NodeSearchCommand;
