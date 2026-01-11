"use client";

import { useState } from 'react';
import { MoreHorizontal, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PromptTemplate } from '@/types/content/prompt-template';
import { PromptFeedbackCollector } from './prompt-feedback-collector';

interface PromptTemplateCardProps {
  template: PromptTemplate;
  onEdit: (template: PromptTemplate) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect?: (template: PromptTemplate) => void;
}

export function PromptTemplateCard({ template, onEdit, onDuplicate, onDelete, onSelect }: PromptTemplateCardProps) {
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
              <DropdownMenuItem onClick={() => onEdit(template)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template.id)}>Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFeedback(true)}>
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Feedback
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(template.id)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="line-clamp-3 whitespace-pre-line border rounded-md bg-muted/60 p-3 text-foreground/80">
          {template.content || 'No content yet'}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{template.targets?.join(', ') || 'chat'}</span>
          <span>Used {template.usageCount}×</span>
        </div>
        {onSelect && (
          <Button size="sm" className="w-full" onClick={() => onSelect(template)}>
            Use template
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
