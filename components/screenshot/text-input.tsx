'use client';

/**
 * Text Input Component
 *
 * Inline text input for text annotations.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { FONT_SIZES } from '@/types/screenshot';

interface TextInputProps {
  position: { x: number; y: number };
  style: {
    color: string;
    fontSize?: number;
  };
  initialText?: string;
  onConfirm: (text: string, fontSize?: number) => void;
  onCancel: () => void;
  className?: string;
}

export function TextInput({
  position,
  style,
  initialText = '',
  onConfirm,
  onCancel,
  className,
}: TextInputProps) {
  const t = useTranslations('screenshot.editor');
  const [text, setText] = useState(initialText);
  const [fontSize, setFontSize] = useState(style.fontSize || 16);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Find current font size index
  const currentIndex = FONT_SIZES.indexOf(fontSize);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < FONT_SIZES.length - 1;

  useEffect(() => {
    // Focus the input when mounted
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (text.trim()) {
          onConfirm(text, fontSize);
        } else {
          onCancel();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [text, fontSize, onConfirm, onCancel]
  );

  const handleBlur = useCallback(() => {
    if (text.trim()) {
      onConfirm(text, fontSize);
    } else {
      onCancel();
    }
  }, [text, fontSize, onConfirm, onCancel]);

  const decreaseFontSize = useCallback(() => {
    if (canDecrease) {
      setFontSize(FONT_SIZES[currentIndex - 1]);
    }
  }, [canDecrease, currentIndex]);

  const increaseFontSize = useCallback(() => {
    if (canIncrease) {
      setFontSize(FONT_SIZES[currentIndex + 1]);
    }
  }, [canIncrease, currentIndex]);

  return (
    <div
      className={cn(
        'absolute z-50 pointer-events-auto',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Font size controls */}
      <div className="flex items-center gap-1 mb-1 bg-background/90 rounded px-1 py-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={decreaseFontSize}
          disabled={!canDecrease}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="text-xs min-w-[32px] text-center">{fontSize}px</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={increaseFontSize}
          disabled={!canIncrease}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={t('enterText')}
        className={cn(
          'min-w-[100px] min-h-[24px] max-w-[300px]',
          'bg-transparent border-2 border-dashed border-primary',
          'outline-none resize-none p-1 rounded',
          'placeholder:text-muted-foreground/50'
        )}
        style={{
          color: style.color,
          fontSize: fontSize,
          fontFamily: 'sans-serif',
        }}
        rows={1}
      />
      <div className="text-xs text-muted-foreground mt-1 bg-background/80 px-1 rounded">
        {t('textInputHint') || 'Enter to confirm, Shift+Enter for new line, Esc to cancel'}
      </div>
    </div>
  );
}
