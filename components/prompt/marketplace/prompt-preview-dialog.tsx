'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  Copy,
  Check,
  Send,
  Sparkles,
  Variable,
} from 'lucide-react';
import { Loader } from '@/components/ai-elements/loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import { cn as _cn } from '@/lib/utils';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';
import { useSettingsStore } from '@/stores/settings';
import { toast } from 'sonner';

interface PromptPreviewDialogProps {
  prompt: MarketplacePrompt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendToChat?: (content: string) => void;
}

export function PromptPreviewDialog({
  prompt,
  open,
  onOpenChange,
  onSendToChat,
}: PromptPreviewDialogProps) {
  const t = useTranslations('promptMarketplace.detail');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultModel = providerSettings[defaultProvider]?.defaultModel || 'gpt-4o-mini';

  // Generate prompt content with filled variables
  const generatedPrompt = useMemo(() => {
    if (!prompt) return '';
    let content = prompt.content;
    
    // Replace variables with their values
    for (const variable of prompt.variables) {
      const value = variableValues[variable.name] || variable.defaultValue || `{{${variable.name}}}`;
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      content = content.replace(regex, value);
    }
    
    return content;
  }, [prompt, variableValues]);

  // Check if all required variables are filled
  const allRequiredFilled = useMemo(() => {
    if (!prompt) return false;
    return prompt.variables
      .filter((v) => v.required)
      .every((v) => variableValues[v.name]?.trim() || v.defaultValue);
  }, [prompt, variableValues]);

  const handleVariableChange = useCallback((name: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCopyPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success(t('copiedToClipboard'));
    setTimeout(() => setCopied(false), 2000);
  }, [generatedPrompt, t]);

  const handleTestWithAI = useCallback(async () => {
    if (!generatedPrompt) return;
    
    setIsTesting(true);
    setTestResult('');
    
    try {
      // Use the AI completion API
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: generatedPrompt,
            },
          ],
          provider: defaultProvider || 'openai',
          model: defaultModel || 'gpt-4o-mini',
          maxTokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      setTestResult(data.content || data.text || 'No response received');
    } catch (error) {
      console.error('AI test failed:', error);
      toast.error(t('testing') + ' failed');
      setTestResult('Error: Failed to get AI response. Please check your API settings.');
    } finally {
      setIsTesting(false);
    }
  }, [generatedPrompt, defaultProvider, defaultModel, t]);

  const handleSendToChat = useCallback(() => {
    if (onSendToChat) {
      onSendToChat(generatedPrompt);
      onOpenChange(false);
    }
  }, [generatedPrompt, onSendToChat, onOpenChange]);

  const handleCopyResult = useCallback(async () => {
    await navigator.clipboard.writeText(testResult);
    toast.success(t('copiedToClipboard'));
  }, [testResult, t]);

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            {t('previewPrompt')}
          </DialogTitle>
          <DialogDescription>
            {prompt.name} - {t('fillVariables')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="variables" className="flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="variables" className="gap-2">
              <Variable className="h-4 w-4" />
              {t('variables')} ({prompt.variables.length})
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {t('preview')}
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2">
              <Play className="h-4 w-4" />
              {t('testResult')}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="variables" className="mt-0 space-y-4">
              {prompt.variables.length === 0 ? (
                <Empty className="py-8">
                  <EmptyMedia>
                    <Variable className="h-10 w-10 text-muted-foreground/50" />
                  </EmptyMedia>
                  <EmptyDescription>{t('noVariables')}</EmptyDescription>
                </Empty>
              ) : (
                <div className="space-y-4">
                  {prompt.variables.map((variable) => (
                    <div key={variable.name} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={variable.name} className="font-medium">
                          {variable.name}
                        </Label>
                        {variable.required && (
                          <Badge variant="destructive" className="text-xs">
                            {t('required')}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {variable.type || 'text'}
                        </Badge>
                      </div>
                      {variable.description && (
                        <p className="text-sm text-muted-foreground">
                          {variable.description}
                        </p>
                      )}
                      {variable.type === 'multiline' ? (
                        <Textarea
                          id={variable.name}
                          placeholder={variable.defaultValue || `Enter ${variable.name}...`}
                          value={variableValues[variable.name] || ''}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={variable.name}
                          type={variable.type === 'number' ? 'number' : 'text'}
                          placeholder={variable.defaultValue || `Enter ${variable.name}...`}
                          value={variableValues[variable.name] || ''}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-0 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{t('generatedPrompt')}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={handleCopyPrompt}
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {t('copyResult')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('copyToClipboard')}</TooltipContent>
                  </Tooltip>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {generatedPrompt}
                  </pre>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleTestWithAI}
                  disabled={isTesting || !allRequiredFilled}
                  className="gap-2"
                >
                  {isTesting ? (
                    <Loader size={16} />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isTesting ? t('testing') : t('testWithAI')}
                </Button>
                {onSendToChat && (
                  <Button
                    variant="outline"
                    onClick={handleSendToChat}
                    disabled={!allRequiredFilled}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {t('sendToChat')}
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="test" className="mt-0 space-y-4">
              {testResult ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{t('testResult')}</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleCopyResult}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {t('copyResult')}
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border max-h-[400px] overflow-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm">
                        {testResult}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <Empty className="py-12">
                  <EmptyMedia>
                    <Play className="h-12 w-12 text-muted-foreground/30" />
                  </EmptyMedia>
                  <EmptyDescription>
                    {isTesting ? t('testing') : t('runTestHint')}
                  </EmptyDescription>
                  {isTesting && (
                    <Loader size={24} className="mt-4" />
                  )}
                </Empty>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default PromptPreviewDialog;
