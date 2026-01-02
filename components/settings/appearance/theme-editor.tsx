'use client';

/**
 * ThemeEditor - Create and edit custom color themes
 */

import { useState, useEffect, useMemo } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { useTranslations } from 'next-intl';
import { Trash2, Copy, Palette, AlertTriangle, CheckCircle2, Wand2 } from 'lucide-react';
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
import {
  checkContrast,
  getPaletteSuggestions,
  generatePaletteFromColor,
  type ColorPalette,
  type ContrastLevel,
} from '@/lib/themes/color-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const colorLabels: { key: keyof ThemeColors; labelKey: string; description: string }[] = [
  { key: 'primary', labelKey: 'primary', description: 'Buttons, links, highlights' },
  { key: 'secondary', labelKey: 'secondary', description: 'Secondary backgrounds' },
  { key: 'accent', labelKey: 'accent', description: 'Hover states, accents' },
  { key: 'background', labelKey: 'background', description: 'Main background' },
  { key: 'foreground', labelKey: 'foreground', description: 'Main text color' },
  { key: 'muted', labelKey: 'muted', description: 'Muted backgrounds' },
];

const contrastLevelColors: Record<ContrastLevel, string> = {
  'fail': 'text-red-500',
  'AA-large': 'text-yellow-500',
  'AA': 'text-green-500',
  'AAA': 'text-green-600',
};

const contrastLevelLabels: Record<ContrastLevel, string> = {
  'fail': 'Fails WCAG',
  'AA-large': 'AA Large Text',
  'AA': 'AA Normal Text',
  'AAA': 'AAA (Best)',
};

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
  const [activeTab, setActiveTab] = useState<'colors' | 'palettes'>('colors');

  // Calculate contrast ratios
  const contrastResults = useMemo(() => {
    return {
      primaryOnBg: checkContrast(colors.primary, colors.background),
      foregroundOnBg: checkContrast(colors.foreground, colors.background),
      foregroundOnSecondary: checkContrast(colors.foreground, colors.secondary),
      foregroundOnMuted: checkContrast(colors.foreground, colors.muted),
    };
  }, [colors]);

  // Get palette suggestions based on dark mode
  const paletteSuggestions = useMemo(() => {
    return getPaletteSuggestions(isDark);
  }, [isDark]);

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
        setActiveTab('colors');
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

  const handleApplyPalette = (palette: ColorPalette) => {
    setColors(palette.colors);
    setName(name || palette.name);
  };

  const handleGenerateFromPrimary = () => {
    const generated = generatePaletteFromColor(colors.primary, isDark);
    setColors(generated.colors);
  };

  const handleDuplicateTheme = () => {
    const newId = createCustomTheme({
      name: `${name} (Copy)`,
      isDark,
      colors,
    });
    setActiveCustomTheme(newId);
    onOpenChange(false);
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

  const renderContrastBadge = (result: ReturnType<typeof checkContrast>) => {
    const Icon = result.level === 'fail' ? AlertTriangle : CheckCircle2;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('inline-flex items-center gap-1 text-xs', contrastLevelColors[result.level])}>
              <Icon className="h-3 w-3" />
              {result.ratio.toFixed(1)}:1
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{contrastLevelLabels[result.level]}</p>
            <p className="text-xs text-muted-foreground">
              {result.passes.normalText ? '✓ Normal text' : '✗ Normal text'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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

        <div className="space-y-4 py-4">
          {/* Theme Name & Dark Mode Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="theme-name" className="text-xs">{t('themeName')}</Label>
              <Input
                id="theme-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('themeNamePlaceholder')}
                className="h-8"
              />
            </div>
            <div className="flex items-end justify-between rounded-lg border px-3 py-2">
              <Label className="text-xs">{t('darkTheme')}</Label>
              <Switch checked={isDark} onCheckedChange={setIsDark} />
            </div>
          </div>

          {/* Tabs: Colors / Palettes */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'colors' | 'palettes')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="colors" className="text-xs">
                <Palette className="h-3.5 w-3.5 mr-1.5" />
                Custom Colors
              </TabsTrigger>
              <TabsTrigger value="palettes" className="text-xs">
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                Palette Suggestions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4 mt-3">
              {/* Color Swatches */}
              <div className="grid grid-cols-3 gap-2">
                {colorLabels.map(({ key, labelKey, description }) => (
                  <TooltipProvider key={key}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setActiveColor(key)}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border-2 p-2 transition-colors',
                            activeColor === key
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-muted hover:bg-muted/80'
                          )}
                        >
                          <div
                            className="h-5 w-5 rounded-full border shadow-sm flex-shrink-0"
                            style={{ backgroundColor: colors[key] }}
                          />
                          <span className="text-xs font-medium truncate">{t(labelKey)}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">{description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>

              {/* Color Picker */}
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <HexColorPicker
                  color={colors[activeColor]}
                  onChange={handleColorChange}
                  style={{ width: '100%', maxWidth: '240px', height: '160px' }}
                />
                <div className="flex items-center gap-2">
                  <Label className="text-xs">{t('hexValue')}:</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs">#</span>
                    <HexColorInput
                      color={colors[activeColor]}
                      onChange={handleColorChange}
                      className="w-20 rounded border bg-background px-2 py-1 text-xs uppercase"
                      prefixed={false}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleGenerateFromPrimary}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Auto-fill
                  </Button>
                </div>
              </div>

              {/* Contrast Check */}
              <div className="rounded-lg border p-3 space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Contrast Check (WCAG)
                </Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Text on Background</span>
                    {renderContrastBadge(contrastResults.foregroundOnBg)}
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Text on Secondary</span>
                    {renderContrastBadge(contrastResults.foregroundOnSecondary)}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="palettes" className="mt-3">
              <ScrollArea className="h-[280px] pr-3">
                <div className="grid grid-cols-2 gap-2">
                  {paletteSuggestions.map((palette) => (
                    <button
                      key={palette.name}
                      onClick={() => handleApplyPalette(palette)}
                      className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="text-xs font-medium">{palette.name}</span>
                      <div className="flex gap-1">
                        {Object.values(palette.colors).slice(0, 4).map((color, i) => (
                          <div
                            key={i}
                            className="h-5 w-5 rounded-full border shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs">{t('preview')}</Label>
            <div
              className="rounded-lg border p-3"
              style={{
                backgroundColor: colors.background,
                color: colors.foreground,
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <div>
                    <p className="text-sm font-semibold">{t('previewTitle')}</p>
                    <p
                      className="text-xs"
                      style={{ color: colors.muted }}
                    >
                      {t('previewSubtitle')}
                    </p>
                  </div>
                </div>
                <div
                  className="rounded-md p-2"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <p className="text-xs">{t('previewContent')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-md px-2 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {t('previewButton')}
                  </button>
                  <button
                    className="rounded-md px-2 py-1 text-xs font-medium"
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
                <div className="flex items-center gap-2 mr-auto">
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {tc('delete')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDuplicateTheme}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicate
                  </Button>
                </div>
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
