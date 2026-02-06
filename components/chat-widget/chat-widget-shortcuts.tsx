'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  descriptionKey: string;
}

const SHORTCUT_KEYS: Shortcut[] = [
  { keys: ['Enter'], descriptionKey: 'sendMessage' },
  { keys: ['Shift', 'Enter'], descriptionKey: 'newLine' },
  { keys: ['Esc'], descriptionKey: 'hideAssistant' },
  { keys: ['↑'], descriptionKey: 'previousMessage' },
  { keys: ['↓'], descriptionKey: 'nextMessage' },
  { keys: ['Ctrl', 'Shift', 'Space'], descriptionKey: 'toggleAssistant' },
];

interface ChatWidgetShortcutsProps {
  className?: string;
}

export function ChatWidgetShortcuts({ className }: ChatWidgetShortcutsProps) {
  const t = useTranslations('chatWidget.shortcuts');
  const [open, setOpen] = useState(false);

  const shortcuts = useMemo(
    () =>
      SHORTCUT_KEYS.map((s) => ({
        keys: s.keys,
        description: t(
          s.descriptionKey as
            | 'sendMessage'
            | 'newLine'
            | 'hideAssistant'
            | 'previousMessage'
            | 'nextMessage'
            | 'toggleAssistant'
        ),
      })),
    [t]
  );

  // Listen for ? key to open shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center w-full px-2 py-1.5 text-sm',
            'rounded-sm hover:bg-accent hover:text-accent-foreground',
            'cursor-pointer outline-none',
            className
          )}
        >
          <Keyboard className="h-4 w-4 mr-2" />
          {t('title')}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="inline-flex items-center">
                    <Kbd>{key}</Kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-0.5 text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          <Kbd>?</Kbd> {t('openPanel')}
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default ChatWidgetShortcuts;
