'use client';

/**
 * Chat Import Dialog - import conversations from ChatGPT and other formats
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  detectImportFormat,
  previewImport,
  importConversations,
  PLATFORM_INFO,
} from '@/lib/storage';
import type { ChatImportFormat, ChatImportOptions, ChatImportResult, ChatImportError } from '@/types';

interface ChatImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: ChatImportResult) => void;
}

type ImportStep = 'select' | 'preview' | 'importing' | 'complete';

interface PreviewData {
  conversations: Array<{
    id: string;
    title: string;
    messageCount: number;
    createdAt: Date;
    preview: string;
  }>;
  totalMessages: number;
  errors: ChatImportError[];
}

const DEFAULT_OPTIONS: ChatImportOptions = {
  mergeStrategy: 'merge',
  generateNewIds: true,
  preserveTimestamps: true,
  defaultProvider: 'openai',
  defaultModel: 'gpt-4',
  defaultMode: 'chat',
};

const FORMAT_LABELS: Record<ChatImportFormat, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  cognia: 'Cognia',
  unknown: 'Unknown',
};

export function ChatImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ChatImportDialogProps) {
  const t = useTranslations('import');
  const tCommon = useTranslations('common');

  const [step, setStep] = useState<ImportStep>('select');
  const [format, setFormat] = useState<ChatImportFormat>('unknown');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [options, setOptions] = useState<ChatImportOptions>(DEFAULT_OPTIONS);
  const [showOptions, setShowOptions] = useState(false);
  const [result, setResult] = useState<ChatImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('select');
    setFormat('unknown');
    setFileContent('');
    setFileName('');
    setPreview(null);
    setOptions(DEFAULT_OPTIONS);
    setShowOptions(false);
    setResult(null);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const content = await file.text();
      setFileContent(content);
      setFileName(file.name);

      // Parse and detect format
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch {
        setError(t('errors.invalidJson'));
        setIsLoading(false);
        return;
      }

      const detectedFormat = detectImportFormat(data);
      setFormat(detectedFormat);

      if (detectedFormat === 'chatgpt' || detectedFormat === 'claude' || detectedFormat === 'gemini') {
        // Generate preview for supported formats
        const previewResult = await previewImport(content, options);
        setPreview(previewResult);
        setStep('preview');
      } else if (detectedFormat === 'cognia') {
        setError(t('errors.useCogniaImport'));
      } else {
        setError(t('errors.unknownFormat'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.readFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [options, t]);

  const handleImport = useCallback(async () => {
    if (!fileContent || format === 'unknown' || format === 'cognia') return;

    setStep('importing');
    setIsLoading(true);

    try {
      const importResult = await importConversations(fileContent, options);
      setResult(importResult);
      setStep('complete');
      onImportComplete?.(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.importFailed'));
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  }, [fileContent, format, options, onImportComplete, t]);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Step: Select File */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="import-file"
                  disabled={isLoading}
                />
                <label htmlFor="import-file" className="cursor-pointer">
                  {isLoading ? (
                    <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
                  ) : (
                    <FileJson className="h-12 w-12 mx-auto text-muted-foreground" />
                  )}
                  <p className="mt-4 text-sm font-medium">
                    {isLoading ? t('analyzing') : t('selectFile')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('supportedFormats')}
                  </p>
                </label>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('errors.title')}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fileName}</span>
                  {format !== 'unknown' && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${PLATFORM_INFO[format]?.color || '#888'}20`,
                        color: PLATFORM_INFO[format]?.color || '#888',
                      }}
                    >
                      {FORMAT_LABELS[format]}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {preview.conversations.length} {t('conversations')}, {preview.totalMessages} {t('messages')}
                </span>
              </div>

              <ScrollArea className="h-[200px] rounded-lg border p-2">
                <div className="space-y-2">
                  {preview.conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50"
                    >
                      <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{conv.messageCount} {t('messages')}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(conv.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Import Options */}
              <Collapsible open={showOptions} onOpenChange={setShowOptions}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                      {t('importOptions')}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="preserve-timestamps">{t('options.preserveTimestamps')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('options.preserveTimestampsDesc')}
                      </p>
                    </div>
                    <Switch
                      id="preserve-timestamps"
                      checked={options.preserveTimestamps}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({ ...prev, preserveTimestamps: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="generate-new-ids">{t('options.generateNewIds')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('options.generateNewIdsDesc')}
                      </p>
                    </div>
                    <Switch
                      id="generate-new-ids"
                      checked={options.generateNewIds}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({ ...prev, generateNewIds: checked }))
                      }
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {preview.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('errors.parseWarnings')}</AlertTitle>
                  <AlertDescription>
                    {preview.errors.length} {t('errors.conversationsFailed')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="space-y-4 py-8 text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <p className="font-medium">{t('importing')}</p>
              <Progress value={50} className="w-full" />
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && result && (
            <div className="space-y-4">
              {result.success ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>{t('success.title')}</AlertTitle>
                  <AlertDescription>
                    {t('success.description', {
                      sessions: result.imported.sessions,
                      messages: result.imported.messages,
                    })}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('errors.importPartial')}</AlertTitle>
                  <AlertDescription>
                    {t('success.description', {
                      sessions: result.imported.sessions,
                      messages: result.imported.messages,
                    })}
                    {result.errors.length > 0 && (
                      <span className="block mt-1">
                        {result.errors.length} {t('errors.conversationsFailed')}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {result.warnings.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">{t('warnings')}:</p>
                  <ul className="list-disc list-inside mt-1">
                    {result.warnings.slice(0, 5).map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2">
          {step === 'select' && (
            <Button variant="outline" onClick={handleClose}>
              {tCommon('cancel')}
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={resetState}>
                {t('back')}
              </Button>
              <Button onClick={handleImport} disabled={isLoading || !preview?.conversations.length}>
                <Upload className="h-4 w-4 mr-2" />
                {t('importButton', { count: preview?.conversations.length || 0 })}
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose}>
              {tCommon('done')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ChatImportDialog;
