'use client';

/**
 * KeyboardShortcutsSettings - Configure keyboard shortcuts
 * Allows users to view and customize keyboard shortcuts
 */

import { useTranslations } from 'next-intl';
import { Keyboard, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSettingsStore } from '@/stores';
import { ShortcutItem } from '@/components/ui/keyboard';
import { DEFAULT_SHORTCUTS } from '@/lib/ui/keyboard-constants';
import type { ShortcutDefinition } from '@/types/ui/keyboard';

export function KeyboardShortcutsSettings() {
  const t = useTranslations('keyboardSettings');
  const customShortcuts = useSettingsStore((state) => state.customShortcuts);
  const setCustomShortcut = useSettingsStore((state) => state.setCustomShortcut);
  const resetShortcuts = useSettingsStore((state) => state.resetShortcuts);

  const handleEditShortcut = (id: string, key: string) => {
    setCustomShortcut(id, key);
  };

  const handleReset = () => {
    resetShortcuts();
  };

  // Group shortcuts by category
  const groupedShortcuts = DEFAULT_SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutDefinition[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <CardTitle>{t('title')}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('resetAll')}
          </Button>
        </div>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <div key={category} className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              {t(`categories.${category}`)}
            </Label>
            <div className="rounded-lg border divide-y">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.id} className="group">
                  <ShortcutItem
                    shortcut={shortcut}
                    customKey={customShortcuts[shortcut.id]}
                    onEdit={handleEditShortcut}
                    t={t}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          {t('editTip')}
        </p>
      </CardContent>
    </Card>
  );
}

export default KeyboardShortcutsSettings;
