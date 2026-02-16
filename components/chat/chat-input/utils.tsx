import React from 'react';
import { Archive, FileIcon, ImageIcon, Music, Video } from 'lucide-react';
import { formatFileSize, getFileType } from '@/lib/chat/file-utils';

export { formatFileSize, getFileType };

/**
 * Calculate caret coordinates in a textarea for popover positioning.
 * Creates a hidden mirror div to measure text position.
 */
export function getCaretCoordinates(textarea: HTMLTextAreaElement): DOMRect | null {
  const { selectionStart } = textarea;
  if (selectionStart === null) return null;

  const mirror = document.createElement('div');
  const computed = window.getComputedStyle(textarea);

  const styles = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'textTransform',
    'wordSpacing',
    'textIndent',
    'whiteSpace',
    'wordWrap',
    'lineHeight',
    'padding',
    'border',
    'boxSizing',
  ] as const;

  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.overflow = 'hidden';
  mirror.style.width = computed.width;

  styles.forEach((style) => {
    (mirror.style as unknown as Record<string, string>)[style] = computed.getPropertyValue(
      style.replace(/([A-Z])/g, '-$1').toLowerCase()
    );
  });

  const textBeforeCursor = textarea.value.substring(0, selectionStart);
  mirror.textContent = textBeforeCursor;

  const marker = document.createElement('span');
  marker.textContent = '|';
  mirror.appendChild(marker);

  document.body.appendChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();

  document.body.removeChild(mirror);

  return new DOMRect(
    textareaRect.left + markerRect.left - mirror.getBoundingClientRect().left,
    textareaRect.top + markerRect.top - mirror.getBoundingClientRect().top,
    0,
    parseInt(computed.lineHeight) || parseInt(computed.fontSize) * 1.2
  );
}

export function getFileIcon(type: 'image' | 'audio' | 'video' | 'archive' | 'document' | 'file') {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-4 w-4" />;
    case 'audio':
      return <Music className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'archive':
      return <Archive className="h-4 w-4" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
}
