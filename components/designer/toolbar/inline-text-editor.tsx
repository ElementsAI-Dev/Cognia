'use client';

/**
 * InlineTextEditor - Edit text content directly in the preview
 * Appears as an overlay when a text element is double-clicked
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';

interface InlineTextEditorProps {
  elementId: string;
  initialText: string;
  position: { x: number; y: number; width: number; height: number };
  onClose: () => void;
  className?: string;
}

export function InlineTextEditor({
  elementId,
  initialText,
  position,
  onClose,
  className,
}: InlineTextEditorProps) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateElementText = useDesignerStore((state) => state.updateElementText);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  // Auto-focus and select all text
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (text !== initialText) {
      updateElementText(elementId, text);
      syncCodeFromElements();
    }
    onClose();
  }, [text, initialText, elementId, updateElementText, syncCodeFromElements, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleSave]);

  return (
    <div
      className={cn(
        'absolute z-50 bg-background border-2 border-primary rounded shadow-lg',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        minWidth: Math.max(position.width, 100),
        minHeight: Math.max(position.height, 24),
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-full min-h-[24px] p-1 text-sm resize-none border-0 outline-none bg-transparent',
          'focus:ring-0 focus:outline-none'
        )}
        style={{
          minHeight: position.height,
        }}
      />
      
      {/* Action buttons */}
      <div className="absolute -bottom-8 right-0 flex gap-1">
        <Button
          size="icon"
          variant="default"
          className="h-6 w-6"
          onClick={handleSave}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-6 w-6"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook to manage inline text editing state
 */
export function useInlineTextEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const [editingElement, setEditingElement] = useState<{
    id: string;
    text: string;
    position: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const startEditing = useCallback((
    elementId: string,
    text: string,
    rect: DOMRect
  ) => {
    setEditingElement({
      id: elementId,
      text,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
    });
    setIsEditing(true);
  }, []);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    setEditingElement(null);
  }, []);

  return {
    isEditing,
    editingElement,
    startEditing,
    stopEditing,
  };
}

export default InlineTextEditor;
