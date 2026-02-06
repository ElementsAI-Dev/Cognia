'use client';

/**
 * A2UI Tool Output Renderer
 * Renders A2UI content from agent tool execution results
 */

import React, { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useA2UI } from '@/hooks/a2ui';
import { parseA2UIMessages, detectA2UIContent } from '@/lib/a2ui/parser';
import { A2UISurface } from './a2ui-surface';
import type { A2UIUserAction, A2UIDataModelChange, A2UIServerMessage } from '@/types/artifact/a2ui';

interface A2UIToolOutputProps {
  toolId: string;
  toolName: string;
  output: unknown;
  className?: string;
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
}

/**
 * Renders A2UI content from tool execution output
 */
export function A2UIToolOutput({
  toolId,
  toolName,
  output,
  className,
  onAction,
  onDataChange,
}: A2UIToolOutputProps) {
  const { processMessages, getSurface } = useA2UI({ onAction, onDataChange });

  // Parse A2UI messages from tool output
  const { surfaceId, messages } = useMemo(() => {
    // Handle string output
    if (typeof output === 'string') {
      if (!detectA2UIContent(output)) {
        return { surfaceId: null, messages: [] };
      }
      try {
        const parsed = JSON.parse(output);
        const result = parseA2UIMessages(parsed);
        if (result.success && result.messages.length > 0) {
          const firstMsg = result.messages.find((m) => 'surfaceId' in m);
          return {
            surfaceId: firstMsg ? (firstMsg as { surfaceId: string }).surfaceId : `tool-${toolId}`,
            messages: result.messages,
          };
        }
      } catch {
        return { surfaceId: null, messages: [] };
      }
    }

    // Handle object output that might be A2UI messages directly
    if (output && typeof output === 'object') {
      const result = parseA2UIMessages(output);
      if (result.success && result.messages.length > 0) {
        const firstMsg = result.messages.find((m) => 'surfaceId' in m);
        return {
          surfaceId: firstMsg ? (firstMsg as { surfaceId: string }).surfaceId : `tool-${toolId}`,
          messages: result.messages,
        };
      }
    }

    return { surfaceId: null, messages: [] };
  }, [output, toolId]);

  // Process the messages
  useEffect(() => {
    if (messages.length > 0) {
      processMessages(messages);
    }
  }, [messages, processMessages]);

  // Get the surface
  const surface = surfaceId ? getSurface(surfaceId) : null;

  // If no A2UI content, return null
  if (!surfaceId || !surface) {
    return null;
  }

  return (
    <div className={cn('a2ui-tool-output', className)}>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">{toolName}</span>
        <span>output</span>
      </div>
      <A2UISurface
        surfaceId={surfaceId}
        className="rounded-lg border bg-card"
        onAction={onAction}
        onDataChange={onDataChange}
      />
    </div>
  );
}

/**
 * Check if tool output contains A2UI content
 */
export function hasA2UIToolOutput(output: unknown): boolean {
  if (typeof output === 'string') {
    return detectA2UIContent(output);
  }
  if (output && typeof output === 'object') {
    const result = parseA2UIMessages(output);
    return result.success && result.messages.length > 0;
  }
  return false;
}

/**
 * Generic A2UI output wrapper for any structured data
 */
interface A2UIStructuredOutputProps {
  id: string;
  messages: A2UIServerMessage[];
  title?: string;
  className?: string;
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
}

export function A2UIStructuredOutput({
  id,
  messages,
  title,
  className,
  onAction,
  onDataChange,
}: A2UIStructuredOutputProps) {
  const { processMessages, getSurface } = useA2UI({ onAction, onDataChange });

  // Get surface ID from messages
  const surfaceId = useMemo(() => {
    const firstMsg = messages.find((m) => 'surfaceId' in m);
    return firstMsg ? (firstMsg as { surfaceId: string }).surfaceId : `output-${id}`;
  }, [messages, id]);

  // Process messages
  useEffect(() => {
    if (messages.length > 0) {
      processMessages(messages);
    }
  }, [messages, processMessages]);

  const surface = getSurface(surfaceId);

  if (!surface) {
    return null;
  }

  return (
    <div className={cn('a2ui-structured-output', className)}>
      {title && <h3 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h3>}
      <A2UISurface surfaceId={surfaceId} onAction={onAction} onDataChange={onDataChange} />
    </div>
  );
}
