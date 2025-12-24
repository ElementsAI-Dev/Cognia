'use client';

/**
 * TextSelectionPopover - Shows action menu when text is selected in chat messages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Quote, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuoteStore } from '@/stores/quote-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TextSelectionPopoverProps {
  containerRef: React.RefObject<HTMLElement | null>;
  messageId: string;
  messageRole: 'user' | 'assistant';
  onSearch?: (text: string) => void;
}

interface SelectionState {
  text: string;
  rect: DOMRect | null;
}

export function TextSelectionPopover({
  containerRef,
  messageId,
  messageRole,
  onSearch,
}: TextSelectionPopoverProps) {
  const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null });
  const [copied, setCopied] = useState(false);
  const [quoted, setQuoted] = useState(false);
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
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleQuote = () => {
    addQuote({
      content: selection.text,
      messageId,
      messageRole,
    });
    setQuoted(true);
    toast.success('Added to quote');
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

  return (
    <div
      ref={popoverRef}
      style={popoverStyle}
      className={cn(
        'flex items-center gap-0.5 p-1 rounded-lg border bg-popover shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
    >
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
          <p>{copied ? 'Copied!' : 'Copy'}</p>
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
          <p>{quoted ? 'Quoted!' : 'Quote'}</p>
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
            <p>Search</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default TextSelectionPopover;
