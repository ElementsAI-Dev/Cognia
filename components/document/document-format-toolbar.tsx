'use client';

/**
 * DocumentFormatToolbar - Formatting toolbar for document editing
 * Provides common Word-like formatting operations with responsive mobile support
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link,
  ImageIcon,
  Table,
  Minus,
  FileText,
  Undo,
  Redo,
  ChevronDown,
  Type,
  Highlighter,
  IndentIncrease,
  IndentDecrease,
  LayoutGrid,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { FONT_FAMILIES, FONT_SIZES } from '@/types/document/document-formatting';

export type FormatAction = 
  | 'bold' | 'italic' | 'underline' | 'strikethrough'
  | 'alignLeft' | 'alignCenter' | 'alignRight' | 'alignJustify'
  | 'bulletList' | 'numberedList'
  | 'heading1' | 'heading2' | 'heading3'
  | 'quote' | 'codeBlock'
  | 'link' | 'image' | 'table'
  | 'horizontalRule' | 'pageBreak'
  | 'undo' | 'redo'
  | 'indentIncrease' | 'indentDecrease'
  | 'clearFormatting';

export interface FormatState {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  listType?: 'bullet' | 'numbered' | null;
  headingLevel?: 1 | 2 | 3 | null;
  isQuote?: boolean;
  isCode?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  highlightColor?: string;
}

export interface DocumentFormatToolbarProps {
  formatState?: FormatState;
  onFormatAction: (action: FormatAction, value?: unknown) => void;
  onFontChange?: (font: string) => void;
  onFontSizeChange?: (size: number) => void;
  onFontColorChange?: (color: string) => void;
  onHighlightColorChange?: (color: string) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  /** Show expanded toolbar on mobile (default: false, shows collapsed) */
  mobileExpanded?: boolean;
  /** Callback when mobile expansion state changes */
  onMobileExpandedChange?: (expanded: boolean) => void;
}

const FONT_COLORS = [
  { nameKey: 'black', value: '#000000' },
  { nameKey: 'darkGray', value: '#333333' },
  { nameKey: 'gray', value: '#666666' },
  { nameKey: 'red', value: '#DC2626' },
  { nameKey: 'orange', value: '#EA580C' },
  { nameKey: 'yellow', value: '#CA8A04' },
  { nameKey: 'green', value: '#16A34A' },
  { nameKey: 'blue', value: '#2563EB' },
  { nameKey: 'purple', value: '#7C3AED' },
  { nameKey: 'pink', value: '#DB2777' },
];

const HIGHLIGHT_COLORS = [
  { nameKey: 'none', value: '' },
  { nameKey: 'yellow', value: '#FEF08A' },
  { nameKey: 'green', value: '#BBF7D0' },
  { nameKey: 'blue', value: '#BFDBFE' },
  { nameKey: 'purple', value: '#DDD6FE' },
  { nameKey: 'pink', value: '#FBCFE8' },
  { nameKey: 'orange', value: '#FED7AA' },
  { nameKey: 'gray', value: '#E5E7EB' },
];

interface ToolbarToggleProps {
  action: FormatAction;
  icon: React.ElementType;
  tooltip: string;
  active?: boolean;
  shortcut?: string;
  disabled?: boolean;
  onClick: (action: FormatAction) => void;
}

function ToolbarToggle({ 
  action, 
  icon: Icon, 
  tooltip, 
  active,
  shortcut,
  disabled,
  onClick,
}: ToolbarToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={active}
          onPressedChange={() => onClick(action)}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Icon className="h-4 w-4" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{tooltip}{shortcut && <span className="ml-2 text-muted-foreground">{shortcut}</span>}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function DocumentFormatToolbar({
  formatState = {},
  onFormatAction,
  onFontChange,
  onFontSizeChange,
  onFontColorChange,
  onHighlightColorChange,
  disabled = false,
  compact = false,
  className,
  mobileExpanded: _mobileExpanded = false,
  onMobileExpandedChange: _onMobileExpandedChange,
}: DocumentFormatToolbarProps) {
  const t = useTranslations('document');
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleAction = useCallback((action: FormatAction) => {
    if (!disabled) {
      onFormatAction(action);
    }
  }, [disabled, onFormatAction]);

  // Toolbar content - rendered inline to avoid component-in-render issues
  const toolbarContent = (
    <>
      {/* Undo/Redo */}
      <div className="flex items-center shrink-0">
        <ToolbarToggle 
          action="undo" 
          icon={Undo} 
          tooltip={t('undo')} 
          shortcut="Ctrl+Z"
          disabled={disabled}
          onClick={handleAction}
        />
        <ToolbarToggle 
          action="redo" 
          icon={Redo} 
          tooltip={t('redo')} 
          shortcut="Ctrl+Y"
          disabled={disabled}
          onClick={handleAction}
        />
      </div>

      <Separator orientation="vertical" className="mx-1 h-6 hidden sm:block" />

      {/* Font Family - Hidden on mobile and compact mode */}
      {!compact && (
        <Select
          value={formatState.fontFamily || 'Calibri'}
          onValueChange={(value) => onFontChange?.(value)}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[100px] sm:w-[130px] text-xs hidden md:flex shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">
                <span style={{ fontFamily: font }}>{font}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Font Size */}
      <Select
        value={String(formatState.fontSize || 11)}
        onValueChange={(value) => onFontSizeChange?.(Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[50px] sm:w-[60px] text-xs shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)} className="text-xs">
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6 hidden sm:block" />

      {/* Text Formatting */}
      <div className="flex items-center shrink-0">
        <ToolbarToggle 
          action="bold" 
          icon={Bold} 
          tooltip={t('bold')} 
          active={formatState.bold}
          shortcut="Ctrl+B"
          disabled={disabled}
          onClick={handleAction}
        />
        <ToolbarToggle 
          action="italic" 
          icon={Italic} 
          tooltip={t('italic')} 
          active={formatState.italic}
          shortcut="Ctrl+I"
          disabled={disabled}
          onClick={handleAction}
        />
        <ToolbarToggle 
          action="underline" 
          icon={Underline} 
          tooltip={t('underline')} 
          active={formatState.underline}
          shortcut="Ctrl+U"
          disabled={disabled}
          onClick={handleAction}
        />
        <span className="hidden sm:inline-flex">
          <ToolbarToggle 
            action="strikethrough" 
            icon={Strikethrough} 
            tooltip={t('strikethrough')} 
            active={formatState.strikethrough}
            disabled={disabled}
            onClick={handleAction}
          />
        </span>
      </div>

      {/* Font Color - Hidden on very small screens */}
      <span className="hidden xs:inline-flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" disabled={disabled}>
              <div className="flex flex-col items-center">
                <Type className="h-3 w-3" />
                <div 
                  className="h-1 w-4 rounded-sm mt-0.5" 
                  style={{ backgroundColor: formatState.fontColor || '#000000' }}
                />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <div className="p-2">
              <p className="text-xs font-medium mb-2">{t('fontColor')}</p>
              <div className="grid grid-cols-5 gap-1">
                {FONT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      'h-6 w-6 rounded border border-border touch-manipulation',
                      formatState.fontColor === color.value && 'ring-2 ring-primary'
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => onFontColorChange?.(color.value)}
                    title={t(`colors.${color.nameKey}`)}
                  />
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Highlight Color */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" disabled={disabled}>
              <div className="flex flex-col items-center">
                <Highlighter className="h-3 w-3" />
                <div 
                  className="h-1 w-4 rounded-sm mt-0.5" 
                  style={{ backgroundColor: formatState.highlightColor || '#FEF08A' }}
                />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <div className="p-2">
              <p className="text-xs font-medium mb-2">{t('highlightColor')}</p>
              <div className="grid grid-cols-4 gap-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.value || 'none'}
                    type="button"
                    className={cn(
                      'h-6 w-6 rounded border border-border touch-manipulation',
                      formatState.highlightColor === color.value && 'ring-2 ring-primary',
                      !color.value && 'relative'
                    )}
                    style={{ backgroundColor: color.value || '#ffffff' }}
                    onClick={() => onHighlightColorChange?.(color.value)}
                    title={t(`colors.${color.nameKey}`)}
                  >
                    {!color.value && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">✕</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>

      <Separator orientation="vertical" className="mx-1 h-6 hidden md:block" />

      {/* Alignment - Hidden on mobile, shown in More menu */}
      <ToggleGroup 
        type="single" 
        value={formatState.alignment || 'left'}
        onValueChange={(value) => {
          if (value) {
            handleAction(`align${value.charAt(0).toUpperCase() + value.slice(1)}` as FormatAction);
          }
        }}
        className="hidden md:flex shrink-0"
        disabled={disabled}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="left" size="sm" className="h-8 w-8 p-0">
              <AlignLeft className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('alignLeft')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="center" size="sm" className="h-8 w-8 p-0">
              <AlignCenter className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('alignCenter')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="right" size="sm" className="h-8 w-8 p-0">
              <AlignRight className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('alignRight')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="justify" size="sm" className="h-8 w-8 p-0">
              <AlignJustify className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('alignJustify')}</TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-1 h-6 hidden lg:block" />

      {/* Lists - Hidden on smaller screens */}
      <div className="hidden lg:flex items-center gap-0.5 shrink-0">
        <ToggleGroup 
          type="single" 
          value={formatState.listType || ''}
          onValueChange={(value) => {
            if (value === 'bullet') handleAction('bulletList');
            else if (value === 'numbered') handleAction('numberedList');
          }}
          disabled={disabled}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="bullet" size="sm" className="h-8 w-8 p-0">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('bulletList')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="numbered" size="sm" className="h-8 w-8 p-0">
                <ListOrdered className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('numberedList')}</TooltipContent>
          </Tooltip>
        </ToggleGroup>
        <ToolbarToggle 
          action="indentDecrease" 
          icon={IndentDecrease} 
          tooltip={t('decreaseIndent')}
          disabled={disabled}
          onClick={handleAction}
        />
        <ToolbarToggle 
          action="indentIncrease" 
          icon={IndentIncrease} 
          tooltip={t('increaseIndent')}
          disabled={disabled}
          onClick={handleAction}
        />
      </div>

      <Separator orientation="vertical" className="mx-1 h-6 hidden xl:block" />

      {/* Headings - Hidden on smaller screens */}
      <span className="hidden xl:inline-flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 shrink-0" disabled={disabled}>
              <Heading1 className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleAction('heading1')}>
              <Heading1 className="h-4 w-4 mr-2" />
              {t('heading1')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('heading2')}>
              <Heading2 className="h-4 w-4 mr-2" />
              {t('heading2')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('heading3')}>
              <Heading3 className="h-4 w-4 mr-2" />
              {t('heading3')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('clearFormatting')}>
              <Type className="h-4 w-4 mr-2" />
              {t('normalText')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quote & Code */}
        <ToolbarToggle 
          action="quote" 
          icon={Quote} 
          tooltip={t('quote')} 
          active={formatState.isQuote}
          disabled={disabled}
          onClick={handleAction}
        />
        <ToolbarToggle 
          action="codeBlock" 
          icon={Code} 
          tooltip={t('codeBlock')} 
          active={formatState.isCode}
          disabled={disabled}
          onClick={handleAction}
        />
      </span>

      <Separator orientation="vertical" className="mx-1 h-6 hidden xl:block" />

      {/* Insert - Hidden on smaller screens */}
      <span className="hidden xl:inline-flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 shrink-0" disabled={disabled}>
              <LayoutGrid className="h-4 w-4" />
              <span className="text-xs hidden 2xl:inline">{t('insert')}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuItem onClick={() => handleAction('link')}>
              <Link className="h-4 w-4 mr-2" />
              {t('insertLink')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('image')}>
              <ImageIcon className="h-4 w-4 mr-2" />
              {t('insertImage')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('table')}>
              <Table className="h-4 w-4 mr-2" />
              {t('insertTable')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('horizontalRule')}>
              <Minus className="h-4 w-4 mr-2" />
              {t('horizontalLine')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('pageBreak')}>
              <FileText className="h-4 w-4 mr-2" />
              {t('pageBreak')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>

      {/* More Menu - Shown on smaller screens for hidden items */}
      <DropdownMenu open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 xl:hidden shrink-0" disabled={disabled}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px] max-h-[70vh] overflow-y-auto">
          {/* Font Family for mobile */}
          {!compact && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground md:hidden">
                {t('fontColor')}
              </DropdownMenuLabel>
              <div className="px-2 pb-2 md:hidden">
                <Select
                  value={formatState.fontFamily || 'Calibri'}
                  onValueChange={(value) => {
                    onFontChange?.(value);
                    setIsMoreOpen(false);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font} value={font} className="text-xs">
                        <span style={{ fontFamily: font }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DropdownMenuSeparator className="md:hidden" />
            </>
          )}

          {/* Alignment for mobile/tablet */}
          <DropdownMenuLabel className="text-xs text-muted-foreground md:hidden">
            {t('alignLeft').replace('Left', '')}
          </DropdownMenuLabel>
          <div className="flex items-center justify-center gap-1 px-2 pb-2 md:hidden">
            <Button 
              variant={formatState.alignment === 'left' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => { handleAction('alignLeft'); setIsMoreOpen(false); }}
              disabled={disabled}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant={formatState.alignment === 'center' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => { handleAction('alignCenter'); setIsMoreOpen(false); }}
              disabled={disabled}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button 
              variant={formatState.alignment === 'right' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => { handleAction('alignRight'); setIsMoreOpen(false); }}
              disabled={disabled}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button 
              variant={formatState.alignment === 'justify' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => { handleAction('alignJustify'); setIsMoreOpen(false); }}
              disabled={disabled}
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenuSeparator className="md:hidden" />

          {/* Lists for mobile/tablet */}
          <DropdownMenuLabel className="text-xs text-muted-foreground lg:hidden">
            {t('bulletList').replace('Bullet ', '')}
          </DropdownMenuLabel>
          <div className="flex items-center justify-center gap-1 px-2 pb-2 lg:hidden">
            <Button 
              variant={formatState.listType === 'bullet' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => { handleAction('bulletList'); setIsMoreOpen(false); }}
              disabled={disabled}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant={formatState.listType === 'numbered' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => { handleAction('numberedList'); setIsMoreOpen(false); }}
              disabled={disabled}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => { handleAction('indentDecrease'); setIsMoreOpen(false); }}
              disabled={disabled}
            >
              <IndentDecrease className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => { handleAction('indentIncrease'); setIsMoreOpen(false); }}
              disabled={disabled}
            >
              <IndentIncrease className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenuSeparator className="lg:hidden" />

          {/* Formatting options for mobile */}
          <DropdownMenuLabel className="text-xs text-muted-foreground xl:hidden">
            {t('heading1').replace('1', '')}
          </DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="xl:hidden">
              <Heading1 className="h-4 w-4 mr-2" />
              {t('heading1').replace('1', '')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => { handleAction('heading1'); setIsMoreOpen(false); }}>
                <Heading1 className="h-4 w-4 mr-2" />
                {t('heading1')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { handleAction('heading2'); setIsMoreOpen(false); }}>
                <Heading2 className="h-4 w-4 mr-2" />
                {t('heading2')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { handleAction('heading3'); setIsMoreOpen(false); }}>
                <Heading3 className="h-4 w-4 mr-2" />
                {t('heading3')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { handleAction('clearFormatting'); setIsMoreOpen(false); }}>
                <Type className="h-4 w-4 mr-2" />
                {t('normalText')}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem className="xl:hidden" onClick={() => { handleAction('quote'); setIsMoreOpen(false); }}>
            <Quote className="h-4 w-4 mr-2" />
            {t('quote')}
          </DropdownMenuItem>
          <DropdownMenuItem className="xl:hidden" onClick={() => { handleAction('codeBlock'); setIsMoreOpen(false); }}>
            <Code className="h-4 w-4 mr-2" />
            {t('codeBlock')}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="xl:hidden" />

          {/* Insert options */}
          <DropdownMenuLabel className="text-xs text-muted-foreground xl:hidden">
            {t('insert')}
          </DropdownMenuLabel>
          <DropdownMenuItem className="xl:hidden" onClick={() => { handleAction('link'); setIsMoreOpen(false); }}>
            <Link className="h-4 w-4 mr-2" />
            {t('insertLink')}
          </DropdownMenuItem>
          <DropdownMenuItem className="xl:hidden" onClick={() => { handleAction('image'); setIsMoreOpen(false); }}>
            <ImageIcon className="h-4 w-4 mr-2" />
            {t('insertImage')}
          </DropdownMenuItem>
          <DropdownMenuItem className="xl:hidden" onClick={() => { handleAction('table'); setIsMoreOpen(false); }}>
            <Table className="h-4 w-4 mr-2" />
            {t('insertTable')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="xl:hidden" />
          <DropdownMenuItem className="xl:hidden" onClick={() => { handleAction('horizontalRule'); setIsMoreOpen(false); }}>
            <Minus className="h-4 w-4 mr-2" />
            {t('horizontalLine')}
          </DropdownMenuItem>
          <DropdownMenuItem className="xl:hidden" onClick={() => { handleAction('pageBreak'); setIsMoreOpen(false); }}>
            <FileText className="h-4 w-4 mr-2" />
            {t('pageBreak')}
          </DropdownMenuItem>

          {/* Additional formatting for very small screens */}
          <DropdownMenuSeparator className="sm:hidden" />
          <DropdownMenuLabel className="text-xs text-muted-foreground sm:hidden">
            {t('strikethrough')}
          </DropdownMenuLabel>
          <DropdownMenuItem className="sm:hidden" onClick={() => { handleAction('strikethrough'); setIsMoreOpen(false); }}>
            <Strikethrough className="h-4 w-4 mr-2" />
            {t('strikethrough')}
          </DropdownMenuItem>

          {/* Color options for very small screens */}
          <DropdownMenuSeparator className="xs:hidden" />
          <DropdownMenuLabel className="text-xs text-muted-foreground xs:hidden">
            {t('fontColor')}
          </DropdownMenuLabel>
          <div className="px-2 pb-2 xs:hidden">
            <div className="grid grid-cols-5 gap-1">
              {FONT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={cn(
                    'h-7 w-7 rounded border border-border touch-manipulation',
                    formatState.fontColor === color.value && 'ring-2 ring-primary'
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => { onFontColorChange?.(color.value); setIsMoreOpen(false); }}
                  title={t(`colors.${color.nameKey}`)}
                />
              ))}
            </div>
          </div>
          <DropdownMenuLabel className="text-xs text-muted-foreground xs:hidden">
            {t('highlightColor')}
          </DropdownMenuLabel>
          <div className="px-2 pb-2 xs:hidden">
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value || 'none'}
                  type="button"
                  className={cn(
                    'h-7 w-7 rounded border border-border touch-manipulation',
                    formatState.highlightColor === color.value && 'ring-2 ring-primary',
                    !color.value && 'relative'
                  )}
                  style={{ backgroundColor: color.value || '#ffffff' }}
                  onClick={() => { onHighlightColorChange?.(color.value); setIsMoreOpen(false); }}
                  title={t(`colors.${color.nameKey}`)}
                >
                  {!color.value && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">✕</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <div className={cn(
      'relative',
      className
    )}>
      {/* Scrollable container for mobile */}
      <ScrollArea className="w-full">
        <div className={cn(
          'flex items-center gap-0.5 p-1',
          'min-w-max', // Prevent wrapping, allow horizontal scroll
        )}>
          {toolbarContent}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  );
}

export default DocumentFormatToolbar;
