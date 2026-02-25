'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Briefcase,
  Rocket,
  GraduationCap,
  BarChart,
  Zap,
  FileText,
  BookOpen,
  Image,
  LineChart,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  PPT_WORKFLOW_TEMPLATES,
  PPT_ENHANCED_TEMPLATES,
} from '@/lib/ai/workflows/ppt-workflow';
import type { WorkflowTemplate } from '@/types/workflow';

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Rocket,
  GraduationCap,
  BarChart,
  Zap,
  FileText,
  BookOpen,
  Image,
  LineChart,
};

const CATEGORY_LABELS: Record<string, string> = {
  business: 'Business',
  marketing: 'Marketing',
  education: 'Education',
  quick: 'Quick',
  content: 'Content',
  creative: 'Creative',
  data: 'Data',
};

export interface PPTTemplateGalleryProps {
  onSelect: (template: WorkflowTemplate) => void;
  compact?: boolean;
  className?: string;
}

export function PPTTemplateGallery({
  onSelect,
  compact = false,
  className,
}: PPTTemplateGalleryProps) {
  const t = useTranslations('pptGenerator');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const allTemplates = useMemo(
    () => [...PPT_WORKFLOW_TEMPLATES, ...PPT_ENHANCED_TEMPLATES],
    []
  );

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map((tpl) => tpl.category));
    return ['all', ...Array.from(cats)];
  }, [allTemplates]);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return allTemplates;
    return allTemplates.filter((tpl) => tpl.category === selectedCategory);
  }, [allTemplates, selectedCategory]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Category filter */}
      <Tabs
        value={selectedCategory}
        onValueChange={setSelectedCategory}
      >
        <TabsList className="h-8">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs h-6 px-2.5">
              {cat === 'all'
                ? t('allTemplates')
                : CATEGORY_LABELS[cat] || cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Template grid */}
      <ScrollArea className={compact ? 'max-h-48' : 'max-h-72'}>
        <div
          className={cn(
            'grid gap-2',
            compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          )}
        >
          {filteredTemplates.map((tpl) => {
            const IconComp = ICON_MAP[tpl.icon || ''] || FileText;
            const inputs = tpl.presetInputs as Record<string, unknown> | undefined;

            return (
              <Card
                key={tpl.id}
                className="cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
                onClick={() => onSelect(tpl)}
              >
                <CardContent className={cn('flex flex-col gap-1.5', compact ? 'p-2.5' : 'p-3')}>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <IconComp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className={cn('font-medium truncate', compact ? 'text-xs' : 'text-sm')}>
                      {tpl.name}
                    </span>
                  </div>
                  {!compact && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {tpl.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {CATEGORY_LABELS[tpl.category] || tpl.category}
                    </Badge>
                    {Boolean(inputs?.slideCount) && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {String(inputs?.slideCount)} slides
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default PPTTemplateGallery;
