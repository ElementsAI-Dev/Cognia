'use client';

/**
 * ArtifactPanel - Side panel for displaying and managing artifacts
 * Similar to Claude's artifact panel
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
  BookOpen,
  FolderOpen,
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
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
import { useArtifactStore, useSettingsStore, useNativeStore } from '@/stores';
import { FileCode } from 'lucide-react';
import { opener } from '@/lib/native';
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
  jupyter: <BookOpen className="h-4 w-4" />,
};

export function ArtifactPanel() {
  const t = useTranslations('artifacts');
  const tCommon = useTranslations('common');
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

  const isDesktop = useNativeStore((state) => state.isDesktop);
  const [lastDownloadPath, setLastDownloadPath] = useState<string | null>(null);

  const handleDownload = () => {
    if (activeArtifact) {
      const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `${activeArtifact.title}.${getExtension(activeArtifact)}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Track download path for reveal functionality (downloads folder)
      if (isDesktop) {
        setLastDownloadPath(filename);
      }
    }
  };

  const handleRevealInExplorer = async () => {
    if (!isDesktop || !lastDownloadPath) return;
    // Note: Browser downloads go to default downloads folder
    // We can open the downloads folder but not select the specific file
    // since we don't have the exact path from browser download API
    await opener.openUrl('file:///');
  };

  const canPreview = activeArtifact?.type === 'html' ||
                     activeArtifact?.type === 'react' ||
                     activeArtifact?.type === 'svg' ||
                     activeArtifact?.type === 'mermaid' ||
                     activeArtifact?.type === 'chart' ||
                     activeArtifact?.type === 'math' ||
                     activeArtifact?.type === 'document' ||
                     activeArtifact?.type === 'jupyter';
  
  // Designer is only available for HTML/React/SVG
  const canDesign = activeArtifact?.type === 'html' ||
                    activeArtifact?.type === 'react' ||
                    activeArtifact?.type === 'svg';

  return (
    <Sheet open={panelOpen && panelView === 'artifact'} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] p-0">
        <SheetTitle className="sr-only">Artifact Panel</SheetTitle>
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
                      {tCommon('cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={!hasChanges}
                      className="h-8 px-2 text-xs"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {tCommon('save')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'code' | 'preview')}>
                      <TabsList className="h-8">
                        <TabsTrigger value="code" className="text-xs px-2">{t('code')}</TabsTrigger>
                        {canPreview && (
                          <TabsTrigger value="preview" className="text-xs px-2">{t('preview')}</TabsTrigger>
                        )}
                      </TabsList>
                    </Tabs>
                    <ArtifactAction
                      tooltip={tCommon('edit')}
                      icon={Pencil}
                      onClick={handleEditMode}
                    />
                    <ArtifactAction
                      tooltip={copied ? tCommon('copied') : tCommon('copy')}
                      icon={Copy}
                      onClick={handleCopy}
                    />
                    <ArtifactAction
                      tooltip={t('download')}
                      icon={Download}
                      onClick={handleDownload}
                    />
                    {isDesktop && lastDownloadPath && (
                      <ArtifactAction
                        tooltip={t('revealInExplorer')}
                        icon={FolderOpen}
                        onClick={handleRevealInExplorer}
                      />
                    )}
                    <ArtifactAction
                      tooltip={t('editInCanvas')}
                      icon={FileCode}
                      onClick={handleOpenInCanvas}
                    />
                    {canDesign && (
                      <>
                        <ArtifactAction
                          tooltip={t('previewInDesigner')}
                          icon={Palette}
                          onClick={() => setDesignerOpen(true)}
                        />
                        <ArtifactAction
                          tooltip={t('openFullDesigner')}
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
            <p>{t('noArtifact')}</p>
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
    jupyter: 'ipynb',
  };
  return extensions[artifact.type] || 'txt';
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
