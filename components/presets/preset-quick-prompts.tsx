'use client';

/**
 * PresetQuickPrompts - displays quick prompts from the current preset
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { BuiltinPrompt } from '@/types/content/preset';

interface PresetQuickPromptsProps {
  prompts: BuiltinPrompt[];
  onSelectPrompt: (content: string) => void;
  disabled?: boolean;
}

export function PresetQuickPrompts({
  prompts,
  onSelectPrompt,
  disabled = false,
}: PresetQuickPromptsProps) {
  const t = useTranslations('presets');
  const [open, setOpen] = useState(false);

  if (!prompts || prompts.length === 0) {
    return null;
  }

  const handleSelect = (prompt: BuiltinPrompt) => {
    onSelectPrompt(prompt.content);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">{t('quick')}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <p className="text-sm font-medium">{t('quickPrompts')}</p>
          <p className="text-xs text-muted-foreground">
            {t('quickPromptsHint')}
          </p>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {prompts.map((prompt) => (
              <Button
                key={prompt.id}
                variant="ghost"
                onClick={() => handleSelect(prompt)}
                className="w-full justify-start h-auto p-2 text-left flex-col items-start"
              >
                <p className="text-sm font-medium truncate w-full">{prompt.name}</p>
                {prompt.description && (
                  <p className="text-xs text-muted-foreground truncate w-full font-normal">
                    {prompt.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 w-full font-normal">
                  {prompt.content}
                </p>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default PresetQuickPrompts;
