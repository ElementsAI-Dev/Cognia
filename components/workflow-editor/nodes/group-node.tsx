'use client';

/**
 * GroupNode - Container node for grouping multiple workflow nodes
 * Supports collapsing, custom styling, and nested organization
 */

import { memo, useState, useCallback } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Trash2,
  Palette,
  Copy,
  Minimize2,
  Maximize2,
  Edit2,
  Check,
  X,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store';

export interface GroupNodeData {
  [key: string]: unknown;
  label: string;
  description?: string;
  nodeType: 'group';
  isCollapsed: boolean;
  color: string;
  childNodeIds: string[];
  minWidth: number;
  minHeight: number;
}

const GROUP_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Gray', value: '#6b7280' },
];

function GroupNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as GroupNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(nodeData.label);
  const { updateNode, deleteNode, duplicateNode } = useWorkflowEditorStore();

  const handleToggleCollapse = useCallback(() => {
    updateNode(id, { isCollapsed: !nodeData.isCollapsed });
  }, [id, nodeData.isCollapsed, updateNode]);

  const handleColorChange = useCallback((color: string) => {
    updateNode(id, { color });
  }, [id, updateNode]);

  const handleLabelSave = useCallback(() => {
    if (editLabel.trim()) {
      updateNode(id, { label: editLabel.trim() });
    }
    setIsEditing(false);
  }, [id, editLabel, updateNode]);

  const handleLabelCancel = useCallback(() => {
    setEditLabel(nodeData.label);
    setIsEditing(false);
  }, [nodeData.label]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleDuplicate = useCallback(() => {
    duplicateNode(id);
  }, [id, duplicateNode]);

  return (
    <>
      <NodeResizer
        minWidth={nodeData.minWidth || 200}
        minHeight={nodeData.isCollapsed ? 48 : (nodeData.minHeight || 150)}
        isVisible={selected}
        lineClassName="border-primary"
        handleClassName="h-3 w-3 bg-primary border-2 border-background rounded"
      />
      
      <div
        className={cn(
          'rounded-lg border-2 transition-all duration-200',
          selected ? 'shadow-lg' : 'shadow-sm',
          nodeData.isCollapsed ? 'h-12' : 'h-full'
        )}
        style={{
          borderColor: nodeData.color || '#6b7280',
          backgroundColor: `${nodeData.color || '#6b7280'}08`,
          minWidth: nodeData.minWidth || 200,
          minHeight: nodeData.isCollapsed ? 48 : (nodeData.minHeight || 150),
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-md"
          style={{ backgroundColor: `${nodeData.color || '#6b7280'}15` }}
        >
          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleToggleCollapse}
          >
            {nodeData.isCollapsed ? (
              <Folder className="h-4 w-4" style={{ color: nodeData.color }} />
            ) : (
              <FolderOpen className="h-4 w-4" style={{ color: nodeData.color }} />
            )}
          </Button>

          {/* Label */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-6 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLabelSave();
                    if (e.key === 'Escape') handleLabelCancel();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleLabelSave}
                >
                  <Check className="h-3 w-3 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleLabelCancel}
                >
                  <X className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ) : (
              <div
                className="text-sm font-semibold truncate cursor-pointer hover:underline"
                style={{ color: nodeData.color }}
                onDoubleClick={() => setIsEditing(true)}
              >
                {nodeData.label}
              </div>
            )}
          </div>

          {/* Child count */}
          {nodeData.childNodeIds?.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${nodeData.color || '#6b7280'}20`,
                color: nodeData.color 
              }}
            >
              {nodeData.childNodeIds.length}
            </span>
          )}

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleCollapse}>
                {nodeData.isCollapsed ? (
                  <>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Expand
                  </>
                ) : (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Collapse
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              {/* Color picker */}
              <div className="px-2 py-1.5">
                <div className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Color
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        'h-6 w-6 rounded-md border-2 transition-transform hover:scale-110',
                        nodeData.color === color.value ? 'border-foreground' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleColorChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content area - only show when not collapsed */}
        {!nodeData.isCollapsed && (
          <div className="p-2 h-[calc(100%-40px)]">
            {nodeData.description && (
              <p className="text-xs text-muted-foreground mb-2">
                {nodeData.description}
              </p>
            )}
            {nodeData.childNodeIds?.length === 0 && (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Drag nodes here to group them
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export const GroupNode = memo(GroupNodeComponent);
export default GroupNode;
