'use client';

/**
 * CreateProjectDialog - dialog for creating/editing projects
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Folder,
  Code,
  BookOpen,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  Music,
  Palette,
  PenTool,
  Rocket,
  Star,
  Target,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TagInput } from '@/components/ui/tag-input';
import { PROJECT_COLORS, PROJECT_ICONS, type Project, type CreateProjectInput } from '@/types';
import { PROVIDERS } from '@/types/provider';
import { cn } from '@/lib/utils';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateProjectInput) => void;
  editProject?: Project | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
  Folder,
  Code,
  BookOpen,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  Music,
  Palette,
  PenTool,
  Rocket,
  Star,
  Target,
  Zap,
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  editProject,
}: CreateProjectDialogProps) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const tPlaceholders = useTranslations('placeholders');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [color, setColor] = useState(PROJECT_COLORS[0].value);
  const [customInstructions, setCustomInstructions] = useState('');
  const [defaultProvider, setDefaultProvider] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [defaultMode, setDefaultMode] = useState<'chat' | 'agent' | 'research' | ''>('');
  const [tags, setTags] = useState<string[]>([]);

  const isEdit = !!editProject;

  useEffect(() => {
    // Use microtask to avoid synchronous setState in effect
    queueMicrotask(() => {
      if (editProject) {
        setName(editProject.name);
        setDescription(editProject.description || '');
        setIcon(editProject.icon || 'Folder');
        setColor(editProject.color || PROJECT_COLORS[0].value);
        setCustomInstructions(editProject.customInstructions || '');
        setDefaultProvider(editProject.defaultProvider || '');
        setDefaultModel(editProject.defaultModel || '');
        setDefaultMode((editProject.defaultMode as 'chat' | 'agent' | 'research') || '');
        setTags(editProject.tags || []);
      } else {
        // Reset form
        setName('');
        setDescription('');
        setIcon('Folder');
        setColor(PROJECT_COLORS[0].value);
        setCustomInstructions('');
        setDefaultProvider('');
        setDefaultModel('');
        setDefaultMode('');
        setTags([]);
      }
    });
  }, [editProject, open]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      customInstructions: customInstructions.trim() || undefined,
      defaultProvider: defaultProvider || undefined,
      defaultModel: defaultModel || undefined,
      defaultMode: defaultMode || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    onOpenChange(false);
  };

  const selectedProvider = defaultProvider ? PROVIDERS[defaultProvider] : null;
  const IconPreview = iconMap[icon] || Folder;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editProject') : t('createProject')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('editProjectDesc') : t('createProjectDesc')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">{t('basicInfo')}</TabsTrigger>
            <TabsTrigger value="appearance">{t('appearance')}</TabsTrigger>
            <TabsTrigger value="defaults">{t('defaults')}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('projectName')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('projectNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">{t('customInstructions')}</Label>
              <Textarea
                id="instructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder={t('customInstructionsPlaceholder')}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {t('customInstructionsHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('tags')}</Label>
              <TagInput
                value={tags}
                onChange={setTags}
                placeholder={t('tagsPlaceholder')}
                maxTags={5}
              />
              <p className="text-xs text-muted-foreground">
                {t('tagsHint')}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 pt-4">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}20` }}
              >
                <IconPreview className="h-8 w-8" color={color} />
              </div>
              <div>
                <p className="font-medium">{name || 'Project Preview'}</p>
                <p className="text-sm text-muted-foreground">
                  {description || 'Project description'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('icon')}</Label>
              <div className="grid grid-cols-5 gap-2">
                {PROJECT_ICONS.map((iconName) => {
                  const IconComp = iconMap[iconName] || Folder;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      className={cn(
                        'flex h-10 w-full items-center justify-center rounded-md border transition-colors',
                        icon === iconName
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-accent'
                      )}
                    >
                      <IconComp className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('color')}</Label>
              <div className="grid grid-cols-5 gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'flex h-10 w-full items-center justify-center rounded-md border transition-all',
                      color === c.value
                        ? 'ring-2 ring-offset-2'
                        : 'hover:scale-105'
                    )}
                    style={{
                      backgroundColor: c.value,
                      '--tw-ring-color': c.value,
                    } as React.CSSProperties}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="defaults" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              {t('defaultsDesc')}
            </p>

            <div className="space-y-2">
              <Label htmlFor="provider">{t('defaultProvider')}</Label>
              <Select value={defaultProvider} onValueChange={setDefaultProvider}>
                <SelectTrigger>
                  <SelectValue placeholder={tPlaceholders('useGlobalDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tPlaceholders('useGlobalDefault')}</SelectItem>
                  {Object.entries(PROVIDERS).map(([id, provider]) => (
                    <SelectItem key={id} value={id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProvider && (
              <div className="space-y-2">
                <Label htmlFor="model">{t('defaultModel')}</Label>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger>
                    <SelectValue placeholder={tPlaceholders('useProviderDefault')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{tPlaceholders('useProviderDefault')}</SelectItem>
                    {selectedProvider.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mode">{t('defaultMode')}</Label>
              <Select value={defaultMode} onValueChange={(v) => setDefaultMode(v as typeof defaultMode)}>
                <SelectTrigger>
                  <SelectValue placeholder={tPlaceholders('useGlobalDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{tPlaceholders('useGlobalDefault')}</SelectItem>
                  <SelectItem value="chat">{tCommon('chat')}</SelectItem>
                  <SelectItem value="agent">{tCommon('agent')}</SelectItem>
                  <SelectItem value="research">{tCommon('research')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {isEdit ? tCommon('save') : t('createProject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateProjectDialog;
