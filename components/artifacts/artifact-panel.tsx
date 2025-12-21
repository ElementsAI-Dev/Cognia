'use client';

/**
 * ArtifactPanel - Side panel for displaying and managing artifacts
 * Similar to Claude's artifact panel
 */

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Copy,
  Download,
  ExternalLink,
  Code,
  FileText,
  Image as ImageIcon,
  BarChart,
  Pencil,
  Save,
  X,
  GitBranch,
  Calculator,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});
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
import { useArtifactStore, useSettingsStore } from '@/stores';
import { FileCode } from 'lucide-react';
import { V0Designer } from '@/components/designer';
import { Palette } from 'lucide-react';
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
  react: <Sparkles className="h-4 w-4" />,
  mermaid: <GitBranch className="h-4 w-4" />,
  chart: <BarChart className="h-4 w-4" />,
  math: <Calculator className="h-4 w-4" />,
};

export function ArtifactPanel() {
  const panelOpen = useArtifactStore((state) => state.panelOpen);
  const panelView = useArtifactStore((state) => state.panelView);
  const closePanel = useArtifactStore((state) => state.closePanel);
  const activeArtifactId = useArtifactStore((state) => state.activeArtifactId);
  const artifacts = useArtifactStore((state) => state.artifacts);
  const updateArtifact = useArtifactStore((state) => state.updateArtifact);
  const activeArtifact = activeArtifactId ? artifacts[activeArtifactId] : null;
  
  const theme = useSettingsStore((state) => state.theme);
  
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'edit'>('code');
  const [copied, setCopied] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Canvas integration
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openPanel = useArtifactStore((state) => state.openPanel);

  // Open artifact in Canvas for detailed editing
  const handleOpenInCanvas = useCallback(() => {
    if (activeArtifact) {
      const docId = createCanvasDocument({
        title: activeArtifact.title,
        content: activeArtifact.content,
        language: activeArtifact.language || 'javascript',
        type: 'code',
      });
      setActiveCanvas(docId);
      openPanel('canvas');
    }
  }, [activeArtifact, createCanvasDocument, setActiveCanvas, openPanel]);

  // Initialize edit content when switching to edit mode
  const handleEditMode = useCallback(() => {
    if (activeArtifact) {
      setEditContent(activeArtifact.content);
      setHasChanges(false);
      setViewMode('edit');
    }
  }, [activeArtifact]);

  const handleSaveEdit = useCallback(() => {
    if (activeArtifact && hasChanges) {
      updateArtifact(activeArtifact.id, { content: editContent });
      setHasChanges(false);
      setViewMode('code');
    }
  }, [activeArtifact, editContent, hasChanges, updateArtifact]);

  const handleCancelEdit = useCallback(() => {
    setViewMode('code');
    setHasChanges(false);
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setEditContent(value || '');
    setHasChanges(value !== activeArtifact?.content);
  }, [activeArtifact?.content]);

  const getEditorTheme = () => {
    if (theme === 'dark') return 'vs-dark';
    if (theme === 'light') return 'light';
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'vs-dark'
        : 'light';
    }
    return 'light';
  };

  const getEditorLanguage = () => {
    if (!activeArtifact) return 'plaintext';
    const languageMap: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      python: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'markdown',
      jsx: 'javascript',
      tsx: 'typescript',
      sql: 'sql',
      bash: 'shell',
      yaml: 'yaml',
      xml: 'xml',
      svg: 'xml',
      mermaid: 'markdown',
      latex: 'latex',
    };
    return languageMap[activeArtifact.language || ''] || 'plaintext';
  };

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
                     activeArtifact?.type === 'svg' ||
                     activeArtifact?.type === 'mermaid' ||
                     activeArtifact?.type === 'chart' ||
                     activeArtifact?.type === 'math' ||
                     activeArtifact?.type === 'document';
  
  // Designer is only available for HTML/React/SVG
  const canDesign = activeArtifact?.type === 'html' ||
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
                {viewMode === 'edit' ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8 px-2 text-xs"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={!hasChanges}
                      className="h-8 px-2 text-xs"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'code' | 'preview')}>
                      <TabsList className="h-8">
                        <TabsTrigger value="code" className="text-xs px-2">Code</TabsTrigger>
                        {canPreview && (
                          <TabsTrigger value="preview" className="text-xs px-2">Preview</TabsTrigger>
                        )}
                      </TabsList>
                    </Tabs>
                    <ArtifactAction
                      tooltip="Edit"
                      icon={Pencil}
                      onClick={handleEditMode}
                    />
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
                    <ArtifactAction
                      tooltip="Edit in Canvas"
                      icon={FileCode}
                      onClick={handleOpenInCanvas}
                    />
                    {canDesign && (
                      <>
                        <ArtifactAction
                          tooltip="Preview in Designer"
                          icon={Palette}
                          onClick={() => setDesignerOpen(true)}
                        />
                        <ArtifactAction
                          tooltip="Open Full Designer"
                          icon={ExternalLink}
                          onClick={() => {
                            const key = `designer-code-${Date.now()}`;
                            sessionStorage.setItem(key, activeArtifact.content);
                            window.open(`/designer?key=${key}`, '_blank');
                          }}
                        />
                      </>
                    )}
                  </>
                )}
                <ArtifactClose onClick={closePanel} />
              </ArtifactActions>
            </ArtifactHeader>
            <ArtifactContent className="p-0 flex-1 overflow-hidden">
              {viewMode === 'edit' ? (
                <MonacoEditor
                  height="100%"
                  language={getEditorLanguage()}
                  theme={getEditorTheme()}
                  value={editContent}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              ) : viewMode === 'code' || !canPreview ? (
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
        {activeArtifact && canDesign && (
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

function _openInNewTab(artifact: ArtifactType) {
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
