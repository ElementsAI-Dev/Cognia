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
  Pencil,
  Save,
  X,
  FolderOpen,
  Maximize2,
  Minimize2,
  History,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArtifactPanelLoading } from '@/components/ui/loading-states';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <ArtifactPanelLoading />,
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
import type { Artifact as ArtifactType } from '@/types';
import { ArtifactPreview } from './artifact-preview';
import { ArtifactList } from './artifact-list';
import { createEditorOptions, getMonacoTheme, getMonacoLanguage } from '@/lib/monaco';
import {
  getShikiLanguage as getShikiLang,
  getArtifactExtension,
  canPreview,
  canDesign,
  MERMAID_TYPE_NAMES,
  DESIGNABLE_TYPES,
} from '@/lib/artifacts';
import { getArtifactTypeIcon } from './artifact-icons';

// Use centralized language mapping
function getShikiLanguage(lang?: string): BundledLanguage {
  return getShikiLang(lang) as BundledLanguage;
}

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Version history integration
  const saveArtifactVersion = useArtifactStore((state) => state.saveArtifactVersion);
  const restoreArtifactVersion = useArtifactStore((state) => state.restoreArtifactVersion);
  const getArtifactVersions = useArtifactStore((state) => state.getArtifactVersions);

  const versions = activeArtifact ? getArtifactVersions(activeArtifact.id) : [];

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
      saveArtifactVersion(activeArtifact.id, 'Before edit');
      updateArtifact(activeArtifact.id, { content: editContent });
      setHasChanges(false);
      setViewMode('code');
    }
  }, [activeArtifact, editContent, hasChanges, updateArtifact, saveArtifactVersion]);

  const handleRestoreVersion = useCallback((versionId: string) => {
    if (activeArtifact) {
      restoreArtifactVersion(activeArtifact.id, versionId);
      setShowVersionHistory(false);
    }
  }, [activeArtifact, restoreArtifactVersion]);

  const handleSaveVersion = useCallback(() => {
    if (activeArtifact) {
      saveArtifactVersion(activeArtifact.id, `Manual save v${activeArtifact.version}`);
    }
  }, [activeArtifact, saveArtifactVersion]);

  const handleCancelEdit = useCallback(() => {
    setViewMode('code');
    setHasChanges(false);
  }, []);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      setEditContent(value || '');
      setHasChanges(value !== activeArtifact?.content);
    },
    [activeArtifact?.content]
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

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

  const isPreviewable = activeArtifact ? canPreview(activeArtifact.type) : false;
  const isDesignable = activeArtifact ? canDesign(activeArtifact.type) : false;

  const panelWidth = isFullscreen
    ? 'w-full sm:w-full sm:max-w-full'
    : 'w-full sm:w-[600px] sm:max-w-[600px]';

  return (
    <Sheet
      open={panelOpen && panelView === 'artifact'}
      onOpenChange={(open) => !open && closePanel()}
    >
      <SheetContent side="right" className={`${panelWidth} p-0 transition-all duration-200`}>
        <SheetTitle className="sr-only">{t('sheetTitle')}</SheetTitle>
        {activeArtifact ? (
          <Artifact className="h-full border-0 rounded-none">
            <ArtifactHeader>
              <div className="flex items-center gap-2">
                {getArtifactTypeIcon(activeArtifact.type)}
                <div>
                  <ArtifactTitle>{activeArtifact.title}</ArtifactTitle>
                  <span className="text-xs text-muted-foreground">
                    v{activeArtifact.version} · {activeArtifact.language || activeArtifact.type}
                    {activeArtifact.type === 'mermaid' && (() => {
                      const match = activeArtifact.content.match(/^(\w+)/m);
                      const diagramType = match ? MERMAID_TYPE_NAMES[match[1]] : null;
                      return diagramType ? ` · ${diagramType}` : '';
                    })()}
                    {DESIGNABLE_TYPES.includes(activeArtifact.type) ? ' · Designable' : ''}
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
                    <Tabs
                      value={viewMode}
                      onValueChange={(v) => setViewMode(v as 'code' | 'preview')}
                    >
                      <TabsList className="h-8">
                        <TabsTrigger value="code" className="text-xs px-2">
                          {t('code')}
                        </TabsTrigger>
                        {isPreviewable && (
                          <TabsTrigger value="preview" className="text-xs px-2">
                            {t('preview')}
                          </TabsTrigger>
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
                    <ArtifactAction
                      tooltip={t('versionHistory')}
                      icon={History}
                      onClick={() => setShowVersionHistory(!showVersionHistory)}
                    />
                    <ArtifactAction
                      tooltip={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
                      icon={isFullscreen ? Minimize2 : Maximize2}
                      onClick={toggleFullscreen}
                    />
                    {isDesignable && (
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
                  language={getMonacoLanguage(activeArtifact.language || 'plaintext')}
                  theme={getMonacoTheme(theme)}
                  value={editContent}
                  onChange={handleEditorChange}
                  options={createEditorOptions('code', {
                    minimap: { enabled: isFullscreen },
                    wordWrap: 'on',
                    readOnly: false,
                    stickyScroll: { enabled: isFullscreen },
                    bracketPairColorization: { enabled: true },
                    guides: {
                      indentation: true,
                      bracketPairs: true,
                    },
                  })}
                />
              ) : viewMode === 'code' || !isPreviewable ? (
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

            {/* Version History Panel */}
            {showVersionHistory && (
              <div className="border-t bg-muted/30 max-h-[200px] overflow-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    {t('versionHistory')}
                  </h4>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSaveVersion}>
                    <Save className="h-3 w-3 mr-1" />
                    {t('saveVersion')}
                  </Button>
                </div>
                {versions.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-4 py-3">{t('noVersions')}</p>
                ) : (
                  <div className="divide-y">
                    {versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between px-4 py-2 text-xs hover:bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{version.changeDescription || `v${version.version}`}</p>
                          <p className="text-muted-foreground">
                            {version.createdAt instanceof Date
                              ? version.createdAt.toLocaleString()
                              : new Date(version.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs shrink-0 ml-2"
                          onClick={() => handleRestoreVersion(version.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {t('restoreVersion')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Artifact>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-medium">{t('recentArtifacts')}</h3>
            </div>
            <ArtifactList className="flex-1" maxHeight="100%" />
          </div>
        )}

        {/* Designer Panel */}
        {activeArtifact && isDesignable && (
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
  return getArtifactExtension(artifact.type, artifact.language);
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
