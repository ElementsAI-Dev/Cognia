'use client';

/**
 * SubAgentTemplateSelector - Component for selecting and creating sub-agents from templates
 */

import { useState, useMemo } from 'react';
import {
  Search,
  Code,
  FileText,
  BarChart,
  Sparkles,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SubAgentTemplate } from '@/types/agent/sub-agent';

export interface SubAgentTemplateSelectorProps {
  templates: SubAgentTemplate[];
  onSelect: (templateId: string, variables: Record<string, string>) => void;
  className?: string;
}

const categoryConfig: Record<SubAgentTemplate['category'], {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  research: { icon: Search, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  coding: { icon: Code, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950' },
  writing: { icon: FileText, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  analysis: { icon: BarChart, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  general: { icon: Sparkles, color: 'text-primary', bgColor: 'bg-primary/10' },
};

interface TemplateCardProps {
  template: SubAgentTemplate;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const config = categoryConfig[template.category];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border cursor-pointer',
        'hover:border-primary/50 hover:shadow-sm transition-all',
        config.bgColor
      )}
      onClick={onSelect}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
        'bg-background border'
      )}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium text-sm">{template.name}</h4>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {template.description}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-[10px]">
            {template.category}
          </Badge>
          {template.isBuiltIn && (
            <Badge variant="outline" className="text-[10px]">
              Built-in
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

interface VariableInputDialogProps {
  template: SubAgentTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (variables: Record<string, string>) => void;
}

function VariableInputDialog({
  template,
  open,
  onOpenChange,
  onSubmit,
}: VariableInputDialogProps) {
  const [variables, setVariables] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    template.variables?.forEach((v) => {
      initial[v.name] = v.defaultValue || '';
    });
    return initial;
  });

  const handleSubmit = () => {
    onSubmit(variables);
    onOpenChange(false);
  };

  const isValid = template.variables?.every(
    (v) => !v.required || variables[v.name]?.trim()
  ) ?? true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure {template.name}</DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {template.variables?.map((v) => (
            <div key={v.name} className="space-y-2">
              <Label htmlFor={v.name} className="flex items-center gap-2">
                {v.name}
                {v.required && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id={v.name}
                placeholder={v.description}
                value={variables[v.name] || ''}
                onChange={(e) =>
                  setVariables((prev) => ({ ...prev, [v.name]: e.target.value }))
                }
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">{v.description}</p>
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            <Plus className="h-4 w-4 mr-1" />
            Create Sub-Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubAgentTemplateSelector({
  templates,
  onSelect,
  className,
}: SubAgentTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SubAgentTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  // Group by category
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return Array.from(cats);
  }, [templates]);

  const handleTemplateSelect = (template: SubAgentTemplate) => {
    if (template.variables && template.variables.length > 0) {
      setSelectedTemplate(template);
      setDialogOpen(true);
    } else {
      onSelect(template.id, {});
    }
  };

  const handleVariablesSubmit = (variables: Record<string, string>) => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.id, variables);
      setSelectedTemplate(null);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((cat) => {
            const config = categoryConfig[cat];
            const Icon = config.icon;
            return (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setSelectedCategory(cat)}
              >
                <Icon className="h-3 w-3" />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Template list */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-2 pr-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No templates found
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => handleTemplateSelect(template)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Variable input dialog */}
      {selectedTemplate && (
        <VariableInputDialog
          template={selectedTemplate}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleVariablesSubmit}
        />
      )}
    </div>
  );
}

export default SubAgentTemplateSelector;
