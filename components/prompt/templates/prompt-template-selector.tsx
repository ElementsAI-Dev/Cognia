"use client";

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePromptTemplateStore } from '@/stores';
import type { PromptTemplate } from '@/types/content/prompt-template';

interface PromptTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: PromptTemplate) => void;
}

export function PromptTemplateSelector({ open, onOpenChange, onSelect }: PromptTemplateSelectorProps) {
  const t = useTranslations('promptTemplate.selector');
  const templates = usePromptTemplateStore((state) => state.templates);
  const [searchQuery, setSearchQuery] = useState('');

  const sorted = useMemo(() => {
    let list = [...templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (tpl) =>
          tpl.name.toLowerCase().includes(query) ||
          tpl.description?.toLowerCase().includes(query) ||
          tpl.category?.toLowerCase().includes(query)
      );
    }
    return list;
  }, [templates, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <ScrollArea className="max-h-[300px]">
            <CommandList>
              <CommandEmpty>{t('noTemplates')}</CommandEmpty>
              <CommandGroup heading={t('templatesGroup')}>
                {sorted.map((template) => (
                  <CommandItem
                    key={template.id}
                    value={template.name}
                    onSelect={() => onSelect(template)}
                    className="flex items-start gap-3 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{template.name}</span>
                        {template.category && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                            {template.category}
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-1">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {template.usageCount}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{t('usageCount')}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
