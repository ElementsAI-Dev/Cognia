/**
 * Project Activity Store - tracks project activities and changes
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'project_unarchived'
  | 'session_added'
  | 'session_removed'
  | 'knowledge_added'
  | 'knowledge_removed'
  | 'knowledge_updated'
  | 'tags_updated'
  | 'settings_updated';

export interface ProjectActivity {
  id: string;
  projectId: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface ProjectActivityState {
  activities: ProjectActivity[];
  maxActivitiesPerProject: number;

  // Actions
  addActivity: (
    projectId: string,
    type: ActivityType,
    description: string,
    metadata?: Record<string, unknown>
  ) => void;
  getActivitiesForProject: (projectId: string) => ProjectActivity[];
  clearActivitiesForProject: (projectId: string) => void;
  clearAllActivities: () => void;
}

const MAX_ACTIVITIES_PER_PROJECT = 100;

export const useProjectActivityStore = create<ProjectActivityState>()(
  persist(
    (set, get) => ({
      activities: [],
      maxActivitiesPerProject: MAX_ACTIVITIES_PER_PROJECT,

      addActivity: (projectId, type, description, metadata) => {
        const newActivity: ProjectActivity = {
          id: nanoid(),
          projectId,
          type,
          description,
          timestamp: new Date(),
          metadata,
        };

        set((state) => {
          // Get existing activities for this project
          const projectActivities = state.activities.filter(
            (a) => a.projectId === projectId
          );
          const otherActivities = state.activities.filter(
            (a) => a.projectId !== projectId
          );

          // Limit activities per project
          const limitedProjectActivities = [
            newActivity,
            ...projectActivities,
          ].slice(0, state.maxActivitiesPerProject);

          return {
            activities: [...limitedProjectActivities, ...otherActivities],
          };
        });
      },

      getActivitiesForProject: (projectId) => {
        const { activities } = get();
        return activities
          .filter((a) => a.projectId === projectId)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      },

      clearActivitiesForProject: (projectId) => {
        set((state) => ({
          activities: state.activities.filter((a) => a.projectId !== projectId),
        }));
      },

      clearAllActivities: () => {
        set({ activities: [] });
      },
    }),
    {
      name: 'cognia-project-activities',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activities: state.activities.map((a) => ({
          ...a,
          timestamp:
            a.timestamp instanceof Date
              ? a.timestamp.toISOString()
              : a.timestamp,
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.activities) {
          state.activities = state.activities.map((a) => ({
            ...a,
            timestamp: new Date(a.timestamp),
          }));
        }
      },
    }
  )
);

/**
 * Helper function to get activity description
 */
export function getActivityDescription(
  type: ActivityType,
  metadata?: Record<string, unknown>
): string {
  const descriptions: Record<ActivityType, string | ((m?: Record<string, unknown>) => string)> = {
    project_created: 'Project created',
    project_updated: (m) => m?.field ? `Updated ${m.field}` : 'Project settings updated',
    project_archived: 'Project archived',
    project_unarchived: 'Project unarchived',
    session_added: (m) => m?.sessionTitle ? `Added session: ${m.sessionTitle}` : 'Session added',
    session_removed: (m) => m?.sessionTitle ? `Removed session: ${m.sessionTitle}` : 'Session removed',
    knowledge_added: (m) => m?.fileName ? `Added file: ${m.fileName}` : 'Knowledge file added',
    knowledge_removed: (m) => m?.fileName ? `Removed file: ${m.fileName}` : 'Knowledge file removed',
    knowledge_updated: (m) => m?.fileName ? `Updated file: ${m.fileName}` : 'Knowledge file updated',
    tags_updated: (m) => m?.tags ? `Tags: ${(m.tags as string[]).join(', ')}` : 'Tags updated',
    settings_updated: 'Project settings updated',
  };

  const desc = descriptions[type];
  if (typeof desc === 'function') {
    return desc(metadata);
  }
  return desc;
}

export default useProjectActivityStore;
