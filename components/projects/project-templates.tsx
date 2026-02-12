'use client';

/**
 * ProjectTemplates - create projects from predefined templates
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useProjectStore } from '@/stores';
import type { CreateProjectInput, ProjectTemplate } from '@/types';
import { PROJECT_ICON_MAP } from '@/lib/project/utils';
import { PROJECT_TEMPLATES, CATEGORY_LABELS } from '@/lib/project/templates';

export type { ProjectTemplate } from '@/types';
export { PROJECT_TEMPLATES } from '@/lib/project/templates';

interface ProjectTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectId: string) => void;
}

export function ProjectTemplatesDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: ProjectTemplatesDialogProps) {
  const t = useTranslations('templates');
  const tToasts = useTranslations('toasts');
  const [selectedCategory, setSelectedCategory] = useState<ProjectTemplate['category'] | 'all'>('all');
  const [isCreating, setIsCreating] = useState(false);

  const createProject = useProjectStore((state) => state.createProject);

  const filteredTemplates = selectedCategory === 'all'
    ? PROJECT_TEMPLATES
    : PROJECT_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleSelectTemplate = async (template: ProjectTemplate) => {
    setIsCreating(true);
    try {
      const templateKey = template.id.replace(/-/g, '') as keyof typeof templateKeyMap;
      const templateKeyMap = {
        'codingassistant': 'codingAssistant',
        'researchproject': 'researchProject',
        'businessstrategy': 'businessStrategy',
        'creativewriting': 'creativeWriting',
        'startuplaunch': 'startupLaunch',
        'learningpath': 'learningPath',
        'personaljournal': 'personalJournal',
        'blankproject': 'blankProject',
      } as const;
      const tKey = templateKeyMap[templateKey] || 'blankProject';
      
      const input: CreateProjectInput = {
        name: t(`${tKey}.name`),
        description: t(`${tKey}.description`),
        icon: template.icon,
        color: template.color,
        defaultMode: template.defaultMode,
        customInstructions: t(`${tKey}.instructions`),
        tags: template.tags,
      };

      const project = createProject(input);
      toast.success(tToasts('projectCreated', { name: project.name }));
      onOpenChange(false);
      onProjectCreated?.(project.id);
    } catch (_error) {
      toast.error(tToasts('projectCreateFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('createFromTemplate')}</DialogTitle>
          <DialogDescription>
            {t('chooseTemplate')}
          </DialogDescription>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('all')}
          >
            {t('all')}
          </Badge>
          {(Object.keys(CATEGORY_LABELS) as ProjectTemplate['category'][]).map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              {t(`categories.${category}`)}
            </Badge>
          ))}
        </div>

        {/* Templates grid */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
            {filteredTemplates.map((template) => {
              const IconComponent = PROJECT_ICON_MAP[template.icon] || Sparkles;
              const templateKeyMap: Record<string, string> = {
                'coding-assistant': 'codingAssistant',
                'research-project': 'researchProject',
                'business-strategy': 'businessStrategy',
                'creative-writing': 'creativeWriting',
                'startup-launch': 'startupLaunch',
                'learning-path': 'learningPath',
                'personal-journal': 'personalJournal',
                'blank-project': 'blankProject',
              };
              const tKey = templateKeyMap[template.id] || 'blankProject';
              
              return (
                <Tooltip key={template.id}>
                  <TooltipTrigger asChild>
                    <Card
                      className="cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors disabled:opacity-50"
                      onClick={() => !isCreating && handleSelectTemplate(template)}
                    >
                      <CardContent className="flex items-start gap-3 p-4">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${template.color}20` }}
                        >
                          <span style={{ color: template.color }}>
                            <IconComponent className="h-5 w-5" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="font-medium text-sm">{t(`${tKey}.name`)}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {t(`${tKey}.description`)}
                          </p>
                          <div className="flex gap-1 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.defaultMode}
                            </Badge>
                            {template.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('clickToCreate')}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>

        {isCreating && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProjectTemplatesDialog;
