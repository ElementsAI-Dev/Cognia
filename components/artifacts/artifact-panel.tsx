'use client';

/**
 * ArtifactPanel - Side panel for displaying and managing artifacts
 * Similar to Claude's artifact panel
 */

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
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
import { FileCode } from 'lucide-react';
import { Palette } from 'lucide-react';
import type { BundledLanguage } from 'shiki';
import { ArtifactPreview } from './artifact-preview';
import { ArtifactList } from './artifact-list';
import { PanelVersionHistory } from './panel-version-history';
import { ArtifactDesignerWrapper } from './panel-designer-wrapper';
import { createEditorOptions, getMonacoTheme, getMonacoLanguage } from '@/lib/monaco';
import {
  getShikiLanguage as getShikiLang,
  MERMAID_TYPE_NAMES,
  DESIGNABLE_TYPES,
} from '@/lib/artifacts';
import { getArtifactTypeIcon } from './artifact-icons';
import { useArtifactPanelState } from '@/hooks/artifacts';
import { useSettingsStore } from '@/stores';
import {
  bindMonacoEditorContext,
  type MonacoContextBinding,
} from '@/lib/editor-workbench/monaco-context-binding';
import { isEditorFeatureFlagEnabled } from '@/lib/editor-workbench/feature-flags';

// Use centralized language mapping
function getShikiLanguage(lang?: string): BundledLanguage {
  return getShikiLang(lang) as BundledLanguage;
}

export function ArtifactPanel() {
  const workbenchBindingRef = useRef<MonacoContextBinding | null>(null);
  const globalEditorSettings = useSettingsStore((state) => state.editorSettings);
  const {
    t,
    tCommon,
    panelOpen,
    panelView,
    activeArtifact,
    theme,
    isDesktop,
    viewMode,
    setViewMode,
    copied,
    designerOpen,
    setDesignerOpen,
    editContent,
    hasChanges,
    isFullscreen,
    showVersionHistory,
    setShowVersionHistory,
    lastDownloadPath,
    isPreviewable,
    isDesignable,
    panelWidth,
    closePanel,
    handleOpenInCanvas,
    handleEditMode,
    handleSaveEdit,
    handleCancelEdit,
    handleEditorChange,
    toggleFullscreen,
    handleCopy,
    handleDownload,
    handleRevealInExplorer,
  } = useArtifactPanelState();

  useEffect(() => {
    return () => {
      workbenchBindingRef.current?.dispose();
      workbenchBindingRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (viewMode !== 'edit') {
      workbenchBindingRef.current?.dispose();
      workbenchBindingRef.current = null;
    }
  }, [viewMode]);

  useEffect(() => {
    if (!activeArtifact) {
      return;
    }
    workbenchBindingRef.current?.update({
      languageId: getMonacoLanguage(activeArtifact.language || 'plaintext'),
    });
  }, [activeArtifact]);

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
                  onMount={(editor) => {
                    if (!isEditorFeatureFlagEnabled('editor.workbench.v2')) {
                      return;
                    }
                    workbenchBindingRef.current?.dispose();
                    workbenchBindingRef.current = bindMonacoEditorContext({
                      contextId: 'artifact',
                      label: 'Artifact Editor',
                      languageId: getMonacoLanguage(activeArtifact.language || 'plaintext'),
                      editor,
                      fallbackReason: 'Using Monaco built-in providers',
                    });
                  }}
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
                  }, {
                    editorSettings: globalEditorSettings,
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
              <PanelVersionHistory
                artifact={activeArtifact}
                onVersionRestored={() => setShowVersionHistory(false)}
              />
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

