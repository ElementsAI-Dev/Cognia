'use client';

/**
 * LaTeX Editor Settings Dialog
 * Allows users to customize editor appearance and behavior.
 * Persists settings via useLatexStore.
 */

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';
import { useLatexStore, type LaTeXEditorSettings } from '@/stores/latex';

interface LatexSettingsDialogProps {
  trigger?: React.ReactNode;
}

const FONT_FAMILIES = [
  { value: 'JetBrains Mono, Fira Code, monospace', label: 'JetBrains Mono' },
  { value: 'Fira Code, monospace', label: 'Fira Code' },
  { value: 'Cascadia Code, monospace', label: 'Cascadia Code' },
  { value: 'Source Code Pro, monospace', label: 'Source Code Pro' },
  { value: 'monospace', label: 'System Monospace' },
];

const AUTO_SAVE_INTERVALS = [
  { value: '15000', label: '15s' },
  { value: '30000', label: '30s' },
  { value: '60000', label: '1 min' },
  { value: '120000', label: '2 min' },
];

export function LatexSettingsDialog({ trigger }: LatexSettingsDialogProps) {
  const t = useTranslations('latex');
  const settings = useLatexStore((s) => s.settings);
  const updateSettings = useLatexStore((s) => s.updateSettings);
  const resetSettings = useLatexStore((s) => s.resetSettings);

  const update = (patch: Partial<LaTeXEditorSettings>) => updateSettings(patch);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            {t('settings.title', { defaultValue: 'Settings' })}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings.title', { defaultValue: 'Editor Settings' })}</DialogTitle>
          <DialogDescription>
            {t('settings.description', { defaultValue: 'Customize your LaTeX editing experience' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('settings.fontSize', { defaultValue: 'Font Size' })}</Label>
              <span className="text-sm text-muted-foreground">{settings.fontSize}px</span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([v]) => update({ fontSize: v })}
              min={10}
              max={24}
              step={1}
            />
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label>{t('settings.fontFamily', { defaultValue: 'Font Family' })}</Label>
            <Select value={settings.fontFamily} onValueChange={(v) => update({ fontFamily: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    <span style={{ fontFamily: f.value }}>{f.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label>{t('settings.theme', { defaultValue: 'Theme' })}</Label>
            <Select value={settings.theme} onValueChange={(v) => update({ theme: v as LaTeXEditorSettings['theme'] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{t('settings.themeSystem', { defaultValue: 'System' })}</SelectItem>
                <SelectItem value="light">{t('settings.themeLight', { defaultValue: 'Light' })}</SelectItem>
                <SelectItem value="dark">{t('settings.themeDark', { defaultValue: 'Dark' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Tab Size */}
          <div className="space-y-2">
            <Label>{t('settings.tabSize', { defaultValue: 'Tab Size' })}</Label>
            <Select value={String(settings.tabSize)} onValueChange={(v) => update({ tabSize: Number(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 spaces</SelectItem>
                <SelectItem value="4">4 spaces</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('settings.lineNumbers', { defaultValue: 'Line Numbers' })}</Label>
              <Switch checked={settings.lineNumbers} onCheckedChange={(v) => update({ lineNumbers: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('settings.wordWrap', { defaultValue: 'Word Wrap' })}</Label>
              <Switch checked={settings.wordWrap} onCheckedChange={(v) => update({ wordWrap: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('settings.spellCheck', { defaultValue: 'Spell Check' })}</Label>
              <Switch checked={settings.spellCheck} onCheckedChange={(v) => update({ spellCheck: v })} />
            </div>
          </div>

          <Separator />

          {/* Auto-Save */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('settings.autoSave', { defaultValue: 'Auto Save' })}</Label>
              <Switch checked={settings.autoSave} onCheckedChange={(v) => update({ autoSave: v })} />
            </div>
            {settings.autoSave && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {t('settings.autoSaveInterval', { defaultValue: 'Save Interval' })}
                </Label>
                <Select
                  value={String(settings.autoSaveIntervalMs)}
                  onValueChange={(v) => update({ autoSaveIntervalMs: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTO_SAVE_INTERVALS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Reset */}
          <Button variant="outline" size="sm" onClick={resetSettings} className="w-full">
            {t('settings.reset', { defaultValue: 'Reset to Defaults' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LatexSettingsDialog;
