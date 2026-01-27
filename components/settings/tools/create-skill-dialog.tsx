'use client';

/**
 * CreateSkillDialog Component
 *
 * Dialog for creating a new skill, either from scratch or from a template.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllTemplates, getTemplateById } from '@/lib/skills/templates';
import { toHyphenCase } from '@/lib/skills/parser';
import { SKILL_CATEGORY_ICONS } from './skill-icons';
import { SKILL_CATEGORY_KEYS } from '@/lib/settings/tools';
import type { SkillCategory, CreateSkillInput } from '@/types/system/skill';
import type { useTranslations } from 'next-intl';

export interface CreateSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSkill: (input: CreateSkillInput) => void;
  t: ReturnType<typeof useTranslations>;
}

export function CreateSkillDialog({
  open,
  onOpenChange,
  onCreateSkill,
  t,
}: CreateSkillDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<SkillCategory>('custom');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [mode, setMode] = useState<'blank' | 'template'>('blank');

  const templates = getAllTemplates();

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = getTemplateById(templateId);
    if (template) {
      setName(template.name.toLowerCase().replace(/\s+/g, '-'));
      setDescription(template.description);
      setContent(template.defaultContent);
      setCategory(template.category);
    }
  };

  const handleSubmit = () => {
    if (!name || !description || !content) return;

    onCreateSkill({
      name: toHyphenCase(name),
      description,
      content,
      category,
      tags: [],
    });

    // Reset form
    setName('');
    setDescription('');
    setContent('');
    setCategory('custom');
    setSelectedTemplate('');
    onOpenChange(false);
  };

  // Category keys for select options
  const categoryKeys: SkillCategory[] = [
    'creative-design',
    'development',
    'enterprise',
    'productivity',
    'data-analysis',
    'communication',
    'meta',
    'custom',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('createNewSkill')}</DialogTitle>
          <DialogDescription>{t('createNewSkillDesc')}</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'blank' | 'template')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blank">{t('startBlank')}</TabsTrigger>
            <TabsTrigger value="template">{t('useTemplate')}</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            <ScrollArea className="h-48">
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="p-3">
                    <div className="flex items-center gap-2">
                      <span>{template.icon}</span>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </div>
                    <CardDescription className="text-xs line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="blank" className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('startBlankDesc')}</p>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                placeholder={t('skillNamePlaceholder') || 'my-skill-name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('nameHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('category')}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SkillCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {SKILL_CATEGORY_ICONS[key]}
                        {t(`categories.${SKILL_CATEGORY_KEYS[key]}`)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">{t('descriptionHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">{t('skillInstructions')}</Label>
            <Textarea
              id="content"
              placeholder={t('contentPlaceholder') || '# My Skill\n\n## When to Use\n\n## Instructions\n\n...'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !description || !content}>
            {t('createSkill')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
