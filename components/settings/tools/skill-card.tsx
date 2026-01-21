'use client';

/**
 * SkillCard Component
 *
 * Displays a skill card with details, actions, and expand/collapse functionality.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SKILL_CATEGORY_KEYS } from '@/lib/settings/tools';
import { SKILL_CATEGORY_ICONS } from './skill-icons';
import type { Skill } from '@/types/system/skill';
import type { useTranslations } from 'next-intl';

export interface SkillCardProps {
  skill: Skill;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onActivate: () => void;
  t: ReturnType<typeof useTranslations>;
}

export function SkillCard({ skill, onEdit, onDelete, onToggle, onActivate, t }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`transition-all ${skill.status === 'disabled' ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {SKILL_CATEGORY_ICONS[skill.category]}
            <CardTitle className="text-base">{skill.metadata.name}</CardTitle>
            {skill.source === 'builtin' && (
              <Badge variant="secondary" className="text-xs">
                {t('builtin')}
              </Badge>
            )}
            {skill.isActive && (
              <Badge variant="default" className="text-xs bg-green-500">
                {t('active')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={skill.status === 'enabled'} onCheckedChange={onToggle} />
          </div>
        </div>
        <CardDescription className="line-clamp-2">{skill.metadata.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {skill.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {skill.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{skill.tags.length - 3}
                </Badge>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>{t('category')}:</strong>{' '}
                {t(`categories.${SKILL_CATEGORY_KEYS[skill.category]}`)}
              </p>
              <p>
                <strong>{t('source')}:</strong> {skill.source}
              </p>
              {skill.version && (
                <p>
                  <strong>{t('version')}:</strong> {skill.version}
                </p>
              )}
              {skill.usageCount !== undefined && (
                <p>
                  <strong>{t('used')}:</strong> {skill.usageCount} {t('times')}
                </p>
              )}
            </div>
            {skill.validationErrors && skill.validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('validationErrors')}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {skill.validationErrors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onActivate}>
                {skill.isActive ? t('deactivate') : t('activate')}
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-1" />
                {t('edit')}
              </Button>
              {skill.source !== 'builtin' && (
                <Button variant="outline" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('delete')}
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
