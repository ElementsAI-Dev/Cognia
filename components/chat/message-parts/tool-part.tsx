'use client';

/**
 * ToolPart - Renders tool invocations with status and results
 */

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import type { ToolInvocationPart, ToolState } from '@/types/message';

interface ToolPartProps {
  part: ToolInvocationPart;
}

// Helper to format tool name for display
function formatToolName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Map our extended tool state to the AI SDK's expected states
function mapToolState(state: ToolState): 'input-streaming' | 'input-available' | 'output-available' | 'output-error' {
  switch (state) {
    case 'input-streaming':
      return 'input-streaming';
    case 'input-available':
    case 'approval-requested':
    case 'approval-responded':
      return 'input-available';
    case 'output-available':
      return 'output-available';
    case 'output-error':
    case 'output-denied':
      return 'output-error';
    default:
      return 'input-available';
  }
}

export function ToolPart({ part }: ToolPartProps) {
  return (
    <Tool defaultOpen={part.state !== 'output-available'}>
      <ToolHeader
        title={formatToolName(part.toolName)}
        type="tool-invocation"
        state={mapToolState(part.state)}
      />
      <ToolContent>
        <ToolInput input={part.args} />
        {(part.result || part.errorText) && (
          <ToolOutput output={part.result} errorText={part.errorText} />
        )}
      </ToolContent>
    </Tool>
  );
}
