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
  BookOpen,
  FileText,
  Globe,
  Volume2,
  VolumeX,
  Highlighter,
  Map,
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
import { useQuoteStore } from '@/stores/chat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Kbd } from '@/components/ui/kbd';
import { useTTS } from '@/hooks';

/** Feature toggle configuration */
export interface TextSelectionFeatures {
  /** Enable copy button (default: true) */
  copy?: boolean;
  /** Enable quote button (default: true) */
  quote?: boolean;
  /** Enable web search button (default: true) */
  webSearch?: boolean;
  /** Enable text-to-speech button (default: true) */
  speak?: boolean;
  /** Enable highlight button (requires onHighlight callback) */
  highlight?: boolean;
  /** Enable search button (requires onSearch callback) */
  search?: boolean;
  /** Enable explain button (requires onExplain callback) */
  explain?: boolean;
  /** Enable summarize button (requires onSummarize callback) */
  summarize?: boolean;
  /** Enable define button (requires onDefine callback) */
  define?: boolean;
  /** Enable translate button (requires onTranslate callback) */
  translate?: boolean;
  /** Enable ask about button (requires onAskAbout callback) */
  askAbout?: boolean;
  /** Enable knowledge map generation button (requires onKnowledgeMap callback) */
  knowledgeMap?: boolean;
}

const DEFAULT_FEATURES: TextSelectionFeatures = {
  copy: true,
  quote: true,
  webSearch: true,
  speak: true,
  highlight: true,
  search: true,
  explain: true,
  summarize: true,
  define: true,
  translate: true,
  askAbout: true,
  knowledgeMap: true,
};

interface TextSelectionPopoverProps {
  containerRef: React.RefObject<HTMLElement | null>;
  messageId: string;
  messageRole: 'user' | 'assistant';
  /** Callback handlers - features are enabled when callback is provided AND feature is enabled */
  onSearch?: (text: string) => void;
  onExplain?: (text: string) => void;
  onTranslate?: (text: string, targetLang: string) => void;
  onAskAbout?: (text: string) => void;
  onSummarize?: (text: string) => void;
  onDefine?: (text: string) => void;
  onHighlight?: (text: string, messageId: string) => void;
  onKnowledgeMap?: (text: string) => void;
  /** Feature toggles - selectively enable/disable features */
  features?: TextSelectionFeatures;
  /** Show text labels alongside icons */
  showLabels?: boolean;
  /** Enable keyboard shortcuts */
  enableShortcuts?: boolean;
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
  onSummarize,
  onDefine,
  onHighlight,
  onKnowledgeMap,
  features: featuresProp,
  showLabels = false,
  enableShortcuts = true,
}: TextSelectionPopoverProps) {
  // Merge user features with defaults
  const features = { ...DEFAULT_FEATURES, ...featuresProp };
  const t = useTranslations('textSelection');
  const tToasts = useTranslations('toasts');
  const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null });
  const [copied, setCopied] = useState(false);
  const [quoted, setQuoted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const { speak: ttsSpeak, stop: ttsStop, isPlaying: isSpeaking } = useTTS();
  const popoverRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addQuote = useQuoteStore((state) => state.addQuote);

  const handleSelectionChange = useCallback(() => {
    // Clear any pending timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    // Debounce selection changes to avoid interfering with active selection
    selectionTimeoutRef.current = setTimeout(() => {
      // Don't update if user is actively selecting
      if (isSelectingRef.current) return;

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
    }, 50); // Small debounce to let selection complete
  }, [containerRef]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const container = containerRef.current;
      // Only track selection start if within container
      if (container && container.contains(e.target as Node)) {
        isSelectingRef.current = true;
      }
    };

    const handleMouseUp = () => {
      // Selection is complete, allow processing
      isSelectingRef.current = false;
      handleSelectionChange();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [handleSelectionChange, containerRef]);

  // Close popover when clicking outside - use mousedown with a small delay
  // to allow button clicks inside popover to complete first
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking on the popover itself or any dropdown menu
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      
      // Check if clicking on a dropdown menu portal (they render outside the popover)
      const target = e.target as HTMLElement;
      if (target.closest('[data-radix-popper-content-wrapper]') || 
          target.closest('[role="menu"]') ||
          target.closest('[data-state="open"]')) {
        return;
      }
      
      const container = containerRef.current;
      // Clear selection if clicking outside both popover and container
      if (container && !container.contains(e.target as Node)) {
        setSelection({ text: '', rect: null });
      }
    };

    // Use setTimeout to add listener after current event cycle
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, { capture: true });
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, { capture: true });
    };
  }, [containerRef]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(selection.text);
      setCopied(true);
      toast.success(tToasts('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tToasts('copyFailed'));
    }
  };

  const handleQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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

  const handleSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onSearch) {
      onSearch(selection.text);
    }
    setSelection({ text: '', rect: null });
    window.getSelection()?.removeAllRanges();
  };

  // Handle AI explain
  const handleExplain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
  const handleAskAbout = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAskAbout) {
      onAskAbout(selection.text);
      setSelection({ text: '', rect: null });
      window.getSelection()?.removeAllRanges();
    }
  };

  // Handle summarize
  const handleSummarize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onSummarize) {
      setIsProcessing(true);
      try {
        onSummarize(selection.text);
      } finally {
        setIsProcessing(false);
        setSelection({ text: '', rect: null });
        window.getSelection()?.removeAllRanges();
      }
    }
  };

  // Handle define
  const handleDefine = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDefine) {
      setIsProcessing(true);
      try {
        onDefine(selection.text);
      } finally {
        setIsProcessing(false);
        setSelection({ text: '', rect: null });
        window.getSelection()?.removeAllRanges();
      }
    }
  };

  // Handle web search
  const handleWebSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selection.text)}`;
    window.open(searchUrl, '_blank');
    setSelection({ text: '', rect: null });
    window.getSelection()?.removeAllRanges();
  };

  // Handle text-to-speech
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isSpeaking) {
      ttsStop();
      return;
    }

    ttsSpeak(selection.text).catch(() => {
      toast.error(tToasts('speechNotSupported') || 'Speech synthesis not supported');
    });
  };

  // Handle highlight
  const handleHighlight = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onHighlight) {
      onHighlight(selection.text, messageId);
      setHighlighted(true);
      toast.success(tToasts('highlighted') || 'Text highlighted');
      setTimeout(() => {
        setSelection({ text: '', rect: null });
        window.getSelection()?.removeAllRanges();
      }, 300);
    }
  };

  // Handle knowledge map generation
  const handleKnowledgeMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onKnowledgeMap) {
      setIsProcessing(true);
      try {
        onKnowledgeMap(selection.text);
        toast.success(tToasts('knowledgeMapGenerated') || 'Knowledge map generated');
      } finally {
        setIsProcessing(false);
        setSelection({ text: '', rect: null });
        window.getSelection()?.removeAllRanges();
      }
    }
  };

  // Keyboard shortcuts - use refs to avoid stale closures
  const selectionTextRef = useRef(selection.text);
  selectionTextRef.current = selection.text;
  
  useEffect(() => {
    if (!enableShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if we have a selection
      if (!selectionTextRef.current) return;
      
      // Ignore if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelection({ text: '', rect: null });
        window.getSelection()?.removeAllRanges();
        return;
      }

      // Don't process shortcuts with modifiers (allow Ctrl+C for native copy)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      
      switch (key) {
        case 'c':
          e.preventDefault();
          navigator.clipboard.writeText(selectionTextRef.current);
          setCopied(true);
          toast.success(tToasts('copied'));
          setTimeout(() => setCopied(false), 2000);
          break;
        case 'q':
          e.preventDefault();
          addQuote({ content: selectionTextRef.current, messageId, messageRole });
          setQuoted(true);
          toast.success(tToasts('addedToQuote'));
          setTimeout(() => {
            setSelection({ text: '', rect: null });
            window.getSelection()?.removeAllRanges();
          }, 300);
          break;
        case 'e':
          if (onExplain) {
            e.preventDefault();
            onExplain(selectionTextRef.current);
            setSelection({ text: '', rect: null });
            window.getSelection()?.removeAllRanges();
          }
          break;
        case 't':
          if (onTranslate) {
            e.preventDefault();
            setShowLanguages(true);
          }
          break;
        case 's':
          if (onSummarize) {
            e.preventDefault();
            onSummarize(selectionTextRef.current);
            setSelection({ text: '', rect: null });
            window.getSelection()?.removeAllRanges();
          }
          break;
        case 'd':
          if (onDefine) {
            e.preventDefault();
            onDefine(selectionTextRef.current);
            setSelection({ text: '', rect: null });
            window.getSelection()?.removeAllRanges();
          }
          break;
        case 'g':
          e.preventDefault();
          window.open(`https://www.google.com/search?q=${encodeURIComponent(selectionTextRef.current)}`, '_blank');
          setSelection({ text: '', rect: null });
          window.getSelection()?.removeAllRanges();
          break;
        case 'r':
          e.preventDefault();
          if (isSpeaking) {
            ttsStop();
          } else {
            ttsSpeak(selectionTextRef.current).catch(() => {});
          }
          break;
        case 'k':
          if (onKnowledgeMap) {
            e.preventDefault();
            onKnowledgeMap(selectionTextRef.current);
            setSelection({ text: '', rect: null });
            window.getSelection()?.removeAllRanges();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableShortcuts, onExplain, onTranslate, onSummarize, onDefine, onKnowledgeMap, messageId, messageRole, addQuote, tToasts, isSpeaking, ttsSpeak, ttsStop]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      ttsStop();
    };
  }, [ttsStop]);

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

  // Word and character count for selection info
  const wordCount = selection.text.split(/\s+/).filter(Boolean).length;
  const charCount = selection.text.length;

  // Check if we have any AI actions (enabled and callback provided)
  const hasAIActions = 
    (features.explain && onExplain) || 
    (features.askAbout && onAskAbout) || 
    (features.translate && onTranslate) || 
    (features.summarize && onSummarize) || 
    (features.define && onDefine) ||
    (features.knowledgeMap && onKnowledgeMap);
  
  
  // Common button styles
  const iconOnlyBtnClass = 'h-8 w-8 rounded-lg transition-colors';
  const labeledBtnClass = 'h-8 px-2.5 gap-1.5 rounded-lg text-xs font-medium transition-colors';
  const baseBtnClass = showLabels ? labeledBtnClass : iconOnlyBtnClass;
  const baseHoverClass = 'hover:bg-accent/80';
  const aiHoverClass = 'hover:bg-primary/10 hover:text-primary';

  return (
    <div
      ref={popoverRef}
      style={popoverStyle}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-xl border bg-popover/95 backdrop-blur-sm',
        'shadow-lg shadow-black/5 dark:shadow-black/20',
        'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200'
      )}
    >
      {/* Selection info badge with word and char count */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className="text-[10px] h-5 px-2 font-medium bg-muted/60 text-muted-foreground shrink-0 cursor-default"
          >
            {wordCount} {wordCount === 1 ? t('word') : t('words')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {charCount} {t('characters') || 'characters'}
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Basic actions group */}
      <div className="flex items-center gap-1">
        {features.copy && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={showLabels ? 'sm' : 'icon'}
                className={cn(baseBtnClass, baseHoverClass)}
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {showLabels && <span>{copied ? t('copied') : t('copy')}</span>}
              </Button>
            </TooltipTrigger>
            {!showLabels && (
              <TooltipContent side="top" className="text-xs">
                {copied ? t('copied') : t('copy')} <Kbd className="ml-1 text-[10px] opacity-60">C</Kbd>
              </TooltipContent>
            )}
          </Tooltip>
        )}

        {features.quote && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={showLabels ? 'sm' : 'icon'}
                className={cn(baseBtnClass, baseHoverClass)}
                onClick={handleQuote}
              >
                {quoted ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Quote className="h-3.5 w-3.5" />
                )}
                {showLabels && <span>{quoted ? t('quoted') : t('quote')}</span>}
              </Button>
            </TooltipTrigger>
            {!showLabels && (
              <TooltipContent side="top" className="text-xs">
                {quoted ? t('quoted') : t('quote')} <Kbd className="ml-1 text-[10px] opacity-60">Q</Kbd>
              </TooltipContent>
            )}
          </Tooltip>
        )}

        {features.search && onSearch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={showLabels ? 'sm' : 'icon'}
                className={cn(baseBtnClass, baseHoverClass)}
                onClick={handleSearch}
              >
                <Search className="h-3.5 w-3.5" />
                {showLabels && <span>{t('search')}</span>}
              </Button>
            </TooltipTrigger>
            {!showLabels && (
              <TooltipContent side="top" className="text-xs">
                {t('search')}
              </TooltipContent>
            )}
          </Tooltip>
        )}

        {/* Web Search */}
        {features.webSearch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={showLabels ? 'sm' : 'icon'}
                className={cn(baseBtnClass, baseHoverClass)}
                onClick={handleWebSearch}
              >
                <Globe className="h-3.5 w-3.5" />
                {showLabels && <span>{t('webSearch') || 'Web'}</span>}
              </Button>
            </TooltipTrigger>
            {!showLabels && (
              <TooltipContent side="top" className="text-xs">
                {t('webSearch') || 'Search Web'} <Kbd className="ml-1 text-[10px] opacity-60">G</Kbd>
              </TooltipContent>
            )}
          </Tooltip>
        )}

        {/* Text-to-Speech */}
        {features.speak && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={showLabels ? 'sm' : 'icon'}
                className={cn(baseBtnClass, baseHoverClass, isSpeaking && 'bg-primary/10 text-primary')}
                onClick={handleSpeak}
              >
                {isSpeaking ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
                {showLabels && <span>{isSpeaking ? t('stop') || 'Stop' : t('speak') || 'Read'}</span>}
              </Button>
            </TooltipTrigger>
            {!showLabels && (
              <TooltipContent side="top" className="text-xs">
                {isSpeaking ? t('stopSpeaking') || 'Stop' : t('speak') || 'Read Aloud'} <Kbd className="ml-1 text-[10px] opacity-60">R</Kbd>
              </TooltipContent>
            )}
          </Tooltip>
        )}

        {/* Highlight (if callback provided and enabled) */}
        {features.highlight && onHighlight && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={showLabels ? 'sm' : 'icon'}
                className={cn(baseBtnClass, baseHoverClass, highlighted && 'text-yellow-500')}
                onClick={handleHighlight}
              >
                {highlighted ? (
                  <Check className="h-3.5 w-3.5 text-yellow-500" />
                ) : (
                  <Highlighter className="h-3.5 w-3.5" />
                )}
                {showLabels && <span>{highlighted ? t('highlighted') || 'Done' : t('highlight') || 'Highlight'}</span>}
              </Button>
            </TooltipTrigger>
            {!showLabels && (
              <TooltipContent side="top" className="text-xs">
                {highlighted ? t('highlighted') || 'Highlighted' : t('highlight') || 'Highlight'}
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </div>

      {/* AI actions group - visually separated */}
      {hasAIActions && (
        <>
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          <div className="flex items-center gap-1">
            {features.explain && onExplain && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={showLabels ? 'sm' : 'icon'}
                    className={cn(baseBtnClass, aiHoverClass)}
                    onClick={handleExplain}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {showLabels && <span>{t('explain')}</span>}
                  </Button>
                </TooltipTrigger>
                {!showLabels && (
                  <TooltipContent side="top" className="text-xs">
                    {t('explain')}
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {features.summarize && onSummarize && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={showLabels ? 'sm' : 'icon'}
                    className={cn(baseBtnClass, aiHoverClass)}
                    onClick={handleSummarize}
                    disabled={isProcessing}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {showLabels && <span>{t('summarize') || 'Summarize'}</span>}
                  </Button>
                </TooltipTrigger>
                {!showLabels && (
                  <TooltipContent side="top" className="text-xs">
                    {t('summarize') || 'Summarize'} <Kbd className="ml-1 text-[10px] opacity-60">S</Kbd>
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {features.define && onDefine && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={showLabels ? 'sm' : 'icon'}
                    className={cn(baseBtnClass, aiHoverClass)}
                    onClick={handleDefine}
                    disabled={isProcessing}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    {showLabels && <span>{t('define') || 'Define'}</span>}
                  </Button>
                </TooltipTrigger>
                {!showLabels && (
                  <TooltipContent side="top" className="text-xs">
                    {t('define') || 'Define'} <Kbd className="ml-1 text-[10px] opacity-60">D</Kbd>
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {features.askAbout && onAskAbout && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={showLabels ? 'sm' : 'icon'}
                    className={cn(baseBtnClass, aiHoverClass)}
                    onClick={handleAskAbout}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {showLabels && <span>{t('askAbout')}</span>}
                  </Button>
                </TooltipTrigger>
                {!showLabels && (
                  <TooltipContent side="top" className="text-xs">
                    {t('askAbout')}
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {features.knowledgeMap && onKnowledgeMap && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={showLabels ? 'sm' : 'icon'}
                    className={cn(baseBtnClass, aiHoverClass)}
                    onClick={handleKnowledgeMap}
                    disabled={isProcessing}
                  >
                    <Map className="h-3.5 w-3.5" />
                    {showLabels && <span>{t('knowledgeMap') || 'Knowledge Map'}</span>}
                  </Button>
                </TooltipTrigger>
                {!showLabels && (
                  <TooltipContent side="top" className="text-xs">
                    {t('knowledgeMap') || 'Knowledge Map'} <Kbd className="ml-1 text-[10px] opacity-60">K</Kbd>
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {features.translate && onTranslate && (
              <DropdownMenu open={showLanguages} onOpenChange={setShowLanguages} modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size={showLabels ? 'sm' : 'icon'}
                    className={cn(baseBtnClass, aiHoverClass)}
                    title={t('translate')}
                  >
                    <Languages className="h-3.5 w-3.5" />
                    {showLabels && <span>{t('translate')}</span>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  className="w-36 p-1 z-[10000]"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  {QUICK_LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTranslate(lang.code);
                      }}
                      className="text-xs rounded-md cursor-pointer"
                    >
                      <span className="mr-2 text-sm">{lang.flag}</span>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default TextSelectionPopover;
