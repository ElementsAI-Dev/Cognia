'use client';

/**
 * StoreInitializer - Initializes store subscriptions and side effects
 * 
 * This component sets up necessary store subscriptions that need to run
 * once during app initialization, such as activity logging.
 */

import { useEffect } from 'react';
import { initProjectActivitySubscriber, initSessionMessageCountSubscriber } from '@/stores/project';
import { useProjectStore, useSessionStore } from '@/stores';
import { unifiedPersistenceService } from '@/lib/storage/persistence/unified-persistence-service';
import type { DBKnowledgeFile } from '@/lib/db';
import type { Project } from '@/types';

function serializeForDiff(value: unknown): string {
  return JSON.stringify(value, (_key, nestedValue) => {
    if (nestedValue instanceof Date) {
      return nestedValue.toISOString();
    }
    return nestedValue;
  });
}

function projectKnowledgeToDbKnowledgeFiles(project: Project): DBKnowledgeFile[] {
  return project.knowledgeBase.map((file) => ({
    id: file.id,
    projectId: project.id,
    name: file.name,
    type: file.type,
    content: file.content,
    size: file.size,
    mimeType: file.mimeType,
    originalSize: file.originalSize,
    pageCount: file.pageCount,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  }));
}

/**
 * Initialize all store-related subscriptions
 */
export function StoreInitializer() {
  useEffect(() => {
    let isDisposed = false;

    // Initialize project activity subscriber to auto-log activities
    const unsubscribe = initProjectActivitySubscriber();

    // Initialize session messageCount tracking for projects
    const unsubscribeMessageCount = initSessionMessageCountSubscriber();

    let sessionSnapshot = new Map<string, string>();
    let projectSnapshot = new Map<string, string>();

    const hydrateStores = async () => {
      try {
        await unifiedPersistenceService.migration.runIfNeeded();

        const [sessions, projects] = await Promise.all([
          unifiedPersistenceService.sessions.list(),
          unifiedPersistenceService.projects.list(),
        ]);

        if (isDisposed) return;

        useSessionStore.setState((state) => {
          const activeSessionId =
            state.activeSessionId && sessions.some((session) => session.id === state.activeSessionId)
              ? state.activeSessionId
              : sessions[0]?.id ?? null;
          return { ...state, sessions, activeSessionId };
        });
        useProjectStore.setState((state) => {
          const activeProjectId =
            state.activeProjectId && projects.some((project) => project.id === state.activeProjectId)
              ? state.activeProjectId
              : projects[0]?.id ?? null;
          return { ...state, projects, activeProjectId };
        });

        sessionSnapshot = new Map(sessions.map((session) => [session.id, serializeForDiff(session)]));
        projectSnapshot = new Map(projects.map((project) => [project.id, serializeForDiff(project)]));
      } catch {
        // hydration is best-effort
      }
    };

    void hydrateStores();

    const unsubscribeSessionPersistence = useSessionStore.subscribe((state) => {
      const nextSnapshot = new Map<string, string>();
      for (const session of state.sessions) {
        const serialized = serializeForDiff(session);
        nextSnapshot.set(session.id, serialized);

        if (sessionSnapshot.get(session.id) !== serialized) {
          void unifiedPersistenceService.sessions
            .upsert(session)
            .catch(() => undefined);
        }
      }

      for (const previousSessionId of sessionSnapshot.keys()) {
        if (!nextSnapshot.has(previousSessionId)) {
          void unifiedPersistenceService.sessions
            .remove(previousSessionId)
            .catch(() => undefined);
        }
      }

      sessionSnapshot = nextSnapshot;
    });

    const unsubscribeProjectPersistence = useProjectStore.subscribe((state) => {
      const nextSnapshot = new Map<string, string>();
      for (const project of state.projects) {
        const serialized = serializeForDiff(project);
        nextSnapshot.set(project.id, serialized);

        if (projectSnapshot.get(project.id) !== serialized) {
          void unifiedPersistenceService.projects
            .upsert(project)
            .then(() =>
              unifiedPersistenceService.projects.upsertKnowledgeFiles(
                projectKnowledgeToDbKnowledgeFiles(project),
                project.id
              )
            )
            .catch(() => undefined);
        }
      }

      for (const previousProjectId of projectSnapshot.keys()) {
        if (!nextSnapshot.has(previousProjectId)) {
          void unifiedPersistenceService.projects
            .remove(previousProjectId)
            .catch(() => undefined);
        }
      }

      projectSnapshot = nextSnapshot;
    });

    return () => {
      isDisposed = true;
      unsubscribe();
      unsubscribeMessageCount?.();
      unsubscribeSessionPersistence();
      unsubscribeProjectPersistence();
    };
  }, []);

  return null;
}

export default StoreInitializer;
