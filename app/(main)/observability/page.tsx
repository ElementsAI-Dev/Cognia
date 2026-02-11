'use client';

/**
 * Observability Page - Dashboard for AI observability and tracing
 */

import { Suspense, lazy } from 'react';
import { DashboardSkeleton } from '@/components/observability';

const ObservabilityDashboard = lazy(() =>
  import('@/components/observability/observability-dashboard').then((mod) => ({
    default: mod.ObservabilityDashboard,
  }))
);

export default function ObservabilityPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<DashboardSkeleton />}>
        <ObservabilityDashboard />
      </Suspense>
    </div>
  );
}
