'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PromptTemplateCardSkeletonProps {
  showFooter?: boolean;
}

export function PromptTemplateCardSkeleton({ showFooter = false }: PromptTemplateCardSkeletonProps) {
  return (
    <Card className="h-full overflow-hidden border-border/50 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-5 space-y-4">
        {/* Header: Icon + Title/Category */}
        <div className="flex items-start gap-3">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 py-0.5 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>

        {/* Content Preview */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-18 rounded-md" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/40">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-8" />
          <Skeleton className="h-3.5 w-16 ml-auto" />
        </div>
      </CardContent>

      {showFooter && (
        <CardFooter className="p-4 pt-0">
          <Skeleton className="h-9 w-full rounded-md" />
        </CardFooter>
      )}
    </Card>
  );
}
