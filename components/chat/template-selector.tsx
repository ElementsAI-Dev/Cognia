'use client';

/**
 * TemplateSelector - Select a chat template to start a new conversation
 */

import { useState, useMemo } from 'react';
import { Search, Sparkles, Eye, MessageSquare, Settings2, ArrowRight } from 'lucide-react';
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
  const [previewTemplate, setPreviewTemplate] = useState<ChatTemplate | null>(null);

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
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Chat Templates
          </DialogTitle>
          <DialogDescription>
            Choose a template to start a new conversation with pre-configured settings
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left side - Template list */}
          <div className="flex-1 space-y-4 flex flex-col min-w-0">
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
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap shrink-0">
                <TabsTrigger value="all">All</TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {TEMPLATE_CATEGORY_LABELS[cat]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4 flex-1 min-h-0">
                <ScrollArea className="h-[350px]">
                  <div className="grid gap-3">
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => handleSelect(template)}
                        onPreview={() => setPreviewTemplate(template)}
                        isSelected={previewTemplate?.id === template.id}
                      />
                    ))}
                    {filteredTemplates.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No templates found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right side - Preview panel */}
          <div className="w-80 shrink-0 border-l hidden md:block">
            <ScrollArea className="h-[450px]">
              <TemplatePreview template={previewTemplate} />
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: ChatTemplate;
  onSelect: () => void;
  onPreview: () => void;
  isSelected: boolean;
}

function TemplateCard({ template, onSelect, onPreview, isSelected }: TemplateCardProps) {
  return (
    <button
      onClick={onPreview}
      className={`flex flex-col items-start gap-2 p-4 rounded-lg border bg-card text-left transition-all hover:bg-accent hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary ${isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : ''}`}
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
      {isSelected && (
        <Button 
          size="sm" 
          className="w-full mt-2 gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          Use Template
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </button>
  );
}

function TemplatePreview({ template }: { template: ChatTemplate | null }) {
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <Eye className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center">Select a template to preview its details</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{template.icon}</span>
        <div>
          <h3 className="text-lg font-semibold">{template.name}</h3>
          <Badge variant="secondary">{TEMPLATE_CATEGORY_LABELS[template.category]}</Badge>
        </div>
      </div>

      <p className="text-muted-foreground">{template.description}</p>

      {template.systemPrompt && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="h-4 w-4" />
            System Prompt
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm max-h-32 overflow-y-auto">
            <p className="whitespace-pre-wrap text-muted-foreground">{template.systemPrompt}</p>
          </div>
        </div>
      )}

      {template.suggestedQuestions && template.suggestedQuestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            Suggested Prompts
          </div>
          <div className="space-y-2">
            {template.suggestedQuestions.map((q, i) => (
              <div
                key={i}
                className="p-2 rounded-lg bg-muted/50 text-sm text-muted-foreground"
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      )}

      {(template.provider || template.model) && (
        <div className="flex gap-2 flex-wrap">
          {template.provider && (
            <Badge variant="outline">Provider: {template.provider}</Badge>
          )}
          {template.model && (
            <Badge variant="outline">Model: {template.model}</Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;
