'use client';

/**
 * StylePanel - Property panel for editing element styles
 * Similar to V0's style editing panel
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Layout,
  Move,
  Maximize2,
  Type,
  Palette,
  Square,
  Sparkles,
  Crosshair,
  Wand2,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer-store';
import { STYLE_CATEGORIES, type StyleProperty } from '@/types/designer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Common Tailwind class suggestions by category
const TAILWIND_SUGGESTIONS: Record<string, string[]> = {
  layout: [
    'flex', 'grid', 'block', 'inline-block', 'hidden',
    'flex-row', 'flex-col', 'items-center', 'justify-center', 'justify-between',
    'gap-2', 'gap-4', 'gap-6', 'space-x-2', 'space-y-2',
  ],
  spacing: [
    'p-2', 'p-4', 'p-6', 'p-8', 'px-4', 'py-2',
    'm-2', 'm-4', 'm-auto', 'mx-auto', 'my-4',
  ],
  size: [
    'w-full', 'w-1/2', 'w-auto', 'max-w-md', 'max-w-lg', 'max-w-xl',
    'h-full', 'h-screen', 'h-auto', 'min-h-screen',
  ],
  typography: [
    'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
    'font-normal', 'font-medium', 'font-semibold', 'font-bold',
    'text-left', 'text-center', 'text-right',
  ],
  colors: [
    'text-gray-900', 'text-gray-600', 'text-white', 'text-primary',
    'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-primary',
  ],
  borders: [
    'border', 'border-2', 'border-none',
    'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full',
    'border-gray-200', 'border-gray-300',
  ],
  effects: [
    'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl',
    'opacity-50', 'opacity-75',
    'hover:bg-gray-50', 'hover:opacity-80',
    'transition', 'transition-all', 'duration-200',
  ],
  responsive: [
    'sm:flex', 'md:flex', 'lg:flex',
    'sm:hidden', 'md:block', 'lg:grid',
    'sm:text-sm', 'md:text-base', 'lg:text-lg',
  ],
};

const categoryIcons: Record<string, React.ReactNode> = {
  layout: <Layout className="h-4 w-4" />,
  spacing: <Move className="h-4 w-4" />,
  size: <Maximize2 className="h-4 w-4" />,
  typography: <Type className="h-4 w-4" />,
  background: <Palette className="h-4 w-4" />,
  border: <Square className="h-4 w-4" />,
  effects: <Sparkles className="h-4 w-4" />,
  position: <Crosshair className="h-4 w-4" />,
};

interface StylePanelProps {
  className?: string;
}

export function StylePanel({ className }: StylePanelProps) {
  const t = useTranslations('designer');
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const elementMap = useDesignerStore((state) => state.elementMap);
  const updateElementStyle = useDesignerStore((state) => state.updateElementStyle);
  const updateElement = useDesignerStore((state) => state.updateElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  const selectedElement = selectedElementId ? elementMap[selectedElementId] : null;

  // State for class editing
  const [isEditingClasses, setIsEditingClasses] = useState(false);
  const [classInputValue, setClassInputValue] = useState('');
  const [activeSuggestionCategory, setActiveSuggestionCategory] = useState<string | null>(null);

  // Update class input when element changes
  const currentClasses = selectedElement?.className || '';

  const handleStyleChange = useCallback(
    (key: string, value: string) => {
      if (!selectedElementId) return;
      updateElementStyle(selectedElementId, { [key]: value });
      syncCodeFromElements();
    },
    [selectedElementId, updateElementStyle, syncCodeFromElements]
  );

  const handleClassNameChange = useCallback(
    (newClassName: string) => {
      if (!selectedElementId) return;
      updateElement(selectedElementId, { className: newClassName });
      syncCodeFromElements();
    },
    [selectedElementId, updateElement, syncCodeFromElements]
  );

  const handleAddClass = useCallback(
    (cls: string) => {
      if (!selectedElementId) return;
      const classes = currentClasses.split(' ').filter(Boolean);
      if (!classes.includes(cls)) {
        classes.push(cls);
        handleClassNameChange(classes.join(' '));
      }
    },
    [selectedElementId, currentClasses, handleClassNameChange]
  );

  const handleRemoveClass = useCallback(
    (cls: string) => {
      if (!selectedElementId) return;
      const classes = currentClasses.split(' ').filter((c) => c !== cls);
      handleClassNameChange(classes.join(' '));
    },
    [selectedElementId, currentClasses, handleClassNameChange]
  );

  const handleSaveClasses = useCallback(() => {
    handleClassNameChange(classInputValue);
    setIsEditingClasses(false);
  }, [classInputValue, handleClassNameChange]);

  if (!selectedElement) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <div className="rounded-full bg-muted p-4 mb-4">
          <Crosshair className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{t('noElement')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('noElementHint')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Element info header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary text-xs font-mono">
            {'</>'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {selectedElement.tagName}
              {selectedElement.className && (
                <span className="text-muted-foreground">
                  .{selectedElement.className.split(' ')[0]}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {selectedElement.className || t('noClasses')}
            </p>
          </div>
        </div>
      </div>

      {/* Tailwind Classes Editor */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium">{t('tailwindClasses')}</Label>
          <div className="flex gap-1">
            {isEditingClasses ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleSaveClasses}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsEditingClasses(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setClassInputValue(currentClasses);
                  setIsEditingClasses(true);
                }}
              >
                <Wand2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {isEditingClasses ? (
          <Textarea
            value={classInputValue}
            onChange={(e) => setClassInputValue(e.target.value)}
            className="text-xs font-mono h-20 resize-none"
            placeholder="flex items-center gap-2..."
          />
        ) : (
          <div className="flex flex-wrap gap-1">
            {currentClasses.split(' ').filter(Boolean).map((cls) => (
              <Badge
                key={cls}
                variant="secondary"
                className="text-xs font-mono cursor-pointer group"
              >
                {cls}
                <button
                  onClick={() => handleRemoveClass(cls)}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            {currentClasses.split(' ').filter(Boolean).length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                {t('noClasses')}
              </span>
            )}
          </div>
        )}

        {/* Quick add suggestions */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('addClasses')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {Object.keys(TAILWIND_SUGGESTIONS).map((category) => (
                  <Badge
                    key={category}
                    variant={activeSuggestionCategory === category ? 'default' : 'outline'}
                    className="text-xs cursor-pointer capitalize"
                    onClick={() => setActiveSuggestionCategory(
                      activeSuggestionCategory === category ? null : category
                    )}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
              {activeSuggestionCategory && (
                <div className="flex flex-wrap gap-1 pt-2 border-t">
                  {TAILWIND_SUGGESTIONS[activeSuggestionCategory].map((cls) => (
                    <Badge
                      key={cls}
                      variant="secondary"
                      className="text-xs font-mono cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleAddClass(cls)}
                    >
                      {cls}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Style categories */}
      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          defaultValue={['layout', 'spacing', 'typography']}
          className="px-4"
        >
          {STYLE_CATEGORIES.map((category) => (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger className="py-3 text-sm">
                <div className="flex items-center gap-2">
                  {categoryIcons[category.id]}
                  <span>{category.label}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3">
                  {category.properties.map((property) => (
                    <StylePropertyInput
                      key={property.key}
                      property={property}
                      value={selectedElement.styles[property.key] || ''}
                      onChange={(value) => handleStyleChange(property.key, value)}
                      t={t}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Custom CSS */}
        <div className="px-4 py-4 border-t">
          <Label className="text-xs font-medium text-muted-foreground mb-2 block">
            {t('customCss')}
          </Label>
          <Textarea
            className="h-24 text-xs font-mono resize-none"
            placeholder="/* Add custom styles */"
            value={Object.entries(selectedElement.styles)
              .map(([k, v]) => `${camelToKebab(k)}: ${v};`)
              .join('\n')}
            readOnly
          />
        </div>
      </ScrollArea>
    </div>
  );
}

interface StylePropertyInputProps {
  property: StyleProperty;
  value: string;
  onChange: (value: string) => void;
  t: ReturnType<typeof useTranslations>;
}

function StylePropertyInput({ property, value, onChange, t }: StylePropertyInputProps) {
  switch (property.type) {
    case 'select':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{property.label}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t('select')} />
            </SelectTrigger>
            <SelectContent>
              {property.options?.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'color':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{property.label}</Label>
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border-0 p-0"
              />
            </div>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="h-8 flex-1 text-xs font-mono"
            />
          </div>
        </div>
      );

    case 'slider':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{property.label}</Label>
            <span className="text-xs text-muted-foreground">{value || property.min}</span>
          </div>
          <Slider
            value={[parseFloat(value) || property.min || 0]}
            onValueChange={([v]) => onChange(String(v))}
            min={property.min}
            max={property.max}
            step={property.step}
            className="py-2"
          />
        </div>
      );

    case 'spacing':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{property.label}</Label>
          <SpacingInput value={value} onChange={onChange} />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{property.label}</Label>
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      );

    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">{property.label}</Label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={property.key}
            className="h-8 text-xs"
          />
        </div>
      );
  }
}

interface SpacingInputProps {
  value: string;
  onChange: (value: string) => void;
}

function SpacingInput({ value, onChange }: SpacingInputProps) {
  // Parse spacing value (e.g., "10px 20px" or "10px")
  const parts = value.split(' ').filter(Boolean);
  const top = parts[0] || '';
  const right = parts[1] || parts[0] || '';
  const bottom = parts[2] || parts[0] || '';
  const left = parts[3] || parts[1] || parts[0] || '';

  const handleChange = (position: 'top' | 'right' | 'bottom' | 'left', newValue: string) => {
    const values = { top, right, bottom, left };
    values[position] = newValue;
    
    // Simplify if all values are the same
    if (values.top === values.right && values.right === values.bottom && values.bottom === values.left) {
      onChange(values.top);
    } else if (values.top === values.bottom && values.left === values.right) {
      onChange(`${values.top} ${values.right}`);
    } else {
      onChange(`${values.top} ${values.right} ${values.bottom} ${values.left}`);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-1 p-2 bg-muted rounded-md">
      <div />
      <Input
        value={top}
        onChange={(e) => handleChange('top', e.target.value)}
        placeholder="0"
        className="h-6 text-xs text-center px-1"
      />
      <div />
      <Input
        value={left}
        onChange={(e) => handleChange('left', e.target.value)}
        placeholder="0"
        className="h-6 text-xs text-center px-1"
      />
      <div className="flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-dashed border-muted-foreground/30 rounded-sm" />
      </div>
      <Input
        value={right}
        onChange={(e) => handleChange('right', e.target.value)}
        placeholder="0"
        className="h-6 text-xs text-center px-1"
      />
      <div />
      <Input
        value={bottom}
        onChange={(e) => handleChange('bottom', e.target.value)}
        placeholder="0"
        className="h-6 text-xs text-center px-1"
      />
      <div />
    </div>
  );
}

// Helper to convert camelCase to kebab-case
function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export default StylePanel;
