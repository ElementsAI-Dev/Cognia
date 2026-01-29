'use client';

/**
 * DesignTokensPanel - Design system tokens management
 * Displays and allows editing of colors, typography, spacing, etc.
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Palette,
  Type,
  Ruler,
  Square,
  Droplets,
  Copy,
  Check,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DesignToken {
  name: string;
  value: string;
  cssVar?: string;
  tailwindClass?: string;
}

interface TokenCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  tokens: DesignToken[];
}

// Default Tailwind/shadcn design tokens
const DEFAULT_TOKENS: TokenCategory[] = [
  {
    id: 'colors',
    name: 'Colors',
    icon: <Palette className="h-4 w-4" />,
    tokens: [
      { name: 'Background', value: 'hsl(0 0% 100%)', cssVar: '--background', tailwindClass: 'bg-background' },
      { name: 'Foreground', value: 'hsl(222.2 84% 4.9%)', cssVar: '--foreground', tailwindClass: 'text-foreground' },
      { name: 'Primary', value: 'hsl(222.2 47.4% 11.2%)', cssVar: '--primary', tailwindClass: 'bg-primary' },
      { name: 'Primary Foreground', value: 'hsl(210 40% 98%)', cssVar: '--primary-foreground', tailwindClass: 'text-primary-foreground' },
      { name: 'Secondary', value: 'hsl(210 40% 96.1%)', cssVar: '--secondary', tailwindClass: 'bg-secondary' },
      { name: 'Muted', value: 'hsl(210 40% 96.1%)', cssVar: '--muted', tailwindClass: 'bg-muted' },
      { name: 'Muted Foreground', value: 'hsl(215.4 16.3% 46.9%)', cssVar: '--muted-foreground', tailwindClass: 'text-muted-foreground' },
      { name: 'Accent', value: 'hsl(210 40% 96.1%)', cssVar: '--accent', tailwindClass: 'bg-accent' },
      { name: 'Destructive', value: 'hsl(0 84.2% 60.2%)', cssVar: '--destructive', tailwindClass: 'bg-destructive' },
      { name: 'Border', value: 'hsl(214.3 31.8% 91.4%)', cssVar: '--border', tailwindClass: 'border-border' },
      { name: 'Ring', value: 'hsl(222.2 84% 4.9%)', cssVar: '--ring', tailwindClass: 'ring-ring' },
    ],
  },
  {
    id: 'typography',
    name: 'Typography',
    icon: <Type className="h-4 w-4" />,
    tokens: [
      { name: 'Font Sans', value: 'system-ui, sans-serif', cssVar: '--font-sans', tailwindClass: 'font-sans' },
      { name: 'Font Mono', value: 'ui-monospace, monospace', cssVar: '--font-mono', tailwindClass: 'font-mono' },
      { name: 'Text xs', value: '0.75rem', tailwindClass: 'text-xs' },
      { name: 'Text sm', value: '0.875rem', tailwindClass: 'text-sm' },
      { name: 'Text base', value: '1rem', tailwindClass: 'text-base' },
      { name: 'Text lg', value: '1.125rem', tailwindClass: 'text-lg' },
      { name: 'Text xl', value: '1.25rem', tailwindClass: 'text-xl' },
      { name: 'Text 2xl', value: '1.5rem', tailwindClass: 'text-2xl' },
      { name: 'Text 3xl', value: '1.875rem', tailwindClass: 'text-3xl' },
      { name: 'Text 4xl', value: '2.25rem', tailwindClass: 'text-4xl' },
    ],
  },
  {
    id: 'spacing',
    name: 'Spacing',
    icon: <Ruler className="h-4 w-4" />,
    tokens: [
      { name: 'Space 0', value: '0', tailwindClass: 'p-0' },
      { name: 'Space 1', value: '0.25rem', tailwindClass: 'p-1' },
      { name: 'Space 2', value: '0.5rem', tailwindClass: 'p-2' },
      { name: 'Space 3', value: '0.75rem', tailwindClass: 'p-3' },
      { name: 'Space 4', value: '1rem', tailwindClass: 'p-4' },
      { name: 'Space 5', value: '1.25rem', tailwindClass: 'p-5' },
      { name: 'Space 6', value: '1.5rem', tailwindClass: 'p-6' },
      { name: 'Space 8', value: '2rem', tailwindClass: 'p-8' },
      { name: 'Space 10', value: '2.5rem', tailwindClass: 'p-10' },
      { name: 'Space 12', value: '3rem', tailwindClass: 'p-12' },
    ],
  },
  {
    id: 'radius',
    name: 'Border Radius',
    icon: <Square className="h-4 w-4" />,
    tokens: [
      { name: 'Radius none', value: '0', tailwindClass: 'rounded-none' },
      { name: 'Radius sm', value: '0.125rem', tailwindClass: 'rounded-sm' },
      { name: 'Radius', value: '0.25rem', cssVar: '--radius', tailwindClass: 'rounded' },
      { name: 'Radius md', value: '0.375rem', tailwindClass: 'rounded-md' },
      { name: 'Radius lg', value: '0.5rem', tailwindClass: 'rounded-lg' },
      { name: 'Radius xl', value: '0.75rem', tailwindClass: 'rounded-xl' },
      { name: 'Radius 2xl', value: '1rem', tailwindClass: 'rounded-2xl' },
      { name: 'Radius full', value: '9999px', tailwindClass: 'rounded-full' },
    ],
  },
  {
    id: 'shadows',
    name: 'Shadows',
    icon: <Droplets className="h-4 w-4" />,
    tokens: [
      { name: 'Shadow sm', value: '0 1px 2px rgba(0,0,0,0.05)', tailwindClass: 'shadow-sm' },
      { name: 'Shadow', value: '0 1px 3px rgba(0,0,0,0.1)', tailwindClass: 'shadow' },
      { name: 'Shadow md', value: '0 4px 6px rgba(0,0,0,0.1)', tailwindClass: 'shadow-md' },
      { name: 'Shadow lg', value: '0 10px 15px rgba(0,0,0,0.1)', tailwindClass: 'shadow-lg' },
      { name: 'Shadow xl', value: '0 20px 25px rgba(0,0,0,0.1)', tailwindClass: 'shadow-xl' },
      { name: 'Shadow 2xl', value: '0 25px 50px rgba(0,0,0,0.25)', tailwindClass: 'shadow-2xl' },
    ],
  },
];

interface DesignTokensPanelProps {
  className?: string;
  onTokenSelect?: (token: DesignToken) => void;
}

export function DesignTokensPanel({ className, onTokenSelect }: DesignTokensPanelProps) {
  const t = useTranslations('designer');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Filter tokens based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return DEFAULT_TOKENS;

    const query = searchQuery.toLowerCase();
    return DEFAULT_TOKENS.map((category) => ({
      ...category,
      tokens: category.tokens.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.value.toLowerCase().includes(query) ||
          token.tailwindClass?.toLowerCase().includes(query) ||
          token.cssVar?.toLowerCase().includes(query)
      ),
    })).filter((category) => category.tokens.length > 0);
  }, [searchQuery]);

  const handleCopyToken = async (token: DesignToken, copyType: 'class' | 'var' | 'value') => {
    let textToCopy = '';
    
    switch (copyType) {
      case 'class':
        textToCopy = token.tailwindClass || '';
        break;
      case 'var':
        textToCopy = token.cssVar ? `var(${token.cssVar})` : '';
        break;
      case 'value':
        textToCopy = token.value;
        break;
    }

    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedToken(`${token.name}-${copyType}`);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const isColorToken = (value: string) => {
    return value.startsWith('hsl') || value.startsWith('rgb') || value.startsWith('#');
  };

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full min-h-0', className)}>
        {/* Header */}
        <div className="border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('designTokens') || 'Design Tokens'}</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchTokens') || 'Search tokens...'}
              className="h-8 pl-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Token List */}
        <ScrollArea className="flex-1 min-h-0">
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">{t('noTokensFound') || 'No tokens found'}</p>
            </div>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={['colors', 'typography']}
              className="w-full"
            >
              {filteredCategories.map((category) => (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span>{category.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto mr-2">
                        {category.tokens.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2 space-y-1">
                    {category.tokens.map((token) => (
                      <div
                        key={token.name}
                        className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => onTokenSelect?.(token)}
                      >
                        {/* Color preview */}
                        {isColorToken(token.value) && (
                          <div
                            className="w-6 h-6 rounded border shrink-0"
                            style={{ backgroundColor: token.value }}
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{token.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate font-mono">
                            {token.tailwindClass || token.value}
                          </p>
                        </div>

                        {/* Copy buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {token.tailwindClass && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyToken(token, 'class');
                                  }}
                                >
                                  {copiedToken === `${token.name}-class` ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy class</TooltipContent>
                            </Tooltip>
                          )}
                          {token.cssVar && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyToken(token, 'var');
                                  }}
                                >
                                  {copiedToken === `${token.name}-var` ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <span className="text-[10px] font-mono">var</span>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy CSS variable</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-3 py-2">
          <p className="text-[10px] text-muted-foreground text-center">
            {t('clickToCopy') || 'Click to copy token'}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default DesignTokensPanel;
