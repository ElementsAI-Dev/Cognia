'use client';

/**
 * StylePanel - Property panel for editing element styles
 * Similar to V0's style editing panel
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Plus,
  X,
  Palette,
  Layout,
  Square,
  Type,
  Sparkles,
  Maximize2,
  Move,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';

// Common Tailwind class suggestions
const TAILWIND_SUGGESTIONS: Record<string, string[]> = {
  spacing: ['p-4', 'px-6', 'py-4', 'm-4', 'mx-auto', 'my-8', 'gap-4', 'space-y-4'],
  sizing: ['w-full', 'h-full', 'max-w-md', 'max-w-lg', 'min-h-screen', 'aspect-video'],
  layout: ['flex', 'grid', 'flex-col', 'items-center', 'justify-center', 'justify-between'],
  typography: ['text-lg', 'text-xl', 'font-bold', 'font-medium', 'text-center', 'leading-relaxed'],
  colors: ['bg-primary', 'text-primary', 'bg-muted', 'border-border', 'text-muted-foreground'],
  effects: ['rounded-lg', 'shadow-md', 'shadow-lg', 'opacity-50', 'transition-all', 'hover:scale-105'],
  borders: ['border', 'border-2', 'rounded', 'rounded-full', 'border-dashed'],
};

interface StylePanelProps {
  className?: string;
}

export function StylePanel({ className }: StylePanelProps) {
  const t = useTranslations('stylePanel');
  const [newClass, setNewClass] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const elementMap = useDesignerStore((state) => state.elementMap);
  const updateElementStyle = useDesignerStore((state) => state.updateElementStyle);
  const updateElement = useDesignerStore((state) => state.updateElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  const selectedElement = selectedElementId ? elementMap[selectedElementId] : null;

  // Parse current classes
  const selectedClassName = selectedElement?.className;
  const currentClasses = useMemo(() => {
    if (!selectedClassName) return [];
    return selectedClassName.split(' ').filter(Boolean);
  }, [selectedClassName]);

  // Parse current inline styles
  const selectedStyles = selectedElement?.styles;
  const currentStyles = useMemo(() => {
    if (!selectedStyles) return {};
    return selectedStyles;
  }, [selectedStyles]);

  // Add a class
  const handleAddClass = useCallback((className: string) => {
    if (!selectedElementId || !className.trim()) return;
    const newClasses = [...currentClasses, className.trim()].join(' ');
    updateElement(selectedElementId, { className: newClasses });
    syncCodeFromElements();
    setNewClass('');
    setShowSuggestions(false);
  }, [selectedElementId, currentClasses, updateElement, syncCodeFromElements]);

  // Remove a class
  const handleRemoveClass = useCallback((classToRemove: string) => {
    if (!selectedElementId) return;
    const newClasses = currentClasses.filter((c) => c !== classToRemove).join(' ');
    updateElement(selectedElementId, { className: newClasses });
    syncCodeFromElements();
  }, [selectedElementId, currentClasses, updateElement, syncCodeFromElements]);

  // Update a style property
  const handleStyleChange = useCallback((property: string, value: string) => {
    if (!selectedElementId) return;
    updateElementStyle(selectedElementId, { [property]: value });
    syncCodeFromElements();
  }, [selectedElementId, updateElementStyle, syncCodeFromElements]);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!newClass.trim()) return Object.values(TAILWIND_SUGGESTIONS).flat().slice(0, 12);
    const query = newClass.toLowerCase();
    return Object.values(TAILWIND_SUGGESTIONS)
      .flat()
      .filter((s) => s.toLowerCase().includes(query) && !currentClasses.includes(s))
      .slice(0, 12);
  }, [newClass, currentClasses]);

  if (!selectedElement) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <div className="rounded-full bg-muted p-4 mb-4">
          <Palette className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{t('noElementSelected')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('selectElementToEdit')}
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea className={cn('h-full', className)}>
        <div className="p-3 space-y-4">
          {/* Element info */}
          <div className="flex items-center gap-2 pb-3 border-b">
            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
              {selectedElement.tagName}
            </span>
            {selectedElement.id && (
              <span className="text-xs text-muted-foreground">
                #{selectedElement.id}
              </span>
            )}
          </div>

          {/* Classes section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">{t('classes')}</Label>
              <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="end">
                  <Input
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    placeholder={t('addClassName')}
                    className="h-8 text-sm mb-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddClass(newClass);
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary text-xs"
                        onClick={() => handleAddClass(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-wrap gap-1">
              {currentClasses.length > 0 ? (
                currentClasses.map((cls) => (
                  <Badge
                    key={cls}
                    variant="secondary"
                    className="text-xs group"
                  >
                    {cls}
                    <button
                      className="ml-1 opacity-50 group-hover:opacity-100"
                      onClick={() => handleRemoveClass(cls)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">{t('noClasses')}</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Style properties accordion - only expand layout by default for cleaner UI */}
          <Accordion type="multiple" defaultValue={['layout']} className="w-full">
            {/* Layout */}
            <AccordionItem value="layout">
              <AccordionTrigger className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Layout className="h-3.5 w-3.5" />
                  {t('layout')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('display')}</Label>
                    <Select
                      value={currentStyles.display || ''}
                      onValueChange={(v) => handleStyleChange('display', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t('auto')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">block</SelectItem>
                        <SelectItem value="flex">flex</SelectItem>
                        <SelectItem value="grid">grid</SelectItem>
                        <SelectItem value="inline">inline</SelectItem>
                        <SelectItem value="inline-flex">inline-flex</SelectItem>
                        <SelectItem value="none">none</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('position')}</Label>
                    <Select
                      value={currentStyles.position || ''}
                      onValueChange={(v) => handleStyleChange('position', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t('static')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">static</SelectItem>
                        <SelectItem value="relative">relative</SelectItem>
                        <SelectItem value="absolute">absolute</SelectItem>
                        <SelectItem value="fixed">fixed</SelectItem>
                        <SelectItem value="sticky">sticky</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Alignment buttons */}
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">{t('alignment')}</Label>
                  <div className="flex gap-1">
                    {[
                      { icon: <AlignLeft className="h-3.5 w-3.5" />, value: 'left' },
                      { icon: <AlignCenter className="h-3.5 w-3.5" />, value: 'center' },
                      { icon: <AlignRight className="h-3.5 w-3.5" />, value: 'right' },
                      { icon: <AlignJustify className="h-3.5 w-3.5" />, value: 'justify' },
                    ].map((btn) => (
                      <Tooltip key={btn.value}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={currentStyles.textAlign === btn.value ? 'secondary' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleStyleChange('textAlign', btn.value)}
                          >
                            {btn.icon}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{btn.value}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Spacing */}
            <AccordionItem value="spacing">
              <AccordionTrigger className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Move className="h-3.5 w-3.5" />
                  {t('spacing')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('padding')}</Label>
                    <Input
                      value={currentStyles.padding || ''}
                      onChange={(e) => handleStyleChange('padding', e.target.value)}
                      placeholder="0px"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('margin')}</Label>
                    <Input
                      value={currentStyles.margin || ''}
                      onChange={(e) => handleStyleChange('margin', e.target.value)}
                      placeholder="0px"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('gap')}</Label>
                    <Input
                      value={currentStyles.gap || ''}
                      onChange={(e) => handleStyleChange('gap', e.target.value)}
                      placeholder="0px"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Size */}
            <AccordionItem value="size">
              <AccordionTrigger className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-3.5 w-3.5" />
                  {t('size')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('width')}</Label>
                    <Input
                      value={currentStyles.width || ''}
                      onChange={(e) => handleStyleChange('width', e.target.value)}
                      placeholder={t('auto')}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('height')}</Label>
                    <Input
                      value={currentStyles.height || ''}
                      onChange={(e) => handleStyleChange('height', e.target.value)}
                      placeholder={t('auto')}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('minWidth')}</Label>
                    <Input
                      value={currentStyles.minWidth || ''}
                      onChange={(e) => handleStyleChange('minWidth', e.target.value)}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('maxWidth')}</Label>
                    <Input
                      value={currentStyles.maxWidth || ''}
                      onChange={(e) => handleStyleChange('maxWidth', e.target.value)}
                      placeholder="none"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Typography */}
            <AccordionItem value="typography">
              <AccordionTrigger className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Type className="h-3.5 w-3.5" />
                  {t('typography')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('fontSize')}</Label>
                    <Input
                      value={currentStyles.fontSize || ''}
                      onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                      placeholder="16px"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('fontWeight')}</Label>
                    <Select
                      value={currentStyles.fontWeight || ''}
                      onValueChange={(v) => handleStyleChange('fontWeight', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t('normal')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">normal</SelectItem>
                        <SelectItem value="medium">medium</SelectItem>
                        <SelectItem value="semibold">semibold</SelectItem>
                        <SelectItem value="bold">bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Text style buttons */}
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">{t('textStyle')}</Label>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentStyles.fontWeight === 'bold' ? 'secondary' : 'outline'}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStyleChange('fontWeight', currentStyles.fontWeight === 'bold' ? 'normal' : 'bold')}
                        >
                          <Bold className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('bold')}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentStyles.fontStyle === 'italic' ? 'secondary' : 'outline'}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStyleChange('fontStyle', currentStyles.fontStyle === 'italic' ? 'normal' : 'italic')}
                        >
                          <Italic className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('italic')}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentStyles.textDecoration === 'underline' ? 'secondary' : 'outline'}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStyleChange('textDecoration', currentStyles.textDecoration === 'underline' ? 'none' : 'underline')}
                        >
                          <Underline className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('underline')}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground">{t('lineHeight')}</Label>
                  <Input
                    value={currentStyles.lineHeight || ''}
                    onChange={(e) => handleStyleChange('lineHeight', e.target.value)}
                    placeholder="1.5"
                    className="h-8 text-xs"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Background */}
            <AccordionItem value="background">
              <AccordionTrigger className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5" />
                  {t('background')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">{t('backgroundColor')}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={currentStyles.backgroundColor || '#ffffff'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="h-8 w-12 p-1"
                    />
                    <Input
                      value={currentStyles.backgroundColor || ''}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Border */}
            <AccordionItem value="border">
              <AccordionTrigger className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Square className="h-3.5 w-3.5" />
                  {t('border')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('borderWidth')}</Label>
                    <Input
                      value={currentStyles.borderWidth || ''}
                      onChange={(e) => handleStyleChange('borderWidth', e.target.value)}
                      placeholder="0px"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('borderRadius')}</Label>
                    <Input
                      value={currentStyles.borderRadius || ''}
                      onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                      placeholder="0px"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">{t('borderColor')}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={currentStyles.borderColor || '#000000'}
                      onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                      className="h-8 w-12 p-1"
                    />
                    <Input
                      value={currentStyles.borderColor || ''}
                      onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                      placeholder="#000000"
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Effects */}
            <AccordionItem value="effects">
              <AccordionTrigger className="text-xs py-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('effects')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('opacity')}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={currentStyles.opacity || '1'}
                      onChange={(e) => handleStyleChange('opacity', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('boxShadow')}</Label>
                    <Select
                      value={currentStyles.boxShadow || ''}
                      onValueChange={(v) => handleStyleChange('boxShadow', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t('none')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none</SelectItem>
                        <SelectItem value="0 1px 2px rgba(0,0,0,0.05)">sm</SelectItem>
                        <SelectItem value="0 4px 6px rgba(0,0,0,0.1)">md</SelectItem>
                        <SelectItem value="0 10px 15px rgba(0,0,0,0.1)">lg</SelectItem>
                        <SelectItem value="0 20px 25px rgba(0,0,0,0.15)">xl</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Custom CSS display */}
          {selectedElement.styles && Object.keys(selectedElement.styles).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-xs font-medium mb-2 block">{t('customCSS')}</Label>
              <pre className="text-[10px] bg-muted rounded p-2 overflow-x-auto font-mono">
                {JSON.stringify(selectedElement.styles, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}

export default StylePanel;
