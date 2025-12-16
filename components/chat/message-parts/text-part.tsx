'use client';

/**
 * TextPart - Renders text content with markdown support
 */

import { MessageResponse } from '@/components/ai-elements/message';
import type { TextPart as TextPartType } from '@/types/message';

interface TextPartProps {
  part: TextPartType;
  isError?: boolean;
}

export function TextPart({ part, isError }: TextPartProps) {
  return (
    <MessageResponse className={isError ? 'text-destructive' : undefined}>
      {part.content}
    </MessageResponse>
  );
}
