'use client';

/**
 * AppearanceSettings - Configure theme, language, and UI preferences
 * Organized into tabs: Theme, Layout & Style, Background, Advanced
 */

import { Moon, Sun, Monitor, Check, Palette, Globe, Plus, Type, MessageCircle, Settings2, MapPin, RefreshCw, Power, Image as ImageIcon, Sliders } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useSettingsStore, type Language, type MessageBubbleStyle } from '@/stores';
import { THEME_MODE_OPTIONS, COLOR_THEME_OPTIONS, type ColorThemePreset } from '@/lib/themes';
import { localeNames, localeFlags, autoDetectLocale, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ThemeEditor } from './theme-editor';
import { ThemeImportExport } from './theme-import-export';
import { ThemePreview } from './theme-preview';
import { ThemeSchedule } from './theme-schedule';
import { UICustomizationSettings } from './ui-customization-settings';
import { BackgroundSettings } from './background-settings';
import { SettingsProfiles } from './settings-profiles';
import { SimplifiedModeSettings } from './simplified-mode-settings';
import { WelcomeSettings } from './welcome-settings';
import { useAutostart } from '@/hooks/native';

// Icon mapping for theme mode options
const themeIconMap = {
  sun: <Sun className="h-4 w-4" />,
  moon: <Moon className="h-4 w-4" />,
  monitor: <Monitor className="h-4 w-4" />,
};

export function AppearanceSettings() {
  const t = useTranslations('settings');
  const tAppearance = useTranslations('appearanceSettings');

  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const colorTheme = useSettingsStore((state) => state.colorTheme);
  const setColorTheme = useSettingsStore((state) => state.setColorTheme);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const activeCustomThemeId = useSettingsStore((state) => state.activeCustomThemeId);
  const setActiveCustomTheme = useSettingsStore((state) => state.setActiveCustomTheme);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
  const uiFontSize = useSettingsStore((state) => state.uiFontSize);
  const setUIFontSize = useSettingsStore((state) => state.setUIFontSize);
  const messageBubbleStyle = useSettingsStore((state) => state.messageBubbleStyle);
  const setMessageBubbleStyle = useSettingsStore((state) => state.setMessageBubbleStyle);

  const autoDetectLocaleEnabled = useSettingsStore((state) => state.autoDetectLocale);
  const setAutoDetectLocale = useSettingsStore((state) => state.setAutoDetectLocale);
  const localeDetectionResult = useSettingsStore((state) => state.localeDetectionResult);
  const setLocaleDetectionResult = useSettingsStore((state) => state.setLocaleDetectionResult);
  const detectedTimezone = useSettingsStore((state) => state.detectedTimezone);

  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const autostart = useAutostart();

  const handleDetectLocale = async () => {
    setIsDetecting(true);
    try {
      const result = await autoDetectLocale();
      setLocaleDetectionResult(result);
      if (result.locale !== language) {
        setLanguage(result.locale as Language);
      }
    } catch (error) {
      console.error('Failed to detect locale:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleColorThemeSelect = (value: ColorThemePreset) => {
    setColorTheme(value);
    setActiveCustomTheme(null);
  };

  const handleCustomThemeSelect = (themeId: string) => {
    setActiveCustomTheme(themeId);
  };

  const handleEditCustomTheme = (themeId: string) => {
    setEditingThemeId(themeId);
    setShowThemeEditor(true);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="theme" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="theme" className="text-xs gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tAppearance('tabTheme')}</span>
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tAppearance('tabLayoutStyle')}</span>
          </TabsTrigger>
          <TabsTrigger value="background" className="text-xs gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tAppearance('tabBackground')}</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tAppearance('tabAdvanced')}</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════ */}
        {/* Tab 1: Theme                               */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="theme" className="mt-4 space-y-4">
          {/* Theme Mode Selection (Light/Dark/System) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{t('theme')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {THEME_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-colors',
                      theme === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-muted hover:bg-muted/80'
                    )}
                  >
                    {theme === option.value && (
                      <div className="absolute top-1.5 right-1.5">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div className="rounded-full bg-background p-2 shadow-sm">
                      {themeIconMap[option.icon]}
                    </div>
                    <span className="text-xs font-medium">{t(option.labelKey)}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color Theme Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">{t('colorTheme')}</CardTitle>
                  <CardDescription className="text-xs">
                    {tAppearance('chooseColorScheme')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Themes */}
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {COLOR_THEME_OPTIONS.map((option) => {
                  const isSelected = colorTheme === option.value && !activeCustomThemeId;

                  return (
                    <ThemePreview key={option.value} preset={option.value} isDarkMode={theme === 'dark'}>
                      <button
                        onClick={() => handleColorThemeSelect(option.value)}
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted hover:bg-muted/80'
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <div className={cn('h-6 w-6 rounded-full shadow-sm', option.color)} />
                        <span className="text-[10px] font-medium">
                          {t(`themePreset${option.value.charAt(0).toUpperCase() + option.value.slice(1)}`)}
                        </span>
                      </button>
                    </ThemePreview>
                  );
                })}
              </div>

              {/* Custom Themes */}
              {customThemes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">{t('customThemes')}</Label>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {customThemes.map((customTheme) => {
                      const isSelected = activeCustomThemeId === customTheme.id;

                      return (
                        <ThemePreview key={customTheme.id} customTheme={customTheme} isDarkMode={theme === 'dark'}>
                          <button
                            onClick={() => handleCustomThemeSelect(customTheme.id)}
                            onDoubleClick={() => handleEditCustomTheme(customTheme.id)}
                            className={cn(
                              'relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-transparent bg-muted hover:bg-muted/80'
                            )}
                            title={tAppearance('doubleClickToEdit')}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1">
                                <Check className="h-3 w-3 text-primary" />
                              </div>
                            )}
                            <div
                              className="h-6 w-6 rounded-full shadow-sm"
                              style={{ backgroundColor: customTheme.colors.primary }}
                            />
                            <span className="text-[10px] font-medium truncate max-w-full">
                              {customTheme.name}
                            </span>
                          </button>
                        </ThemePreview>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Create Custom Theme Button & Import/Export */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingThemeId(null);
                    setShowThemeEditor(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {t('createCustomTheme')}
                </Button>
                <ThemeImportExport />
              </div>
            </CardContent>
          </Card>

          {/* Theme Schedule */}
          <ThemeSchedule />
        </TabsContent>

        {/* ═══════════════════════════════════════════ */}
        {/* Tab 2: Layout & Style                      */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="layout" className="mt-4 space-y-4">
          {/* Font Size and Message Style side by side */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* UI Font Size */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{tAppearance('uiFontSize')}</CardTitle>
                    <CardDescription className="text-xs">
                      {tAppearance('uiFontSizeDesc')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{tAppearance('fontSizeLabel', { size: uiFontSize })}</Label>
                    <span className="text-xs text-muted-foreground">
                      {uiFontSize <= 13 ? tAppearance('compact') : uiFontSize <= 15 ? tAppearance('default') : tAppearance('large')}
                    </span>
                  </div>
                  <Slider
                    value={[uiFontSize]}
                    onValueChange={([v]) => setUIFontSize(v)}
                    min={12}
                    max={20}
                    step={1}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>12px</span>
                    <span>16px</span>
                    <span>20px</span>
                  </div>
                </div>
                <div
                  className="p-2 rounded-lg border bg-muted/30"
                  style={{ fontSize: `${uiFontSize}px` }}
                >
                  <p className="font-medium text-sm">{tAppearance('previewText')}</p>
                  <p className="text-muted-foreground text-xs">{tAppearance('previewTextDesc')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Message Bubble Style */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{tAppearance('messageStyle')}</CardTitle>
                    <CardDescription className="text-xs">
                      {tAppearance('messageStyleDesc')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'default', label: tAppearance('styleDefault'), desc: tAppearance('styleDefaultDesc') },
                    { value: 'minimal', label: tAppearance('styleMinimal'), desc: tAppearance('styleMinimalDesc') },
                    { value: 'bordered', label: tAppearance('styleBordered'), desc: tAppearance('styleBorderedDesc') },
                    { value: 'gradient', label: tAppearance('styleGradient'), desc: tAppearance('styleGradientDesc') },
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setMessageBubbleStyle(style.value as MessageBubbleStyle)}
                      className={cn(
                        'relative flex flex-col items-center gap-0.5 rounded-lg border-2 p-2 transition-colors text-center',
                        messageBubbleStyle === style.value
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-muted hover:bg-muted/80'
                      )}
                    >
                      {messageBubbleStyle === style.value && (
                        <Check className="h-3 w-3 text-primary absolute top-1 right-1" />
                      )}
                      <span className="text-xs font-medium">{style.label}</span>
                      <span className="text-[10px] text-muted-foreground">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* UI Customization */}
          <UICustomizationSettings />
        </TabsContent>

        {/* ═══════════════════════════════════════════ */}
        {/* Tab 3: Background                          */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="background" className="mt-4">
          <BackgroundSettings />
        </TabsContent>

        {/* ═══════════════════════════════════════════ */}
        {/* Tab 4: Advanced                             */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="advanced" className="mt-4 space-y-4">
          {/* Language Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{t('language')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(localeNames) as Locale[]).map((locale) => (
                    <SelectItem key={locale} value={locale}>
                      <span className="flex items-center gap-2">
                        <span>{localeFlags[locale]}</span>
                        <span>{localeNames[locale]}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Auto-detect locale option */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label htmlFor="auto-detect-locale" className="text-xs">
                    {tAppearance('autoDetectLocale')}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleDetectLocale}
                    disabled={isDetecting}
                    title={tAppearance('detectNow')}
                  >
                    <RefreshCw className={cn("h-3 w-3", isDetecting && "animate-spin")} />
                  </Button>
                  <Switch
                    id="auto-detect-locale"
                    checked={autoDetectLocaleEnabled}
                    onCheckedChange={setAutoDetectLocale}
                  />
                </div>
              </div>

              {/* Detection result info */}
              {localeDetectionResult && (
                <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>{tAppearance('detectionSource')}:</span>
                    <span className="capitalize">{localeDetectionResult.source}</span>
                  </div>
                  {localeDetectionResult.country && (
                    <div className="flex items-center justify-between">
                      <span>{tAppearance('detectionRegion')}:</span>
                      <span>{localeDetectionResult.country}</span>
                    </div>
                  )}
                  {detectedTimezone && (
                    <div className="flex items-center justify-between">
                      <span>{tAppearance('detectionTimezone')}:</span>
                      <span>{detectedTimezone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>{tAppearance('detectionConfidence')}:</span>
                    <span className={cn(
                      "capitalize",
                      localeDetectionResult.confidence === 'high' && "text-green-600",
                      localeDetectionResult.confidence === 'medium' && "text-yellow-600",
                      localeDetectionResult.confidence === 'low' && "text-red-600"
                    )}>{localeDetectionResult.confidence}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* UI Preferences */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('interfacePreferences')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                    <Label htmlFor="sidebar-collapsed" className="text-sm">{t('collapseSidebar')}</Label>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {t('collapseSidebarDescription')}
                    </p>
                  </div>
                  <Switch
                    id="sidebar-collapsed"
                    checked={sidebarCollapsed}
                    onCheckedChange={setSidebarCollapsed}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-1.5">
                      <Power className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label htmlFor="autostart" className="text-sm">
                        {tAppearance('launchAtStartup')}
                      </Label>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {tAppearance('launchAtStartupDesc')}
                    </p>
                  </div>
                  <Switch
                    id="autostart"
                    checked={autostart.isEnabled}
                    onCheckedChange={autostart.toggle}
                    disabled={autostart.isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Profiles */}
          <SettingsProfiles />

          {/* Simplified Mode */}
          <SimplifiedModeSettings />

          {/* Welcome Page Settings */}
          <WelcomeSettings />
        </TabsContent>
      </Tabs>

      {/* Theme Editor Dialog (shared across tabs) */}
      <ThemeEditor
        open={showThemeEditor}
        onOpenChange={setShowThemeEditor}
        editingThemeId={editingThemeId}
      />
    </div>
  );
}

export default AppearanceSettings;
