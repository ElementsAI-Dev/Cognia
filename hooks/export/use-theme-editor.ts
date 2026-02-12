import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useCustomThemeStore, createDefaultThemeTemplate } from '@/stores/settings';
import type { SyntaxTheme } from '@/lib/export/html/syntax-themes';

/**
 * Hook for custom theme editing — name/dark/colors state, save/reset/export/import handlers
 */
export function useThemeEditor(
  editingThemeId: string | null | undefined,
  onSave: ((themeId: string) => void) | undefined,
  onOpenChange: (open: boolean) => void,
  t: (key: string) => string
) {
  const { addTheme, updateTheme, getTheme, exportTheme, importTheme } = useCustomThemeStore();

  const existingTheme = editingThemeId ? getTheme(editingThemeId) : null;

  const [themeName, setThemeName] = useState(existingTheme?.displayName || 'My Custom Theme');
  const [isDark, setIsDark] = useState(existingTheme?.isDark ?? true);
  const [colors, setColors] = useState<SyntaxTheme['colors']>(
    existingTheme?.colors || createDefaultThemeTemplate('', true).colors
  );

  const updateColor = useCallback((key: keyof SyntaxTheme['colors'], value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    const template = createDefaultThemeTemplate('', isDark);
    setColors(template.colors);
  }, [isDark]);

  const handleSave = useCallback(() => {
    if (!themeName.trim()) {
      toast.error(t('enterThemeName'));
      return;
    }

    const themeData = {
      name: themeName.toLowerCase().replace(/\s+/g, '-'),
      displayName: themeName,
      isDark,
      colors,
    };

    let themeId: string;
    if (editingThemeId && existingTheme) {
      updateTheme(editingThemeId, themeData);
      themeId = editingThemeId;
      toast.success(t('themeUpdated'));
    } else {
      themeId = addTheme(themeData);
      toast.success(t('themeCreated'));
    }

    onSave?.(themeId);
    onOpenChange(false);
  }, [
    themeName,
    isDark,
    colors,
    editingThemeId,
    existingTheme,
    addTheme,
    updateTheme,
    onSave,
    onOpenChange,
    t,
  ]);

  const handleExport = useCallback(() => {
    if (editingThemeId) {
      const json = exportTheme(editingThemeId);
      if (json) {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${themeName.toLowerCase().replace(/\s+/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('themeExported'));
      }
    }
  }, [editingThemeId, exportTheme, themeName, t]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const result = importTheme(text);

      if (result.success) {
        toast.success(t('themeImported'));
        onOpenChange(false);
      } else {
        toast.error(result.error || t('importFailed'));
      }
    };
    input.click();
  }, [importTheme, onOpenChange, t]);

  return {
    themeName,
    setThemeName,
    isDark,
    setIsDark,
    colors,
    updateColor,
    resetToDefaults,
    handleSave,
    handleExport,
    handleImport,
  };
}
