/**
 * useProjectActivity - hook for accessing project activities
 */

import { useMemo } from 'react';
import { useProjectActivityStore } from '@/stores';
import type { ProjectActivityItem } from '@/types';

/**
 * Get project activities for a specific project
 * Provides a simpler interface than accessing the store directly
 */
export function useProjectActivity(projectId: string): ProjectActivityItem[] {
  const activities = useProjectActivityStore((state) => state.activities);
  return useMemo(
    () => activities.filter((a) => a.projectId === projectId),
    [activities, projectId]
  );
}
