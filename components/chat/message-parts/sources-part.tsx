'use client';

/**
 * SourcesPart - Renders search result sources with optional verification badges
 */

import { useTranslations } from 'next-intl';
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from '@/components/ai-elements/sources';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores';
import { 
  ShieldCheck, 
  Shield, 
  ShieldAlert, 
  ShieldQuestion 
} from 'lucide-react';
import type { SourcesPart as SourcesPartType } from '@/types/core/message';
import type { CredibilityLevel } from '@/types/search';
import { cn } from '@/lib/utils';

// Credibility icon and style configuration (labels are i18n)
const credibilityIcons: Record<CredibilityLevel, {
  icon: React.ReactNode;
  className: string;
}> = {
  high: {
    icon: <ShieldCheck className="h-3 w-3" />,
    className: 'text-green-600',
  },
  medium: {
    icon: <Shield className="h-3 w-3" />,
    className: 'text-yellow-600',
  },
  low: {
    icon: <ShieldAlert className="h-3 w-3" />,
    className: 'text-red-600',
  },
  unknown: {
    icon: <ShieldQuestion className="h-3 w-3" />,
    className: 'text-gray-600',
  },
};

interface SourcesPartProps {
  part: SourcesPartType;
}

export function SourcesPart({ part }: SourcesPartProps) {
  const t = useTranslations('sources');
  const showVerificationBadges = useSettingsStore(
    (state) => state.sourceVerificationSettings.showVerificationBadges
  );

  if (!part.sources || part.sources.length === 0) {
    return null;
  }

  // Get credibility label from i18n
  const getCredibilityLabel = (level: CredibilityLevel) => {
    return t(`credibility.${level}`);
  };

  return (
    <Sources>
      <SourcesTrigger count={part.sources.length} />
      <SourcesContent>
        {part.sources.map((source) => {
          const verification = source.verification;
          const credibility = verification?.credibilityLevel || 'unknown';
          const iconConfig = credibilityIcons[credibility];

          return (
            <Source key={source.id} href={source.url} title={source.title}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">{source.title}</span>
                  {showVerificationBadges && verification && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn('inline-flex', iconConfig.className)}>
                            {iconConfig.icon}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getCredibilityLabel(credibility)}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('credibilityScore', { score: Math.round(verification.credibilityScore * 100) })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {source.snippet}
                </span>
                {showVerificationBadges && verification?.sourceType && verification.sourceType !== 'unknown' && (
                  <Badge variant="outline" className="text-xs mt-1 w-fit px-1.5 py-0">
                    {verification.sourceType}
                  </Badge>
                )}
              </div>
            </Source>
          );
        })}
      </SourcesContent>
    </Sources>
  );
}
