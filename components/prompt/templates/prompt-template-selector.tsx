"use client";

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const sorted = useMemo(
    () => [...templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [templates]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput placeholder={t('searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('noTemplates')}</CommandEmpty>
            <CommandGroup heading={t('templatesGroup')}>
              {sorted.map((template) => (
                <CommandItem key={template.id} value={template.name} onSelect={() => onSelect(template)}>
                  <div className="flex flex-col">
                    <span className="font-medium">{template.name}</span>
                    {template.description && (
                      <span className="text-muted-foreground text-xs">{template.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
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
