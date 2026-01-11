'use client';

/**
 * NodeTemplateManager - UI for managing saved node templates
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { NODE_TYPE_COLORS } from '@/types/workflow/workflow-editor';
import type { NodeTemplate } from '@/types/workflow/workflow-editor';
import {
  Bookmark,
  Plus,
  MoreHorizontal,
  Trash2,
  Sparkles,
  Wrench,
  Code,
  GitBranch,
  Clock,
  Globe,
  Workflow,
} from 'lucide-react';

const NODE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ai: Sparkles,
  tool: Wrench,
  code: Code,
  conditional: GitBranch,
  delay: Clock,
  webhook: Globe,
  subworkflow: Workflow,
};

interface SaveTemplateDialogProps {
  nodeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveTemplateDialog({ nodeId, open, onOpenChange }: SaveTemplateDialogProps) {
  const t = useTranslations('nodeTemplate');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const { saveNodeAsTemplate, currentWorkflow } = useWorkflowEditorStore();

  const node = currentWorkflow?.nodes.find((n) => n.id === nodeId);

  const handleSave = () => {
    if (!name.trim()) return;
    
    saveNodeAsTemplate(nodeId, name.trim(), {
      description: description.trim() || undefined,
      category,
    });
    
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            {t('saveAsTemplate')}
          </DialogTitle>
          <DialogDescription>
            {t('saveDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">{t('templateName')}</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={node?.data.label || 'My Template'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">{t('descriptionOptional')}</Label>
            <Input
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-category">{t('category')}</Label>
            <Input
              id="template-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="custom"
            />
          </div>

          {node && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{t('nodeType')}</div>
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: `${NODE_TYPE_COLORS[node.type as keyof typeof NODE_TYPE_COLORS]}20`,
                  color: NODE_TYPE_COLORS[node.type as keyof typeof NODE_TYPE_COLORS],
                }}
              >
                {node.type}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Bookmark className="h-4 w-4 mr-1" />
            {t('saveTemplate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NodeTemplatePanelProps {
  onAddTemplate: (templateId: string) => void;
}

export function NodeTemplatePanel({ onAddTemplate }: NodeTemplatePanelProps) {
  const t = useTranslations('nodeTemplate');
  const { nodeTemplates, deleteNodeTemplate } = useWorkflowEditorStore();

  // Group templates by category
  const templatesByCategory = nodeTemplates.reduce((acc, template) => {
    const category = template.category || 'custom';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, NodeTemplate[]>);

  const categories = Object.keys(templatesByCategory);

  if (nodeTemplates.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{t('noTemplates')}</p>
        <p className="text-xs mt-1">
          {t('howToSave')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <Accordion type="multiple" defaultValue={categories} className="px-2">
        {categories.map((category) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="text-xs font-medium py-2">
              {category.charAt(0).toUpperCase() + category.slice(1)}
              <Badge variant="secondary" className="ml-2 text-xs">
                {templatesByCategory[category].length}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1">
                {templatesByCategory[category].map((template) => {
                  const Icon = NODE_TYPE_ICONS[template.nodeType] || Workflow;
                  const color = NODE_TYPE_COLORS[template.nodeType];

                  return (
                    <div
                      key={template.id}
                      className="group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/template-id', template.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onAddTemplate(template.id)}
                    >
                      <div
                        className="p-1.5 rounded"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {template.name}
                        </div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {template.description}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onAddTemplate(template.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('addToCanvas')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteNodeTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </ScrollArea>
  );
}

export default NodeTemplatePanel;
