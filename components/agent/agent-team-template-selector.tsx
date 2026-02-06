'use client';

/**
 * AgentTeamTemplateSelector - Select a team template to create a new team
 */

import {
  ShieldCheck,
  FlaskConical,
  BookOpen,
  Layers,
  GitBranch,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AgentTeamTemplate } from '@/types/agent/agent-team';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';

// ============================================================================
// Icon Map
// ============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  FlaskConical,
  BookOpen,
  Layers,
  GitBranch,
  Users,
};

function TemplateIcon({ icon }: { icon?: string }) {
  const IconComponent = icon ? ICON_MAP[icon] || Users : Users;
  return <IconComponent className="size-5" />;
}

// ============================================================================
// Category Colors
// ============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  review: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  research: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  development: 'bg-green-500/10 text-green-500 border-green-500/20',
  debugging: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  analysis: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  general: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

// ============================================================================
// TemplateCard
// ============================================================================

interface TemplateCardProps {
  template: AgentTeamTemplate;
  onSelect: (template: AgentTeamTemplate) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={() => onSelect(template)}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-all',
        'hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex size-10 items-center justify-center rounded-lg border',
          CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general,
        )}>
          <TemplateIcon icon={template.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">{template.name}</h4>
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', CATEGORY_COLORS[template.category])}
            >
              {template.category}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {template.teammates.map((tm, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tm.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// AgentTeamTemplateSelector
// ============================================================================

export interface AgentTeamTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: AgentTeamTemplate) => void;
}

export function AgentTeamTemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
}: AgentTeamTemplateSelectorProps) {
  const templates = useAgentTeamStore((s) => s.templates);
  const templateList = Object.values(templates);

  const builtIn = templateList.filter(t => t.isBuiltIn);
  const custom = templateList.filter(t => !t.isBuiltIn);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Choose Team Template
          </DialogTitle>
          <DialogDescription>
            Select a template to create a new agent team, or start from scratch.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Built-in Templates */}
            {builtIn.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Built-in Templates
                </h3>
                <div className="space-y-2">
                  {builtIn.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={(t) => {
                        onSelectTemplate(t);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom Templates */}
            {custom.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Custom Templates
                </h3>
                <div className="space-y-2">
                  {custom.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={(t) => {
                        onSelectTemplate(t);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Create from scratch */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onSelectTemplate({
                  id: 'custom',
                  name: 'Custom Team',
                  description: 'Start with an empty team',
                  category: 'general',
                  teammates: [],
                  isBuiltIn: false,
                });
                onOpenChange(false);
              }}
            >
              <Users className="size-4" />
              Start from Scratch
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
