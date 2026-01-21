'use client';

/**
 * KeyboardSettings - Configure and view keyboard shortcuts
 * Enhanced with customization capabilities
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Keyboard, Edit2, RotateCcw, X, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  useKeyboardShortcuts,
  formatShortcut,
  type KeyboardShortcut,
} from '@/hooks/ui';
import { useSettingsStore } from '@/stores';
import { ShortcutEditDialog } from '@/components/ui/keyboard';
import { CATEGORY_COLORS } from '@/lib/ui/keyboard-constants';

export function KeyboardSettings() {
  const t = useTranslations('keyboardSettings');
  const tCommon = useTranslations('common');
  const { shortcuts } = useKeyboardShortcuts({ enabled: false });
  const customShortcuts = useSettingsStore((state) => state.customShortcuts);
  const setCustomShortcut = useSettingsStore((state) => state.setCustomShortcut);
  const resetShortcuts = useSettingsStore((state) => state.resetShortcuts);

  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const hasCustomShortcuts = Object.keys(customShortcuts).length > 0;

  // Get display shortcut (custom or default)
  const getDisplayShortcut = (shortcut: KeyboardShortcut, index: number): string => {
    const shortcutId = `${shortcut.category}-${index}`;
    if (customShortcuts[shortcutId]) {
      return customShortcuts[shortcutId];
    }
    return formatShortcut(shortcut);
  };

  const handleEditShortcut = (shortcut: KeyboardShortcut, _index: number) => {
    setEditingShortcut({ ...shortcut, action: () => {} });
  };

  const handleSaveShortcut = (keys: string) => {
    if (editingShortcut) {
      const shortcutIndex = shortcuts.findIndex(s => s.description === editingShortcut.description);
      if (shortcutIndex !== -1) {
        const shortcutId = `${editingShortcut.category}-${shortcutIndex}`;
        setCustomShortcut(shortcutId, keys);
      }
    }
    setEditingShortcut(null);
  };

  const handleResetShortcuts = () => {
    resetShortcuts();
    setShowResetConfirm(false);
  };

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<KeyboardShortcut['category'], KeyboardShortcut[]>
  );

  return (
    <div className="space-y-4">
      {/* Header with reset button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>
        {hasCustomShortcuts && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('resetAll')}
          </Button>
        )}
      </div>

      {hasCustomShortcuts && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('customShortcutsAlert', { count: Object.keys(customShortcuts).length })}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            {t('allShortcuts')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('allShortcutsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`${CATEGORY_COLORS[category as KeyboardShortcut['category']]} text-white text-[10px]`}
                >
                  {t(`categories.${category}`)}
                </Badge>
              </div>
              <div className="grid gap-1">
                {categoryShortcuts.map((shortcut, index) => {
                  const globalIndex = shortcuts.findIndex(s => s.description === shortcut.description);
                  const shortcutId = `${category}-${globalIndex}`;
                  const isCustom = !!customShortcuts[shortcutId];
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between py-1.5 px-2.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group ${
                        isCustom ? 'ring-1 ring-primary/50' : ''
                      }`}
                    >
                      <span className="text-xs">{shortcut.description}</span>
                      <div className="flex items-center gap-1.5">
                        <kbd className={`px-1.5 py-0.5 text-[10px] font-mono bg-background border rounded shadow-sm ${
                          isCustom ? 'border-primary text-primary' : ''
                        }`}>
                          {getDisplayShortcut(shortcut, globalIndex)}
                        </kbd>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditShortcut(shortcut, globalIndex)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{t('tips')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-muted-foreground">
          <p>• {t('tip1')}</p>
          <p>• {t('tip2')}</p>
          <p>• {t('tip3')}</p>
          <p>• {t('tip4')}</p>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ShortcutEditDialog
        open={!!editingShortcut}
        onOpenChange={(open) => !open && setEditingShortcut(null)}
        shortcut={editingShortcut}
        onSave={handleSaveShortcut}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resetConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('resetConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleResetShortcuts}>
              <X className="h-4 w-4 mr-2" />
              {t('resetAll')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KeyboardSettings;
