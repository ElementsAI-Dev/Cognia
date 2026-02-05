'use client';

/**
 * ThemeEditor - Create and edit custom color themes
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { useTranslations } from 'next-intl';
import { Trash2, Copy, Palette, AlertTriangle, CheckCircle2, Wand2, Eye, EyeOff } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSettingsStore } from '@/stores';
import { cn } from '@/lib/utils';
import {
  checkContrast,
  getPaletteSuggestions,
  generatePaletteFromColor,
  type ColorPalette,
  COLOR_LABELS,
  DEFAULT_LIGHT_COLORS,
  DEFAULT_DARK_COLORS,
  CONTRAST_LEVEL_COLORS,
  CONTRAST_LEVEL_LABELS,
  type ThemeEditorColors,
} from '@/lib/themes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { ThemeEditorProps } from '@/types/settings';

// Alias the imported types for local use
type ThemeColors = ThemeEditorColors;

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
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_LIGHT_COLORS);
  const [activeColor, setActiveColor] = useState<keyof ThemeColors>('primary');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'palettes'>('colors');
  const [isLivePreview, setIsLivePreview] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Theme name validation constants
  const THEME_NAME_MIN_LENGTH = 1;
  const THEME_NAME_MAX_LENGTH = 40;

  // Validate theme name
  const validateThemeName = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    const invalidCharsPattern = /[<>:"/\\|?*]/;
    if (trimmed.length < THEME_NAME_MIN_LENGTH) {
      return t('nameRequired');
    }
    if (trimmed.length > THEME_NAME_MAX_LENGTH) {
      return t('nameTooLong', { max: THEME_NAME_MAX_LENGTH });
    }
    if (invalidCharsPattern.test(trimmed)) {
      return t('nameInvalidChars');
    }
    // Check for duplicate names (excluding current theme if editing)
    const isDuplicate = customThemes.some(
      (theme) => theme.name.toLowerCase() === trimmed.toLowerCase() && theme.id !== editingThemeId
    );
    if (isDuplicate) {
      return t('nameDuplicate');
    }
    return null;
  }, [t, customThemes, editingThemeId]);

  // Handle name change with validation
  const handleNameChange = useCallback((value: string) => {
    // Enforce max length
    if (value.length > THEME_NAME_MAX_LENGTH) {
      value = value.slice(0, THEME_NAME_MAX_LENGTH);
    }
    setName(value);
    setNameError(validateThemeName(value));
  }, [validateThemeName]);

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
          setColors(DEFAULT_LIGHT_COLORS);
        }
        setActiveColor('primary');
        setDeleteDialogOpen(false);
        setActiveTab('colors');
      });
    }
  }, [open, editingThemeId, customThemes]);

  // Update default colors when toggling dark mode for new themes
  useEffect(() => {
    if (!editingThemeId) {
      queueMicrotask(() => {
        setColors(isDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS);
      });
    }
  }, [isDark, editingThemeId]);

  // Live preview effect - apply colors to document temporarily
  useEffect(() => {
    if (!isLivePreview) return;

    const root = document.documentElement;
    const originalStyles: Record<string, string> = {};
    
    // Store original values
    const cssVars = [
      '--primary', '--secondary', '--accent', '--background', '--foreground', '--muted',
      '--primary-foreground', '--secondary-foreground', '--accent-foreground', '--muted-foreground',
      '--card', '--card-foreground', '--border', '--ring', '--destructive', '--destructive-foreground'
    ];
    cssVars.forEach(v => {
      originalStyles[v] = root.style.getPropertyValue(v);
    });

    // Apply preview colors
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVar, value);
      }
    });

    return () => {
      // Restore original values
      cssVars.forEach(v => {
        if (originalStyles[v]) {
          root.style.setProperty(v, originalStyles[v]);
        } else {
          root.style.removeProperty(v);
        }
      });
    };
  }, [isLivePreview, colors]);

  // Toggle live preview handler
  const toggleLivePreview = useCallback(() => {
    setIsLivePreview(prev => !prev);
  }, []);

  // Handle dialog close - reset preview
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setIsLivePreview(false);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

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
    // Validate before saving
    const error = validateThemeName(name);
    if (error) {
      setNameError(error);
      return;
    }

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
            <span className={cn('inline-flex items-center gap-1 text-xs', CONTRAST_LEVEL_COLORS[result.level])}>
              <Icon className="h-3 w-3" />
              {result.ratio.toFixed(1)}:1
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{CONTRAST_LEVEL_LABELS[result.level]}</p>
            <p className="text-xs text-muted-foreground">
              {result.passes.normalText ? '✓ Normal text' : '✗ Normal text'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {isEditing ? t('editTheme') : t('createTheme')}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? t('editThemeDescription') : t('createThemeDescription')}
              </DialogDescription>
            </div>
            <Button
              variant={isLivePreview ? 'default' : 'outline'}
              size="sm"
              onClick={toggleLivePreview}
              className="h-8"
            >
              {isLivePreview ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
              {isLivePreview ? t('previewOn') || 'Preview On' : t('previewOff') || 'Preview'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Theme Name & Dark Mode Row */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-name" className="text-xs">{t('themeName')}</Label>
                <span className="text-[10px] text-muted-foreground">
                  {name.length}/{THEME_NAME_MAX_LENGTH}
                </span>
              </div>
              <Input
                id="theme-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('themeNamePlaceholder')}
                className={cn('h-8', nameError && 'border-destructive')}
                maxLength={THEME_NAME_MAX_LENGTH}
              />
              {nameError && (
                <p className="text-[10px] text-destructive">{nameError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('darkTheme')}</Label>
              <div className="flex items-center justify-end rounded-lg border px-3 h-8">
                <Switch checked={isDark} onCheckedChange={setIsDark} />
              </div>
            </div>
          </div>

          {/* Tabs: Colors / Palettes */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'colors' | 'palettes')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="colors" className="text-xs">
                <Palette className="h-3.5 w-3.5 mr-1.5" />
                {t('customColors')}
              </TabsTrigger>
              <TabsTrigger value="palettes" className="text-xs">
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                {t('paletteSuggestions')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4 mt-3">
              {/* Core Color Swatches */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('coreColors')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_LABELS.filter(c => c.category === 'core').map(({ key, labelKey, description }) => (
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
                              style={{ backgroundColor: colors[key] || '#888888' }}
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
              </div>

              {/* Extended Color Swatches */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('extendedColors')}</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_LABELS.filter(c => c.category === 'extended').map(({ key, labelKey, description }) => (
                    <TooltipProvider key={key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setActiveColor(key)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-md border-2 p-1.5 transition-colors',
                              activeColor === key
                                ? 'border-primary bg-primary/5'
                                : 'border-transparent bg-muted/50 hover:bg-muted/80'
                            )}
                          >
                            <div
                              className="h-4 w-4 rounded-full border shadow-sm flex-shrink-0"
                              style={{ backgroundColor: colors[key] || '#888888' }}
                            />
                            <span className="text-[10px] font-medium truncate">{t(labelKey)}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">{description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <div className="text-xs text-center mb-1">
                  <span className="font-medium">{t(COLOR_LABELS.find(c => c.key === activeColor)?.labelKey || activeColor)}</span>
                  <span className="text-muted-foreground ml-1">
                    ({COLOR_LABELS.find(c => c.key === activeColor)?.category === 'extended' ? t('optional') : t('required')})
                  </span>
                </div>
                <HexColorPicker
                  color={colors[activeColor] || '#888888'}
                  onChange={handleColorChange}
                  style={{ width: '100%', maxWidth: '240px', height: '160px' }}
                />
                <div className="flex items-center gap-2">
                  <Label className="text-xs">{t('hexValue')}:</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs">#</span>
                    <HexColorInput
                      color={colors[activeColor] || '#888888'}
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
                    {t('autoFill')}
                  </Button>
                </div>
              </div>

              {/* Contrast Check */}
              <div className="rounded-lg border p-3 space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('contrastCheck')}
                </Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">{t('textOnBackground')}</span>
                    {renderContrastBadge(contrastResults.foregroundOnBg)}
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">{t('textOnSecondary')}</span>
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
            <div className="flex items-center gap-2 mr-auto">
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {tc('delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('confirmDelete')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {tc('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="ghost"
                onClick={handleDuplicateTheme}
              >
                <Copy className="h-4 w-4 mr-1" />
                {t('duplicateTheme')}
              </Button>
            </div>
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
