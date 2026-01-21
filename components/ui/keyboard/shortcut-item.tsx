'use client';

/**
 * ShortcutItem - Keyboard shortcut item component with inline editing
 * Extracted from components/settings/system/keyboard-shortcuts-settings.tsx
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Edit2, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { validateShortcut } from '@/lib/native/shortcuts';
import type { ShortcutValidationResult } from '@/types/shortcut';
import type { ShortcutDefinition } from '@/types/ui/keyboard';

export interface ShortcutItemProps {
  shortcut: ShortcutDefinition;
  customKey?: string;
  onEdit: (id: string, key: string) => void;
  t: ReturnType<typeof useTranslations>;
}

export function ShortcutItem({
  shortcut,
  customKey,
  onEdit,
  t,
}: ShortcutItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [validation, setValidation] = useState<ShortcutValidationResult | null>(null);

  const currentKey = customKey || shortcut.defaultKey;
  const isCustomized = customKey && customKey !== shortcut.defaultKey;

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const keys: string[] = [];
    if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    
    // Add the actual key
    const key = e.key;
    if (key !== 'Control' && key !== 'Alt' && key !== 'Shift' && key !== 'Meta') {
      // Normalize key names
      const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
      keys.push(normalizedKey);
    }

    if (keys.length > 0) {
      setRecordedKeys(keys);
      const shortcutStr = keys.join('+');
      setInputValue(shortcutStr);
      
      // Validate shortcut in real-time
      try {
        const result = await validateShortcut(shortcutStr, 'keyboard-settings', shortcut.defaultLabel);
        setValidation(result);
      } catch (error) {
        console.error('Validation error:', error);
      }
    }
  }, [shortcut.defaultLabel]);

  const handleSave = () => {
    if (recordedKeys.length > 0 && validation?.valid) {
      onEdit(shortcut.id, recordedKeys.join('+'));
    }
    setIsEditing(false);
    setRecordedKeys([]);
    setInputValue('');
    setValidation(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setRecordedKeys([]);
    setInputValue('');
    setValidation(null);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setInputValue('');
    setRecordedKeys([]);
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
      <div className="flex-1">
        <span className={cn('text-sm', isCustomized && 'font-medium')}>
          {t(`shortcuts.${shortcut.labelKey}`)}
        </span>
        {isCustomized && (
          <span className="ml-2 text-xs text-primary">({t('customized')})</span>
        )}
      </div>
      
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onKeyDown={handleKeyDown}
            placeholder={t('pressKeys')}
            className="h-7 w-32 text-xs text-center"
            autoFocus
            readOnly
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={recordedKeys.length === 0 || !validation?.valid}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCancel}
          >
            <X className="h-3.5 w-3.5 text-red-600" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
            {currentKey}
          </kbd>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleStartEdit}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      {isEditing && validation && !validation.valid && (
        <div className="mt-2 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            {validation.errors?.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
            {validation.conflict && (
              <div>
                Conflicts with: {validation.conflict.existingAction} ({validation.conflict.existingOwner})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShortcutItem;
