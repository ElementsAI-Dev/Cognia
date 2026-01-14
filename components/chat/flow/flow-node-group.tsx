'use client';

/**
 * FlowNodeGroup - Visual grouping container for flow nodes
 * Allows organizing related nodes together
 */

import { memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  FolderOpen,
  FolderClosed,
  Edit2,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Palette,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import type { FlowNodeGroup as FlowNodeGroupType } from '@/types/chat/flow-chat';

interface FlowNodeGroupProps {
  /** Group data */
  group: FlowNodeGroupType;
  /** Whether the group is selected */
  isSelected?: boolean;
  /** Callback when group is renamed */
  onRename?: (groupId: string, name: string) => void;
  /** Callback when group color is changed */
  onColorChange?: (groupId: string, color: string) => void;
  /** Callback when group is deleted */
  onDelete?: (groupId: string) => void;
  /** Callback when group is toggled (collapsed/expanded) */
  onToggle?: (groupId: string) => void;
  /** Callback when group is clicked */
  onClick?: (groupId: string) => void;
  className?: string;
}

const GROUP_COLORS = [
  { name: 'gray', bg: 'bg-gray-100/50 dark:bg-gray-800/50', border: 'border-gray-300 dark:border-gray-600', header: 'bg-gray-200/80 dark:bg-gray-700/80' },
  { name: 'red', bg: 'bg-red-50/50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', header: 'bg-red-100/80 dark:bg-red-900/40' },
  { name: 'orange', bg: 'bg-orange-50/50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', header: 'bg-orange-100/80 dark:bg-orange-900/40' },
  { name: 'yellow', bg: 'bg-yellow-50/50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', header: 'bg-yellow-100/80 dark:bg-yellow-900/40' },
  { name: 'green', bg: 'bg-green-50/50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', header: 'bg-green-100/80 dark:bg-green-900/40' },
  { name: 'blue', bg: 'bg-blue-50/50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', header: 'bg-blue-100/80 dark:bg-blue-900/40' },
  { name: 'purple', bg: 'bg-purple-50/50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700', header: 'bg-purple-100/80 dark:bg-purple-900/40' },
  { name: 'pink', bg: 'bg-pink-50/50 dark:bg-pink-900/20', border: 'border-pink-300 dark:border-pink-700', header: 'bg-pink-100/80 dark:bg-pink-900/40' },
];

function getGroupColorClasses(color?: string) {
  const found = GROUP_COLORS.find(c => c.name === color);
  return found || GROUP_COLORS[0];
}

function FlowNodeGroupComponent({
  group,
  isSelected,
  onRename,
  onColorChange,
  onDelete,
  onToggle,
  onClick,
  className,
}: FlowNodeGroupProps) {
  const t = useTranslations('flowChat');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const colors = getGroupColorClasses(group.color);

  const handleRename = useCallback(() => {
    if (editName.trim() && editName !== group.name) {
      onRename?.(group.id, editName.trim());
    }
    setIsEditing(false);
  }, [editName, group.id, group.name, onRename]);

  const handleColorSelect = useCallback((color: string) => {
    onColorChange?.(group.id, color);
    setColorPickerOpen(false);
  }, [group.id, onColorChange]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(group.id);
  }, [group.id, onToggle]);

  const handleDelete = useCallback(() => {
    onDelete?.(group.id);
  }, [group.id, onDelete]);

  return (
    <div
      className={cn(
        'flow-node-group rounded-lg border-2 border-dashed transition-all',
        colors.bg,
        colors.border,
        isSelected && 'ring-2 ring-primary ring-offset-2',
        className
      )}
      onClick={() => onClick?.(group.id)}
    >
      {/* Group header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-t-md',
          colors.header
        )}
      >
        {/* Toggle button */}
        <button
          onClick={handleToggle}
          className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
        >
          {group.isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Folder icon */}
        {group.isCollapsed ? (
          <FolderClosed className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Group name */}
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditName(group.name);
                setIsEditing(false);
              }
            }}
            className="h-6 text-sm flex-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm font-medium flex-1 truncate">
            {group.name}
          </span>
        )}

        {/* Node count */}
        <Badge variant="secondary" className="text-[10px]">
          {group.nodeIds.length}
        </Badge>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {t('rename')}
            </DropdownMenuItem>
            <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
              <PopoverTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerOpen(true);
                  }}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  {t('changeColor')}
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <div className="flex flex-wrap gap-1">
                  {GROUP_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleColorSelect(c.name)}
                      className={cn(
                        'h-6 w-6 rounded-full border-2 transition-all',
                        c.bg,
                        c.border,
                        group.color === c.name
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'hover:scale-110'
                      )}
                    >
                      {group.color === c.name && (
                        <Check className="h-4 w-4 mx-auto text-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteGroup')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Group content area (placeholder for nodes) */}
      {!group.isCollapsed && (
        <div className="min-h-[100px] p-2">
          {group.nodeIds.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
              {t('dropNodesToGroup')}
            </div>
          )}
        </div>
      )}

      {/* Group description */}
      {group.description && !group.isCollapsed && (
        <div className="px-3 py-1.5 border-t border-inherit bg-muted/30">
          <p className="text-xs text-muted-foreground">{group.description}</p>
        </div>
      )}
    </div>
  );
}

export const FlowNodeGroup = memo(FlowNodeGroupComponent);
export default FlowNodeGroup;
