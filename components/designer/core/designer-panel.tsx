'use client';

/**
 * DesignerPanel - compatibility wrapper around DesignerShell.
 */

import type { FrameworkType } from '@/lib/designer';
import { DesignerShell } from './designer-shell';

export interface DesignerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
  framework?: FrameworkType;
  onCodeChange?: (code: string) => void;
  onAIRequest?: (prompt: string, code: string) => Promise<string>;
  onSave?: (code: string) => void;
}

export function DesignerPanel({
  open,
  onOpenChange,
  initialCode,
  framework,
  onCodeChange,
  onAIRequest,
  onSave,
}: DesignerPanelProps) {
  return (
    <DesignerShell
      open={open}
      onOpenChange={onOpenChange}
      initialCode={initialCode}
      framework={framework}
      onCodeChange={onCodeChange}
      onAIRequest={onAIRequest}
      onSave={onSave}
    />
  );
}

export default DesignerPanel;
