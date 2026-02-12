/**
 * useProjectStats - hook for computing project statistics
 */

import { useMemo } from 'react';
import { useProjectStore, useSessionStore } from '@/stores';

export interface ProjectStats {
  totalProjects: number;
  totalSessions: number;
  recentProjects: number;
}

/**
 * Compute aggregate project statistics
 */
export function useProjectStats(): ProjectStats {
  const projects = useProjectStore((state) => state.projects);
  const sessions = useSessionStore((state) => state.sessions);

  return useMemo(() => {
    const totalProjects = projects.length;
    const totalSessions = sessions.filter((s) => s.projectId).length;
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    const dayAgoTime = dayAgo.getTime();
    const recentProjects = projects.filter(
      (p) => new Date(p.updatedAt).getTime() > dayAgoTime
    ).length;

    return { totalProjects, totalSessions, recentProjects };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentProjects is approximate, ok to recalc on projects/sessions change
  }, [projects.length, sessions.length]);
}
