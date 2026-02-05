'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { PPTTheme } from '@/types/workflow';
import { Palette, Type, RotateCcw } from 'lucide-react';

// Available fonts for presentations
const HEADING_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Source Sans Pro', 'Oswald',
  'Raleway', 'PT Sans', 'Nunito', 'Ubuntu', 'Work Sans',
];

const BODY_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans Pro',
  'Noto Sans', 'PT Sans', 'Nunito', 'Ubuntu', 'Work Sans',
  'IBM Plex Sans', 'Fira Sans', 'Libre Franklin', 'Mulish', 'Quicksand',
];

const CODE_FONTS = [
  'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Roboto Mono',
  'IBM Plex Mono', 'Ubuntu Mono', 'Inconsolata', 'Monaco', 'Consolas',
];

const COLOR_PRESETS = [
  '#000000', '#333333', '#666666', '#999999',
  '#CCCCCC', '#FFFFFF', '#F44336', '#E91E63',
  '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
  '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107',
  '#FF9800', '#FF5722', '#795548', '#607D8B',
];

// Color picker sub-component (defined outside)
interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-24 h-8 p-1 justify-start gap-2">
            <div className="h-5 w-5 rounded border" style={{ backgroundColor: value }} />
            <span className="text-xs font-mono">{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
            <div className="grid grid-cols-8 gap-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'h-6 w-6 rounded border',
                    value === color && 'ring-2 ring-primary ring-offset-1'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Font selector sub-component (defined outside)
interface FontSelectorFieldProps {
  label: string;
  value: string;
  fonts: string[];
  onChange: (font: string) => void;
}

function FontSelectorField({ label, value, fonts, onChange }: FontSelectorFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select font" />
        </SelectTrigger>
        <SelectContent>
          {fonts.map((font) => (
            <SelectItem key={font} value={font}>
              <span style={{ fontFamily: font }}>{font}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="p-2 rounded border text-sm" style={{ fontFamily: value }}>
        The quick brown fox jumps over the lazy dog
      </div>
    </div>
  );
}

export interface ThemeCustomizerProps {
  theme: PPTTheme;
  onChange: (theme: PPTTheme) => void;
  onReset?: () => void;
  className?: string;
}

/**
 * ThemeCustomizer - Fine-grained theme customization panel
 */
export function ThemeCustomizer({
  theme,
  onChange,
  onReset,
  className,
}: ThemeCustomizerProps) {
  const t = useTranslations('pptEditor');

  const handleColorChange = (key: keyof PPTTheme, color: string) => {
    onChange({ ...theme, [key]: color });
  };

  const handleFontChange = (key: keyof PPTTheme, font: string) => {
    onChange({ ...theme, [key]: font });
  };

  return (
    <div className={cn('w-80 border rounded-lg bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="font-medium text-sm">{t('themeCustomizer')}</span>
        </div>
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            {t('reset')}
          </Button>
        )}
      </div>

      {/* Tabs - Using shadcn Tabs component */}
      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="w-full rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="colors"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Palette className="h-4 w-4 mr-1" />
            {t('colors')}
          </TabsTrigger>
          <TabsTrigger
            value="fonts"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Type className="h-4 w-4 mr-1" />
            {t('fonts')}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-80">
          <TabsContent value="colors" className="m-0 p-4 space-y-4">
            <ColorPickerField
              label={t('primaryColor')}
              value={theme.primaryColor}
              onChange={(c) => handleColorChange('primaryColor', c)}
            />
            <ColorPickerField
              label={t('secondaryColor')}
              value={theme.secondaryColor}
              onChange={(c) => handleColorChange('secondaryColor', c)}
            />
            <ColorPickerField
              label={t('accentColor')}
              value={theme.accentColor}
              onChange={(c) => handleColorChange('accentColor', c)}
            />
            
            <Separator />
            
            <ColorPickerField
              label={t('backgroundColor')}
              value={theme.backgroundColor}
              onChange={(c) => handleColorChange('backgroundColor', c)}
            />
            <ColorPickerField
              label={t('textColor')}
              value={theme.textColor}
              onChange={(c) => handleColorChange('textColor', c)}
            />

            <Separator />

            {/* Theme Preview */}
            <div className="space-y-2">
              <Label className="text-sm">{t('preview')}</Label>
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: theme.backgroundColor }}
              >
                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: theme.primaryColor, fontFamily: theme.headingFont }}
                >
                  {t('sampleTitle')}
                </h3>
                <p
                  className="text-sm mb-2"
                  style={{ color: theme.textColor, fontFamily: theme.bodyFont }}
                >
                  {t('sampleContent')}
                </p>
                <div className="flex gap-2">
                  <div className="h-4 w-12 rounded" style={{ backgroundColor: theme.primaryColor }} />
                  <div className="h-4 w-8 rounded" style={{ backgroundColor: theme.secondaryColor }} />
                  <div className="h-4 w-6 rounded" style={{ backgroundColor: theme.accentColor }} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fonts" className="m-0 p-4 space-y-4">
            <FontSelectorField
              label={t('headingFont')}
              value={theme.headingFont}
              fonts={HEADING_FONTS}
              onChange={(f) => handleFontChange('headingFont', f)}
            />

            <Separator />

            <FontSelectorField
              label={t('bodyFont')}
              value={theme.bodyFont}
              fonts={BODY_FONTS}
              onChange={(f) => handleFontChange('bodyFont', f)}
            />

            <Separator />

            <FontSelectorField
              label={t('codeFont')}
              value={theme.codeFont}
              fonts={CODE_FONTS}
              onChange={(f) => handleFontChange('codeFont', f)}
            />

            {/* Font Preview */}
            <div className="space-y-2 mt-4">
              <Label className="text-sm">{t('fontPreview')}</Label>
              <div
                className="p-4 rounded-lg border space-y-2"
                style={{ backgroundColor: theme.backgroundColor }}
              >
                <h1
                  className="text-2xl font-bold"
                  style={{ fontFamily: theme.headingFont, color: theme.primaryColor }}
                >
                  Heading Text
                </h1>
                <p
                  className="text-base"
                  style={{ fontFamily: theme.bodyFont, color: theme.textColor }}
                >
                  Body text for regular content and descriptions.
                </p>
                <pre
                  className="text-sm p-2 rounded bg-black/5"
                  style={{ fontFamily: theme.codeFont, color: theme.textColor }}
                >
                  const code = &quot;example&quot;;
                </pre>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default ThemeCustomizer;
