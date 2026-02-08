'use client';

/**
 * VariableSelector - Dify-style variable reference picker
 * Allows nodes to reference output variables from upstream nodes
 */

import { useMemo, useState, useCallback } from 'react';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Variable, ChevronDown, X } from 'lucide-react';
import {
  NODE_TYPE_COLORS,
  type VariableReference,
  type VariableSelectorOption,
  type WorkflowNodeType,
} from '@/types/workflow/workflow-editor';

interface VariableSelectorProps {
  value: VariableReference | null;
  onChange: (ref: VariableReference | null) => void;
  currentNodeId?: string;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

/**
 * Get upstream nodes and their output variables for the variable selector
 */
function useUpstreamVariables(currentNodeId?: string): VariableSelectorOption[] {
  const { currentWorkflow } = useWorkflowEditorStore(
    useShallow((state) => ({
      currentWorkflow: state.currentWorkflow,
    }))
  );

  return useMemo(() => {
    if (!currentWorkflow) return [];

    const options: VariableSelectorOption[] = [];

    // Build adjacency map for upstream detection
    const upstreamIds = new Set<string>();
    if (currentNodeId) {
      // BFS to find all upstream nodes
      const visited = new Set<string>();
      const queue: string[] = [];

      // Find edges pointing to current node
      currentWorkflow.edges.forEach((edge) => {
        if (edge.target === currentNodeId) {
          queue.push(edge.source);
        }
      });

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        upstreamIds.add(nodeId);

        currentWorkflow.edges.forEach((edge) => {
          if (edge.target === nodeId) {
            queue.push(edge.source);
          }
        });
      }
    } else {
      // If no current node specified, all nodes are available
      currentWorkflow.nodes.forEach((n) => upstreamIds.add(n.id));
    }

    // Build variable options from upstream nodes
    currentWorkflow.nodes
      .filter((node) => upstreamIds.has(node.id) && node.id !== currentNodeId)
      .forEach((node) => {
        const variables: VariableSelectorOption['variables'] = [];
        const data = node.data;

        // Extract output variables based on node type
        if ('outputs' in data && data.outputs) {
          Object.entries(data.outputs as Record<string, { type: string; description?: string }>).forEach(
            ([name, schema]) => {
              variables.push({
                name,
                type: schema.type || 'string',
                description: schema.description,
              });
            }
          );
        }

        // Start node exposes workflow inputs
        if (node.type === 'start' && 'workflowInputs' in data) {
          Object.entries(data.workflowInputs as Record<string, { type: string; description?: string }>).forEach(
            ([name, schema]) => {
              variables.push({
                name,
                type: schema.type || 'string',
                description: schema.description,
              });
            }
          );
        }

        if (variables.length > 0) {
          options.push({
            nodeId: node.id,
            nodeLabel: data.label,
            nodeType: node.type as WorkflowNodeType,
            variables,
          });
        }
      });

    return options;
  }, [currentWorkflow, currentNodeId]);
}

export function VariableSelector({
  value,
  onChange,
  currentNodeId,
  placeholder = 'Select variable...',
  className,
  allowClear = true,
}: VariableSelectorProps) {
  const [open, setOpen] = useState(false);
  const upstreamOptions = useUpstreamVariables(currentNodeId);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const node = upstreamOptions.find((o) => o.nodeId === value.nodeId);
    if (!node) return `${value.nodeId}.${value.variableName}`;
    return `${node.nodeLabel}.${value.variableName}`;
  }, [value, upstreamOptions]);

  const handleSelect = useCallback(
    (nodeId: string, variableName: string) => {
      onChange({ nodeId, variableName });
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-8 justify-between text-xs font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Variable className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            {value ? (
              <span className="font-mono truncate">{selectedLabel}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {value && allowClear && (
              <X
                className="h-3 w-3 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search variables..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-4 text-xs text-center text-muted-foreground">
              No upstream variables found
            </CommandEmpty>
            {upstreamOptions.map((option) => (
              <CommandGroup
                key={option.nodeId}
                heading={
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: NODE_TYPE_COLORS[option.nodeType] }}
                    />
                    <span className="text-xs font-medium">{option.nodeLabel}</span>
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                      {option.nodeType}
                    </Badge>
                  </div>
                }
              >
                {option.variables.map((variable) => (
                  <CommandItem
                    key={`${option.nodeId}.${variable.name}`}
                    value={`${option.nodeLabel}.${variable.name}`}
                    onSelect={() => handleSelect(option.nodeId, variable.name)}
                    className="text-xs"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {variable.name}
                      </span>
                      <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-auto">
                        {variable.type}
                      </Badge>
                    </div>
                    {variable.description && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {variable.description}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * MultiVariableSelector - Select multiple variable references
 */
interface MultiVariableSelectorProps {
  value: VariableReference[];
  onChange: (refs: VariableReference[]) => void;
  currentNodeId?: string;
  className?: string;
}

export function MultiVariableSelector({
  value,
  onChange,
  currentNodeId,
  className,
}: MultiVariableSelectorProps) {
  const upstreamOptions = useUpstreamVariables(currentNodeId);

  const handleAdd = useCallback(
    (ref: VariableReference | null) => {
      if (!ref) return;
      // Avoid duplicates
      const exists = value.some(
        (v) => v.nodeId === ref.nodeId && v.variableName === ref.variableName
      );
      if (!exists) {
        onChange([...value, ref]);
      }
    },
    [value, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  const getLabel = useCallback(
    (ref: VariableReference) => {
      const node = upstreamOptions.find((o) => o.nodeId === ref.nodeId);
      return node
        ? `${node.nodeLabel}.${ref.variableName}`
        : `${ref.nodeId}.${ref.variableName}`;
    },
    [upstreamOptions]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected variables */}
      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((ref, i) => (
            <div
              key={`${ref.nodeId}-${ref.variableName}-${i}`}
              className="flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1"
            >
              <Variable className="h-3 w-3 text-blue-500 shrink-0" />
              <span className="font-mono truncate flex-1">{getLabel(ref)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0"
                onClick={() => handleRemove(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add variable selector */}
      <VariableSelector
        value={null}
        onChange={handleAdd}
        currentNodeId={currentNodeId}
        placeholder="Add variable reference..."
        allowClear={false}
      />
    </div>
  );
}

export default VariableSelector;
