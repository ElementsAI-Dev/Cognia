'use client';

/**
 * ProviderEmptyState - Empty state component for when no providers are configured
 * Matches the design spec with centered layout and action buttons
 */

import { Cpu, Plus, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ReactNode } from 'react';

interface ProviderEmptyStateProps {
  onAddProvider: () => void;
  onImportSettings: () => void;
  importButton?: ReactNode;
}

export function ProviderEmptyState({
  onAddProvider,
  onImportSettings,
  importButton,
}: ProviderEmptyStateProps) {
  const t = useTranslations('providers');

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-4">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-6">
          <Cpu className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('emptyStateTitle') || 'No AI Providers Configured'}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          {t('emptyStateDescription') ||
            'Add your first AI provider to start chatting with language models. You can configure OpenAI, Anthropic, Google, and more.'}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={onAddProvider} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('addProvider') || 'Add Provider'}
          </Button>
          {importButton ? (
            importButton
          ) : (
            <Button variant="outline" onClick={onImportSettings} className="gap-2">
              <Upload className="h-4 w-4" />
              {t('importSettings') || 'Import Settings'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProviderEmptyState;
