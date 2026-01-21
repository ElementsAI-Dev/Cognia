'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useRulesEditor } from '@/hooks/settings';
import {
  RulesEditorHeader,
  RulesEditorToolbar,
  RulesEditorMobileToolbar,
  RulesEditorTabs,
  RulesEditorContent,
  RulesEditorFooter,
} from './components';
import type { RulesEditorProps } from '@/types/settings/rules';

export function RulesEditor({ onSave, initialContent, className }: RulesEditorProps) {
  const t = useTranslations('rules');
  const tCommon = useTranslations('common');

  const {
    // State
    activeTab,
    activeContent,
    isDirty,
    showPreview,
    wordWrap,
    theme,
    mobileMenuOpen,
    canUndo,
    canRedo,
    isOptimizing,
    showResetDialog,
    charCount,
    wordCount,
    tokenEstimate,

    // Actions
    setActiveTab,
    handleContentChange,
    handleApplyTemplate,
    handleInsertVariable,
    handleUndo,
    handleRedo,
    handleSave,
    handleCopy,
    handleImport,
    handleExport,
    handleReset,
    handleFileChange,
    handleOptimize,
    setShowPreview,
    setWordWrap,
    setTheme,
    setMobileMenuOpen,
    setShowResetDialog,

    // Refs
    fileInputRef,
  } = useRulesEditor({ onSave, initialContent });

  return (
    <>
      <Card className={cn('flex flex-col h-[600px] md:h-[700px] overflow-hidden', className)}>
        {/* Header */}
        <CardHeader className="py-2 md:py-3 px-3 md:px-4 flex-row items-center justify-between border-b space-y-0 shrink-0">
          <RulesEditorHeader
            isDirty={isDirty}
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />

          {/* Desktop Toolbar */}
          <RulesEditorToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            showPreview={showPreview}
            wordWrap={wordWrap}
            isOptimizing={isOptimizing}
            isDirty={isDirty}
            activeContent={activeContent}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onTogglePreview={() => setShowPreview(!showPreview)}
            onToggleWordWrap={() => setWordWrap(!wordWrap)}
            onOptimize={handleOptimize}
            onApplyTemplate={handleApplyTemplate}
            onInsertVariable={handleInsertVariable}
            onImport={handleImport}
            onExport={handleExport}
            onReset={() => setShowResetDialog(true)}
            onCopy={handleCopy}
            onSave={handleSave}
          />
        </CardHeader>

        {/* Mobile Toolbar */}
        {mobileMenuOpen && (
          <RulesEditorMobileToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            showPreview={showPreview}
            wordWrap={wordWrap}
            isOptimizing={isOptimizing}
            isDirty={isDirty}
            activeContent={activeContent}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onTogglePreview={() => setShowPreview(!showPreview)}
            onToggleWordWrap={() => setWordWrap(!wordWrap)}
            onOptimize={handleOptimize}
            onImport={handleImport}
            onExport={handleExport}
            onReset={() => setShowResetDialog(true)}
            onCopy={handleCopy}
            onSave={handleSave}
          />
        )}

        {/* Tabs */}
        <RulesEditorTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Editor Content */}
        <CardContent className="p-0 flex-1 min-h-0 bg-background relative">
          <RulesEditorContent
            activeContent={activeContent}
            onContentChange={handleContentChange}
            showPreview={showPreview}
            wordWrap={wordWrap}
            theme={theme}
            onThemeToggle={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
            isOptimizing={isOptimizing}
          />
        </CardContent>

        {/* Footer */}
        <CardFooter className="p-0">
          <RulesEditorFooter
            activeTab={activeTab}
            charCount={charCount}
            wordCount={wordCount}
            tokenEstimate={tokenEstimate}
            isDirty={isDirty}
          />
        </CardFooter>
      </Card>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.cursorrules,.windsurfrules"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reset')}</AlertDialogTitle>
            <AlertDialogDescription>{t('resetConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>{tCommon('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
