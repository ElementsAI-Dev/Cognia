'use client';

import { useTranslations } from 'next-intl';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import type { DesignerMode } from '@/types/designer';
import type { FrameworkType } from '@/lib/designer';
import { MonacoSandpackEditor } from '../editor/monaco-sandpack-editor';
import { ReactSandbox } from '../editor/react-sandbox';
import { DesignerPreview } from '../preview/designer-preview';

interface DesignerMainWorkspaceProps {
  mode: DesignerMode;
  framework?: FrameworkType;
  className?: string;
  onCodeChange?: (code: string) => void;
  onRequestAIEdit?: () => void;
}

/**
 * Shared workspace renderer to keep main designer behavior consistent
 * across /designer page and embedded designer panel.
 */
export function DesignerMainWorkspace({
  mode,
  framework = 'react',
  className,
  onCodeChange,
  onRequestAIEdit,
}: DesignerMainWorkspaceProps) {
  const t = useTranslations('designer');

  if (mode === 'code') {
    return (
      <ResizablePanelGroup direction="horizontal" className={cn('h-full min-h-0', className)}>
        <ResizablePanel defaultSize={55} minSize={30}>
          <MonacoSandpackEditor
            onSave={(savedCode) => onCodeChange?.(savedCode ?? '')}
            showStatusBar
            showToolbar
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={25}>
          <ReactSandbox
            onCodeChange={onCodeChange}
            showEditor={false}
            showPreview
            showFileExplorer
            showConsole={false}
            framework={framework}
            onAIEdit={onRequestAIEdit}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  if (mode === 'preview') {
    return (
      <div className={cn('h-full min-h-0 flex flex-col', className)}>
        <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/20">
          {t('previewReady')}
        </div>
        <ReactSandbox
          onCodeChange={onCodeChange}
          showEditor={false}
          showPreview
          showFileExplorer={false}
          showConsole={false}
          framework={framework}
          onAIEdit={onRequestAIEdit}
          className="flex-1 min-h-0"
        />
      </div>
    );
  }

  return <DesignerPreview className={cn('h-full min-h-0', className)} />;
}

export default DesignerMainWorkspace;
