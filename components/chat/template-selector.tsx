'use client';

/**
 * TemplateSelector - Select a chat template to start a new conversation
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { EmptyState } from '@/components/ui/empty-state';
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
  const t = useTranslations('templates');
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
            {t('title')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left side - Template list */}
          <div className="md:w-[55%] lg:w-[60%] space-y-4 flex flex-col min-w-0 overflow-hidden shrink-0">
            {/* Search */}
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>

            {/* Category Tabs */}
            <Tabs
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as TemplateCategory | 'all')}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap shrink-0">
                <TabsTrigger value="all">{t('all')}</TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {TEMPLATE_CATEGORY_LABELS[cat]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4 flex-1 min-h-0">
                <ScrollArea className="h-[200px] md:h-[350px]">
                  <div className="grid gap-3">
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => handleSelect(template)}
                        onPreview={() => setPreviewTemplate(template)}
                        isSelected={previewTemplate?.id === template.id}
                        builtInLabel={t('builtIn')}
                        useTemplateLabel={t('useTemplate')}
                      />
                    ))}
                    {filteredTemplates.length === 0 && (
                      <EmptyState
                        icon={Sparkles}
                        title={t('noTemplates')}
                        description={searchQuery ? 'Try a different search query' : 'No templates available in this category'}
                        compact
                      />
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right side - Preview panel */}
          <div className="flex-1 border-t md:border-t-0 md:border-l flex flex-col overflow-hidden min-w-0">
            <ScrollArea className="h-[200px] md:h-auto md:flex-1">
              <TemplatePreview 
                template={previewTemplate}
                selectToPreviewLabel={t('selectToPreview')}
                systemPromptLabel={t('systemPrompt')}
                suggestedPromptsLabel={t('suggestedPrompts')}
                providerLabel={t('provider')}
                modelLabel={t('model')}
              />
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
  builtInLabel: string;
  useTemplateLabel: string;
}

function TemplateCard({ template, onSelect, onPreview, isSelected, builtInLabel, useTemplateLabel }: TemplateCardProps) {
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
            {builtInLabel}
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
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[200px]"
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
          {useTemplateLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </button>
  );
}

interface TemplatePreviewProps {
  template: ChatTemplate | null;
  selectToPreviewLabel: string;
  systemPromptLabel: string;
  suggestedPromptsLabel: string;
  providerLabel: string;
  modelLabel: string;
}

function TemplatePreview({ 
  template, 
  selectToPreviewLabel,
  systemPromptLabel,
  suggestedPromptsLabel,
  providerLabel,
  modelLabel,
}: TemplatePreviewProps) {
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <Eye className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center">{selectToPreviewLabel}</p>
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
            {systemPromptLabel}
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
            {suggestedPromptsLabel}
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
            <Badge variant="outline">{providerLabel}: {template.provider}</Badge>
          )}
          {template.model && (
            <Badge variant="outline">{modelLabel}: {template.model}</Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;
