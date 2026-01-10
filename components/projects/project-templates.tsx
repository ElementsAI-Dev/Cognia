'use client';

/**
 * ProjectTemplates - create projects from predefined templates
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Code,
  BookOpen,
  Briefcase,
  PenTool,
  Rocket,
  GraduationCap,
  Heart,
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
import { toast } from 'sonner';
import { useProjectStore } from '@/stores';
import type { CreateProjectInput, ProjectTemplate } from '@/types';

export type { ProjectTemplate } from '@/types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Code,
  BookOpen,
  Briefcase,
  PenTool,
  Rocket,
  GraduationCap,
  Heart,
  Sparkles,
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'coding-assistant',
    name: 'Coding Assistant',
    description: 'AI-powered coding help with code reviews, debugging, and documentation',
    icon: 'Code',
    color: '#3B82F6',
    defaultMode: 'agent',
    customInstructions: 'You are an expert software developer. Help with coding tasks, code reviews, debugging, and technical documentation. Always provide clean, well-documented code examples.',
    tags: ['development', 'coding'],
    category: 'development',
  },
  {
    id: 'research-project',
    name: 'Research Project',
    description: 'Organize research with AI-assisted analysis and summarization',
    icon: 'BookOpen',
    color: '#8B5CF6',
    defaultMode: 'research',
    customInstructions: 'You are a research assistant. Help analyze documents, summarize findings, and organize research materials. Provide citations and references when possible.',
    tags: ['research', 'learning'],
    category: 'research',
  },
  {
    id: 'business-strategy',
    name: 'Business Strategy',
    description: 'Strategic planning and business analysis with AI insights',
    icon: 'Briefcase',
    color: '#F97316',
    defaultMode: 'chat',
    customInstructions: 'You are a business strategist. Help with market analysis, competitive research, and strategic planning. Provide actionable insights and recommendations.',
    tags: ['work', 'business'],
    category: 'business',
  },
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    description: 'Writing assistant for stories, articles, and creative content',
    icon: 'PenTool',
    color: '#EC4899',
    defaultMode: 'chat',
    customInstructions: 'You are a creative writing assistant. Help with storytelling, character development, and prose improvement. Provide constructive feedback and suggestions.',
    tags: ['writing', 'creative'],
    category: 'writing',
  },
  {
    id: 'startup-launch',
    name: 'Startup Launch',
    description: 'Plan and execute your startup idea with AI guidance',
    icon: 'Rocket',
    color: '#22C55E',
    defaultMode: 'agent',
    customInstructions: 'You are a startup advisor. Help with product development, go-to-market strategy, and pitch preparation. Provide practical, actionable advice for early-stage founders.',
    tags: ['work', 'startup'],
    category: 'business',
  },
  {
    id: 'learning-path',
    name: 'Learning Path',
    description: 'Personalized learning with AI tutoring and study plans',
    icon: 'GraduationCap',
    color: '#14B8A6',
    defaultMode: 'chat',
    customInstructions: 'You are a patient and knowledgeable tutor. Help create personalized learning paths, explain complex concepts, and provide practice exercises. Adapt to the learner\'s pace and style.',
    tags: ['learning', 'personal'],
    category: 'personal',
  },
  {
    id: 'personal-journal',
    name: 'Personal Journal',
    description: 'Reflective journaling with AI prompts and insights',
    icon: 'Heart',
    color: '#EF4444',
    defaultMode: 'chat',
    customInstructions: 'You are a thoughtful companion for personal reflection. Help with journaling prompts, goal setting, and self-discovery. Be supportive and non-judgmental.',
    tags: ['personal', 'journal'],
    category: 'personal',
  },
  {
    id: 'blank-project',
    name: 'Blank Project',
    description: 'Start fresh with a clean slate',
    icon: 'Sparkles',
    color: '#6B7280',
    defaultMode: 'chat',
    customInstructions: '',
    tags: [],
    category: 'personal',
  },
];

const CATEGORY_LABELS: Record<ProjectTemplate['category'], string> = {
  development: 'Development',
  writing: 'Writing',
  research: 'Research',
  business: 'Business',
  personal: 'Personal',
};

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
      const input: CreateProjectInput = {
        name: template.name,
        description: template.description,
        icon: template.icon,
        color: template.color,
        defaultMode: template.defaultMode,
        customInstructions: template.customInstructions,
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
          <DialogTitle>Create from Template</DialogTitle>
          <DialogDescription>
            Choose a template to quickly set up your project
          </DialogDescription>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Badge>
          {(Object.keys(CATEGORY_LABELS) as ProjectTemplate['category'][]).map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              {CATEGORY_LABELS[category]}
            </Badge>
          ))}
        </div>

        {/* Templates grid */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
            {filteredTemplates.map((template) => {
              const IconComponent = ICON_MAP[template.icon] || Sparkles;
              
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  disabled={isCreating}
                  className="flex items-start gap-3 p-4 rounded-lg border text-left hover:border-primary/50 hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <span style={{ color: template.color }}>
                      <IconComponent className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {template.description}
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
                </button>
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
