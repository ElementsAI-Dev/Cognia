'use client';

/**
 * SimplifiedModeSettings - Configure simplified interface mode
 * Provides settings for minimal, focused, and zen presets
 */

import { useTranslations } from 'next-intl';
import { Sparkles, Minimize2, Focus, Leaf, RotateCcw, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Kbd } from '@/components/ui/kbd';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
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
import { useSettingsStore } from '@/stores';

export function SimplifiedModeSettings() {
  const t = useTranslations('simplifiedMode');

  const simplifiedModeSettings = useSettingsStore((state) => state.simplifiedModeSettings);
  const setSimplifiedModeSettings = useSettingsStore((state) => state.setSimplifiedModeSettings);
  const setSimplifiedModeEnabled = useSettingsStore((state) => state.setSimplifiedModeEnabled);
  const setSimplifiedModePreset = useSettingsStore((state) => state.setSimplifiedModePreset);
  const resetSimplifiedModeSettings = useSettingsStore((state) => state.resetSimplifiedModeSettings);

  const handlePresetChange = (preset: string) => {
    setSimplifiedModePreset(preset as 'off' | 'minimal' | 'focused' | 'zen');
  };

  const handleSettingChange = (key: keyof typeof simplifiedModeSettings, value: boolean) => {
    setSimplifiedModeSettings({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <CardTitle>{t('title')}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetSimplifiedModeSettings}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('reset')}
            </Button>
          </div>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Selection */}
          <div className="space-y-3">
            <Label>{t('presetLabel')}</Label>
            <Select value={simplifiedModeSettings.preset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('presets.off')}
                  </div>
                </SelectItem>
                <SelectItem value="minimal">
                  <div className="flex items-center gap-2">
                    <Minimize2 className="h-4 w-4" />
                    {t('presets.minimal')}
                  </div>
                </SelectItem>
                <SelectItem value="focused">
                  <div className="flex items-center gap-2">
                    <Focus className="h-4 w-4" />
                    {t('presets.focused')}
                  </div>
                </SelectItem>
                <SelectItem value="zen">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4" />
                    {t('presets.zen')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('presetDescriptions.' + simplifiedModeSettings.preset)}
            </p>
          </div>

          {/* Quick Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enableLabel')}</Label>
              <p className="text-xs text-muted-foreground">{t('enableDescription')}</p>
            </div>
            <Switch
              checked={simplifiedModeSettings.enabled}
              onCheckedChange={setSimplifiedModeEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Header Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('headerSettings')}</CardTitle>
          <CardDescription className="text-xs">{t('headerDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideModelSelector')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideModelSelector}
              onCheckedChange={(checked) => handleSettingChange('hideModelSelector', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideModeSelector')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideModeSelector}
              onCheckedChange={(checked) => handleSettingChange('hideModeSelector', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideSessionActions')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideSessionActions}
              onCheckedChange={(checked) => handleSettingChange('hideSessionActions', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Input Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('inputSettings')}</CardTitle>
          <CardDescription className="text-xs">{t('inputDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideAdvancedInputControls')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideAdvancedInputControls}
              onCheckedChange={(checked) => handleSettingChange('hideAdvancedInputControls', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideAttachmentButton')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideAttachmentButton}
              onCheckedChange={(checked) => handleSettingChange('hideAttachmentButton', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideWebSearchToggle')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideWebSearchToggle}
              onCheckedChange={(checked) => handleSettingChange('hideWebSearchToggle', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideThinkingToggle')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideThinkingToggle}
              onCheckedChange={(checked) => handleSettingChange('hideThinkingToggle', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hidePresetSelector')}</Label>
            <Switch
              checked={simplifiedModeSettings.hidePresetSelector}
              onCheckedChange={(checked) => handleSettingChange('hidePresetSelector', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideContextIndicator')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideContextIndicator}
              onCheckedChange={(checked) => handleSettingChange('hideContextIndicator', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Welcome Screen Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('welcomeSettings')}</CardTitle>
          <CardDescription className="text-xs">{t('welcomeDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideFeatureBadges')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideFeatureBadges}
              onCheckedChange={(checked) => handleSettingChange('hideFeatureBadges', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideSuggestionDescriptions')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideSuggestionDescriptions}
              onCheckedChange={(checked) => handleSettingChange('hideSuggestionDescriptions', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideQuickAccessLinks')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideQuickAccessLinks}
              onCheckedChange={(checked) => handleSettingChange('hideQuickAccessLinks', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sidebar & Message Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('sidebarAndMessageSettings')}</CardTitle>
          <CardDescription className="text-xs">{t('sidebarAndMessageDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('autoHideSidebar')}</Label>
            <Switch
              checked={simplifiedModeSettings.autoHideSidebar}
              onCheckedChange={(checked) => handleSettingChange('autoHideSidebar', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideMessageActions')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideMessageActions}
              onCheckedChange={(checked) => handleSettingChange('hideMessageActions', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideMessageTimestamps')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideMessageTimestamps}
              onCheckedChange={(checked) => handleSettingChange('hideMessageTimestamps', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t('hideTokenCount')}</Label>
            <Switch
              checked={simplifiedModeSettings.hideTokenCount}
              onCheckedChange={(checked) => handleSettingChange('hideTokenCount', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('shortcutSettings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('shortcutHint')}</p>
              <p className="text-xs text-muted-foreground">
                {t('shortcutValue')}: <Kbd>{simplifiedModeSettings.toggleShortcut}</Kbd>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SimplifiedModeSettings;
