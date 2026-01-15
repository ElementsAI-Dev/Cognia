'use client';

/**
 * Observability Page - Dashboard for AI observability and tracing
 */

import { ObservabilityDashboard } from '@/components/observability';

export default function ObservabilityPage() {
  return (
    <div className="flex flex-col h-full">
      <ObservabilityDashboard />
    </div>
  );
}
