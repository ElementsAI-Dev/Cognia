'use client';

/**
 * FlowNodeTags - Tag management component for flow chat nodes
 * Allows adding, removing, and displaying tags on nodes
 */

import { useState, useCallback, memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tag,
  Plus,
  X,
  Check,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FlowNodeTag } from '@/types/chat/flow-chat';

interface FlowNodeTagsProps {
  /** Current tags on this node */
  tags: FlowNodeTag[];
  /** Available tag definitions */
  availableTags: FlowNodeTag[];
  /** Whether editing is allowed */
  editable?: boolean;
  /** Maximum tags to show before collapsing */
  maxVisible?: number;
  /** Callback when tag is added */
  onAddTag?: (tag: FlowNodeTag) => void;
  /** Callback when tag is removed */
  onRemoveTag?: (tagId: string) => void;
  /** Callback when new tag is created */
  onCreateTag?: (tag: Omit<FlowNodeTag, 'id'>) => void;
  className?: string;
}

const TAG_COLORS = [
  { name: 'gray', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-300 dark:border-pink-700' },
];

function getTagColorClasses(color: string) {
  const found = TAG_COLORS.find(c => c.name === color);
  return found || TAG_COLORS[0];
}

function FlowNodeTagsComponent({
  tags,
  availableTags,
  editable = true,
  maxVisible = 3,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  className,
}: FlowNodeTagsProps) {
  const t = useTranslations('flowChat');
  const [isOpen, setIsOpen] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');
  const [isCreating, setIsCreating] = useState(false);

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - visibleTags.length;

  // Filter out already applied tags from available tags
  const unassignedTags = useMemo(() => {
    const assignedIds = new Set(tags.map(t => t.id));
    return availableTags.filter(t => !assignedIds.has(t.id));
  }, [tags, availableTags]);

  const handleAddExistingTag = useCallback((tag: FlowNodeTag) => {
    onAddTag?.(tag);
  }, [onAddTag]);

  const handleCreateNewTag = useCallback(() => {
    if (!newTagLabel.trim()) return;
    
    onCreateTag?.({
      label: newTagLabel.trim(),
      color: newTagColor,
    });
    
    setNewTagLabel('');
    setIsCreating(false);
  }, [newTagLabel, newTagColor, onCreateTag]);

  const handleRemoveTag = useCallback((e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    onRemoveTag?.(tagId);
  }, [onRemoveTag]);

  if (tags.length === 0 && !editable) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {/* Visible tags */}
      {visibleTags.map((tag) => {
        const colors = getTagColorClasses(tag.color);
        return (
          <Badge
            key={tag.id}
            variant="outline"
            className={cn(
              'text-[10px] gap-1 pr-1',
              colors.bg,
              colors.text,
              colors.border
            )}
          >
            <span>{tag.label}</span>
            {editable && (
              <button
                onClick={(e) => handleRemoveTag(e, tag.id)}
                className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        );
      })}

      {/* Hidden tags count */}
      {hiddenCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px]">
              +{hiddenCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {tags.slice(maxVisible).map((tag) => (
                <span key={tag.id} className="text-xs">{tag.label}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Add tag button */}
      {editable && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full"
            >
              <Tag className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            {!isCreating ? (
              <>
                {/* Search/filter existing tags */}
                <div className="space-y-2">
                  {unassignedTags.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground px-1">
                        {t('availableTags')}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {unassignedTags.map((tag) => {
                          const colors = getTagColorClasses(tag.color);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => handleAddExistingTag(tag)}
                              className={cn(
                                'px-2 py-0.5 rounded-full text-xs transition-colors',
                                colors.bg,
                                colors.text,
                                'hover:ring-2 hover:ring-primary/50'
                              )}
                            >
                              {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8"
                    onClick={() => setIsCreating(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('createNewTag')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t('createNewTag')}
                </p>
                
                <Input
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  placeholder={t('tagName')}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNewTag();
                    }
                  }}
                />

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    {t('tagColor')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setNewTagColor(color.name)}
                        className={cn(
                          'h-6 w-6 rounded-full border-2 transition-all',
                          color.bg,
                          newTagColor === color.name
                            ? 'ring-2 ring-primary ring-offset-2'
                            : 'border-transparent hover:scale-110'
                        )}
                      >
                        {newTagColor === color.name && (
                          <Check className={cn('h-4 w-4 mx-auto', color.text)} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setNewTagLabel('');
                    }}
                    className="flex-1"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateNewTag}
                    disabled={!newTagLabel.trim()}
                    className="flex-1"
                  >
                    {t('create')}
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export const FlowNodeTags = memo(FlowNodeTagsComponent);
export default FlowNodeTags;
