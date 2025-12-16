'use client';

/**
 * TemplateSelector - Select a chat template to start a new conversation
 */

import { useState, useMemo } from 'react';
import { Search, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTemplateStore } from '@/stores';
import type { ChatTemplate, TemplateCategory } from '@/types/template';
import { TEMPLATE_CATEGORY_LABELS } from '@/types/template';

interface TemplateSelectorProps {
  trigger?: React.ReactNode;
  onSelectTemplate: (template: ChatTemplate) => void;
}

export function TemplateSelector({
  trigger,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  const templates = useTemplateStore((state) => state.templates);
  const searchTemplates = useTemplateStore((state) => state.searchTemplates);

  const filteredTemplates = useMemo(() => {
    let result = searchQuery ? searchTemplates(searchQuery) : templates;
    
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory);
    }
    
    return result;
  }, [templates, searchQuery, selectedCategory, searchTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return Array.from(cats) as TemplateCategory[];
  }, [templates]);

  const handleSelect = (template: ChatTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Templates
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Chat Templates
          </DialogTitle>
          <DialogDescription>
            Choose a template to start a new conversation with pre-configured settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Tabs */}
          <Tabs
            value={selectedCategory}
            onValueChange={(v) => setSelectedCategory(v as TemplateCategory | 'all')}
          >
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {TEMPLATE_CATEGORY_LABELS[cat]}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-[400px]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelect(template)}
                    />
                  ))}
                  {filteredTemplates.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      No templates found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: ChatTemplate;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-start gap-2 p-4 rounded-lg border bg-card text-left transition-colors hover:bg-accent hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-2xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{template.name}</h3>
          <Badge variant="secondary" className="text-xs mt-1">
            {TEMPLATE_CATEGORY_LABELS[template.category]}
          </Badge>
        </div>
        {template.isBuiltIn && (
          <Badge variant="outline" className="text-xs shrink-0">
            Built-in
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {template.description}
      </p>
      {template.suggestedQuestions && template.suggestedQuestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {template.suggestedQuestions.slice(0, 2).map((q, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[150px]"
            >
              {q}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default TemplateSelector;
