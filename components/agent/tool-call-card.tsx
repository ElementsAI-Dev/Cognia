'use client';

/**
 * ToolCallCard - Displays a tool invocation with its result
 * Uses AI Elements Tool components
 */

import { useState } from 'react';
import type { ToolUIPart } from 'ai';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { cn } from '@/lib/utils';

interface ToolCallCardProps {
  tool: ToolUIPart;
  className?: string;
}

export function ToolCallCard({ tool, className }: ToolCallCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract tool name from type (e.g., "tool-invocation-web_search" -> "web_search")
  const toolName = tool.type.includes('-')
    ? tool.type.split('-').slice(-1)[0]
    : tool.type;

  return (
    <Tool
      className={cn('group', className)}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <ToolHeader title={formatToolName(toolName)} type={tool.type} state={tool.state} />
      <ToolContent>
        <ToolInput input={tool.input} />
        <ToolOutput output={tool.output} errorText={tool.errorText} />
      </ToolContent>
    </Tool>
  );
}

function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default ToolCallCard;
