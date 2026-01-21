'use client';

/**
 * ShortcutEditDialog - Dialog for editing keyboard shortcuts
 * Extracted from components/settings/system/keyboard-settings.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { KeyboardShortcut } from '@/hooks/ui';

export interface ShortcutEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut: KeyboardShortcut | null;
  onSave: (keys: string) => void;
}

interface ShortcutEditDialogContentProps {
  shortcut: KeyboardShortcut;
  onSave: (keys: string) => void;
  onClose: () => void;
}

function ShortcutEditDialogContent({ shortcut, onSave, onClose }: ShortcutEditDialogContentProps) {
  const t = useTranslations('keyboardSettings');
  const tCommon = useTranslations('common');
  const [capturedKeys, setCapturedKeys] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(true);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isCapturing) return;
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    // Skip if only modifier keys are pressed
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    setCapturedKeys(parts.join('+'));
    setIsCapturing(false);
  }, [isCapturing]);

  useEffect(() => {
    if (isCapturing) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isCapturing, handleKeyDown]);

  const handleSave = () => {
    if (capturedKeys) {
      onSave(capturedKeys);
      onClose();
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('editShortcut')}</DialogTitle>
        <DialogDescription>
          {t('editShortcutDesc', { action: shortcut.description })}
        </DialogDescription>
      </DialogHeader>
      <div className="py-6">
        <div
          className={`flex items-center justify-center h-20 rounded-lg border-2 border-dashed transition-colors ${
            isCapturing ? 'border-primary bg-primary/5' : 'border-muted'
          }`}
          onClick={() => setIsCapturing(true)}
        >
          {capturedKeys ? (
            <kbd className="px-4 py-2 text-lg font-mono bg-background border rounded-lg shadow">
              {capturedKeys}
            </kbd>
          ) : (
            <span className="text-muted-foreground">
              {isCapturing ? t('pressKeys') : t('clickToCapture')}
            </span>
          )}
        </div>
        {capturedKeys && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            {t('pressAnotherCombination')}
          </p>
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>
          {tCommon('cancel')}
        </Button>
        <Button onClick={handleSave} disabled={!capturedKeys}>
          <Check className="h-4 w-4 mr-2" />
          {tCommon('save')}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ShortcutEditDialog({ open, onOpenChange, shortcut, onSave }: ShortcutEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {shortcut && (
          <ShortcutEditDialogContent
            key={shortcut.description}
            shortcut={shortcut}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutEditDialog;
