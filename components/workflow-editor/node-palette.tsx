'use client';

/**
 * NodePalette - Draggable node palette for adding nodes to the workflow
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  Play,
  Square,
  Sparkles,
  Wrench,
  GitBranch,
  GitFork,
  User,
  Workflow,
  Repeat,
  Clock,
  Globe,
  Code,
  Shuffle,
  GitMerge,
  Settings,
  Plug,
} from 'lucide-react';
import { NODE_CATEGORIES, NODE_TYPE_COLORS, type WorkflowNodeType } from '@/types/workflow-editor';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Play,
  Square,
  Sparkles,
  Wrench,
  GitBranch,
  GitFork,
  User,
  Workflow,
  Repeat,
  Clock,
  Globe,
  Code,
  Shuffle,
  GitMerge,
  Settings,
  Plug,
};

interface NodePaletteProps {
  onDragStart?: (type: WorkflowNodeType) => void;
  className?: string;
}

export function NodePalette({ onDragStart, className }: NodePaletteProps) {
  const t = useTranslations('workflowEditor');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    NODE_CATEGORIES.map((c) => c.id)
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = NODE_CATEGORIES.map((category) => ({
    ...category,
    nodes: category.nodes.filter(
      (node) =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.nodes.length > 0);

  const handleDragStart = (
    e: React.DragEvent,
    type: WorkflowNodeType
  ) => {
    e.dataTransfer.setData('application/workflow-node', type);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(type);
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border-r', className)}>
      {/* Header */}
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold mb-2">{t('nodePalette')}</h3>
        <InputGroup className="h-8">
          <InputGroupAddon align="inline-start">
            <Search className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t('searchNodes')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </InputGroup>
      </div>

      {/* Node categories */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredCategories.map((category) => {
            const CategoryIcon = ICONS[category.icon] || Workflow;
            const isExpanded = expandedCategories.includes(category.id);

            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-sm font-medium">
                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">{category.name}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-2 py-1 space-y-1">
                    {category.nodes.map((node) => {
                      const NodeIcon = ICONS[node.icon] || Workflow;
                      const color = NODE_TYPE_COLORS[node.type];

                      return (
                        <div
                          key={node.type}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node.type)}
                          className="flex items-center gap-2 p-2 rounded-md border border-transparent hover:border-border hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
                        >
                          <div
                            className="p-1.5 rounded"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <NodeIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {node.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {node.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Help text */}
      <div className="p-3 border-t text-xs text-muted-foreground">
        {t('dragToAdd')}
      </div>
    </div>
  );
}

export default NodePalette;
