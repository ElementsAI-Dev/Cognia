'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { loggers } from '@/lib/logger';
import {
  Upload,
  Tag,
  Sparkles,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { usePromptMarketplaceStore } from '@/stores/prompt/prompt-marketplace-store';
import { usePromptTemplateStore } from '@/stores/prompt/prompt-template-store';
import { MARKETPLACE_CATEGORIES } from '@/types/content/prompt-marketplace';
import type { MarketplaceCategory } from '@/types/content/prompt-marketplace';
import { toast } from '@/components/ui/sonner';

interface PromptPublishDialogProps {
  templateId?: string;
  trigger?: React.ReactNode;
}

const PROMPT_ICONS = ['💡', '🎯', '⚡', '🔥', '✨', '🚀', '💎', '🎨', '📝', '🔍', '🤖', '📊', '🌐', '💼', '🎓', '🔬', '📡', '🎭', '🔄', '✉️'];

export function PromptPublishDialog({ templateId, trigger }: PromptPublishDialogProps) {
  const t = useTranslations('promptMarketplace');
  const tDetail = useTranslations('promptMarketplace.detail');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'configure' | 'review'>('select');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId || '');
  const [isPublishing, setIsPublishing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('chat');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [icon, setIcon] = useState('💡');

  const templates = usePromptTemplateStore((state) => state.templates);
  const publishPrompt = usePromptMarketplaceStore((state) => state.publishPrompt);

  const templateList = useMemo(
    () => templates.filter((t) => t.source !== 'builtin'),
    [templates]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setName(tmpl.name);
      setDescription(tmpl.description || '');
      setTags(tmpl.tags || []);
    }
    setStep('configure');
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagsInput.trim()) {
      e.preventDefault();
      const newTag = tagsInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handlePublish = async () => {
    if (!selectedTemplateId || !name.trim()) return;

    setIsPublishing(true);
    try {
      await publishPrompt(selectedTemplateId, {
        name: name.trim(),
        description: description.trim(),
        category,
        tags,
        icon,
      });
      toast.success(t('publish.success'));
      setOpen(false);
      resetForm();
    } catch (error) {
      loggers.ui.error('Publish failed:', error);
      toast.error(t('publish.failed'));
    } finally {
      setIsPublishing(false);
    }
  };

  const resetForm = () => {
    setStep('select');
    setSelectedTemplateId('');
    setName('');
    setDescription('');
    setCategory('chat');
    setTags([]);
    setTagsInput('');
    setIcon('💡');
  };

  const canProceedToReview = name.trim() && description.trim() && category;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            {t('publish.title')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {t('publish.title')}
          </DialogTitle>
          <DialogDescription>
            {t('publish.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-1">
          {(['select', 'configure', 'review'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : (['select', 'configure', 'review'].indexOf(step) > i
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground')
                )}
              >
                {['select', 'configure', 'review'].indexOf(step) > i ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span className={cn('text-sm', step === s ? 'font-medium' : 'text-muted-foreground')}>
                {t(`publish.step${i + 1}`)}
              </span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />}
            </div>
          ))}
        </div>

        <Separator />

        <ScrollArea className="flex-1 min-h-0">
          {/* Step 1: Select Template */}
          {step === 'select' && (
            <div className="space-y-3 p-1">
              {templateList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>{t('publish.noTemplates')}</p>
                </div>
              ) : (
                templateList.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    className={cn(
                      'w-full text-left p-4 rounded-lg border transition-all hover:bg-muted/50 hover:border-primary/30',
                      selectedTemplateId === tmpl.id && 'border-primary bg-primary/5'
                    )}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{tmpl.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {tmpl.description || tmpl.content.slice(0, 80)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
                    </div>
                    {tmpl.tags && tmpl.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tmpl.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && (
            <div className="space-y-5 p-1">
              <div className="space-y-2">
                <Label htmlFor="publish-name">{t('publish.name')} *</Label>
                <Input
                  id="publish-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('publish.namePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publish-desc">{t('publish.descriptionLabel')} *</Label>
                <Textarea
                  id="publish-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('publish.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('publish.category')}</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as MarketplaceCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETPLACE_CATEGORIES
                        .filter((c) => !['featured', 'trending', 'new'].includes(c.id))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <span>{c.icon}</span>
                              <span>{c.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('publish.icon')}</Label>
                  <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg max-h-[100px] overflow-auto">
                    {PROMPT_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        className={cn(
                          'w-8 h-8 rounded-md flex items-center justify-center text-lg transition-all hover:bg-muted',
                          icon === emoji && 'ring-2 ring-primary bg-primary/10'
                        )}
                        onClick={() => setIcon(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tDetail('tags')}</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                      <span className="ml-0.5">×</span>
                    </Badge>
                  ))}
                </div>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={t('publish.addTagPlaceholder')}
                />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep('select')}>
                  {tDetail('cancel')}
                </Button>
                <Button
                  onClick={() => setStep('review')}
                  disabled={!canProceedToReview}
                >
                  {t('publish.next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-5 p-1">
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{name}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('publish.category')}:</span>{' '}
                    <span className="font-medium">
                      {MARKETPLACE_CATEGORIES.find((c) => c.id === category)?.name || category}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tDetail('variables')}:</span>{' '}
                    <span className="font-medium">{selectedTemplate?.variables?.length || 0}</span>
                  </div>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {selectedTemplate?.content && (
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">{tDetail('content')}</Label>
                    <pre className="mt-1 p-3 bg-background rounded-md border text-xs font-mono whitespace-pre-wrap line-clamp-6">
                      {selectedTemplate.content}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep('configure')}>
                  {tDetail('cancel')}
                </Button>
                <Button onClick={handlePublish} disabled={isPublishing} className="gap-2">
                  {isPublishing ? (
                    <>{t('publish.publishing')}</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {t('publish.publishButton')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default PromptPublishDialog;
