'use client';

/**
 * UICustomizationSettings - Configure UI appearance options
 * Includes border radius, spacing, shadows, animations, and layout settings
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sliders, RotateCcw, Layout, Sparkles, MessageSquare, User, Clock } from 'lucide-react';
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
  type MessageDensity,
  type AvatarStyle,
  type TimestampFormat,
  type UIFontFamily,
  UI_FONT_OPTIONS,
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

const messageDensityOptions: { value: MessageDensity; label: string; desc: string }[] = [
  { value: 'compact', label: 'Compact', desc: 'Minimal spacing' },
  { value: 'default', label: 'Default', desc: 'Balanced layout' },
  { value: 'relaxed', label: 'Relaxed', desc: 'More breathing room' },
];

const avatarStyleOptions: { value: AvatarStyle; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'hidden', label: 'Hidden' },
];

const timestampOptions: { value: TimestampFormat; label: string }[] = [
  { value: 'relative', label: 'Relative (2m ago)' },
  { value: 'absolute', label: 'Absolute (14:30)' },
  { value: 'both', label: 'Both' },
  { value: 'hidden', label: 'Hidden' },
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
  const setUICustomization = useSettingsStore((state) => state.setUICustomization);
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

      {/* Chat Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>{t('chatMessages') || 'Chat Messages'}</CardTitle>
          </div>
          <CardDescription>
            {t('chatMessagesDescription') || 'Customize message appearance'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Density */}
          <div className="space-y-3">
            <Label>{t('messageDensity') || 'Message Density'}</Label>
            <div className="grid grid-cols-3 gap-2">
              {messageDensityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setUICustomization({ messageDensity: option.value })}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors',
                    uiCustomization.messageDensity === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  <span className="text-xs font-medium">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground">{option.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Alignment */}
          <div className="space-y-3">
            <Label>{t('messageAlignment') || 'Message Alignment'}</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setUICustomization({ messageAlignment: 'alternate' })}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                  uiCustomization.messageAlignment === 'alternate'
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted hover:bg-muted/80'
                )}
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="h-2 w-8 rounded bg-primary/50 self-end" />
                  <div className="h-2 w-12 rounded bg-muted-foreground/30 self-start" />
                </div>
                <span className="text-xs font-medium">Alternate</span>
              </button>
              <button
                onClick={() => setUICustomization({ messageAlignment: 'left' })}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                  uiCustomization.messageAlignment === 'left'
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted hover:bg-muted/80'
                )}
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="h-2 w-8 rounded bg-primary/50 self-start" />
                  <div className="h-2 w-12 rounded bg-muted-foreground/30 self-start" />
                </div>
                <span className="text-xs font-medium">All Left</span>
              </button>
            </div>
          </div>

          {/* Timestamp Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>{t('timestampFormat') || 'Timestamp Format'}</Label>
            </div>
            <Select
              value={uiCustomization.timestampFormat}
              onValueChange={(value: TimestampFormat) => setUICustomization({ timestampFormat: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timestampOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Avatars */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>{t('avatars') || 'Avatars'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar Style */}
          <div className="space-y-3">
            <Label>{t('avatarStyle') || 'Avatar Style'}</Label>
            <div className="grid grid-cols-4 gap-2">
              {avatarStyleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setUICustomization({ avatarStyle: option.value })}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-2 transition-colors',
                    uiCustomization.avatarStyle === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  <div
                    className={cn(
                      'h-6 w-6 bg-primary/50',
                      option.value === 'circle' && 'rounded-full',
                      option.value === 'rounded' && 'rounded-md',
                      option.value === 'square' && 'rounded-none',
                      option.value === 'hidden' && 'opacity-30'
                    )}
                  />
                  <span className="text-[10px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Visibility */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('showUserAvatar') || 'Show User Avatar'}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('showUserAvatarDescription') || 'Display your avatar in messages'}
                </p>
              </div>
              <Switch
                checked={uiCustomization.showUserAvatar}
                onCheckedChange={(checked) => setUICustomization({ showUserAvatar: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('showAssistantAvatar') || 'Show AI Avatar'}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('showAssistantAvatarDescription') || 'Display AI avatar in messages'}
                </p>
              </div>
              <Switch
                checked={uiCustomization.showAssistantAvatar}
                onCheckedChange={(checked) => setUICustomization({ showAssistantAvatar: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            <CardTitle>{t('typography') || 'Typography'}</CardTitle>
          </div>
          <CardDescription>
            {t('typographyDescription') || 'Customize font settings'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* UI Font Family */}
          <div className="space-y-3">
            <Label>{t('uiFontFamily') || 'UI Font Family'}</Label>
            <Select
              value={uiCustomization.uiFontFamily}
              onValueChange={(value: UIFontFamily) => setUICustomization({ uiFontFamily: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UI_FONT_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    style={{ fontFamily: option.fontFamily }}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('uiFontFamilyDescription') || 'Select the font used throughout the interface'}
            </p>
          </div>

          {/* Font Preview */}
          <div 
            className="p-3 rounded-lg border bg-muted/30"
            style={{ fontFamily: UI_FONT_OPTIONS.find(f => f.value === uiCustomization.uiFontFamily)?.fontFamily }}
          >
            <p className="text-sm font-medium mb-1">Font Preview</p>
            <p className="text-xs text-muted-foreground">
              The quick brown fox jumps over the lazy dog. 0123456789
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UICustomizationSettings;
