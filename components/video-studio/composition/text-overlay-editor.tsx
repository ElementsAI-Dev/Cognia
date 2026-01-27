'use client';

/**
 * TextOverlayEditor - Text overlay creation and editing
 * 
 * Features:
 * - Text content editing
 * - Font selection
 * - Size, color, and style controls
 * - Position and alignment
 * - Animation presets
 * - Background/outline options
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Move,
  Sparkles,
} from 'lucide-react';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type TextAnimation = 
  | 'none'
  | 'fade-in'
  | 'fade-out'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'typewriter'
  | 'bounce';

export interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  outlineColor: string;
  outlineWidth: number;
  alignment: TextAlignment;
  position: { x: number; y: number };
  rotation: number;
  opacity: number;
  animation: TextAnimation;
  animationDuration: number;
  startTime: number;
  duration: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface TextOverlayEditorProps {
  overlay: TextOverlay;
  onOverlayChange: (updates: Partial<TextOverlay>) => void;
  onClose: () => void;
  className?: string;
}

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
];

const ANIMATION_KEYS: { value: TextAnimation; key: string }[] = [
  { value: 'none', key: 'none' },
  { value: 'fade-in', key: 'fadeIn' },
  { value: 'fade-out', key: 'fadeOut' },
  { value: 'slide-up', key: 'slideUp' },
  { value: 'slide-down', key: 'slideDown' },
  { value: 'slide-left', key: 'slideLeft' },
  { value: 'slide-right', key: 'slideRight' },
  { value: 'zoom-in', key: 'zoomIn' },
  { value: 'zoom-out', key: 'zoomOut' },
  { value: 'typewriter', key: 'typewriter' },
  { value: 'bounce', key: 'bounce' },
];

export function TextOverlayEditor({
  overlay,
  onOverlayChange,
  onClose,
  className,
}: TextOverlayEditorProps) {
  const t = useTranslations('textOverlay');
  const [activeTab, setActiveTab] = useState('text');

  const handleTextChange = useCallback(
    (text: string) => {
      onOverlayChange({ text });
    },
    [onOverlayChange]
  );

  const toggleBold = useCallback(() => {
    onOverlayChange({
      fontWeight: overlay.fontWeight === 'bold' ? 'normal' : 'bold',
    });
  }, [overlay.fontWeight, onOverlayChange]);

  const toggleItalic = useCallback(() => {
    onOverlayChange({
      fontStyle: overlay.fontStyle === 'italic' ? 'normal' : 'italic',
    });
  }, [overlay.fontStyle, onOverlayChange]);

  const toggleUnderline = useCallback(() => {
    onOverlayChange({
      textDecoration: overlay.textDecoration === 'underline' ? 'none' : 'underline',
    });
  }, [overlay.textDecoration, onOverlayChange]);

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <Type className="h-4 w-4" />
          {t('title')}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('done')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-3 mt-3">
          <TabsTrigger value="text" className="text-xs">
            <Type className="h-3 w-3 mr-1" />
            {t('tabs.text')}
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Palette className="h-3 w-3 mr-1" />
            {t('tabs.style')}
          </TabsTrigger>
          <TabsTrigger value="animation" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {t('tabs.animation')}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto p-3">
          <TabsContent value="text" className="mt-0 space-y-4">
            {/* Text input */}
            <div className="space-y-2">
              <Label>{t('textContent')}</Label>
              <Textarea
                value={overlay.text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={t('placeholder')}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Font family */}
            <div className="space-y-2">
              <Label>{t('font')}</Label>
              <Select
                value={overlay.fontFamily}
                onValueChange={(v) => onOverlayChange({ fontFamily: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem
                      key={font.value}
                      value={font.value}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('fontSize')}</Label>
                <span className="text-sm text-muted-foreground">{overlay.fontSize}px</span>
              </div>
              <Slider
                value={[overlay.fontSize]}
                onValueChange={(v) => onOverlayChange({ fontSize: v[0] })}
                min={12}
                max={200}
                step={1}
              />
            </div>

            {/* Text style buttons */}
            <div className="space-y-2">
              <Label>{t('fontStyle')}</Label>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={overlay.fontWeight === 'bold' ? 'secondary' : 'outline'}
                      size="icon"
                      onClick={toggleBold}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('bold')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={overlay.fontStyle === 'italic' ? 'secondary' : 'outline'}
                      size="icon"
                      onClick={toggleItalic}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('italic')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={overlay.textDecoration === 'underline' ? 'secondary' : 'outline'}
                      size="icon"
                      onClick={toggleUnderline}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('underline')}</TooltipContent>
                </Tooltip>

                <div className="w-px h-8 bg-border mx-1" />

                {(['left', 'center', 'right', 'justify'] as TextAlignment[]).map((align) => {
                  const icons = {
                    left: AlignLeft,
                    center: AlignCenter,
                    right: AlignRight,
                    justify: AlignJustify,
                  };
                  const Icon = icons[align];
                  return (
                    <Tooltip key={align}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={overlay.alignment === align ? 'secondary' : 'outline'}
                          size="icon"
                          onClick={() => onOverlayChange({ alignment: align })}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t(`alignment.${align}`)}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="mt-0 space-y-4">
            {/* Text color */}
            <div className="space-y-2">
              <Label>{t('textColor')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={overlay.color}
                  onChange={(e) => onOverlayChange({ color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={overlay.color}
                  onChange={(e) => onOverlayChange({ color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Background */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('background')}</Label>
                <Switch
                  checked={overlay.backgroundOpacity > 0}
                  onCheckedChange={(checked) =>
                    onOverlayChange({ backgroundOpacity: checked ? 0.8 : 0 })
                  }
                />
              </div>
              {overlay.backgroundOpacity > 0 && (
                <div className="space-y-2 pl-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={overlay.backgroundColor}
                      onChange={(e) => onOverlayChange({ backgroundColor: e.target.value })}
                      className="w-12 h-8 p-1"
                    />
                    <Slider
                      value={[overlay.backgroundOpacity]}
                      onValueChange={(v) => onOverlayChange({ backgroundOpacity: v[0] })}
                      min={0}
                      max={1}
                      step={0.05}
                      className="flex-1"
                    />
                    <span className="text-xs w-10">
                      {Math.round(overlay.backgroundOpacity * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Outline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('outline')}</Label>
                <Switch
                  checked={overlay.outlineWidth > 0}
                  onCheckedChange={(checked) =>
                    onOverlayChange({ outlineWidth: checked ? 2 : 0 })
                  }
                />
              </div>
              {overlay.outlineWidth > 0 && (
                <div className="space-y-2 pl-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={overlay.outlineColor}
                      onChange={(e) => onOverlayChange({ outlineColor: e.target.value })}
                      className="w-12 h-8 p-1"
                    />
                    <Slider
                      value={[overlay.outlineWidth]}
                      onValueChange={(v) => onOverlayChange({ outlineWidth: v[0] })}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs w-10">{overlay.outlineWidth}px</span>
                  </div>
                </div>
              )}
            </div>

            {/* Shadow */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('shadow')}</Label>
                <Switch
                  checked={overlay.shadowBlur > 0}
                  onCheckedChange={(checked) =>
                    onOverlayChange({ shadowBlur: checked ? 4 : 0 })
                  }
                />
              </div>
              {overlay.shadowBlur > 0 && (
                <div className="space-y-2 pl-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={overlay.shadowColor}
                      onChange={(e) => onOverlayChange({ shadowColor: e.target.value })}
                      className="w-12 h-8 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('blur')}</Label>
                    <Slider
                      value={[overlay.shadowBlur]}
                      onValueChange={(v) => onOverlayChange({ shadowBlur: v[0] })}
                      min={0}
                      max={20}
                      step={1}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('opacity')}</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(overlay.opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[overlay.opacity]}
                onValueChange={(v) => onOverlayChange({ opacity: v[0] })}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </TabsContent>

          <TabsContent value="animation" className="mt-0 space-y-4">
            {/* Animation type */}
            <div className="space-y-2">
              <Label>{t('animation')}</Label>
              <Select
                value={overlay.animation}
                onValueChange={(v) => onOverlayChange({ animation: v as TextAnimation })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATION_KEYS.map((anim) => (
                    <SelectItem key={anim.value} value={anim.value}>
                      {t(`animations.${anim.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Animation duration */}
            {overlay.animation !== 'none' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('duration')}</Label>
                  <span className="text-sm text-muted-foreground">
                    {overlay.animationDuration.toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[overlay.animationDuration]}
                  onValueChange={(v) => onOverlayChange({ animationDuration: v[0] })}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
              </div>
            )}

            {/* Position */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Move className="h-3 w-3" />
                {t('position')}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={overlay.position.x}
                    onChange={(e) =>
                      onOverlayChange({
                        position: { ...overlay.position, x: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={overlay.position.y}
                    onChange={(e) =>
                      onOverlayChange({
                        position: { ...overlay.position, y: parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('rotation')}</Label>
                <span className="text-sm text-muted-foreground">{overlay.rotation}°</span>
              </div>
              <Slider
                value={[overlay.rotation]}
                onValueChange={(v) => onOverlayChange({ rotation: v[0] })}
                min={-180}
                max={180}
                step={1}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default TextOverlayEditor;
