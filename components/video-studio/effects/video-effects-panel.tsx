'use client';

/**
 * VideoEffectsPanel - Panel for managing video effects
 * Features:
 * - Effect categories and browsing
 * - Effect parameters control
 * - Preview functionality
 * - Plugin-registered effects
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Settings,
  Palette,
  Sparkles,
  Droplets,
  Move3D,
  Zap,
  Layers,
} from 'lucide-react';
import { getMediaRegistry } from '@/lib/plugin/api/media-api';
import type { VideoEffectDefinition, FilterParameterDefinition } from '@/lib/plugin/api/media-api';

export interface AppliedEffect {
  id: string;
  effectId: string;
  name: string;
  enabled: boolean;
  params: Record<string, unknown>;
}

export interface VideoEffectsPanelProps {
  appliedEffects: AppliedEffect[];
  onAddEffect: (effectId: string) => void;
  onRemoveEffect: (id: string) => void;
  onToggleEffect: (id: string, enabled: boolean) => void;
  onUpdateParams: (id: string, params: Record<string, unknown>) => void;
  onReorderEffects: (fromIndex: number, toIndex: number) => void;
  className?: string;
}

// Effect category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  color: <Palette className="h-4 w-4" />,
  blur: <Droplets className="h-4 w-4" />,
  stylize: <Sparkles className="h-4 w-4" />,
  distort: <Move3D className="h-4 w-4" />,
  motion: <Zap className="h-4 w-4" />,
  custom: <Layers className="h-4 w-4" />,
};

// Built-in effect definitions
const BUILTIN_EFFECTS: VideoEffectDefinition[] = [
  {
    id: 'brightness-contrast',
    name: 'Brightness/Contrast',
    description: 'Adjust brightness and contrast levels',
    category: 'color',
    parameters: [
      { id: 'brightness', name: 'Brightness', type: 'number', default: 0, min: -100, max: 100, step: 1 },
      { id: 'contrast', name: 'Contrast', type: 'number', default: 0, min: -100, max: 100, step: 1 },
    ],
    apply: (frame, params) => {
      const brightness = ((params?.brightness as number) || 0) * 2.55;
      const contrast = ((params?.contrast as number) || 0 + 100) / 100;
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

      const data = new Uint8ClampedArray(frame.data);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] + brightness - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] + brightness - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] + brightness - 128) + 128));
      }
      return new ImageData(data, frame.width, frame.height);
    },
  },
  {
    id: 'saturation',
    name: 'Saturation',
    description: 'Adjust color saturation',
    category: 'color',
    parameters: [
      { id: 'amount', name: 'Amount', type: 'number', default: 0, min: -100, max: 100, step: 1 },
    ],
    apply: (frame, params) => {
      const saturation = ((params?.amount as number) || 0 + 100) / 100;
      const data = new Uint8ClampedArray(frame.data);
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = Math.min(255, Math.max(0, gray + saturation * (data[i] - gray)));
        data[i + 1] = Math.min(255, Math.max(0, gray + saturation * (data[i + 1] - gray)));
        data[i + 2] = Math.min(255, Math.max(0, gray + saturation * (data[i + 2] - gray)));
      }
      return new ImageData(data, frame.width, frame.height);
    },
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    description: 'Convert to black and white',
    category: 'color',
    parameters: [
      { id: 'amount', name: 'Amount', type: 'number', default: 100, min: 0, max: 100, step: 1 },
    ],
    apply: (frame, params) => {
      const amount = ((params?.amount as number) || 100) / 100;
      const data = new Uint8ClampedArray(frame.data);
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i] + (gray - data[i]) * amount;
        data[i + 1] = data[i + 1] + (gray - data[i + 1]) * amount;
        data[i + 2] = data[i + 2] + (gray - data[i + 2]) * amount;
      }
      return new ImageData(data, frame.width, frame.height);
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    description: 'Apply sepia tone effect',
    category: 'stylize',
    parameters: [
      { id: 'amount', name: 'Amount', type: 'number', default: 100, min: 0, max: 100, step: 1 },
    ],
    apply: (frame, params) => {
      const amount = ((params?.amount as number) || 100) / 100;
      const data = new Uint8ClampedArray(frame.data);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const sepiaR = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        const sepiaG = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        const sepiaB = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        data[i] = r + (sepiaR - r) * amount;
        data[i + 1] = g + (sepiaG - g) * amount;
        data[i + 2] = b + (sepiaB - b) * amount;
      }
      return new ImageData(data, frame.width, frame.height);
    },
  },
  {
    id: 'invert',
    name: 'Invert Colors',
    description: 'Invert all colors',
    category: 'color',
    parameters: [
      { id: 'amount', name: 'Amount', type: 'number', default: 100, min: 0, max: 100, step: 1 },
    ],
    apply: (frame, params) => {
      const amount = ((params?.amount as number) || 100) / 100;
      const data = new Uint8ClampedArray(frame.data);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] + ((255 - data[i]) - data[i]) * amount;
        data[i + 1] = data[i + 1] + ((255 - data[i + 1]) - data[i + 1]) * amount;
        data[i + 2] = data[i + 2] + ((255 - data[i + 2]) - data[i + 2]) * amount;
      }
      return new ImageData(data, frame.width, frame.height);
    },
  },
  {
    id: 'vignette',
    name: 'Vignette',
    description: 'Add dark vignette around edges',
    category: 'stylize',
    parameters: [
      { id: 'amount', name: 'Amount', type: 'number', default: 50, min: 0, max: 100, step: 1 },
      { id: 'radius', name: 'Radius', type: 'number', default: 50, min: 0, max: 100, step: 1 },
    ],
    apply: (frame, params) => {
      const amount = ((params?.amount as number) || 50) / 100;
      const radius = ((params?.radius as number) || 50) / 100;
      const data = new Uint8ClampedArray(frame.data);
      const cx = frame.width / 2, cy = frame.height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
          const i = (y * frame.width + x) * 4;
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
          const vignette = Math.max(0, 1 - ((dist - radius) / (1 - radius)) * amount);
          data[i] *= vignette;
          data[i + 1] *= vignette;
          data[i + 2] *= vignette;
        }
      }
      return new ImageData(data, frame.width, frame.height);
    },
  },
];

export function VideoEffectsPanel({
  appliedEffects,
  onAddEffect,
  onRemoveEffect,
  onToggleEffect,
  onUpdateParams,
  onReorderEffects,
  className,
}: VideoEffectsPanelProps) {
  const t = useTranslations('effects');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedEffectIndex, setSelectedEffectIndex] = useState<number | null>(null);

  // Get all available effects (built-in + plugins)
  const allEffects = useMemo(() => {
    const pluginEffects = getMediaRegistry().getAllEffects();
    return [...BUILTIN_EFFECTS, ...pluginEffects];
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allEffects.forEach((e) => cats.add(e.category));
    return ['all', ...Array.from(cats)];
  }, [allEffects]);

  // Filter effects by category
  const filteredEffects = useMemo(() => {
    if (activeCategory === 'all') return allEffects;
    return allEffects.filter((e) => e.category === activeCategory);
  }, [allEffects, activeCategory]);

  // Get effect definition by ID
  const getEffectDef = useCallback(
    (effectId: string): VideoEffectDefinition | undefined => {
      return allEffects.find((e) => e.id === effectId);
    },
    [allEffects]
  );

  // Render parameter control
  const renderParameter = (
    param: FilterParameterDefinition,
    value: unknown,
    onChange: (value: unknown) => void
  ) => {
    switch (param.type) {
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{param.name}</Label>
              <span className="text-xs font-mono">{value as number}</span>
            </div>
            <Slider
              value={[value as number]}
              onValueChange={([v]) => onChange(v)}
              min={param.min ?? 0}
              max={param.max ?? 100}
              step={param.step ?? 1}
            />
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <Label className="text-xs">{param.name}</Label>
            <Switch
              checked={value as boolean}
              onCheckedChange={onChange}
            />
          </div>
        );

      case 'color':
        return (
          <div className="flex items-center justify-between">
            <Label className="text-xs">{param.name}</Label>
            <Input
              type="color"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-16 p-1"
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-1">
            <Label className="text-xs">{param.name}</Label>
            <Select value={value as string} onValueChange={onChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {param.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return (
          <div className="space-y-1">
            <Label className="text-xs">{param.name}</Label>
            <Input
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              className="h-8"
            />
          </div>
        );
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <Tabs defaultValue="browse" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">{t('browseEffects')}</TabsTrigger>
          <TabsTrigger value="applied">
            {t('applied')} ({appliedEffects.length})
          </TabsTrigger>
        </TabsList>

        {/* Browse effects */}
        <TabsContent value="browse" className="flex-1 mt-4">
          <div className="space-y-4">
            {/* Category filter */}
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-1 pb-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? 'secondary' : 'ghost'}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat !== 'all' && CATEGORY_ICONS[cat]}
                    <span className="ml-1 capitalize">{cat === 'all' ? t('all') : t(`categories.${cat}`)}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>

            {/* Effects grid */}
            <ScrollArea className="h-[300px] sm:h-[400px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredEffects.map((effect) => {
                  const isApplied = appliedEffects.some((e) => e.effectId === effect.id);
                  const isPlugin = effect.id.includes(':');

                  return (
                    <Card
                      key={effect.id}
                      className={cn(
                        'cursor-pointer transition-all hover:ring-1 hover:ring-muted-foreground/50',
                        isApplied && 'ring-1 ring-primary'
                      )}
                      onClick={() => onAddEffect(effect.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {CATEGORY_ICONS[effect.category] || <Settings className="h-4 w-4" />}
                            <div>
                              <h4 className="text-sm font-medium">{effect.name}</h4>
                              {effect.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {effect.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isPlugin && (
                              <Badge variant="outline" className="text-xs">
                                {t('plugin')}
                              </Badge>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddEffect(effect.id);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('addEffect')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Applied effects */}
        <TabsContent value="applied" className="flex-1 mt-4">
          {appliedEffects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Layers className="h-12 w-12 mb-2 opacity-50" />
              <p>{t('noEffectsApplied')}</p>
              <p className="text-sm">{t('browseHint')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] sm:h-[400px]">
              <div className="space-y-2">
                {appliedEffects.map((applied, index) => {
                  const effectDef = getEffectDef(applied.effectId);
                  const isSelected = selectedEffectIndex === index;

                  return (
                    <Card
                      key={applied.id}
                      className={cn(
                        'transition-all',
                        isSelected && 'ring-1 ring-primary',
                        !applied.enabled && 'opacity-50'
                      )}
                    >
                      <CardHeader
                        className="p-3 cursor-pointer"
                        onClick={() => setSelectedEffectIndex(isSelected ? null : index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={applied.enabled}
                                onCheckedChange={(checked) => onToggleEffect(applied.id, checked)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <CardTitle className="text-sm">{applied.name}</CardTitle>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (index > 0) onReorderEffects(index, index - 1);
                                  }}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('moveUp')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (index < appliedEffects.length - 1) {
                                      onReorderEffects(index, index + 1);
                                    }
                                  }}
                                  disabled={index === appliedEffects.length - 1}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('moveDown')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveEffect(applied.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('remove')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardHeader>

                      {isSelected && effectDef?.parameters && (
                        <CardContent className="pt-0 pb-3 px-3 space-y-3">
                          {effectDef.parameters.map((param) => (
                            <div key={param.id}>
                              {renderParameter(
                                param,
                                applied.params[param.id] ?? param.default,
                                (value) =>
                                  onUpdateParams(applied.id, {
                                    ...applied.params,
                                    [param.id]: value,
                                  })
                              )}
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default VideoEffectsPanel;
