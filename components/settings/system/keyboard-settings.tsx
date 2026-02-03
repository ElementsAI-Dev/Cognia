'use client';

/**
 * KeyboardSettings - Configure and view keyboard shortcuts
 * Uses unified shortcut definitions from keyboard-constants.ts
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Keyboard,
  Edit2,
  RotateCcw,
  X,
  AlertCircle,
  Compass,
  MessageSquare,
  Settings,
  Type,
  RotateCw,
  Globe,
  Monitor,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSettingsStore, useNativeStore } from '@/stores';
import {
  CATEGORY_COLORS,
  formatShortcutDisplay,
  getShortcutsByCategory,
} from '@/lib/ui/keyboard-constants';
import type { ShortcutDefinition, ShortcutCategory } from '@/types/ui/keyboard';
import { isTauri } from '@/lib/utils';

// Category icons mapping
const CategoryIcons: Record<ShortcutCategory, React.ReactNode> = {
  navigation: <Compass className="h-3 w-3" />,
  chat: <MessageSquare className="h-3 w-3" />,
  editing: <Type className="h-3 w-3" />,
  system: <Settings className="h-3 w-3" />,
};

// Category order for display
const CATEGORY_ORDER: ShortcutCategory[] = ['navigation', 'chat', 'editing', 'system'];

interface EditingState {
  shortcut: ShortcutDefinition;
  capturedKeys: string;
  isCapturing: boolean;
}

/**
 * GlobalShortcutsSection - Shows Tauri global shortcuts (desktop only)
 */
function GlobalShortcutsSection({ isMac }: { isMac: boolean }) {
  const t = useTranslations('keyboardSettings');

  // Native store state
  const globalShortcuts = useNativeStore((state) => state.shortcuts);
  const shortcutsEnabled = useNativeStore((state) => state.shortcutsEnabled);
  const updateShortcut = useNativeStore((state) => state.updateShortcut);
  const setShortcutsEnabled = useNativeStore((state) => state.setShortcutsEnabled);

  // Format Tauri shortcut for display
  const formatGlobalShortcut = (shortcut: string): string => {
    return shortcut
      .replace(/CommandOrControl/gi, isMac ? '⌘' : 'Ctrl')
      .replace(/\+/g, isMac ? '' : '+');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Badge variant="secondary" className="bg-amber-500 text-white">
              <Globe className="h-3 w-3" />
              <span className="ml-1">{t('globalShortcuts')}</span>
            </Badge>
            <span className="text-muted-foreground font-normal">
              ({globalShortcuts.length})
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {shortcutsEnabled ? t('enabled') : t('disabled')}
            </span>
            <Switch
              checked={shortcutsEnabled}
              onCheckedChange={setShortcutsEnabled}
            />
          </div>
        </div>
        <CardDescription className="text-xs">
          {t('globalShortcutsDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {globalShortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className={`flex items-center justify-between py-2.5 group ${
                !shortcut.enabled || !shortcutsEnabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch
                        checked={shortcut.enabled}
                        onCheckedChange={(enabled) => updateShortcut(shortcut.id, { enabled })}
                        disabled={!shortcutsEnabled}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {shortcut.enabled ? t('disableShortcut') : t('enableShortcut')}
                  </TooltipContent>
                </Tooltip>
                <span className={`text-sm ${!shortcut.enabled ? 'line-through' : ''}`}>
                  {shortcut.name}
                </span>
              </div>
              <kbd className="px-2 py-1 text-xs font-mono rounded border shadow-sm bg-muted border-border">
                {formatGlobalShortcut(shortcut.shortcut)}
              </kbd>
            </div>
          ))}
        </div>

        {!shortcutsEnabled && (
          <Alert className="mt-3">
            <Monitor className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t('globalShortcutsDisabledAlert')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function KeyboardSettings() {
  const t = useTranslations('keyboardSettings');
  const tCommon = useTranslations('common');

  // Store state
  const customShortcuts = useSettingsStore((state) => state.customShortcuts);
  const disabledShortcuts = useSettingsStore((state) => state.disabledShortcuts);
  const setCustomShortcut = useSettingsStore((state) => state.setCustomShortcut);
  const setShortcutEnabled = useSettingsStore((state) => state.setShortcutEnabled);
  const resetShortcuts = useSettingsStore((state) => state.resetShortcuts);
  const resetShortcut = useSettingsStore((state) => state.resetShortcut);

  // Local state
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Platform detection
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Count customizations
  const customCount = Object.keys(customShortcuts).length;
  const disabledCount = Object.keys(disabledShortcuts).length;
  const hasModifications = customCount > 0 || disabledCount > 0;

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => getShortcutsByCategory(), []);

  // Get effective shortcut key for display
  const getEffectiveKey = useCallback((shortcut: ShortcutDefinition): string => {
    return customShortcuts[shortcut.id] || shortcut.defaultKey;
  }, [customShortcuts]);

  // Check if shortcut is enabled
  const isEnabled = useCallback((shortcut: ShortcutDefinition): boolean => {
    return !disabledShortcuts[shortcut.id];
  }, [disabledShortcuts]);

  // Check if shortcut is customized
  const isCustomized = useCallback((shortcut: ShortcutDefinition): boolean => {
    return !!customShortcuts[shortcut.id];
  }, [customShortcuts]);

  // Handle key capture for editing
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!editing?.isCapturing) return;

    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    // Skip if only modifier keys are pressed
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    // Normalize key
    let key = e.key;
    if (key.length === 1) key = key.toUpperCase();
    parts.push(key);

    setEditing(prev => prev ? {
      ...prev,
      capturedKeys: parts.join('+'),
      isCapturing: false,
    } : null);
  }, [editing?.isCapturing]);

  // Start editing a shortcut
  const startEditing = useCallback((shortcut: ShortcutDefinition) => {
    setEditing({
      shortcut,
      capturedKeys: '',
      isCapturing: true,
    });
  }, []);

  // Save edited shortcut
  const saveShortcut = useCallback(() => {
    if (editing?.capturedKeys && editing.shortcut) {
      setCustomShortcut(editing.shortcut.id, editing.capturedKeys);
    }
    setEditing(null);
  }, [editing, setCustomShortcut]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditing(null);
  }, []);

  // Reset single shortcut
  const handleResetSingle = useCallback((shortcut: ShortcutDefinition) => {
    resetShortcut(shortcut.id);
  }, [resetShortcut]);

  // Reset all shortcuts
  const handleResetAll = useCallback(() => {
    resetShortcuts();
    setShowResetConfirm(false);
  }, [resetShortcuts]);

  // Toggle shortcut enabled/disabled
  const toggleEnabled = useCallback((shortcut: ShortcutDefinition) => {
    setShortcutEnabled(shortcut.id, !isEnabled(shortcut));
  }, [setShortcutEnabled, isEnabled]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              {t('title')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
          {hasModifications && (
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

        {/* Modifications Alert */}
        {hasModifications && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {customCount > 0 && t('customShortcutsAlert', { count: customCount })}
              {customCount > 0 && disabledCount > 0 && ' • '}
              {disabledCount > 0 && t('disabledShortcutsAlert', { count: disabledCount })}
            </AlertDescription>
          </Alert>
        )}

        {/* Shortcuts by Category */}
        {CATEGORY_ORDER.map((category) => {
          const shortcuts = groupedShortcuts[category];
          if (!shortcuts || shortcuts.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Badge
                    variant="secondary"
                    className={`${CATEGORY_COLORS[category]} text-white`}
                  >
                    {CategoryIcons[category]}
                    <span className="ml-1">{t(`categories.${category}`)}</span>
                  </Badge>
                  <span className="text-muted-foreground font-normal">
                    ({shortcuts.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {shortcuts.map((shortcut) => {
                    const enabled = isEnabled(shortcut);
                    const customized = isCustomized(shortcut);
                    const effectiveKey = getEffectiveKey(shortcut);

                    return (
                      <div
                        key={shortcut.id}
                        className={`flex items-center justify-between py-2.5 group ${
                          !enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Enable/Disable Switch */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={() => toggleEnabled(shortcut)}
                                  className="data-[state=checked]:bg-primary"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {enabled ? t('disableShortcut') : t('enableShortcut')}
                            </TooltipContent>
                          </Tooltip>

                          {/* Shortcut Label */}
                          <span className={`text-sm ${!enabled ? 'line-through' : ''}`}>
                            {t(`shortcuts.${shortcut.labelKey}`, { defaultValue: shortcut.defaultLabel })}
                          </span>

                          {/* Customized Indicator */}
                          {customized && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {t('customized')}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Shortcut Key Display */}
                          <kbd
                            className={`px-2 py-1 text-xs font-mono rounded border shadow-sm ${
                              customized
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-muted border-border'
                            } ${!enabled ? 'opacity-50' : ''}`}
                          >
                            {formatShortcutDisplay(effectiveKey, isMac)}
                          </kbd>

                          {/* Edit Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEditing(shortcut)}
                                disabled={!enabled}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('editShortcut')}</TooltipContent>
                          </Tooltip>

                          {/* Reset Button (only show if customized) */}
                          {customized && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleResetSingle(shortcut)}
                                >
                                  <RotateCw className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('resetToDefault')}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Global Shortcuts Section (Desktop Only) */}
        {isTauri() && <GlobalShortcutsSection isMac={isMac} />}

        {/* Tips Card */}
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
        <Dialog open={!!editing} onOpenChange={(open) => !open && cancelEditing()}>
          <DialogContent
            className="sm:max-w-md"
            onKeyDown={editing?.isCapturing ? (e) => handleKeyDown(e.nativeEvent) : undefined}
          >
            <DialogHeader>
              <DialogTitle>{t('editShortcut')}</DialogTitle>
              <DialogDescription>
                {editing && t('editShortcutDesc', {
                  action: t(`shortcuts.${editing.shortcut.labelKey}`, { defaultValue: editing.shortcut.defaultLabel })
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <div
                className={`flex items-center justify-center h-20 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                  editing?.isCapturing ? 'border-primary bg-primary/5' : 'border-muted'
                }`}
                onClick={() => setEditing(prev => prev ? { ...prev, isCapturing: true } : null)}
              >
                {editing?.capturedKeys ? (
                  <kbd className="px-4 py-2 text-lg font-mono bg-background border rounded-lg shadow">
                    {formatShortcutDisplay(editing.capturedKeys, isMac)}
                  </kbd>
                ) : (
                  <span className="text-muted-foreground">
                    {editing?.isCapturing ? t('pressKeys') : t('clickToCapture')}
                  </span>
                )}
              </div>

              {editing?.capturedKeys && (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  {t('pressAnotherCombination')}
                </p>
              )}

              {editing && (
                <p className="text-center text-xs text-muted-foreground mt-2">
                  {t('currentDefault')}: <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
                    {formatShortcutDisplay(editing.shortcut.defaultKey, isMac)}
                  </kbd>
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={cancelEditing}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={saveShortcut} disabled={!editing?.capturedKeys}>
                {tCommon('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <Button variant="destructive" onClick={handleResetAll}>
                <X className="h-4 w-4 mr-2" />
                {t('resetAll')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default KeyboardSettings;
