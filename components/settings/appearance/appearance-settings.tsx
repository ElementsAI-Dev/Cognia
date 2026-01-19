'use client';

/**
 * AppearanceSettings - Configure theme, language, and UI preferences
 */

import { Moon, Sun, Monitor, Check, Palette, Globe, Plus, Type, MessageCircle, Settings2, MapPin, RefreshCw, Power } from 'lucide-react';
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
import { useSettingsStore, type Theme, type Language, type MessageBubbleStyle } from '@/stores';
import { THEME_PRESETS, type ColorThemePreset } from '@/lib/themes';
import { localeNames, localeFlags, autoDetectLocale, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ThemeEditor } from './theme-editor';
import { ThemeImportExport } from './theme-import-export';
import { ThemeSchedule } from './theme-schedule';
import { UICustomizationSettings } from './ui-customization-settings';
import { BackgroundSettings } from './background-settings';
import { SettingsProfiles } from './settings-profiles';
import { useAutostart } from '@/hooks/native';

const themeOptions: { value: Theme; labelKey: string; icon: React.ReactNode }[] = [
  { value: 'light', labelKey: 'themeLight', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', labelKey: 'themeDark', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', labelKey: 'themeSystem', icon: <Monitor className="h-4 w-4" /> },
];

const colorThemeOptions: { value: ColorThemePreset; color: string }[] = [
  { value: 'default', color: 'bg-blue-500' },
  { value: 'ocean', color: 'bg-teal-500' },
  { value: 'forest', color: 'bg-green-600' },
  { value: 'sunset', color: 'bg-orange-500' },
  { value: 'lavender', color: 'bg-purple-500' },
  { value: 'rose', color: 'bg-pink-500' },
  { value: 'slate', color: 'bg-slate-500' },
  { value: 'amber', color: 'bg-amber-500' },
];

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
  const sendOnEnter = useSettingsStore((state) => state.sendOnEnter);
  const setSendOnEnter = useSettingsStore((state) => state.setSendOnEnter);
  const streamResponses = useSettingsStore((state) => state.streamResponses);
  const setStreamResponses = useSettingsStore((state) => state.setStreamResponses);
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
      {/* Quick Access: Language and Theme Mode side by side */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Language Selection */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">{t('language')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
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

        {/* Theme Mode Selection (Light/Dark/System) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">{t('theme')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-1.5">
              {themeOptions.map((option) => (
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
                    {option.icon}
                  </div>
                  <span className="text-xs font-medium">{t(option.labelKey)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Color Theme Selection - Full width */}
      <Card>
        <CardHeader className="pb-2">
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
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {colorThemeOptions.map((option) => {
              const _preset = THEME_PRESETS[option.value];
              const isSelected = colorTheme === option.value && !activeCustomThemeId;

              return (
                <button
                  key={option.value}
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
              );
            })}
          </div>

          {/* Custom Themes */}
          {customThemes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">{t('customThemes')}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {customThemes.map((customTheme) => {
                  const isSelected = activeCustomThemeId === customTheme.id;

                  return (
                    <button
                      key={customTheme.id}
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

      {/* Font Size and Message Style side by side */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* UI Font Size */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-sm font-medium">{tAppearance('uiFontSize')}</CardTitle>
                <CardDescription className="text-[10px]">
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
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-sm font-medium">{tAppearance('messageStyle')}</CardTitle>
                <CardDescription className="text-[10px]">
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

      {/* UI Preferences - Grid layout for switches */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('interfacePreferences')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
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
                <Label htmlFor="send-on-enter" className="text-sm">{t('sendOnEnter')}</Label>
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {t('sendOnEnterDescription')}
                </p>
              </div>
              <Switch
                id="send-on-enter"
                checked={sendOnEnter}
                onCheckedChange={setSendOnEnter}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5 min-w-0 flex-1 mr-2">
                <Label htmlFor="stream-responses" className="text-sm">{t('streamResponses')}</Label>
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {t('streamResponsesDescription')}
                </p>
              </div>
              <Switch
                id="stream-responses"
                checked={streamResponses}
                onCheckedChange={setStreamResponses}
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

      {/* Theme Schedule */}
      <ThemeSchedule />

      {/* Background Settings */}
      <BackgroundSettings />

      {/* UI Customization */}
      <UICustomizationSettings />

      {/* Theme Editor Dialog */}
      <ThemeEditor
        open={showThemeEditor}
        onOpenChange={setShowThemeEditor}
        editingThemeId={editingThemeId}
      />
    </div>
  );
}

export default AppearanceSettings;
