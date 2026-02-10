'use client';

/**
 * UICustomizationSettings - Configure UI appearance options
 * Includes border radius, spacing, shadows, animations, and layout settings
 * Uses collapsible sections for less frequently used options
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sliders, RotateCcw, Layout, Sparkles, MessageSquare, User, Clock, ChevronDown, ChevronUp, Type } from 'lucide-react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSettingsStore } from '@/stores';
import {
  type UIFontFamily,
  UI_FONT_OPTIONS,
  applyUICustomization,
  BORDER_RADIUS_OPTIONS,
  SPACING_OPTIONS,
  SHADOW_OPTIONS,
  MESSAGE_DENSITY_OPTIONS,
  AVATAR_STYLE_OPTIONS,
  TIMESTAMP_OPTIONS,
} from '@/lib/themes';
import { cn } from '@/lib/utils';

export function UICustomizationSettings() {
  const t = useTranslations('uiCustomizationSettings');

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

  const [effectsOpen, setEffectsOpen] = useState(false);
  const [chatMessagesOpen, setChatMessagesOpen] = useState(false);
  const [avatarsOpen, setAvatarsOpen] = useState(false);
  const [typographyOpen, setTypographyOpen] = useState(false);

  // Apply UI customization when it changes
  useEffect(() => {
    applyUICustomization(uiCustomization);
  }, [uiCustomization]);

  return (
    <div className="space-y-4">
      {/* Border Radius, Spacing & Shadows — always visible */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t('title')}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetUICustomization}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('reset')}
            </Button>
          </div>
          <CardDescription className="text-xs">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Border Radius */}
          <div className="space-y-3">
            <Label>{t('borderRadius')}</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {BORDER_RADIUS_OPTIONS.map((option) => (
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
                  <span className="text-xs font-medium">{t(option.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Spacing */}
          <div className="space-y-3">
            <Label>{t('spacing')}</Label>
            <Select
              value={uiCustomization.spacing}
              onValueChange={(value) => setSpacing(value as 'compact' | 'comfortable' | 'spacious')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPACING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shadow Intensity */}
          <div className="space-y-3">
            <Label>{t('shadowIntensity')}</Label>
            <div className="grid grid-cols-4 gap-2">
              {SHADOW_OPTIONS.map((option) => (
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
                  <span className="text-xs font-medium">{t(option.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout — always visible */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t('layout')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sidebar Width */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('sidebarWidth')}</Label>
              <span className="text-xs text-muted-foreground">
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
              <Label>{t('chatMaxWidth')}</Label>
              <span className="text-xs text-muted-foreground">
                {uiCustomization.chatMaxWidth === 0 ? t('fullWidth') : `${uiCustomization.chatMaxWidth}px`}
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
              {t('chatMaxWidthDesc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Effects — collapsible */}
      <Collapsible open={effectsOpen} onOpenChange={setEffectsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{t('effects')}</CardTitle>
                </div>
                {effectsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Animations */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('enableAnimations')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('enableAnimationsDesc')}
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
                  <Label>{t('enableBlur')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('enableBlurDesc')}
                  </p>
                </div>
                <Switch
                  checked={uiCustomization.enableBlur}
                  onCheckedChange={setEnableBlur}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Chat Messages — collapsible */}
      <Collapsible open={chatMessagesOpen} onOpenChange={setChatMessagesOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{t('chatMessages')}</CardTitle>
                    <CardDescription className="text-xs">
                      {t('chatMessagesDesc')}
                    </CardDescription>
                  </div>
                </div>
                {chatMessagesOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Message Density */}
              <div className="space-y-3">
                <Label>{t('messageDensity')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {MESSAGE_DENSITY_OPTIONS.map((option) => (
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
                      <span className="text-xs font-medium">{t(option.labelKey)}</span>
                      <span className="text-[10px] text-muted-foreground">{t(option.descKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Alignment */}
              <div className="space-y-3">
                <Label>{t('messageAlignment')}</Label>
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
                    <span className="text-xs font-medium">{t('alignmentAlternate')}</span>
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
                    <span className="text-xs font-medium">{t('alignmentLeft')}</span>
                  </button>
                </div>
              </div>

              {/* Input Position */}
              <div className="space-y-3">
                <Label>{t('inputPosition')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setUICustomization({ inputPosition: 'bottom' })}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                      uiCustomization.inputPosition === 'bottom'
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-muted hover:bg-muted/80'
                    )}
                  >
                    <div className="flex flex-col gap-1 w-full h-10 border rounded-md relative">
                      <div className="absolute bottom-1 left-1 right-1 h-2 rounded bg-primary/50" />
                    </div>
                    <span className="text-xs font-medium">{t('inputBottom')}</span>
                  </button>
                  <button
                    onClick={() => setUICustomization({ inputPosition: 'floating' })}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                      uiCustomization.inputPosition === 'floating'
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-muted hover:bg-muted/80'
                    )}
                  >
                    <div className="flex flex-col gap-1 w-full h-10 border rounded-md relative">
                      <div className="absolute bottom-2 left-2 right-2 h-3 rounded bg-primary/50 shadow-sm" />
                    </div>
                    <span className="text-xs font-medium">{t('inputFloating')}</span>
                  </button>
                </div>
              </div>

              {/* Timestamp Format */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label>{t('timestampFormat')}</Label>
                </div>
                <Select
                  value={uiCustomization.timestampFormat}
                  onValueChange={(value) => setUICustomization({ timestampFormat: value as 'relative' | 'absolute' | 'both' | 'hidden' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMESTAMP_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Avatars — collapsible */}
      <Collapsible open={avatarsOpen} onOpenChange={setAvatarsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{t('avatars')}</CardTitle>
                </div>
                {avatarsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Avatar Style */}
              <div className="space-y-3">
                <Label>{t('avatarStyle')}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_STYLE_OPTIONS.map((option) => (
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
                      <span className="text-[10px] font-medium">{t(option.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Visibility */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('showUserAvatar')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('showUserAvatarDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={uiCustomization.showUserAvatar}
                    onCheckedChange={(checked) => setUICustomization({ showUserAvatar: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('showAssistantAvatar')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('showAssistantAvatarDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={uiCustomization.showAssistantAvatar}
                    onCheckedChange={(checked) => setUICustomization({ showAssistantAvatar: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Typography — collapsible */}
      <Collapsible open={typographyOpen} onOpenChange={setTypographyOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{t('typography')}</CardTitle>
                    <CardDescription className="text-xs">
                      {t('typographyDesc')}
                    </CardDescription>
                  </div>
                </div>
                {typographyOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
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
                  {t('uiFontFamilyDesc')}
                </p>
              </div>

              {/* Font Preview */}
              <div 
                className="p-3 rounded-lg border bg-muted/30"
                style={{ fontFamily: UI_FONT_OPTIONS.find(f => f.value === uiCustomization.uiFontFamily)?.fontFamily }}
              >
                <p className="text-sm font-medium mb-1">{t('fontPreview')}</p>
                <p className="text-xs text-muted-foreground">
                  The quick brown fox jumps over the lazy dog. 0123456789
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

export default UICustomizationSettings;
