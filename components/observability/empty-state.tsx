'use client';

/**
 * Empty State Component
 *
 * Displayed when there's no observability data.
 * Uses @ui/empty component for consistent empty state styling.
 */

import { useTranslations } from 'next-intl';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { BarChart3, MessageSquare, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  type?: 'no-data' | 'disabled';
}

export function EmptyState({ type = 'no-data' }: EmptyStateProps) {
  const t = useTranslations('observability.emptyState');

  if (type === 'disabled') {
    return (
      <Empty className="w-full border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Settings className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>{t('disabledTitle')}</EmptyTitle>
          <EmptyDescription>{t('disabledDescription')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              {t('goToSettings')}
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="w-full border py-16">
      <EmptyHeader>
        <EmptyMedia>
          <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6">
            <BarChart3 className="h-12 w-12 text-primary" />
          </div>
        </EmptyMedia>
        <EmptyTitle>{t('noDataTitle')}</EmptyTitle>
        <EmptyDescription>{t('noDataDescription')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <MessageSquare className="h-6 w-6 text-primary mb-2" />
            <span className="text-sm font-medium">{t('tip1Title')}</span>
            <span className="text-xs text-muted-foreground">{t('tip1Desc')}</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <Sparkles className="h-6 w-6 text-primary mb-2" />
            <span className="text-sm font-medium">{t('tip2Title')}</span>
            <span className="text-xs text-muted-foreground">{t('tip2Desc')}</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
            <BarChart3 className="h-6 w-6 text-primary mb-2" />
            <span className="text-sm font-medium">{t('tip3Title')}</span>
            <span className="text-xs text-muted-foreground">{t('tip3Desc')}</span>
          </div>
        </div>
      </EmptyContent>
    </Empty>
  );
}
