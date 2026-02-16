'use client';

/**
 * MessagePartsRenderer — dispatches structured message parts (text, reasoning,
 * tool-invocation, sources, A2UI) to their specialised renderers.
 *
 * When `parts` is empty or absent, the plain `content` string is rendered inside
 * a {@link MessageResponse} wrapper.
 *
 * @module message-parts/message-parts-renderer
 */

import React from 'react';
import { MessageResponse } from '@/components/ai-elements/message';
import { TextPart } from './text-part';
import { ReasoningPart } from './reasoning-part';
import { ToolPart } from './tool-part';
import { SourcesPart } from './sources-part';
import { A2UIPart } from './a2ui-part';
import type { MessagePart } from '@/types/core/message';

/**
 * Props for the {@link MessagePartsRenderer} component.
 */
export interface MessagePartsRendererProps {
  /** Structured message parts (text, reasoning, tool-invocation, sources, a2ui). When empty, `content` is rendered directly. */
  parts?: MessagePart[];
  /** Raw string content to display when `parts` is empty or as a fallback. */
  content: string;
  /** When `true`, applies destructive (red) styling to the text. */
  isError?: boolean;
}

/**
 * Render a message's content, choosing between raw text and structured parts.
 *
 * When `parts` is provided and non-empty each part is rendered by its
 * specialised renderer ({@link TextPart}, {@link ReasoningPart},
 * {@link ToolPart}, {@link SourcesPart}, {@link A2UIPart}).
 * Otherwise the plain `content` string is wrapped in a {@link MessageResponse}.
 */
export function MessagePartsRenderer({ parts, content, isError }: MessagePartsRendererProps) {
  // If no parts, render content directly
  if (!parts || parts.length === 0) {
    return (
      <MessageResponse className={isError ? 'text-destructive' : undefined}>
        {content}
      </MessageResponse>
    );
  }

  // Render each part based on its type
  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        switch (part.type) {
          case 'text':
            return <TextPart key={`text-${index}`} part={part} isError={isError} />;
          case 'reasoning':
            return <ReasoningPart key={`reasoning-${index}`} part={part} />;
          case 'tool-invocation':
            return (
              <ToolPart
                key={`tool-${part.toolCallId}`}
                part={part}
                serverId={part.mcpServerId}
                serverName={part.mcpServerName}
              />
            );
          case 'sources':
            return <SourcesPart key={`sources-${index}`} part={part} />;
          case 'a2ui':
            return <A2UIPart key={`a2ui-${index}`} part={part} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
