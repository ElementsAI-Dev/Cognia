'use client';

/**
 * V0Designer - compatibility wrapper around DesignerShell.
 */

import type { FrameworkType } from '@/lib/designer';
import { DesignerShell } from './designer-shell';

interface V0DesignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
  framework?: FrameworkType;
  onCodeChange?: (code: string) => void;
  onSave?: (code: string) => void;
  onAIRequest?: (prompt: string, code: string) => Promise<string>;
}

export function V0Designer({
  open,
  onOpenChange,
  initialCode,
  framework,
  onCodeChange,
  onSave,
  onAIRequest,
}: V0DesignerProps) {
  return (
    <DesignerShell
      open={open}
      onOpenChange={onOpenChange}
      initialCode={initialCode}
      framework={framework}
      onCodeChange={onCodeChange}
      onSave={onSave}
      onAIRequest={onAIRequest}
    />
  );
}

export default V0Designer;
