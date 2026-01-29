'use client';

/**
 * NodeSearchPanel - Search and navigate to nodes in the workflow
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWorkflowEditorStore } from '@/stores/workflow';
import {
  Search,
  Circle,
} from 'lucide-react';
import { NODE_ICONS } from '@/lib/workflow-editor/constants';
import type { WorkflowNodeType } from '@/types/workflow/workflow-editor';
import { NODE_TYPE_COLORS } from '@/types/workflow/workflow-editor';

// Helper to render node icon with color
function NodeTypeIcon({ type }: { type: WorkflowNodeType }) {
  const Icon = NODE_ICONS[type];
  const color = NODE_TYPE_COLORS[type] || '#6b7280';
  return Icon ? <Icon className="h-3.5 w-3.5" style={{ color }} /> : <Circle className="h-3.5 w-3.5" />;
}

interface NodeSearchPanelProps {
  onNavigateToNode?: (nodeId: string) => void;
}

export function NodeSearchPanel({ onNavigateToNode }: NodeSearchPanelProps) {
  const t = useTranslations('workflowEditor');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    currentWorkflow,
    selectNodes,
    breakpoints,
    executionState,
  } = useWorkflowEditorStore();

  // Filter nodes based on search
  const filteredNodes = useMemo(() => {
    if (!currentWorkflow) return [];
    
    const query = search.toLowerCase().trim();
    if (!query) return currentWorkflow.nodes;

    return currentWorkflow.nodes.filter(node => {
      const label = node.data.label?.toLowerCase() || '';
      const type = node.type?.toLowerCase() || '';
      const nodeType = node.data.nodeType?.toLowerCase() || '';
      
      return label.includes(query) || 
             type.includes(query) || 
             nodeType.includes(query) ||
             node.id.toLowerCase().includes(query);
    });
  }, [currentWorkflow, search]);

  // Group nodes by type
  const groupedNodes = useMemo(() => {
    const groups: Record<string, typeof filteredNodes> = {};
    
    filteredNodes.forEach(node => {
      const type = node.type || 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(node);
    });

    return groups;
  }, [filteredNodes]);

  // Handle node selection
  const handleSelectNode = useCallback((nodeId: string) => {
    selectNodes([nodeId]);
    onNavigateToNode?.(nodeId);
    setOpen(false);
    setSearch('');
  }, [selectNodes, onNavigateToNode]);

  // Get node status
  const getNodeStatus = useCallback((nodeId: string) => {
    const hasBreakpoint = breakpoints.has(nodeId);
    const execState = executionState?.nodeStates[nodeId];
    
    return {
      hasBreakpoint,
      status: execState?.status,
      isRunning: execState?.status === 'running',
      isCompleted: execState?.status === 'completed',
      isFailed: execState?.status === 'failed',
    };
  }, [breakpoints, executionState]);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && e.shiftKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const nodeCount = currentWorkflow?.nodes.length || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          disabled={!currentWorkflow}
        >
          <Search className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">
            {t('searchNodes') || 'Search'}
          </span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>⇧F
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder={t('searchNodesPlaceholder') || 'Search nodes...'}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('noNodesFound') || 'No nodes found'}
              </div>
            </CommandEmpty>

            {Object.entries(groupedNodes).map(([type, nodes], index) => (
              <div key={type}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup
                  heading={
                    <div className="flex items-center gap-1.5">
                      <NodeTypeIcon type={type as WorkflowNodeType} />
                      <span className="capitalize">{type}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {nodes.length}
                      </Badge>
                    </div>
                  }
                >
                  {nodes.map(node => {
                    const status = getNodeStatus(node.id);
                    
                    return (
                      <CommandItem
                        key={node.id}
                        value={node.id}
                        onSelect={() => handleSelectNode(node.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <NodeTypeIcon type={node.type as WorkflowNodeType} />
                          <span className="truncate">{node.data.label || 'Unnamed'}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {status.hasBreakpoint && (
                            <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500" />
                          )}
                          {status.isRunning && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-blue-100 text-blue-700 border-blue-300">
                              Running
                            </Badge>
                          )}
                          {status.isCompleted && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-green-100 text-green-700 border-green-300">
                              Done
                            </Badge>
                          )}
                          {status.isFailed && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-red-100 text-red-700 border-red-300">
                              Failed
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </div>
            ))}
          </CommandList>

          {/* Footer */}
          <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>{nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}</span>
            <div className="flex items-center gap-2">
              <kbd className="px-1 rounded bg-muted text-[10px]">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-1 rounded bg-muted text-[10px]">↵</kbd>
              <span>select</span>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default NodeSearchPanel;
