'use client';

/**
 * AppearanceSettings - Configure theme, language, and UI preferences
 */

import { Moon, Sun, Monitor, Check, Palette, Globe, Plus, Type, MessageCircle } from 'lucide-react';
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
import { localeNames, localeFlags, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ThemeEditor } from './theme-editor';
import { UICustomizationSettings } from './ui-customization-settings';

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
];

export function AppearanceSettings() {
  const t = useTranslations('settings');

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

  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);

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
    <div className="space-y-6">
      {/* Language Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>{t('language')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
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
        </CardContent>
      </Card>

      {/* Theme Mode Selection (Light/Dark/System) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('theme')}</CardTitle>
          <CardDescription>
            {language === 'zh-CN' ? '选择您偏好的主题模式' : 'Choose your preferred theme mode'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                  theme === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted hover:bg-muted/80'
                )}
              >
                {theme === option.value && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="rounded-full bg-background p-3 shadow-sm">
                  {option.icon}
                </div>
                <span className="text-sm font-medium">{t(option.labelKey)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Theme Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>{t('colorTheme')}</CardTitle>
          </div>
          <CardDescription>
            {language === 'zh-CN' ? '选择配色方案' : 'Choose a color scheme'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset Themes */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {colorThemeOptions.map((option) => {
              const preset = THEME_PRESETS[option.value];
              const isSelected = colorTheme === option.value && !activeCustomThemeId;

              return (
                <button
                  key={option.value}
                  onClick={() => handleColorThemeSelect(option.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
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
                  <div className={cn('h-8 w-8 rounded-full shadow-sm', option.color)} />
                  <span className="text-xs font-medium">{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Themes */}
          {customThemes.length > 0 && (
            <div className="space-y-2">
              <Label>{t('customThemes')}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {customThemes.map((customTheme) => {
                  const isSelected = activeCustomThemeId === customTheme.id;

                  return (
                    <button
                      key={customTheme.id}
                      onClick={() => handleCustomThemeSelect(customTheme.id)}
                      onDoubleClick={() => handleEditCustomTheme(customTheme.id)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-muted hover:bg-muted/80'
                      )}
                      title={language === 'zh-CN' ? '双击编辑' : 'Double-click to edit'}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <div
                        className="h-8 w-8 rounded-full shadow-sm"
                        style={{ backgroundColor: customTheme.colors.primary }}
                      />
                      <span className="text-xs font-medium truncate max-w-full">
                        {customTheme.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create Custom Theme Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEditingThemeId(null);
              setShowThemeEditor(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('createCustomTheme')}
          </Button>
        </CardContent>
      </Card>

      {/* UI Font Size */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <CardTitle className="text-base">UI Font Size</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Adjust the base font size for the interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Font Size: {uiFontSize}px</Label>
              <span className="text-xs text-muted-foreground">
                {uiFontSize <= 13 ? 'Compact' : uiFontSize <= 15 ? 'Default' : 'Large'}
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
            className="p-3 rounded-lg border bg-muted/30"
            style={{ fontSize: `${uiFontSize}px` }}
          >
            <p className="font-medium">Preview Text</p>
            <p className="text-muted-foreground">This is how text will appear in the interface.</p>
          </div>
        </CardContent>
      </Card>

      {/* Message Bubble Style */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <CardTitle className="text-base">Message Style</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Choose how chat messages are displayed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: 'default', label: 'Default', desc: 'Standard bubbles' },
              { value: 'minimal', label: 'Minimal', desc: 'Clean, no borders' },
              { value: 'bordered', label: 'Bordered', desc: 'With outlines' },
              { value: 'gradient', label: 'Gradient', desc: 'Subtle gradients' },
            ].map((style) => (
              <button
                key={style.value}
                onClick={() => setMessageBubbleStyle(style.value as MessageBubbleStyle)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors text-center',
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

      {/* UI Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('interfacePreferences')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="sidebar-collapsed" className="text-sm">{t('collapseSidebar')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('collapseSidebarDescription')}
              </p>
            </div>
            <Switch
              id="sidebar-collapsed"
              checked={sidebarCollapsed}
              onCheckedChange={setSidebarCollapsed}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="send-on-enter" className="text-sm">{t('sendOnEnter')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('sendOnEnterDescription')}
              </p>
            </div>
            <Switch
              id="send-on-enter"
              checked={sendOnEnter}
              onCheckedChange={setSendOnEnter}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="stream-responses" className="text-sm">{t('streamResponses')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('streamResponsesDescription')}
              </p>
            </div>
            <Switch
              id="stream-responses"
              checked={streamResponses}
              onCheckedChange={setStreamResponses}
            />
          </div>
        </CardContent>
      </Card>

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
