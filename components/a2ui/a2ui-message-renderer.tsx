'use client';

/**
 * A2UI Message Renderer
 * Detects and renders A2UI content within chat messages
 */

import React, { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useA2UI } from '@/hooks/a2ui';
import { detectA2UIContent, extractA2UIFromResponse } from '@/lib/a2ui/parser';
import { A2UIInlineSurface } from './a2ui-surface';
import type { A2UIUserAction, A2UIDataModelChange } from '@/types/artifact/a2ui';

interface A2UIMessageRendererProps {
  content: string;
  messageId: string;
  className?: string;
  textRenderer?: (text: string) => React.ReactNode;
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
}

/**
 * Renders A2UI content embedded in a chat message
 * Automatically detects and parses A2UI JSON from the message content
 * Also renders text content alongside A2UI when present
 */
export function A2UIMessageRenderer({
  content,
  messageId,
  className,
  textRenderer,
  onAction,
  onDataChange,
}: A2UIMessageRendererProps) {
  const { extractAndProcess, getSurface } = useA2UI({ onAction, onDataChange });

  // Detect if content has A2UI
  const hasA2UI = useMemo(() => detectA2UIContent(content), [content]);

  // Extract and process A2UI content from the message
  const a2uiResult = useMemo(() => {
    if (!hasA2UI) {
      return null;
    }
    return extractA2UIFromResponse(content);
  }, [content, hasA2UI]);

  // Extract non-A2UI text content
  const textContent = useMemo(() => {
    if (!hasA2UI) return content;

    // Remove JSON code blocks that contain A2UI content
    let text = content;
    const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
      if (detectA2UIContent(match[1])) {
        text = text.replace(match[0], '');
      }
    }

    return text.trim();
  }, [content, hasA2UI]);

  // Process the A2UI messages when detected
  useEffect(() => {
    if (a2uiResult) {
      extractAndProcess(content);
    }
  }, [a2uiResult, content, extractAndProcess]);

  // Generate a surface ID based on message ID
  const surfaceId = a2uiResult?.surfaceId || `msg-${messageId}`;
  const surface = hasA2UI ? getSurface(surfaceId) : null;

  // If no A2UI content and no text, return null
  if (!hasA2UI && !textContent) {
    return null;
  }

  // If only text content (no A2UI), render text only
  if (!hasA2UI || !surface) {
    if (!textContent) return null;
    return (
      <div className={cn('a2ui-message-content', className)}>
        <div className="message-text">{textRenderer ? textRenderer(textContent) : textContent}</div>
      </div>
    );
  }

  // Render both text and A2UI content
  return (
    <div className={cn('a2ui-message-content space-y-3', className)}>
      {textContent && (
        <div className="message-text">{textRenderer ? textRenderer(textContent) : textContent}</div>
      )}
      <A2UIInlineSurface surfaceId={surfaceId} onAction={onAction} onDataChange={onDataChange} />
    </div>
  );
}

/**
 * Check if a message contains A2UI content
 */
export function hasA2UIContent(content: string): boolean {
  return detectA2UIContent(content);
}

/**
 * Hook to integrate A2UI with chat messages
 */
export function useA2UIMessageIntegration(options?: {
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
}) {
  const a2ui = useA2UI(options);

  const processMessage = (content: string, messageId: string) => {
    if (detectA2UIContent(content)) {
      const surfaceId = a2ui.extractAndProcess(content);
      return surfaceId || `msg-${messageId}`;
    }
    return null;
  };

  const renderA2UIContent = (surfaceId: string) => {
    const surface = a2ui.getSurface(surfaceId);
    if (!surface) return null;

    return (
      <A2UIInlineSurface
        surfaceId={surfaceId}
        onAction={options?.onAction}
        onDataChange={options?.onDataChange}
      />
    );
  };

  return {
    ...a2ui,
    processMessage,
    renderA2UIContent,
    hasA2UIContent: detectA2UIContent,
  };
}
