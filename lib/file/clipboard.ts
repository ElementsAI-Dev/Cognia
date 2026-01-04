/**
 * Clipboard utilities for reading images and text
 */

import { invoke } from '@tauri-apps/api/core';

export interface ClipboardContent {
  content_type: 'image' | 'text' | 'empty';
  data?: string;
  mime_type?: string;
}

/**
 * Check if running in Tauri environment
 */
function isInTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Read image from clipboard
 * Returns base64 encoded image data if available
 */
export async function readClipboardImage(): Promise<ClipboardContent> {
  if (isInTauri()) {
    return invoke<ClipboardContent>('read_clipboard_image');
  }

  // Browser fallback using Clipboard API
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          const base64 = await blobToBase64(blob);
          return {
            content_type: 'image',
            data: base64,
            mime_type: type,
          };
        }
      }
    }
    // No image found, try text
    const text = await navigator.clipboard.readText();
    if (text) {
      return {
        content_type: 'text',
        data: text,
        mime_type: 'text/plain',
      };
    }
    return { content_type: 'empty' };
  } catch (error) {
    console.error('Clipboard read error:', error);
    return { content_type: 'empty' };
  }
}

/**
 * Read text from clipboard
 */
export async function readClipboardText(): Promise<string | null> {
  if (isInTauri()) {
    return invoke<string | null>('read_clipboard_text');
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/**
 * Write text to clipboard
 */
export async function writeClipboardText(text: string): Promise<void> {
  if (isInTauri()) {
    return invoke('write_clipboard_text', { text });
  }

  await navigator.clipboard.writeText(text);
}

/**
 * Check if clipboard has an image
 */
export async function clipboardHasImage(): Promise<boolean> {
  if (isInTauri()) {
    return invoke<boolean>('clipboard_has_image');
  }

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Convert blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64 data
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 to blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Convert base64 to data URL
 */
export function base64ToDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Handle paste event and extract image if present
 */
export async function handlePasteEvent(
  event: ClipboardEvent
): Promise<{ type: 'image' | 'text' | 'none'; data?: string; mimeType?: string }> {
  const items = event.clipboardData?.items;
  if (!items) {
    return { type: 'none' };
  }

  // Check for images first
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const base64 = await blobToBase64(file);
        return {
          type: 'image',
          data: base64,
          mimeType: item.type,
        };
      }
    }
  }

  // Check for text
  for (const item of Array.from(items)) {
    if (item.type === 'text/plain') {
      return new Promise((resolve) => {
        item.getAsString((text) => {
          resolve({
            type: 'text',
            data: text,
          });
        });
      });
    }
  }

  return { type: 'none' };
}
