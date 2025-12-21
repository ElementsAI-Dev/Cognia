'use client';

/**
 * CreateProjectDialog - dialog for creating/editing projects
 */

import { useState, useEffect } from 'react';
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
          <DialogTitle>{isEdit ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update your project settings and preferences.'
              : 'Create a new project to organize your conversations and knowledge.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Custom Instructions</Label>
              <Textarea
                id="instructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Special instructions for AI when working on this project..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be added to every conversation in this project.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                value={tags}
                onChange={setTags}
                placeholder="Add tags to organize..."
                maxTags={5}
              />
              <p className="text-xs text-muted-foreground">
                Tags help you filter and organize projects.
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
              <Label>Icon</Label>
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
              <Label>Color</Label>
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
              Set default values for new conversations in this project.
            </p>

            <div className="space-y-2">
              <Label htmlFor="provider">Default Provider</Label>
              <Select value={defaultProvider} onValueChange={setDefaultProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Use global default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Use global default</SelectItem>
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
                <Label htmlFor="model">Default Model</Label>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use provider default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use provider default</SelectItem>
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
              <Label htmlFor="mode">Default Mode</Label>
              <Select value={defaultMode} onValueChange={(v) => setDefaultMode(v as typeof defaultMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Use global default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Use global default</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateProjectDialog;
