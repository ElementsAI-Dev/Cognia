'use client';

/**
 * KeyboardShortcutsDialog - shows available keyboard shortcuts
 */

import { Keyboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useKeyboardShortcuts, formatShortcut } from '@/hooks/ui';
import { useUIStore } from '@/stores';

interface KeyboardShortcutsDialogProps {
  trigger?: React.ReactNode;
}

const categoryLabelKeys: Record<string, string> = {
  navigation: 'navigation',
  chat: 'chat',
  editing: 'editing',
  system: 'system',
};

const categoryColors: Record<string, string> = {
  navigation: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  chat: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  editing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  system: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function KeyboardShortcutsDialog({ trigger }: KeyboardShortcutsDialogProps) {
  const t = useTranslations('keyboardShortcuts');
  const open = useUIStore((state) => state.keyboardShortcutsOpen);
  const setOpen = useUIStore((state) => state.setKeyboardShortcutsOpen);
  const { shortcuts } = useKeyboardShortcuts({ enabled: false });

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof shortcuts>
  );

  // If no trigger is provided, render only the controlled dialog (no visible trigger button)
  if (!trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              {t('title')}
            </DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Badge variant="secondary" className={categoryColors[category]}>
                    {t(categoryLabelKeys[category])}
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-1 font-mono text-xs">
                        {formatShortcut({
                          key: shortcut.key,
                          ctrl: shortcut.ctrl,
                          shift: shortcut.shift,
                          alt: shortcut.alt,
                          meta: shortcut.meta,
                        })}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              <strong>{t('tip')}</strong> Press{' '}
              <kbd className="mx-1 rounded border bg-background px-1.5 py-0.5 font-mono text-xs">
                {typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}+K
              </kbd>{' '}
              {t('commandPaletteHint')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Badge variant="secondary" className={categoryColors[category]}>
                  {t(categoryLabelKeys[category])}
                </Badge>
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-1 font-mono text-xs">
                      {formatShortcut({
                        key: shortcut.key,
                        ctrl: shortcut.ctrl,
                        shift: shortcut.shift,
                        alt: shortcut.alt,
                        meta: shortcut.meta,
                      })}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
          <p className="text-muted-foreground">
            <strong>{t('tip')}</strong> Press{' '}
            <kbd className="mx-1 rounded border bg-background px-1.5 py-0.5 font-mono text-xs">
              {typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}+K
            </kbd>{' '}
            {t('commandPaletteHint')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
