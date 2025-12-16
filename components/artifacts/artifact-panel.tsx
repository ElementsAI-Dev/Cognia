'use client';

/**
 * ArtifactPanel - Side panel for displaying and managing artifacts
 * Similar to Claude's artifact panel
 */

import { useState } from 'react';
import {
  Copy,
  Download,
  ExternalLink,
  Code,
  FileText,
  Image as ImageIcon,
  BarChart,
  Pencil,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
  ArtifactClose,
} from '@/components/ai-elements/artifact';
import { CodeBlock } from '@/components/ai-elements/code-block';
import { useArtifactStore } from '@/stores';
import { V0Designer } from '@/components/designer';
import type { BundledLanguage } from 'shiki';
import type { Artifact as ArtifactType, ArtifactType as ArtType } from '@/types';
import { ArtifactPreview } from './artifact-preview';

// Map artifact languages to shiki languages
function getShikiLanguage(lang?: string): BundledLanguage {
  const languageMap: Record<string, BundledLanguage> = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'markdown',
    jsx: 'jsx',
    tsx: 'tsx',
    sql: 'sql',
    bash: 'bash',
    yaml: 'yaml',
    xml: 'xml',
    svg: 'xml',
    mermaid: 'markdown',
    latex: 'latex',
  };
  return languageMap[lang || ''] || 'text';
}

const typeIcons: Record<ArtType, React.ReactNode> = {
  code: <Code className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  svg: <ImageIcon className="h-4 w-4" />,
  html: <Code className="h-4 w-4" />,
  react: <Code className="h-4 w-4" />,
  mermaid: <BarChart className="h-4 w-4" />,
  chart: <BarChart className="h-4 w-4" />,
  math: <FileText className="h-4 w-4" />,
};

export function ArtifactPanel() {
  const panelOpen = useArtifactStore((state) => state.panelOpen);
  const panelView = useArtifactStore((state) => state.panelView);
  const closePanel = useArtifactStore((state) => state.closePanel);
  const activeArtifactId = useArtifactStore((state) => state.activeArtifactId);
  const artifacts = useArtifactStore((state) => state.artifacts);
  const activeArtifact = activeArtifactId ? artifacts[activeArtifactId] : null;
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);

  const handleCopy = async () => {
    if (activeArtifact) {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (activeArtifact) {
      const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeArtifact.title}.${getExtension(activeArtifact)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const canPreview = activeArtifact?.type === 'html' ||
                     activeArtifact?.type === 'react' ||
                     activeArtifact?.type === 'svg';

  return (
    <Sheet open={panelOpen && panelView === 'artifact'} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] p-0">
        {activeArtifact ? (
          <Artifact className="h-full border-0 rounded-none">
            <ArtifactHeader>
              <div className="flex items-center gap-2">
                {typeIcons[activeArtifact.type]}
                <div>
                  <ArtifactTitle>{activeArtifact.title}</ArtifactTitle>
                  <span className="text-xs text-muted-foreground">
                    v{activeArtifact.version} · {activeArtifact.language || activeArtifact.type}
                  </span>
                </div>
              </div>
              <ArtifactActions>
                {canPreview && (
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'code' | 'preview')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="code" className="text-xs px-2">Code</TabsTrigger>
                      <TabsTrigger value="preview" className="text-xs px-2">Preview</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
                <ArtifactAction
                  tooltip={copied ? 'Copied!' : 'Copy'}
                  icon={Copy}
                  onClick={handleCopy}
                />
                <ArtifactAction
                  tooltip="Download"
                  icon={Download}
                  onClick={handleDownload}
                />
                {canPreview && (
                  <>
                    <ArtifactAction
                      tooltip="Open in Designer"
                      icon={Pencil}
                      onClick={() => setDesignerOpen(true)}
                    />
                    <ArtifactAction
                      tooltip="Open in new tab"
                      icon={ExternalLink}
                      onClick={() => openInNewTab(activeArtifact)}
                    />
                  </>
                )}
                <ArtifactClose onClick={closePanel} />
              </ArtifactActions>
            </ArtifactHeader>
            <ArtifactContent className="p-0 flex-1 overflow-hidden">
              {viewMode === 'code' || !canPreview ? (
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <CodeBlock
                      code={activeArtifact.content}
                      language={getShikiLanguage(activeArtifact.language)}
                    />
                  </div>
                </ScrollArea>
              ) : (
                <ArtifactPreview artifact={activeArtifact} />
              )}
            </ArtifactContent>
          </Artifact>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>No artifact selected</p>
          </div>
        )}

        {/* Designer Panel */}
        {activeArtifact && canPreview && (
          <ArtifactDesignerWrapper
            artifact={activeArtifact}
            open={designerOpen}
            onOpenChange={setDesignerOpen}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function getExtension(artifact: ArtifactType): string {
  const extensions: Record<ArtType, string> = {
    code: artifact.language || 'txt',
    document: 'md',
    svg: 'svg',
    html: 'html',
    react: 'tsx',
    mermaid: 'mmd',
    chart: 'json',
    math: 'tex',
  };
  return extensions[artifact.type] || 'txt';
}

function openInNewTab(artifact: ArtifactType) {
  if (artifact.type === 'html' || artifact.type === 'svg') {
    const blob = new Blob([artifact.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } else if (artifact.type === 'react') {
    // For React, wrap in basic HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${artifact.content}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

// Designer Panel integration
function ArtifactDesignerWrapper({
  artifact,
  open,
  onOpenChange,
}: {
  artifact: ArtifactType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateArtifact = useArtifactStore((state) => state.updateArtifact);

  const handleCodeChange = (newCode: string) => {
    updateArtifact(artifact.id, { content: newCode });
  };

  return (
    <V0Designer
      open={open}
      onOpenChange={onOpenChange}
      initialCode={artifact.content}
      onCodeChange={handleCodeChange}
    />
  );
}

export default ArtifactPanel;
