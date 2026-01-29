'use client';

/**
 * Empty State Component
 *
 * Displayed when there's no observability data.
 */

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, MessageSquare, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  type?: 'no-data' | 'disabled';
  onEnableClick?: () => void;
}

export function EmptyState({ type = 'no-data', onEnableClick: _onEnableClick }: EmptyStateProps) {
  const t = useTranslations('observability.emptyState');

  if (type === 'disabled') {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('disabledTitle')}</h3>
          <p className="text-muted-foreground max-w-md mb-6">{t('disabledDescription')}</p>
          <Button asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              {t('goToSettings')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6 mb-6">
          <BarChart3 className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t('noDataTitle')}</h3>
        <p className="text-muted-foreground max-w-md mb-8">{t('noDataDescription')}</p>

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
      </CardContent>
    </Card>
  );
}
