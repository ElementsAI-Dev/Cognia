'use client';

/**
 * Text Input Component
 *
 * Inline text input for text annotations.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface TextInputProps {
  position: { x: number; y: number };
  style: {
    color: string;
    fontSize?: number;
  };
  initialText?: string;
  onConfirm: (text: string) => void;
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
          onConfirm(text);
        } else {
          onCancel();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [text, onConfirm, onCancel]
  );

  const handleBlur = useCallback(() => {
    if (text.trim()) {
      onConfirm(text);
    } else {
      onCancel();
    }
  }, [text, onConfirm, onCancel]);

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
          fontSize: style.fontSize || 16,
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
