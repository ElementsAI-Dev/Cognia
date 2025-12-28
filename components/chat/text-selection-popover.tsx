'use client';

/**
 * TextSelectionPopover - Shows action menu when text is selected in chat messages
 * Enhanced with AI explain, quick translate, and context integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Copy, 
  Quote, 
  Search, 
  Check, 
  Languages, 
  Sparkles, 
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuoteStore } from '@/stores/quote-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TextSelectionPopoverProps {
  containerRef: React.RefObject<HTMLElement | null>;
  messageId: string;
  messageRole: 'user' | 'assistant';
  onSearch?: (text: string) => void;
  onExplain?: (text: string) => void;
  onTranslate?: (text: string, targetLang: string) => void;
  onAskAbout?: (text: string) => void;
}

interface SelectionState {
  text: string;
  rect: DOMRect | null;
}

// Quick translate languages
const QUICK_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export function TextSelectionPopover({
  containerRef,
  messageId,
  messageRole,
  onSearch,
  onExplain,
  onTranslate,
  onAskAbout,
}: TextSelectionPopoverProps) {
  const t = useTranslations('textSelection');
  const tToasts = useTranslations('toasts');
  const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null });
  const [copied, setCopied] = useState(false);
  const [quoted, setQuoted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const addQuote = useQuoteStore((state) => state.addQuote);

  const handleSelectionChange = useCallback(() => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      setSelection({ text: '', rect: null });
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText) {
      setSelection({ text: '', rect: null });
      return;
    }

    // Check if selection is within our container
    const container = containerRef.current;
    if (!container) return;

    const anchorNode = windowSelection.anchorNode;
    const focusNode = windowSelection.focusNode;
    
    if (!anchorNode || !focusNode) return;
    if (!container.contains(anchorNode) || !container.contains(focusNode)) {
      setSelection({ text: '', rect: null });
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelection({ text: selectedText, rect });
    setCopied(false);
    setQuoted(false);
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Only clear if clicking outside both popover and container
        const container = containerRef.current;
        if (container && !container.contains(e.target as Node)) {
          setSelection({ text: '', rect: null });
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [containerRef]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      setCopied(true);
      toast.success(tToasts('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tToasts('copyFailed'));
    }
  };

  const handleQuote = () => {
    addQuote({
      content: selection.text,
      messageId,
      messageRole,
    });
    setQuoted(true);
    toast.success(tToasts('addedToQuote'));
    setTimeout(() => {
      setSelection({ text: '', rect: null });
      window.getSelection()?.removeAllRanges();
    }, 300);
  };

  const handleSearch = () => {
    if (onSearch) {
      onSearch(selection.text);
    }
    setSelection({ text: '', rect: null });
    window.getSelection()?.removeAllRanges();
  };

  // Handle AI explain
  const handleExplain = async () => {
    if (onExplain) {
      setIsProcessing(true);
      try {
        onExplain(selection.text);
      } finally {
        setIsProcessing(false);
        setSelection({ text: '', rect: null });
        window.getSelection()?.removeAllRanges();
      }
    }
  };

  // Handle translate
  const handleTranslate = (langCode: string) => {
    if (onTranslate) {
      onTranslate(selection.text, langCode);
      setShowLanguages(false);
      setSelection({ text: '', rect: null });
      window.getSelection()?.removeAllRanges();
    }
  };

  // Handle ask about
  const handleAskAbout = () => {
    if (onAskAbout) {
      onAskAbout(selection.text);
      setSelection({ text: '', rect: null });
      window.getSelection()?.removeAllRanges();
    }
  };

  if (!selection.text || !selection.rect) {
    return null;
  }

  // Calculate popover position
  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    left: selection.rect.left + selection.rect.width / 2,
    top: selection.rect.top - 8,
    transform: 'translate(-50%, -100%)',
    zIndex: 9999,
  };

  // Word count for selection info
  const wordCount = selection.text.split(/\s+/).filter(Boolean).length;

  return (
    <div
      ref={popoverRef}
      style={popoverStyle}
      className={cn(
        'flex flex-col gap-1 p-1.5 rounded-lg border bg-popover shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
    >
      {/* Selection info */}
      <div className="flex items-center justify-center px-2">
        <Badge variant="secondary" className="text-[10px] h-4">
          {wordCount} {wordCount === 1 ? t('word') : t('words')}
        </Badge>
      </div>

      {/* Main actions row */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{copied ? t('copied') : t('copy')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleQuote}
            >
              {quoted ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Quote className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{quoted ? t('quoted') : t('quote')}</p>
          </TooltipContent>
        </Tooltip>

        {onSearch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSearch}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('search')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* AI Explain button */}
        {onExplain && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleExplain}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('explain')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Ask about button */}
        {onAskAbout && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleAskAbout}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('askAbout')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Translate dropdown */}
        {onTranslate && (
          <DropdownMenu open={showLanguages} onOpenChange={setShowLanguages}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <Languages className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{t('translate')}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="center" className="w-36">
              {QUICK_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleTranslate(lang.code)}
                  className="text-xs"
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export default TextSelectionPopover;
