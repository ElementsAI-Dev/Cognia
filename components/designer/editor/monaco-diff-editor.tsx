'use client';

/**
 * MonacoDiffEditor - Side-by-side or inline diff comparison editor
 * Uses Monaco's built-in diff editor with MONACO_DIFF_OPTIONS configuration
 * Provides VSCode-like code comparison experience
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  Columns2,
  AlignJustify,
  RotateCcw,
  FileCode,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import {
  MONACO_DIFF_OPTIONS,
  getMonacoTheme,
  getMonacoLanguage,
} from '@/lib/monaco';
import { setupTypeScript } from '@/lib/monaco/typescript-config';
import type * as Monaco from 'monaco-editor';

interface MonacoDiffEditorProps {
  className?: string;
  originalCode: string;
  modifiedCode: string;
  language?: string;
  originalLabel?: string;
  modifiedLabel?: string;
  readOnly?: boolean;
  onModifiedChange?: (code: string) => void;
}

interface DiffStats {
  additions: number;
  deletions: number;
  changes: number;
}

export function MonacoDiffEditor({
  className,
  originalCode,
  modifiedCode,
  language = 'typescript',
  originalLabel,
  modifiedLabel,
  readOnly = false,
  onModifiedChange,
}: MonacoDiffEditorProps) {
  const t = useTranslations('sandboxEditor');
  const editorRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<Monaco.editor.IStandaloneDiffEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sideBySide, setSideBySide] = useState(true);
  const [diffStats, setDiffStats] = useState<DiffStats>({ additions: 0, deletions: 0, changes: 0 });
  const typescriptConfiguredRef = useRef(false);

  const theme = useSettingsStore((state) => state.theme);

  // Calculate diff statistics
  const updateDiffStats = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) return;

    const lineChanges = diffEditor.getLineChanges();
    if (!lineChanges) {
      setDiffStats({ additions: 0, deletions: 0, changes: 0 });
      return;
    }

    let additions = 0;
    let deletions = 0;
    let changes = 0;

    for (const change of lineChanges) {
      if (change.originalStartLineNumber === 0 || change.originalEndLineNumber === 0) {
        // Pure addition
        additions += (change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1);
      } else if (change.modifiedStartLineNumber === 0 || change.modifiedEndLineNumber === 0) {
        // Pure deletion
        deletions += (change.originalEndLineNumber - change.originalStartLineNumber + 1);
      } else {
        // Modification
        changes++;
      }
    }

    setDiffStats({ additions, deletions, changes });
  }, []);

  // Initialize Monaco diff editor
  const initMonaco = useCallback(async () => {
    try {
      setLoadingProgress(10);

      const monaco = await import('monaco-editor');
      monacoRef.current = monaco;

      setLoadingProgress(30);

      if (!typescriptConfiguredRef.current) {
        setupTypeScript(monaco);
        typescriptConfiguredRef.current = true;
      }

      setLoadingProgress(50);

      if (!editorRef.current) return;

      const monacoLang = getMonacoLanguage(language);
      const monacoTheme = getMonacoTheme(theme);

      // Create models
      const originalModel = monaco.editor.createModel(originalCode, monacoLang);
      const modifiedModel = monaco.editor.createModel(modifiedCode, monacoLang);

      // Create diff editor
      const diffEditor = monaco.editor.createDiffEditor(editorRef.current, {
        ...MONACO_DIFF_OPTIONS,
        theme: monacoTheme,
        readOnly,
        renderSideBySide: sideBySide,
        originalEditable: false,
      });

      diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel,
      });

      setLoadingProgress(80);

      diffEditorRef.current = diffEditor;

      // Listen for modified content changes
      modifiedModel.onDidChangeContent(() => {
        onModifiedChange?.(modifiedModel.getValue());
        updateDiffStats();
      });

      // Initial diff stats
      // Diff computation is async, wait a bit
      setTimeout(updateDiffStats, 300);

      setLoadingProgress(100);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load Monaco diff editor:', err);
      setError(t('failedToLoadEditor'));
      setIsLoading(false);
    }
  }, [originalCode, modifiedCode, language, theme, readOnly, sideBySide, onModifiedChange, updateDiffStats, t]);

  // Initialize
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!mounted) return;
      await initMonaco();
    };

    init();

    return () => {
      mounted = false;
      if (diffEditorRef.current) {
        // Dispose models before disposing editor
        const model = diffEditorRef.current.getModel();
        diffEditorRef.current.dispose();
        model?.original.dispose();
        model?.modified.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme
  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco) {
      monaco.editor.setTheme(getMonacoTheme(theme));
    }
  }, [theme]);

  // Toggle side-by-side mode
  const toggleSideBySide = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    if (diffEditor) {
      const newSideBySide = !sideBySide;
      setSideBySide(newSideBySide);
      diffEditor.updateOptions({ renderSideBySide: newSideBySide });
    }
  }, [sideBySide]);

  // Navigate to next/previous change
  const navigateChange = useCallback((direction: 'next' | 'prev') => {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) return;

    const lineChanges = diffEditor.getLineChanges();
    if (!lineChanges || lineChanges.length === 0) return;

    const modifiedEditor = diffEditor.getModifiedEditor();
    const currentLine = modifiedEditor.getPosition()?.lineNumber ?? 1;

    if (direction === 'next') {
      const nextChange = lineChanges.find(c => c.modifiedStartLineNumber > currentLine);
      if (nextChange) {
        modifiedEditor.revealLineInCenter(nextChange.modifiedStartLineNumber);
        modifiedEditor.setPosition({ lineNumber: nextChange.modifiedStartLineNumber, column: 1 });
      }
    } else {
      const prevChanges = lineChanges.filter(c => c.modifiedStartLineNumber < currentLine);
      if (prevChanges.length > 0) {
        const prevChange = prevChanges[prevChanges.length - 1];
        modifiedEditor.revealLineInCenter(prevChange.modifiedStartLineNumber);
        modifiedEditor.setPosition({ lineNumber: prevChange.modifiedStartLineNumber, column: 1 });
      }
    }
  }, []);

  // Labels for original and modified
  const origLabel = originalLabel || t('originalCode');
  const modLabel = modifiedLabel || t('modifiedCode');

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-muted/30', className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('relative h-full flex flex-col', className)}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            {loadingProgress > 0 && (
              <Progress value={loadingProgress} className="w-32 h-1" />
            )}
          </div>
        )}

        {/* Diff Toolbar */}
        {!isLoading && (
          <div className="flex items-center justify-between px-2 py-1 bg-muted/20 border-b select-none">
            <div className="flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{origLabel}</span>
              <span className="text-xs text-muted-foreground/50">↔</span>
              <span className="text-xs text-muted-foreground">{modLabel}</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Diff Stats */}
              <div className="flex items-center gap-1.5 text-[11px] mr-2">
                {diffStats.additions > 0 && (
                  <span className="text-green-500">+{diffStats.additions}</span>
                )}
                {diffStats.deletions > 0 && (
                  <span className="text-red-500">-{diffStats.deletions}</span>
                )}
                {diffStats.changes > 0 && (
                  <span className="text-yellow-500">~{diffStats.changes}</span>
                )}
                {diffStats.additions === 0 && diffStats.deletions === 0 && diffStats.changes === 0 && (
                  <span className="text-muted-foreground">No changes</span>
                )}
              </div>

              <Separator orientation="vertical" className="h-4" />

              {/* Navigate Changes */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => navigateChange('prev')}
                  >
                    <RotateCcw className="h-3.5 w-3.5 rotate-90" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous Change</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => navigateChange('next')}
                  >
                    <RotateCcw className="h-3.5 w-3.5 -rotate-90" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next Change</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-4" />

              {/* Side-by-Side / Inline Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={sideBySide ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-6 w-6"
                    onClick={toggleSideBySide}
                  >
                    {sideBySide ? (
                      <Columns2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlignJustify className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sideBySide ? t('inline') : t('sideBySide')}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        <div ref={editorRef} className="flex-1 min-h-0" />
      </div>
    </TooltipProvider>
  );
}

export default MonacoDiffEditor;
