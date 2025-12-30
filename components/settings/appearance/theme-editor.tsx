'use client';

/**
 * ThemeEditor - Create and edit custom color themes
 */

import { useState, useEffect } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores';
import { cn } from '@/lib/utils';

interface ThemeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingThemeId: string | null;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}

const defaultLightColors: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#f1f5f9',
  accent: '#f1f5f9',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f1f5f9',
};

const defaultDarkColors: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#1e293b',
  accent: '#1e293b',
  background: '#0f172a',
  foreground: '#f8fafc',
  muted: '#1e293b',
};

const colorLabels: { key: keyof ThemeColors; labelKey: string }[] = [
  { key: 'primary', labelKey: 'primary' },
  { key: 'secondary', labelKey: 'secondary' },
  { key: 'accent', labelKey: 'accent' },
  { key: 'background', labelKey: 'background' },
  { key: 'foreground', labelKey: 'foreground' },
  { key: 'muted', labelKey: 'muted' },
];

export function ThemeEditor({ open, onOpenChange, editingThemeId }: ThemeEditorProps) {
  const t = useTranslations('themeEditor');
  const tc = useTranslations('common');

  const customThemes = useSettingsStore((state) => state.customThemes);
  const createCustomTheme = useSettingsStore((state) => state.createCustomTheme);
  const updateCustomTheme = useSettingsStore((state) => state.updateCustomTheme);
  const deleteCustomTheme = useSettingsStore((state) => state.deleteCustomTheme);
  const setActiveCustomTheme = useSettingsStore((state) => state.setActiveCustomTheme);

  const [name, setName] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [colors, setColors] = useState<ThemeColors>(defaultLightColors);
  const [activeColor, setActiveColor] = useState<keyof ThemeColors>('primary');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load theme data when editing - use microtask to avoid synchronous setState
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        if (editingThemeId) {
          const theme = customThemes.find((t) => t.id === editingThemeId);
          if (theme) {
            setName(theme.name);
            setIsDark(theme.isDark);
            setColors(theme.colors);
          }
        } else {
          // Reset for new theme
          setName('');
          setIsDark(false);
          setColors(defaultLightColors);
        }
        setActiveColor('primary');
        setShowDeleteConfirm(false);
      });
    }
  }, [open, editingThemeId, customThemes]);

  // Update default colors when toggling dark mode for new themes
  useEffect(() => {
    if (!editingThemeId) {
      queueMicrotask(() => {
        setColors(isDark ? defaultDarkColors : defaultLightColors);
      });
    }
  }, [isDark, editingThemeId]);

  const handleColorChange = (color: string) => {
    setColors((prev) => ({
      ...prev,
      [activeColor]: color,
    }));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingThemeId) {
      updateCustomTheme(editingThemeId, {
        name: name.trim(),
        isDark,
        colors,
      });
    } else {
      const newId = createCustomTheme({
        name: name.trim(),
        isDark,
        colors,
      });
      setActiveCustomTheme(newId);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingThemeId) {
      deleteCustomTheme(editingThemeId);
      onOpenChange(false);
    }
  };

  const isEditing = !!editingThemeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('editTheme') : t('createTheme')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('editThemeDescription') : t('createThemeDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Name */}
          <div className="space-y-2">
            <Label htmlFor="theme-name">{t('themeName')}</Label>
            <Input
              id="theme-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('themeNamePlaceholder')}
            />
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('darkTheme')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('darkThemeDescription')}
              </p>
            </div>
            <Switch checked={isDark} onCheckedChange={setIsDark} />
          </div>

          {/* Color Selection */}
          <div className="space-y-4">
            <Label>{t('colors')}</Label>

            {/* Color Swatches */}
            <div className="grid grid-cols-3 gap-2">
              {colorLabels.map(({ key, labelKey }) => (
                <button
                  key={key}
                  onClick={() => setActiveColor(key)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border-2 p-2 transition-colors',
                    activeColor === key
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  <div
                    className="h-6 w-6 rounded-full border shadow-sm"
                    style={{ backgroundColor: colors[key] }}
                  />
                  <span className="text-xs font-medium">{t(labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Color Picker */}
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/50 p-4">
              <HexColorPicker
                color={colors[activeColor]}
                onChange={handleColorChange}
                style={{ width: '100%', maxWidth: '280px' }}
              />
              <div className="flex items-center gap-2">
                <Label className="text-sm">{t('hexValue')}:</Label>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">#</span>
                  <HexColorInput
                    color={colors[activeColor]}
                    onChange={handleColorChange}
                    className="w-24 rounded border bg-background px-2 py-1 text-sm uppercase"
                    prefixed={false}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>{t('preview')}</Label>
            <div
              className="rounded-lg border p-4"
              style={{
                backgroundColor: colors.background,
                color: colors.foreground,
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <div>
                    <p className="font-semibold">{t('previewTitle')}</p>
                    <p
                      className="text-sm"
                      style={{ color: colors.muted }}
                    >
                      {t('previewSubtitle')}
                    </p>
                  </div>
                </div>
                <div
                  className="rounded-md p-3"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <p className="text-sm">{t('previewContent')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {t('previewButton')}
                  </button>
                  <button
                    className="rounded-md px-3 py-1.5 text-sm font-medium"
                    style={{
                      backgroundColor: colors.accent,
                      color: colors.foreground,
                    }}
                  >
                    {t('previewSecondary')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isEditing && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-sm text-destructive">
                    {t('confirmDelete')}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    {tc('confirm')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {tc('cancel')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="mr-auto text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {tc('delete')}
                </Button>
              )}
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {tc('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ThemeEditor;
