'use client';

/**
 * VisualPropertyEditor - No-code property editor with sliders and color pickers
 * Enables visual manipulation of element properties without code
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Paintbrush,
  Move,
  Maximize,
  Type,
  Box,
  Layers,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import type { DesignerElement } from '@/types/designer';

interface VisualPropertyEditorProps {
  className?: string;
}

interface PropertyGroup {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
}

const PROPERTY_GROUPS: PropertyGroup[] = [
  { id: 'layout', labelKey: 'layout', icon: <Box className="h-4 w-4" /> },
  { id: 'spacing', labelKey: 'spacing', icon: <Move className="h-4 w-4" /> },
  { id: 'size', labelKey: 'size', icon: <Maximize className="h-4 w-4" /> },
  { id: 'typography', labelKey: 'typography', icon: <Type className="h-4 w-4" /> },
  { id: 'background', labelKey: 'background', icon: <Paintbrush className="h-4 w-4" /> },
  { id: 'effects', labelKey: 'effects', icon: <Layers className="h-4 w-4" /> },
];

const DISPLAY_OPTIONS = ['block', 'flex', 'grid', 'inline', 'inline-block', 'none'];
const FLEX_DIRECTION_OPTIONS = ['row', 'row-reverse', 'column', 'column-reverse'];
const JUSTIFY_OPTIONS = ['start', 'center', 'end', 'between', 'around', 'evenly'];
const ALIGN_OPTIONS = ['start', 'center', 'end', 'stretch', 'baseline'];
const FONT_WEIGHT_OPTIONS = ['normal', 'medium', 'semibold', 'bold'];
const TEXT_ALIGN_OPTIONS = ['left', 'center', 'right', 'justify'];

export function VisualPropertyEditor({ className }: VisualPropertyEditorProps) {
  const t = useTranslations('visualPropertyEditor');
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const elementTree = useDesignerStore((state) => state.elementTree);
  const updateElement = useDesignerStore((state) => state.updateElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  const [activeTab, setActiveTab] = useState('layout');

  const selectedElement = useMemo(() => {
    if (!selectedElementId || !elementTree) return null;
    return findElement(elementTree, selectedElementId);
  }, [selectedElementId, elementTree]);

  const parseClasses = useCallback((className: string | undefined): Record<string, string> => {
    if (!className) return {};
    const classes: Record<string, string> = {};
    
    className.split(' ').forEach((cls) => {
      // Parse spacing classes
      if (cls.match(/^p-(\d+|px)$/)) classes.padding = cls;
      if (cls.match(/^m-(\d+|px|auto)$/)) classes.margin = cls;
      if (cls.match(/^px-(\d+)$/)) classes.paddingX = cls;
      if (cls.match(/^py-(\d+)$/)) classes.paddingY = cls;
      if (cls.match(/^mx-(\d+|auto)$/)) classes.marginX = cls;
      if (cls.match(/^my-(\d+)$/)) classes.marginY = cls;
      
      // Parse size classes
      if (cls.match(/^w-/)) classes.width = cls;
      if (cls.match(/^h-/)) classes.height = cls;
      if (cls.match(/^min-w-/)) classes.minWidth = cls;
      if (cls.match(/^max-w-/)) classes.maxWidth = cls;
      
      // Parse display/flex classes
      if (DISPLAY_OPTIONS.includes(cls)) classes.display = cls;
      if (cls.match(/^flex-/)) classes.flexDirection = cls;
      if (cls.match(/^justify-/)) classes.justifyContent = cls;
      if (cls.match(/^items-/)) classes.alignItems = cls;
      if (cls.match(/^gap-/)) classes.gap = cls;
      
      // Parse typography
      if (cls.match(/^text-/)) {
        if (cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/)) {
          classes.fontSize = cls;
        } else if (cls.match(/^text-(left|center|right|justify)$/)) {
          classes.textAlign = cls;
        } else {
          classes.textColor = cls;
        }
      }
      if (cls.match(/^font-(normal|medium|semibold|bold)$/)) classes.fontWeight = cls;
      
      // Parse background
      if (cls.match(/^bg-/)) classes.background = cls;
      
      // Parse border/rounded
      if (cls.match(/^rounded/)) classes.borderRadius = cls;
      if (cls.match(/^border/)) classes.border = cls;
      
      // Parse effects
      if (cls.match(/^opacity-/)) classes.opacity = cls;
      if (cls.match(/^shadow/)) classes.shadow = cls;
    });
    
    return classes;
  }, []);

  const updateClass = useCallback(
    (property: string, value: string, oldValue?: string) => {
      if (!selectedElement) return;
      
      let currentClasses = selectedElement.className || '';
      
      // Remove old value if exists
      if (oldValue) {
        currentClasses = currentClasses.replace(oldValue, '').replace(/\s+/g, ' ').trim();
      }
      
      // Add new value
      currentClasses = `${currentClasses} ${value}`.trim();
      
      updateElement(selectedElement.id, { className: currentClasses });
      syncCodeFromElements();
    },
    [selectedElement, updateElement, syncCodeFromElements]
  );

  if (!selectedElement) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <div className="rounded-full bg-muted p-4 mb-4">
          <Box className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{t('noSelection') || 'No element selected'}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('noSelectionDesc') || 'Select an element to edit its properties'}
        </p>
      </div>
    );
  }

  const classes = parseClasses(selectedElement.className);

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full min-h-0', className)}>
        <div className="border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              {selectedElement.tagName}
            </span>
            {selectedElement.className && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                .{selectedElement.className.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b px-2 h-auto py-1">
            {PROPERTY_GROUPS.map((group) => (
              <Tooltip key={group.id}>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value={group.id}
                    className="data-[state=active]:bg-muted px-2 py-1.5"
                  >
                    {group.icon}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>{t(group.labelKey)}</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>

          <div className="flex-1 min-h-0 overflow-auto p-3 space-y-4">
            <TabsContent value="layout" className="m-0 space-y-4">
              <PropertyRow label={t('display')}>
                <Select
                  value={classes.display || 'block'}
                  onValueChange={(v) => updateClass('display', v, classes.display)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPLAY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>

              {classes.display === 'flex' && (
                <>
                  <PropertyRow label={t('direction')}>
                    <Select
                      value={classes.flexDirection?.replace('flex-', '') || 'row'}
                      onValueChange={(v) =>
                        updateClass('flexDirection', `flex-${v}`, classes.flexDirection)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FLEX_DIRECTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropertyRow>

                  <PropertyRow label={t('justify')}>
                    <Select
                      value={classes.justifyContent?.replace('justify-', '') || 'start'}
                      onValueChange={(v) =>
                        updateClass('justifyContent', `justify-${v}`, classes.justifyContent)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JUSTIFY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropertyRow>

                  <PropertyRow label={t('align')}>
                    <Select
                      value={classes.alignItems?.replace('items-', '') || 'start'}
                      onValueChange={(v) =>
                        updateClass('alignItems', `items-${v}`, classes.alignItems)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALIGN_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropertyRow>

                  <PropertyRow label={t('gap')}>
                    <SliderWithValue
                      value={parseInt(classes.gap?.replace('gap-', '') || '0')}
                      onChange={(v) => updateClass('gap', `gap-${v}`, classes.gap)}
                      max={16}
                    />
                  </PropertyRow>
                </>
              )}
            </TabsContent>

            <TabsContent value="spacing" className="m-0 space-y-4">
              <div className="text-xs font-medium text-muted-foreground mb-2">{t('spacing')}</div>
              <PropertyRow label={t('all')}>
                <SliderWithValue
                  value={parseInt(classes.padding?.replace('p-', '') || '0')}
                  onChange={(v) => updateClass('padding', `p-${v}`, classes.padding)}
                  max={16}
                />
              </PropertyRow>
              <PropertyRow label={t('horizontal')}>
                <SliderWithValue
                  value={parseInt(classes.paddingX?.replace('px-', '') || '0')}
                  onChange={(v) => updateClass('paddingX', `px-${v}`, classes.paddingX)}
                  max={16}
                />
              </PropertyRow>
              <PropertyRow label={t('vertical')}>
                <SliderWithValue
                  value={parseInt(classes.paddingY?.replace('py-', '') || '0')}
                  onChange={(v) => updateClass('paddingY', `py-${v}`, classes.paddingY)}
                  max={16}
                />
              </PropertyRow>

              <div className="text-xs font-medium text-muted-foreground mb-2 mt-4">{t('spacing')}</div>
              <PropertyRow label={t('all')}>
                <SliderWithValue
                  value={parseInt(classes.margin?.replace('m-', '') || '0')}
                  onChange={(v) => updateClass('margin', `m-${v}`, classes.margin)}
                  max={16}
                />
              </PropertyRow>
            </TabsContent>

            <TabsContent value="size" className="m-0 space-y-4">
              <PropertyRow label={t('width')}>
                <Input
                  className="h-8"
                  placeholder="w-full, w-64, w-[200px]"
                  value={classes.width || ''}
                  onChange={(e) => updateClass('width', e.target.value, classes.width)}
                />
              </PropertyRow>
              <PropertyRow label={t('height')}>
                <Input
                  className="h-8"
                  placeholder="h-full, h-64, h-[200px]"
                  value={classes.height || ''}
                  onChange={(e) => updateClass('height', e.target.value, classes.height)}
                />
              </PropertyRow>
              <PropertyRow label={t('maxWidth')}>
                <Input
                  className="h-8"
                  placeholder="max-w-md, max-w-lg"
                  value={classes.maxWidth || ''}
                  onChange={(e) => updateClass('maxWidth', e.target.value, classes.maxWidth)}
                />
              </PropertyRow>
            </TabsContent>

            <TabsContent value="typography" className="m-0 space-y-4">
              <PropertyRow label={t('fontSizeLabel')}>
                <Select
                  value={classes.fontSize?.replace('text-', '') || 'base'}
                  onValueChange={(v) =>
                    updateClass('fontSize', `text-${v}`, classes.fontSize)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'].map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>
              <PropertyRow label={t('weight')}>
                <Select
                  value={classes.fontWeight?.replace('font-', '') || 'normal'}
                  onValueChange={(v) =>
                    updateClass('fontWeight', `font-${v}`, classes.fontWeight)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_WEIGHT_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>
              <PropertyRow label={t('alignLabel')}>
                <Select
                  value={classes.textAlign?.replace('text-', '') || 'left'}
                  onValueChange={(v) =>
                    updateClass('textAlign', `text-${v}`, classes.textAlign)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_ALIGN_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>
              <PropertyRow label={t('color')}>
                <Input
                  className="h-8"
                  placeholder="text-gray-600"
                  value={classes.textColor || ''}
                  onChange={(e) => updateClass('textColor', e.target.value, classes.textColor)}
                />
              </PropertyRow>
            </TabsContent>

            <TabsContent value="background" className="m-0 space-y-4">
              <PropertyRow label={t('background')}>
                <Input
                  className="h-8"
                  placeholder="bg-white, bg-gray-100"
                  value={classes.background || ''}
                  onChange={(e) => updateClass('background', e.target.value, classes.background)}
                />
              </PropertyRow>
              <PropertyRow label={t('borderRadius')}>
                <Select
                  value={classes.borderRadius || 'rounded-none'}
                  onValueChange={(v) =>
                    updateClass('borderRadius', v, classes.borderRadius)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'].map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt.replace('rounded-', '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>
            </TabsContent>

            <TabsContent value="effects" className="m-0 space-y-4">
              <PropertyRow label={t('shadow')}>
                <Select
                  value={classes.shadow || 'shadow-none'}
                  onValueChange={(v) => updateClass('shadow', v, classes.shadow)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl'].map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt.replace('shadow-', '') || 'default'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>
              <PropertyRow label={t('opacityLabel')}>
                <SliderWithValue
                  value={parseInt(classes.opacity?.replace('opacity-', '') || '100')}
                  onChange={(v) => updateClass('opacity', `opacity-${v}`, classes.opacity)}
                  max={100}
                  step={10}
                  suffix="%"
                />
              </PropertyRow>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-xs shrink-0 w-20">{label}</Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SliderWithValue({
  value,
  onChange,
  max = 100,
  min = 0,
  step = 1,
  suffix = '',
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={max}
        min={min}
        step={step}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground w-10 text-right">
        {value}{suffix}
      </span>
    </div>
  );
}

function findElement(element: DesignerElement, id: string): DesignerElement | null {
  if (element.id === id) return element;
  for (const child of element.children) {
    const found = findElement(child, id);
    if (found) return found;
  }
  return null;
}

export default VisualPropertyEditor;
