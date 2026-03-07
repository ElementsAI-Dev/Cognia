'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Upload,
  FileText,
  Globe,
  ClipboardPaste,
  Loader2,
  X,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PPTGenerationConfig, PPTMaterialGenerationConfig } from '@/hooks/ppt/use-ppt-generation';
import type { PPTMaterial } from '@/types/workflow';
import { DEFAULT_PPT_THEMES } from '@/types/workflow';
import { loggers } from '@/lib/logger';
import {
  validatePPTCreationInput,
  type PPTCreationValidationIssue,
} from '@/lib/ppt/ppt-state';

export type CreationMode = 'generate' | 'import' | 'paste';

export interface PPTCreationFormProps {
  initialMode?: CreationMode;
  initialTopic?: string;
  isGenerating: boolean;
  progress: { message: string };
  error: string | null;
  canRetry?: boolean;
  onRetry?: () => Promise<unknown>;
  onGenerate: (config: PPTGenerationConfig) => Promise<unknown>;
  onGenerateFromMaterials: (config: PPTMaterialGenerationConfig) => Promise<unknown>;
  className?: string;
}

export function PPTCreationForm({
  initialMode = 'generate',
  initialTopic = '',
  isGenerating,
  progress,
  error,
  canRetry = false,
  onRetry,
  onGenerate,
  onGenerateFromMaterials,
  className,
}: PPTCreationFormProps) {
  const t = useTranslations('pptGenerator');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<CreationMode>(initialMode);
  const [topic, setTopic] = useState(initialTopic);
  const [description, setDescription] = useState('');

  // Import mode state
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Paste mode state
  const [pastedText, setPastedText] = useState('');

  const defaultConfig = useMemo<Omit<PPTGenerationConfig, 'topic'>>(() => ({
    slideCount: 10,
    theme: DEFAULT_PPT_THEMES[0],
    language: 'zh-CN',
    includeImages: true,
    purpose: 'informative',
    tone: 'professional',
  }), []);

  const currentValidation = useMemo(
    () =>
      validatePPTCreationInput({
        mode,
        topic,
        hasImportedFile: Boolean(importedFile),
        importUrl,
        pastedText,
      }),
    [mode, topic, importedFile, importUrl, pastedText]
  );

  const issueToMessage = useCallback((issue: PPTCreationValidationIssue): string => {
    switch (issue.code) {
      case 'topic_required':
        return t('topicRequired');
      case 'material_required':
        return t('materialRequired');
      case 'invalid_url':
        return t('invalidUrl');
      case 'paste_too_short':
        return t('minCharsHint');
      default:
        return issue.message;
    }
  }, [t]);

  // --- Generate Mode ---
  const handleGenerate = useCallback(async () => {
    const validation = validatePPTCreationInput({
      mode: 'generate',
      topic,
    });
    if (!validation.isValid) {
      toast.error(issueToMessage(validation.issues[0]));
      return;
    }

    const config: PPTGenerationConfig = {
      ...defaultConfig,
      topic: validation.normalizedTopic,
      description: description.trim() || undefined,
    };

    await onGenerate(config);
  }, [topic, description, defaultConfig, onGenerate, issueToMessage]);

  // --- Import Mode: File ---
  const handleFileSelect = useCallback((file: File) => {
    const validTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const validExtensions = ['.pdf', '.txt', '.md', '.docx'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidType && !hasValidExt) {
      toast.error(t('supportedFormats'));
      return;
    }
    setImportedFile(file);
    if (!topic.trim()) {
      setTopic(file.name.replace(/\.(pdf|txt|md|docx)$/i, ''));
    }
  }, [t, topic]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const handleImportGenerate = useCallback(async () => {
    const validation = validatePPTCreationInput({
      mode: 'import',
      topic,
      hasImportedFile: Boolean(importedFile),
      importUrl,
    });
    if (!validation.isValid) {
      toast.error(issueToMessage(validation.issues[0]));
      return;
    }

    const materials: PPTMaterial[] = [];

    if (importedFile) {
      const content = await importedFile.text();
      materials.push({
        id: `material-file-${Date.now()}`,
        type: 'file',
        name: importedFile.name,
        content,
        mimeType: importedFile.type,
      });
    }

    if (importUrl.trim()) {
      materials.push({
        id: `material-url-${Date.now()}`,
        type: 'url',
        name: importUrl.trim(),
        content: importUrl.trim(),
      });
    }

    const config: PPTMaterialGenerationConfig = {
      ...defaultConfig,
      topic: validation.normalizedTopic || materials[0].name,
      description: description.trim() || undefined,
      materials,
    };

    try {
      await onGenerateFromMaterials(config);
    } catch (err) {
      loggers.ui.error('Import generation failed:', err instanceof Error ? err : undefined);
    }
  }, [importedFile, importUrl, topic, description, defaultConfig, onGenerateFromMaterials, issueToMessage]);

  // --- Paste Mode ---
  const handlePasteGenerate = useCallback(async () => {
    const validation = validatePPTCreationInput({
      mode: 'paste',
      topic,
      pastedText,
    });
    if (!validation.isValid) {
      toast.error(issueToMessage(validation.issues[0]));
      return;
    }

    const materials: PPTMaterial[] = [
      {
        id: `material-text-${Date.now()}`,
        type: 'text',
        name: topic.trim() || 'Pasted Content',
        content: pastedText.trim(),
      },
    ];

    const config: PPTMaterialGenerationConfig = {
      ...defaultConfig,
      topic: validation.normalizedTopic || 'Presentation',
      description: description.trim() || undefined,
      materials,
    };

    try {
      await onGenerateFromMaterials(config);
    } catch (err) {
      loggers.ui.error('Paste generation failed:', err instanceof Error ? err : undefined);
    }
  }, [pastedText, topic, description, defaultConfig, onGenerateFromMaterials, issueToMessage]);

  const canSubmit = !isGenerating && currentValidation.isValid;

  const handleSubmit = useCallback(() => {
    switch (mode) {
      case 'generate':
        handleGenerate();
        break;
      case 'import':
        handleImportGenerate();
        break;
      case 'paste':
        handlePasteGenerate();
        break;
    }
  }, [mode, handleGenerate, handleImportGenerate, handlePasteGenerate]);

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={mode} onValueChange={(v) => setMode(v as CreationMode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="gap-1.5" data-testid="ppt-mode-generate">
            <Sparkles className="h-3.5 w-3.5" />
            {t('modeGenerate')}
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5" data-testid="ppt-mode-import">
            <Upload className="h-3.5 w-3.5" />
            {t('modeImport')}
          </TabsTrigger>
          <TabsTrigger value="paste" className="gap-1.5" data-testid="ppt-mode-paste">
            <ClipboardPaste className="h-3.5 w-3.5" />
            {t('modePaste')}
          </TabsTrigger>
        </TabsList>

        {/* Common: Topic + Description */}
        <div className="space-y-3 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="form-topic">{t('topic')}</Label>
            <Input
              id="form-topic"
              data-testid="ppt-form-topic"
              placeholder={t('topicPlaceholder')}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="form-desc">{t('additionalDetails')}</Label>
            <Textarea
              id="form-desc"
              data-testid="ppt-form-description"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Generate Tab */}
        <TabsContent value="generate" className="mt-0">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary/50" />
            <p className="mt-3 text-sm font-medium">{t('modeGenerateDesc')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('generateDescription')}
            </p>
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="mt-0 space-y-4">
          {/* File upload zone */}
          <div
            className={cn(
              'rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx"
              className="hidden"
              onChange={handleFileInputChange}
            />
            {importedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{importedFile.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {(importedFile.size / 1024).toFixed(1)} KB
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImportedFile(null);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium">{t('dragDropHere')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('clickToUpload')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('supportedFormats')}
                </p>
              </>
            )}
          </div>

          {/* URL input */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {t('enterUrl')}
            </Label>
            <div className="flex gap-2">
              <Input
                data-testid="ppt-import-url"
                placeholder={t('urlPlaceholder')}
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </TabsContent>

        {/* Paste Tab */}
        <TabsContent value="paste" className="mt-0 space-y-3">
          <Textarea
            data-testid="ppt-paste-text"
            placeholder={t('pasteTextPlaceholder')}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={8}
            className="resize-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('charCount', { count: pastedText.length })}</span>
            {pastedText.length > 0 && pastedText.length < 50 && (
              <span className="text-amber-500">{t('minCharsHint')}</span>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Error display */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive space-y-2">
          <div>{error}</div>
          {canRetry && onRetry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onRetry()}
              disabled={isGenerating}
              data-testid="ppt-create-retry"
            >
              {t('retry')}
            </Button>
          )}
        </div>
      )}

      {/* Progress display */}
      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress.message}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={!canSubmit} data-testid="ppt-create-submit">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {t('generate')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default PPTCreationForm;
