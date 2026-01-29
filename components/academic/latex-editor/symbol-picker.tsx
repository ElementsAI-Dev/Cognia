'use client';

/**
 * Symbol Picker Component
 * Provides a visual picker for LaTeX symbols
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  GREEK_LETTERS,
  MATH_OPERATORS,
  ARROWS,
  DELIMITERS,
  searchSymbols,
} from '@/lib/latex/symbols';
import type { LaTeXSymbol } from '@/types/latex';

// Define relations and functions locally since they're not exported from symbols
const MATH_RELATIONS = MATH_OPERATORS.filter((s) => ['=', '<', '>', '≤', '≥', '≠'].some((r) => s.name.includes(r) || s.command.includes(r)));
const MATH_FUNCTIONS: LaTeXSymbol[] = [
  { name: 'sin', command: '\\sin', category: 'functions' },
  { name: 'cos', command: '\\cos', category: 'functions' },
  { name: 'tan', command: '\\tan', category: 'functions' },
  { name: 'log', command: '\\log', category: 'functions' },
  { name: 'ln', command: '\\ln', category: 'functions' },
  { name: 'exp', command: '\\exp', category: 'functions' },
  { name: 'lim', command: '\\lim', category: 'functions' },
  { name: 'sum', command: '\\sum', category: 'functions' },
  { name: 'prod', command: '\\prod', category: 'functions' },
  { name: 'int', command: '\\int', category: 'functions' },
];
import { Search } from 'lucide-react';

interface SymbolPickerProps {
  onSelect: (symbol: LaTeXSymbol) => void;
  className?: string;
}

export function SymbolPicker({ onSelect, className }: SymbolPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('greek');

  const categories = useMemo(
    () => [
      { id: 'greek', label: 'Greek', symbols: GREEK_LETTERS },
      { id: 'operators', label: 'Operators', symbols: MATH_OPERATORS },
      { id: 'relations', label: 'Relations', symbols: MATH_RELATIONS },
      { id: 'arrows', label: 'Arrows', symbols: ARROWS },
      { id: 'delimiters', label: 'Delimiters', symbols: DELIMITERS },
      { id: 'functions', label: 'Functions', symbols: MATH_FUNCTIONS },
    ],
    []
  );

  const filteredSymbols = useMemo(() => {
    if (!searchQuery) {
      const category = categories.find((c) => c.id === activeTab);
      return category?.symbols || [];
    }
    return searchSymbols(searchQuery);
  }, [searchQuery, activeTab, categories]);

  const renderSymbol = (symbol: LaTeXSymbol) => (
    <TooltipProvider key={symbol.name}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 text-lg font-normal"
            onClick={() => onSelect(symbol)}
          >
            {symbol.command}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-mono text-sm">{symbol.command}</p>
            <p className="text-xs text-muted-foreground">{symbol.name}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Categories */}
      {!searchQuery ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id}>
              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-8 gap-1 p-2">
                  {cat.symbols.map(renderSymbol)}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <ScrollArea className="h-[200px]">
          <div className="grid grid-cols-8 gap-1 p-2">
            {filteredSymbols.map(renderSymbol)}
          </div>
          {filteredSymbols.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No symbols found
            </p>
          )}
        </ScrollArea>
      )}
    </div>
  );
}

export default SymbolPicker;
