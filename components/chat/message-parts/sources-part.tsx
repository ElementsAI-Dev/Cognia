'use client';

/**
 * SourcesPart - Renders search result sources with optional verification badges
 */

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

// Credibility badge configuration
const credibilityConfig: Record<CredibilityLevel, { 
  icon: React.ReactNode; 
  label: string; 
  className: string;
}> = {
  high: {
    icon: <ShieldCheck className="h-3 w-3" />,
    label: '高可信度',
    className: 'text-green-600',
  },
  medium: {
    icon: <Shield className="h-3 w-3" />,
    label: '中等可信度',
    className: 'text-yellow-600',
  },
  low: {
    icon: <ShieldAlert className="h-3 w-3" />,
    label: '低可信度',
    className: 'text-red-600',
  },
  unknown: {
    icon: <ShieldQuestion className="h-3 w-3" />,
    label: '未知',
    className: 'text-gray-600',
  },
};

interface SourcesPartProps {
  part: SourcesPartType;
}

export function SourcesPart({ part }: SourcesPartProps) {
  const showVerificationBadges = useSettingsStore(
    (state) => state.sourceVerificationSettings.showVerificationBadges
  );

  if (!part.sources || part.sources.length === 0) {
    return null;
  }

  return (
    <Sources>
      <SourcesTrigger count={part.sources.length} />
      <SourcesContent>
        {part.sources.map((source) => {
          const verification = source.verification;
          const credibility = verification?.credibilityLevel || 'unknown';
          const config = credibilityConfig[credibility];
          
          return (
            <Source key={source.id} href={source.url} title={source.title}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">{source.title}</span>
                  {showVerificationBadges && verification && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn('inline-flex', config.className)}>
                            {config.icon}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{config.label}</p>
                          <p className="text-xs text-muted-foreground">
                            可信度: {Math.round(verification.credibilityScore * 100)}%
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
