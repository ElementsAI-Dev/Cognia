"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  MessageSquare,
  Trash2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PromptTemplate } from '@/types/content/prompt-template';
import { PromptFeedbackCollector } from './prompt-feedback-collector';

interface PromptTemplateCardProps {
  template: PromptTemplate;
  onEdit: (template: PromptTemplate) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onFeedback?: (template: PromptTemplate) => void;
  onUse?: (template: PromptTemplate) => void;
}

export function PromptTemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onFeedback,
  onUse,
}: PromptTemplateCardProps) {
  const t = useTranslations('promptTemplate.card');
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>{template.meta?.icon ?? '📝'}</span>
              {template.name}
            </CardTitle>
            {template.description && (
              <CardDescription>{template.description}</CardDescription>
            )}
            <div className="flex flex-wrap gap-2">
              {template.category && <Badge variant="secondary">{template.category}</Badge>}
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="template-actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(template)}>
                <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate?.(template.id)}>
                <Copy className="mr-2 h-4 w-4" /> {t('duplicate')}
              </DropdownMenuItem>
              {onFeedback && (
                <DropdownMenuItem onClick={() => onFeedback?.(template)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> {t('feedback')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(template.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {template.content || t('noContent')}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{template.targets?.join(', ') || 'chat'}</span>
          <span>{t('usedCount', { count: template.usageCount })}</span>
        </div>
        {onUse && (
          <Button size="sm" className="flex-1" onClick={() => onUse?.(template)}>
            <Zap className="mr-1 h-3.5 w-3.5" />
            {t('useTemplate')}
          </Button>
        )}
        {showFeedback && (
          <div className="mt-3 pt-3 border-t">
            <PromptFeedbackCollector
              templateId={template.id}
              templateName={template.name}
              variant="compact"
              onFeedbackSubmitted={() => setShowFeedback(false)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
