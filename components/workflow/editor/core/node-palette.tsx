'use client';

/**
 * NodePalette - Advanced node palette with search, filters, and recent nodes
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/kbd';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronDown,
  Workflow,
  History,
  Star,
  X,
  SlidersHorizontal,
  Heart,
  Bookmark,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { NODE_CATEGORIES, NODE_TYPE_COLORS, type WorkflowNodeType } from '@/types/workflow/workflow-editor';
import { NODE_ICONS, NODE_TAGS, NODE_TYPE_TAGS } from '@/lib/workflow-editor/constants';
import { NodeTemplatePanel } from './node-template-manager';
import { useWorkflowEditorStore } from '@/stores/workflow';

// ICONS alias for backward compatibility with category icon lookups
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = NODE_ICONS as Record<string, React.ComponentType<{ className?: string }>>;

interface NodePaletteProps {
  onDragStart?: (type: WorkflowNodeType) => void;
  className?: string;
}

export function NodePalette({ onDragStart, className }: NodePaletteProps) {
  const t = useTranslations('workflowEditor');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('nodes');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    NODE_CATEGORIES.map((c) => c.id)
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const {
    addNodeFromTemplate,
    nodeTemplates,
    addNode,
    recentNodes,
    favoriteNodes,
    addRecentNode,
    toggleFavoriteNode,
  } = useWorkflowEditorStore(
    useShallow((state) => ({
      addNodeFromTemplate: state.addNodeFromTemplate,
      nodeTemplates: state.nodeTemplates,
      addNode: state.addNode,
      recentNodes: state.recentNodes,
      favoriteNodes: state.favoriteNodes,
      addRecentNode: state.addRecentNode,
      toggleFavoriteNode: state.toggleFavoriteNode,
    }))
  );

  // Alias store actions for backward compat with internal references
  const addToRecent = addRecentNode;
  const toggleFavorite = toggleFavoriteNode;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Advanced filtering
  const filteredCategories = useMemo(() => {
    return NODE_CATEGORIES.map((category) => ({
      ...category,
      nodes: category.nodes.filter((node) => {
        // Text search
        const matchesSearch = 
          searchQuery === '' ||
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Tag filter
        const nodeTags = NODE_TYPE_TAGS[node.type] || [];
        const matchesTags = 
          selectedTags.length === 0 ||
          selectedTags.some(tag => nodeTags.includes(tag));
        
        return matchesSearch && matchesTags;
      }),
    })).filter((category) => category.nodes.length > 0);
  }, [searchQuery, selectedTags]);

  const handleDragStart = (e: React.DragEvent, type: WorkflowNodeType) => {
    e.dataTransfer.setData('application/workflow-node', type);
    e.dataTransfer.effectAllowed = 'move';
    addToRecent(type);
    onDragStart?.(type);
  };

  const handleDoubleClick = (type: WorkflowNodeType) => {
    addNode(type, { x: 250, y: 250 });
    addToRecent(type);
  };

  const handleAddFromTemplate = (templateId: string) => {
    addNodeFromTemplate(templateId, { x: 250, y: 250 });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const renderNodeItem = (node: { type: WorkflowNodeType; name: string; description: string; icon: string }, showFavorite = true) => {
    const NodeIcon = ICONS[node.icon] || Workflow;
    const color = NODE_TYPE_COLORS[node.type];
    const isFavorite = favoriteNodes.includes(node.type);

    return (
      <motion.div
        key={node.name}
        draggable
        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, node.type)}
        onDoubleClick={() => handleDoubleClick(node.type)}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="group flex items-center gap-2 p-2 rounded-lg border border-transparent hover:border-border hover:bg-accent/80 cursor-grab active:cursor-grabbing transition-colors hover:shadow-sm"
      >
        <div
          className="p-1.5 rounded-md transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}20`, color }}
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
        {showFavorite && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                    isFavorite && "opacity-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(node.type);
                  }}
                >
                  <motion.div
                    whileTap={{ scale: 1.2 }}
                    transition={{ duration: 0.1 }}
                  >
                    <Heart 
                      className={cn(
                        "h-3.5 w-3.5 transition-colors",
                        isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                      )} 
                    />
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </motion.div>
    );
  };

  // Get all nodes flat for recent/favorites
  const allNodes = useMemo(() => {
    const nodes: { type: WorkflowNodeType; name: string; description: string; icon: string }[] = [];
    NODE_CATEGORIES.forEach(cat => {
      cat.nodes.forEach(node => {
        if (!nodes.find(n => n.type === node.type)) {
          nodes.push(node);
        }
      });
    });
    return nodes;
  }, []);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={cn('flex flex-col h-full min-h-0 bg-background border-r overflow-hidden', className)}>
      {/* Header with tabs */}
      <div className="p-3 border-b shrink-0">
        <TabsList className="w-full grid grid-cols-3 mb-2">
          <TabsTrigger value="nodes" className="text-xs">
            <Workflow className="h-3 w-3 mr-1" />
            Nodes
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-xs">
            <Star className="h-3 w-3 mr-1" />
            Favorites
            {favoriteNodes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {favoriteNodes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            <Bookmark className="h-3 w-3 mr-1" />
            Templates
            {nodeTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {nodeTemplates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Search and Filter */}
        {(activeTab === 'nodes' || activeTab === 'favorites') && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <InputGroup className="h-8 flex-1">
                <InputGroupAddon align="inline-start">
                  <Search className="h-4 w-4" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder={t('searchNodes')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm"
                />
                {searchQuery && (
                  <InputGroupAddon align="inline-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </InputGroupAddon>
                )}
              </InputGroup>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={selectedTags.length > 0 ? "secondary" : "outline"} 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {selectedTags.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                        {selectedTags.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {NODE_TAGS.map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag.id}
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => toggleTag(tag.id)}
                    >
                      <Badge variant="secondary" className={cn("text-xs", tag.color)}>
                        {tag.label}
                      </Badge>
                    </DropdownMenuCheckboxItem>
                  ))}
                  {selectedTags.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={false}
                        onCheckedChange={clearFilters}
                        className="text-muted-foreground"
                      >
                        Clear filters
                      </DropdownMenuCheckboxItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Active filters */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tagId => {
                  const tag = NODE_TAGS.find(t => t.id === tagId);
                  return tag ? (
                    <Badge 
                      key={tagId} 
                      variant="secondary" 
                      className={cn("text-xs cursor-pointer", tag.color)}
                      onClick={() => toggleTag(tagId)}
                    >
                      {tag.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content based on active tab */}
      <TabsContent value="nodes" className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden">
        {/* Recent nodes */}
        {recentNodes.length > 0 && !searchQuery && selectedTags.length === 0 && (
          <div className="p-2 border-b shrink-0">
            <div className="flex items-center gap-2 mb-2 px-2">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Recent</span>
            </div>
            <div className="flex flex-wrap gap-1 px-2">
              {recentNodes.slice(0, 6).map(type => {
                const node = allNodes.find(n => n.type === type);
                if (!node) return null;
                const NodeIcon = ICONS[node.icon] || Workflow;
                const color = NODE_TYPE_COLORS[node.type];
                return (
                  <TooltipProvider key={type}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          draggable
                          onDragStart={(e) => handleDragStart(e, type)}
                          onDoubleClick={() => handleDoubleClick(type)}
                          className="p-2 rounded-md border hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
                          style={{ backgroundColor: `${color}10` }}
                        >
                          <NodeIcon className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="font-medium">{node.name}</p>
                        <p className="text-xs text-muted-foreground">Double-click to add</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        {/* Node categories */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="p-2 space-y-1">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No nodes found</p>
                <p className="text-xs">Try adjusting your search or filters</p>
                {(searchQuery || selectedTags.length > 0) && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              filteredCategories.map((category) => {
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
                      <Badge variant="secondary" className="text-xs">
                        {category.nodes.length}
                      </Badge>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-2 py-1 space-y-1">
                        {category.nodes.map((node) => renderNodeItem(node))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Help text */}
        <div className="p-3 border-t text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-1">
            <span>{t('dragToCanvas')}</span>
            <Kbd className="text-[10px]">{t('doubleClick')}</Kbd>
            <span>{t('toAdd')}</span>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="favorites" className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden">
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="p-2 space-y-1">
            {favoriteNodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No favorites yet</p>
                <p className="text-xs">Click the heart icon on nodes to add</p>
              </div>
            ) : (
              favoriteNodes.map(type => {
                const node = allNodes.find(n => n.type === type);
                return node ? renderNodeItem(node, true) : null;
              })
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="templates" className="flex-1 min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
        <NodeTemplatePanel onAddTemplate={handleAddFromTemplate} />
      </TabsContent>
    </Tabs>
  );
}

export default NodePalette;
