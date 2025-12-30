'use client';

/**
 * UICustomizationSettings - Configure UI appearance options
 * Includes border radius, spacing, shadows, animations, and layout settings
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sliders, RotateCcw, Layout, Sparkles } from 'lucide-react';
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
import { useSettingsStore } from '@/stores';
import {
  type BorderRadiusSize,
  type SpacingSize,
  type ShadowIntensity,
  applyUICustomization,
} from '@/lib/themes';
import { cn } from '@/lib/utils';

const borderRadiusOptions: { value: BorderRadiusSize; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
  { value: 'full', label: 'Full' },
];

const spacingOptions: { value: SpacingSize; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];

const shadowOptions: { value: ShadowIntensity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
];

export function UICustomizationSettings() {
  const t = useTranslations('settings');

  const uiCustomization = useSettingsStore((state) => state.uiCustomization);
  const setBorderRadius = useSettingsStore((state) => state.setBorderRadius);
  const setSpacing = useSettingsStore((state) => state.setSpacing);
  const setShadowIntensity = useSettingsStore((state) => state.setShadowIntensity);
  const setEnableAnimations = useSettingsStore((state) => state.setEnableAnimations);
  const setEnableBlur = useSettingsStore((state) => state.setEnableBlur);
  const setSidebarWidth = useSettingsStore((state) => state.setSidebarWidth);
  const setChatMaxWidth = useSettingsStore((state) => state.setChatMaxWidth);
  const resetUICustomization = useSettingsStore((state) => state.resetUICustomization);

  // Apply UI customization when it changes
  useEffect(() => {
    applyUICustomization(uiCustomization);
  }, [uiCustomization]);

  return (
    <div className="space-y-6">
      {/* Border Radius & Spacing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              <CardTitle>{t('uiCustomization') || 'UI Customization'}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetUICustomization}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('reset') || 'Reset'}
            </Button>
          </div>
          <CardDescription>
            {t('uiCustomizationDescription') || 'Customize the look and feel of the interface'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Border Radius */}
          <div className="space-y-3">
            <Label>{t('borderRadius') || 'Border Radius'}</Label>
            <div className="grid grid-cols-3 gap-2">
              {borderRadiusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setBorderRadius(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                    uiCustomization.borderRadius === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  <div
                    className="h-8 w-8 border-2 border-foreground/50"
                    style={{
                      borderRadius:
                        option.value === 'none' ? '0' :
                        option.value === 'sm' ? '4px' :
                        option.value === 'md' ? '8px' :
                        option.value === 'lg' ? '12px' :
                        option.value === 'xl' ? '16px' : '9999px',
                    }}
                  />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Spacing */}
          <div className="space-y-3">
            <Label>{t('spacing') || 'Spacing'}</Label>
            <Select
              value={uiCustomization.spacing}
              onValueChange={(value: SpacingSize) => setSpacing(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shadow Intensity */}
          <div className="space-y-3">
            <Label>{t('shadowIntensity') || 'Shadow Intensity'}</Label>
            <div className="grid grid-cols-4 gap-2">
              {shadowOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setShadowIntensity(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                    uiCustomization.shadowIntensity === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  <div
                    className="h-6 w-10 rounded bg-card"
                    style={{
                      boxShadow:
                        option.value === 'none' ? 'none' :
                        option.value === 'subtle' ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' :
                        option.value === 'medium' ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' :
                        '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Effects */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle>{t('effects') || 'Effects'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Animations */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enableAnimations') || 'Enable Animations'}</Label>
              <p className="text-sm text-muted-foreground">
                {t('enableAnimationsDescription') || 'Enable smooth transitions and animations'}
              </p>
            </div>
            <Switch
              checked={uiCustomization.enableAnimations}
              onCheckedChange={setEnableAnimations}
            />
          </div>

          {/* Blur Effects */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enableBlur') || 'Enable Blur Effects'}</Label>
              <p className="text-sm text-muted-foreground">
                {t('enableBlurDescription') || 'Enable backdrop blur effects (may affect performance)'}
              </p>
            </div>
            <Switch
              checked={uiCustomization.enableBlur}
              onCheckedChange={setEnableBlur}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            <CardTitle>{t('layout') || 'Layout'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sidebar Width */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('sidebarWidth') || 'Sidebar Width'}</Label>
              <span className="text-sm text-muted-foreground">
                {uiCustomization.sidebarWidth}px
              </span>
            </div>
            <Slider
              value={[uiCustomization.sidebarWidth]}
              onValueChange={([value]) => setSidebarWidth(value)}
              min={200}
              max={400}
              step={10}
            />
          </div>

          {/* Chat Max Width */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('chatMaxWidth') || 'Chat Max Width'}</Label>
              <span className="text-sm text-muted-foreground">
                {uiCustomization.chatMaxWidth === 0 ? 'Full Width' : `${uiCustomization.chatMaxWidth}px`}
              </span>
            </div>
            <Slider
              value={[uiCustomization.chatMaxWidth]}
              onValueChange={([value]) => setChatMaxWidth(value)}
              min={0}
              max={1400}
              step={50}
            />
            <p className="text-xs text-muted-foreground">
              {t('chatMaxWidthDescription') || 'Set to 0 for full width'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UICustomizationSettings;
