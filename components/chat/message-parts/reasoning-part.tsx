'use client';

/**
 * ReasoningPart - Renders AI reasoning/thinking process
 */

import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning';
import type { ReasoningPart as ReasoningPartType } from '@/types/message';

interface ReasoningPartProps {
  part: ReasoningPartType;
}

export function ReasoningPart({ part }: ReasoningPartProps) {
  return (
    <Reasoning isStreaming={part.isStreaming} duration={part.duration}>
      <ReasoningTrigger />
      <ReasoningContent>{part.content}</ReasoningContent>
    </Reasoning>
  );
}
