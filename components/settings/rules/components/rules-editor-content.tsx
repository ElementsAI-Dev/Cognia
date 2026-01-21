'use client';

import { Type, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Editor, EditorProps } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { EditorTheme } from '@/types/settings/rules';
import { RulesEditorPreview } from './rules-editor-preview';

interface RulesEditorContentProps {
  // Content
  activeContent: string;
  onContentChange: (value: string | undefined) => void;

  // Settings
  showPreview: boolean;
  wordWrap: boolean;
  theme: EditorTheme;
  onThemeToggle: () => void;

  // Loading state
  isOptimizing: boolean;
}

export function RulesEditorContent({
  activeContent,
  onContentChange,
  showPreview,
  wordWrap,
  theme,
  onThemeToggle,
  isOptimizing,
}: RulesEditorContentProps) {
  const t = useTranslations('rules');

  return (
    <div className="h-full relative">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={showPreview ? 60 : 100} minSize={30}>
          <div className="h-full relative group">
            <MonacoEditor
              height="100%"
              language="markdown"
              theme={theme}
              value={activeContent}
              onChange={onContentChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                lineNumbers: 'on',
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                wordWrap: wordWrap ? 'on' : 'off',
                automaticLayout: true,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                },
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
              }}
            />
            <div className="absolute bottom-4 right-6 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 bg-background/80 backdrop-blur pointer-events-auto shadow-sm"
                onClick={onThemeToggle}
                aria-label="Toggle theme"
              >
                <Type className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </ResizablePanel>

        {showPreview && (
          <>
            <ResizableHandle withHandle className="hidden md:flex" />
            <ResizablePanel defaultSize={40} minSize={20} className="hidden md:block">
              <RulesEditorPreview content={activeContent} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Loading overlay for AI optimization */}
      {isOptimizing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="text-sm font-medium animate-pulse">{t('optimizing')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper to handle Monaco Editor import issues in some environments
function MonacoEditor(props: EditorProps) {
  return <Editor {...props} />;
}
