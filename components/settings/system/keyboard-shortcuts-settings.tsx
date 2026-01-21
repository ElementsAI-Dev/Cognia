'use client';

/**
 * KeyboardShortcutsSettings - Configure keyboard shortcuts
 * Allows users to view and customize keyboard shortcuts
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Keyboard, RotateCcw, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSettingsStore } from '@/stores';
import { validateShortcut } from '@/lib/native/shortcuts';
import type { ShortcutValidationResult } from '@/types/shortcut';
import { cn } from '@/lib/utils';

interface ShortcutDefinition {
  id: string;
  labelKey: string;
  defaultLabel: string;
  defaultKey: string;
  category: 'chat' | 'navigation' | 'editing';
}

const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Chat shortcuts
  { id: 'newChat', labelKey: 'newChat', defaultLabel: 'New Chat', defaultKey: 'Ctrl+N', category: 'chat' },
  { id: 'sendMessage', labelKey: 'sendMessage', defaultLabel: 'Send Message', defaultKey: 'Enter', category: 'chat' },
  { id: 'regenerate', labelKey: 'regenerate', defaultLabel: 'Regenerate Response', defaultKey: 'Ctrl+Shift+R', category: 'chat' },
  { id: 'stopGeneration', labelKey: 'stopGeneration', defaultLabel: 'Stop Generation', defaultKey: 'Escape', category: 'chat' },
  { id: 'clearChat', labelKey: 'clearChat', defaultLabel: 'Clear Chat', defaultKey: 'Ctrl+Shift+Delete', category: 'chat' },
  
  // Navigation shortcuts
  { id: 'toggleSidebar', labelKey: 'toggleSidebar', defaultLabel: 'Toggle Sidebar', defaultKey: 'Ctrl+B', category: 'navigation' },
  { id: 'openSettings', labelKey: 'openSettings', defaultLabel: 'Open Settings', defaultKey: 'Ctrl+,', category: 'navigation' },
  { id: 'focusInput', labelKey: 'focusInput', defaultLabel: 'Focus Input', defaultKey: 'Ctrl+/', category: 'navigation' },
  { id: 'searchChats', labelKey: 'searchChats', defaultLabel: 'Search Chats', defaultKey: 'Ctrl+K', category: 'navigation' },
  
  // Editing shortcuts
  { id: 'copyLastMessage', labelKey: 'copyLastMessage', defaultLabel: 'Copy Last Message', defaultKey: 'Ctrl+Shift+C', category: 'editing' },
  { id: 'editLastMessage', labelKey: 'editLastMessage', defaultLabel: 'Edit Last Message', defaultKey: 'Ctrl+Shift+E', category: 'editing' },
];


function ShortcutItem({
  shortcut,
  customKey,
  onEdit,
  t,
}: {
  shortcut: ShortcutDefinition;
  customKey?: string;
  onEdit: (id: string, key: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
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
