"use client";

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePromptTemplateStore } from '@/stores';
import type { PromptTemplate } from '@/types/prompt-template';

interface PromptTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: PromptTemplate) => void;
}

export function PromptTemplateSelector({ open, onOpenChange, onSelect }: PromptTemplateSelectorProps) {
  const templates = usePromptTemplateStore((state) => state.templates);

  const sorted = useMemo(
    () => [...templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [templates]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert prompt template</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search templates" />
          <CommandList>
            <CommandEmpty>No templates found</CommandEmpty>
            <CommandGroup heading="Templates">
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
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
