'use client';

/**
 * A2UIPart - Renders A2UI interactive surfaces within chat messages
 * Detects and processes A2UI content from AI responses
 */

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useA2UI } from '@/hooks/a2ui';
import { A2UIInlineSurface, hasA2UIContent } from '@/components/a2ui';
import type { A2UIPart as A2UIPartType } from '@/types/core/message';
import type { A2UIUserAction, A2UIDataModelChange } from '@/types/artifact/a2ui';

interface A2UIPartProps {
  part: A2UIPartType;
  _messageId?: string;
  className?: string;
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
}

export function A2UIPart({
  part,
  className,
  onAction,
  onDataChange,
}: A2UIPartProps) {
  const { extractAndProcess, getSurface } = useA2UI({ onAction, onDataChange });

  // Process A2UI content when the part is rendered
  useEffect(() => {
    if (part.content && hasA2UIContent(part.content)) {
      extractAndProcess(part.content);
    }
  }, [part.content, extractAndProcess]);

  // Get the surface
  const surface = getSurface(part.surfaceId);

  // If no surface yet, return null (will render after processing)
  if (!surface) {
    return null;
  }

  return (
    <div className={cn('a2ui-part my-2', className)}>
      <A2UIInlineSurface
        surfaceId={part.surfaceId}
        onAction={onAction}
        onDataChange={onDataChange}
      />
    </div>
  );
}

export default A2UIPart;
