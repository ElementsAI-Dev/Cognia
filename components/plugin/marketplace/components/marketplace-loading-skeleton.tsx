'use client';

/**
 * MarketplaceLoadingSkeleton - Loading skeleton for marketplace
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ViewMode } from './marketplace-types';

interface LoadingSkeletonProps {
  viewMode: ViewMode;
}

export function MarketplaceLoadingSkeleton({ viewMode }: LoadingSkeletonProps) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border animate-pulse">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default MarketplaceLoadingSkeleton;
