'use client';

/**
 * Gitignore Template Selector
 *
 * UI component for selecting and previewing .gitignore templates
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { FileCode, Check, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  gitignoreTemplates,
  getGitignoreTemplate,
  mergeGitignoreTemplates,
  detectProjectType,
} from '@/lib/native/gitignore-templates';
import type { GitignoreTemplateSelectorProps } from '@/types/git';

export function GitignoreTemplateSelector({
  onSelect,
  projectFiles = [],
  className,
}: GitignoreTemplateSelectorProps) {
  const t = useTranslations('git');
  const tCommon = useTranslations('common');

  const [open, setOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [customContent, setCustomContent] = useState('');

  // Auto-detect project types
  const detectedTypes = useMemo(() => {
    if (projectFiles.length > 0) {
      return detectProjectType(projectFiles);
    }
    return [];
  }, [projectFiles]);

  // Generate merged content
  const mergedContent = useMemo(() => {
    if (selectedTemplates.length === 0) return '';
    return mergeGitignoreTemplates(selectedTemplates);
  }, [selectedTemplates]);

  // Final content with custom additions
  const finalContent = useMemo(() => {
    if (customContent.trim()) {
      return mergedContent + '\n\n# ===== Custom =====\n' + customContent;
    }
    return mergedContent;
  }, [mergedContent, customContent]);

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  const handleAutoDetect = () => {
    setSelectedTemplates(detectedTypes);
  };

  const handleConfirm = () => {
    if (finalContent.trim()) {
      onSelect(finalContent);
      setOpen(false);
      setSelectedTemplates([]);
      setCustomContent('');
    }
  };

  const handleCopyToClipboard = async () => {
    if (finalContent) {
      await navigator.clipboard.writeText(finalContent);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <FileCode className="h-4 w-4 mr-2" />
          {t('gitignore.selectTemplate')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            {t('gitignore.title')}
          </DialogTitle>
          <DialogDescription>{t('gitignore.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('gitignore.templates')}</Label>
              {detectedTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoDetect}
                  className="h-7 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('gitignore.autoDetect')}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {gitignoreTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplates.includes(template.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTemplateToggle(template.id)}
                  className={cn(
                    'h-8',
                    detectedTypes.includes(template.id) && 'ring-2 ring-primary/50'
                  )}
                >
                  <span className="mr-1">{template.icon}</span>
                  {template.name}
                  {selectedTemplates.includes(template.id) && <Check className="h-3 w-3 ml-1" />}
                </Button>
              ))}
            </div>

            {selectedTemplates.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {t('gitignore.selected')}:
                {selectedTemplates.map((id) => {
                  const template = getGitignoreTemplate(id);
                  return template ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {template.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Custom additions */}
          <div className="space-y-2">
            <Label>{t('gitignore.customAdditions')}</Label>
            <Textarea
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder={t('gitignore.customPlaceholder')}
              rows={3}
              className="font-mono text-xs"
            />
          </div>

          {/* Preview */}
          {finalContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('gitignore.preview')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="h-7 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {tCommon('copy')}
                </Button>
              </div>
              <ScrollArea className="h-48 rounded-md border bg-muted/30">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap">{finalContent}</pre>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!finalContent.trim()}>
            <FileCode className="h-4 w-4 mr-2" />
            {t('gitignore.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
