'use client';

/**
 * ThemePreview - Live preview of theme colors before applying
 * Shows a mini preview of how the theme will look
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, Send, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_PRESETS, type ColorThemePreset } from '@/lib/themes';
import type { CustomTheme } from '@/stores';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface ThemePreviewProps {
  preset?: ColorThemePreset;
  customTheme?: CustomTheme;
  isDarkMode?: boolean;
  children: React.ReactNode;
}

/**
 * Get CSS color values for a preset theme
 */
function getPresetColors(preset: ColorThemePreset, isDark: boolean) {
  const presetData = THEME_PRESETS[preset];
  if (!presetData) {
    return {
      primary: isDark ? '#3b82f6' : '#2563eb',
      background: isDark ? '#0f172a' : '#ffffff',
      foreground: isDark ? '#f8fafc' : '#0f172a',
      muted: isDark ? '#1e293b' : '#f1f5f9',
      secondary: isDark ? '#1e293b' : '#f1f5f9',
    };
  }

  // Map preset to approximate hex colors
  const colorMap: Record<ColorThemePreset, { light: string; dark: string }> = {
    default: { light: '#2563eb', dark: '#3b82f6' },
    ocean: { light: '#0891b2', dark: '#06b6d4' },
    forest: { light: '#059669', dark: '#10b981' },
    sunset: { light: '#ea580c', dark: '#f97316' },
    lavender: { light: '#7c3aed', dark: '#8b5cf6' },
    rose: { light: '#e11d48', dark: '#f43f5e' },
  };

  const primary = isDark ? colorMap[preset].dark : colorMap[preset].light;

  return {
    primary,
    background: isDark ? '#0f172a' : '#ffffff',
    foreground: isDark ? '#f8fafc' : '#0f172a',
    muted: isDark ? '#1e293b' : '#f1f5f9',
    secondary: isDark ? '#1e293b' : '#f1f5f9',
  };
}

/**
 * Mini chat preview component
 */
function MiniChatPreview({
  colors,
}: {
  colors: {
    primary: string;
    background: string;
    foreground: string;
    muted: string;
    secondary: string;
  };
}) {
  const t = useTranslations('themeEditor');

  return (
    <div
      className="w-[200px] rounded-lg border overflow-hidden shadow-lg"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: colors.muted }}
      >
        <div
          className="h-5 w-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: colors.foreground }}
        >
          Cognia
        </span>
        <Settings
          className="h-3 w-3 ml-auto"
          style={{ color: colors.muted }}
        />
      </div>

      {/* Messages */}
      <div className="p-2 space-y-2">
        {/* User message */}
        <div className="flex justify-end">
          <div
            className="rounded-lg px-2 py-1 max-w-[140px]"
            style={{ backgroundColor: colors.primary }}
          >
            <span className="text-[10px] text-white">
              {t('previewUserMessage') || 'Hello!'}
            </span>
          </div>
        </div>

        {/* AI message */}
        <div className="flex items-start gap-1.5">
          <div
            className="h-4 w-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: colors.secondary }}
          />
          <div
            className="rounded-lg px-2 py-1 max-w-[140px]"
            style={{ backgroundColor: colors.secondary }}
          >
            <span
              className="text-[10px]"
              style={{ color: colors.foreground }}
            >
              {t('previewAIMessage') || 'Hi! How can I help?'}
            </span>
          </div>
        </div>
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 border-t"
        style={{ borderColor: colors.muted }}
      >
        <div
          className="flex-1 rounded px-2 py-1"
          style={{ backgroundColor: colors.secondary }}
        >
          <span
            className="text-[9px]"
            style={{ color: colors.muted }}
          >
            {t('previewInputPlaceholder') || 'Type a message...'}
          </span>
        </div>
        <div
          className="h-5 w-5 rounded flex items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Send className="h-2.5 w-2.5 text-white" />
        </div>
      </div>
    </div>
  );
}

/**
 * Theme preview with hover card
 */
export function ThemePreview({
  preset,
  customTheme,
  isDarkMode = false,
  children,
}: ThemePreviewProps) {
  const colors = useMemo(() => {
    if (customTheme) {
      return {
        primary: customTheme.colors.primary,
        background: customTheme.colors.background,
        foreground: customTheme.colors.foreground,
        muted: customTheme.colors.muted,
        secondary: customTheme.colors.secondary,
      };
    }
    if (preset) {
      return getPresetColors(preset, isDarkMode);
    }
    return getPresetColors('default', isDarkMode);
  }, [preset, customTheme, isDarkMode]);

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-auto p-2">
        <MiniChatPreview colors={colors} />
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Simple inline theme preview (no hover)
 */
export function ThemePreviewInline({
  colors,
  className,
}: {
  colors: {
    primary: string;
    background: string;
    foreground: string;
    muted: string;
    secondary: string;
  };
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1.5 rounded-md border',
        className
      )}
      style={{ backgroundColor: colors.background }}
    >
      <div
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: colors.primary }}
      />
      <div
        className="h-3 w-6 rounded"
        style={{ backgroundColor: colors.secondary }}
      />
      <MessageSquare
        className="h-3 w-3"
        style={{ color: colors.foreground }}
      />
    </div>
  );
}

export default ThemePreview;
