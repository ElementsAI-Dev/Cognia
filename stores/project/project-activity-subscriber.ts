/**
 * Project Activity Subscriber
 * Automatically logs activities when project store changes
 * Also tracks session messageCount changes to update project messageCount
 */

import { useProjectStore } from './project-store';
import { useProjectActivityStore, getActivityDescription } from './project-activity-store';
import type { Project, Session } from '@/types';

let previousState: {
  projects: Project[];
  activeProjectId: string | null;
} | null = null;

let _previousSessions: Session[] | null = null;

/**
 * Initialize session messageCount tracking for projects.
 * When a session's messageCount changes, propagate the delta to its project.
 */
export function initSessionMessageCountSubscriber(): (() => void) | null {
  try {
    // Lazy import to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useSessionStore } = require('@/stores/chat/session-store');

    const unsubscribe = useSessionStore.subscribe((state: { sessions: Session[] }) => {
      if (!_previousSessions) {
        _previousSessions = state.sessions;
        return;
      }

      const { incrementMessageCount, getProjectForSession } = useProjectStore.getState();

      for (const session of state.sessions) {
        const prev = _previousSessions.find((s: Session) => s.id === session.id);
        if (!prev) continue;

        const delta = (session.messageCount || 0) - (prev.messageCount || 0);
        if (delta > 0) {
          const project = getProjectForSession(session.id);
          if (project) {
            incrementMessageCount(project.id, delta);
          }
        }
      }

      _previousSessions = state.sessions;
    });

    return unsubscribe;
  } catch {
    // Session store not available yet
    return null;
  }
}

/**
 * Initialize the project activity subscriber
 * Call this once during app initialization
 */
export function initProjectActivitySubscriber(): () => void {
  const unsubscribe = useProjectStore.subscribe((state) => {
    if (!previousState) {
      previousState = {
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      };
      return;
    }

    const { addActivity } = useProjectActivityStore.getState();
    const currentProjects = state.projects;
    const prevProjects = previousState.projects;

    // Detect new projects
    for (const project of currentProjects) {
      const prevProject = prevProjects.find((p) => p.id === project.id);

      if (!prevProject) {
        // New project created
        addActivity(project.id, 'project_created', getActivityDescription('project_created'), {
          projectName: project.name,
        });
        continue;
      }

      // Check for archive/unarchive
      if (project.isArchived !== prevProject.isArchived) {
        addActivity(
          project.id,
          project.isArchived ? 'project_archived' : 'project_unarchived',
          getActivityDescription(project.isArchived ? 'project_archived' : 'project_unarchived')
        );
      }

      // Check for session changes
      const addedSessions = project.sessionIds.filter((id) => !prevProject.sessionIds.includes(id));
      const removedSessions = prevProject.sessionIds.filter(
        (id) => !project.sessionIds.includes(id)
      );

      for (const sessionId of addedSessions) {
        addActivity(
          project.id,
          'session_added',
          getActivityDescription('session_added', { sessionId }),
          { sessionId }
        );
      }

      for (const sessionId of removedSessions) {
        addActivity(
          project.id,
          'session_removed',
          getActivityDescription('session_removed', { sessionId }),
          { sessionId }
        );
      }

      // Check for knowledge base changes
      const addedFiles = project.knowledgeBase.filter(
        (f) => !prevProject.knowledgeBase.find((pf) => pf.id === f.id)
      );
      const removedFiles = prevProject.knowledgeBase.filter(
        (f) => !project.knowledgeBase.find((pf) => pf.id === f.id)
      );
      const updatedFiles = project.knowledgeBase.filter((f) => {
        const prevFile = prevProject.knowledgeBase.find((pf) => pf.id === f.id);
        return prevFile && prevFile.content !== f.content;
      });

      for (const file of addedFiles) {
        addActivity(
          project.id,
          'knowledge_added',
          getActivityDescription('knowledge_added', { fileName: file.name }),
          { fileName: file.name, fileType: file.type }
        );
      }

      for (const file of removedFiles) {
        addActivity(
          project.id,
          'knowledge_removed',
          getActivityDescription('knowledge_removed', { fileName: file.name }),
          { fileName: file.name }
        );
      }

      for (const file of updatedFiles) {
        addActivity(
          project.id,
          'knowledge_updated',
          getActivityDescription('knowledge_updated', { fileName: file.name }),
          { fileName: file.name }
        );
      }

      // Check for tag changes
      const tagsChanged =
        JSON.stringify(project.tags?.sort()) !== JSON.stringify(prevProject.tags?.sort());
      if (tagsChanged) {
        addActivity(
          project.id,
          'tags_updated',
          getActivityDescription('tags_updated', { tags: project.tags }),
          { tags: project.tags, previousTags: prevProject.tags }
        );
      }

      // Check for settings changes (name, description, instructions, etc.)
      const settingsChanged =
        project.name !== prevProject.name ||
        project.description !== prevProject.description ||
        project.customInstructions !== prevProject.customInstructions ||
        project.defaultProvider !== prevProject.defaultProvider ||
        project.defaultModel !== prevProject.defaultModel ||
        project.defaultMode !== prevProject.defaultMode ||
        project.icon !== prevProject.icon ||
        project.color !== prevProject.color;

      if (settingsChanged && !tagsChanged) {
        const changedFields: string[] = [];
        if (project.name !== prevProject.name) changedFields.push('name');
        if (project.description !== prevProject.description) changedFields.push('description');
        if (project.customInstructions !== prevProject.customInstructions)
          changedFields.push('instructions');
        if (project.defaultProvider !== prevProject.defaultProvider) changedFields.push('provider');
        if (project.defaultModel !== prevProject.defaultModel) changedFields.push('model');
        if (project.defaultMode !== prevProject.defaultMode) changedFields.push('mode');
        if (project.icon !== prevProject.icon) changedFields.push('icon');
        if (project.color !== prevProject.color) changedFields.push('color');

        addActivity(
          project.id,
          'settings_updated',
          getActivityDescription('settings_updated', { field: changedFields.join(', ') }),
          { changedFields }
        );
      }
    }

    // Update previous state
    previousState = {
      projects: currentProjects,
      activeProjectId: state.activeProjectId,
    };
  });

  return unsubscribe;
}

/**
 * Reset the subscriber state (useful for testing)
 */
export function resetSubscriberState(): void {
  previousState = null;
}
