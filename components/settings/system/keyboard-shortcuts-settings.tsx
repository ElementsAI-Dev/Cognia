'use client';

/**
 * KeyboardShortcutsSettings - Configure keyboard shortcuts
 * Allows users to view and customize keyboard shortcuts
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Keyboard, RotateCcw, Edit2, Check, X } from 'lucide-react';
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

const CATEGORY_LABELS: Record<string, { en: string; zh: string }> = {
  chat: { en: 'Chat', zh: '聊天' },
  navigation: { en: 'Navigation', zh: '导航' },
  editing: { en: 'Editing', zh: '编辑' },
};

function ShortcutItem({
  shortcut,
  customKey,
  onEdit,
  language,
}: {
  shortcut: ShortcutDefinition;
  customKey?: string;
  onEdit: (id: string, key: string) => void;
  language: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);

  const currentKey = customKey || shortcut.defaultKey;
  const isCustomized = customKey && customKey !== shortcut.defaultKey;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
      setInputValue(keys.join('+'));
    }
  }, []);

  const handleSave = () => {
    if (recordedKeys.length > 0) {
      onEdit(shortcut.id, recordedKeys.join('+'));
    }
    setIsEditing(false);
    setRecordedKeys([]);
    setInputValue('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setRecordedKeys([]);
    setInputValue('');
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
          {shortcut.defaultLabel}
        </span>
        {isCustomized && (
          <span className="ml-2 text-xs text-primary">(customized)</span>
        )}
      </div>
      
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onKeyDown={handleKeyDown}
            placeholder={language === 'zh-CN' ? '按下快捷键...' : 'Press keys...'}
            className="h-7 w-32 text-xs text-center"
            autoFocus
            readOnly
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleSave}
            disabled={recordedKeys.length === 0}
          >
            <Check className="h-3.5 w-3.5 text-green-600" />
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
    </div>
  );
}

export function KeyboardShortcutsSettings() {
  const t = useTranslations('settings');
  const language = useSettingsStore((state) => state.language);
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
            <CardTitle>{t('keyboardShortcuts') || 'Keyboard Shortcuts'}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('resetToDefaults') || 'Reset'}
          </Button>
        </div>
        <CardDescription>
          {t('keyboardShortcutsDescription') || 'Customize keyboard shortcuts for common actions'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <div key={category} className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[category]?.[language === 'zh-CN' ? 'zh' : 'en'] || category}
            </Label>
            <div className="rounded-lg border divide-y">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.id} className="group">
                  <ShortcutItem
                    shortcut={shortcut}
                    customKey={customShortcuts[shortcut.id]}
                    onEdit={handleEditShortcut}
                    language={language}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          {language === 'zh-CN' 
            ? '提示：点击编辑按钮，然后按下新的快捷键组合'
            : 'Tip: Click edit, then press the new key combination'}
        </p>
      </CardContent>
    </Card>
  );
}

export default KeyboardShortcutsSettings;
