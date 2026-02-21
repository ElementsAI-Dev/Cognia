/**
 * Project Store - manages projects with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Project, CreateProjectInput, UpdateProjectInput, KnowledgeFile } from '@/types';
import { getPluginEventHooks } from '@/lib/plugin';
import { projectRepository } from '@/lib/db/repositories/project-repository';
import { loggers } from '@/lib/logger';

const log = loggers.store;

interface ProjectState {
  // State
  projects: Project[];
  activeProjectId: string | null;

  // Actions
  createProject: (input: CreateProjectInput) => Project;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updates: UpdateProjectInput) => void;
  setActiveProject: (id: string | null) => void;
  duplicateProject: (id: string) => Project | null;

  // Session management
  addSessionToProject: (projectId: string, sessionId: string) => void;
  removeSessionFromProject: (projectId: string, sessionId: string) => void;
  getProjectForSession: (sessionId: string) => Project | undefined;

  // Knowledge base management
  addKnowledgeFile: (
    projectId: string,
    file: Omit<KnowledgeFile, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  removeKnowledgeFile: (projectId: string, fileId: string) => void;
  updateKnowledgeFile: (projectId: string, fileId: string, content: string) => void;

  // Tag management
  addTag: (projectId: string, tag: string) => void;
  removeTag: (projectId: string, tag: string) => void;
  setTags: (projectId: string, tags: string[]) => void;

  // Archive management
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;
  getArchivedProjects: () => Project[];
  getActiveProjects: () => Project[];

  // Message count
  incrementMessageCount: (projectId: string, delta?: number) => void;

  // Bulk operations
  clearAllProjects: () => void;
  importProjects: (projects: Project[]) => void;

  // Selectors
  getProject: (id: string) => Project | undefined;
  getActiveProject: () => Project | undefined;
  getProjectsBySessionCount: () => Project[];
  getProjectsByTag: (tag: string) => Project[];
  getAllTags: () => string[];
}

const DEFAULT_COLOR = '#3B82F6';
const DEFAULT_ICON = 'Folder';

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      createProject: (input) => {
        const project: Project = {
          id: nanoid(),
          name: input.name,
          description: input.description,
          icon: input.icon || DEFAULT_ICON,
          color: input.color || DEFAULT_COLOR,
          customInstructions: input.customInstructions,
          defaultProvider: input.defaultProvider,
          defaultModel: input.defaultModel,
          defaultMode: input.defaultMode,
          tags: input.tags || [],
          isArchived: false,
          knowledgeBase: [],
          sessionIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          sessionCount: 0,
          messageCount: 0,
        };

        set((state) => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
        }));

        getPluginEventHooks().dispatchProjectCreate(project);

        return project;
      },

      deleteProject: (id) =>
        set((state) => {
          const newProjects = state.projects.filter((p) => p.id !== id);
          const newActiveId = state.activeProjectId === id ? null : state.activeProjectId;

          getPluginEventHooks().dispatchProjectDelete(id);

          return {
            projects: newProjects,
            activeProjectId: newActiveId,
          };
        }),

      updateProject: (id, updates) =>
        set((state) => {
          const updatedProjects = state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...updates,
                  updatedAt: new Date(),
                }
              : p
          );
          const updatedProject = updatedProjects.find((p) => p.id === id);
          if (updatedProject) {
            getPluginEventHooks().dispatchProjectUpdate(updatedProject, updates);
          }
          return { projects: updatedProjects };
        }),

      setActiveProject: (id) =>
        set((state) => {
          // Update lastAccessedAt when setting active project
          const updatedProjects = id
            ? state.projects.map((p) => (p.id === id ? { ...p, lastAccessedAt: new Date() } : p))
            : state.projects;

          if (state.activeProjectId !== id) {
            const previous = state.activeProjectId;
            getPluginEventHooks().dispatchProjectSwitch(id, previous);
          }

          return {
            projects: updatedProjects,
            activeProjectId: id,
          };
        }),

      duplicateProject: (id) => {
        const { projects } = get();
        const original = projects.find((p) => p.id === id);

        if (!original) return null;

        const duplicate: Project = {
          ...original,
          id: nanoid(),
          name: `${original.name} (copy)`,
          sessionIds: [], // Don't copy session associations
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          sessionCount: 0,
          messageCount: 0,
        };

        set((state) => ({
          projects: [duplicate, ...state.projects],
          activeProjectId: duplicate.id,
        }));

        return duplicate;
      },

      addSessionToProject: (projectId, sessionId) =>
        set((state) => {
          const updatedProjects = state.projects.map((p) =>
            p.id === projectId && !p.sessionIds.includes(sessionId)
              ? {
                  ...p,
                  sessionIds: [...p.sessionIds, sessionId],
                  sessionCount: p.sessionCount + 1,
                  updatedAt: new Date(),
                }
              : p
          );
          const project = state.projects.find((p) => p.id === projectId);
          if (project && !project.sessionIds.includes(sessionId)) {
            getPluginEventHooks().dispatchSessionLinked(projectId, sessionId);
          }
          return { projects: updatedProjects };
        }),

      removeSessionFromProject: (projectId, sessionId) =>
        set((state) => {
          const updatedProjects = state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  sessionIds: p.sessionIds.filter((id) => id !== sessionId),
                  sessionCount: Math.max(0, p.sessionCount - 1),
                  updatedAt: new Date(),
                }
              : p
          );
          getPluginEventHooks().dispatchSessionUnlinked(projectId, sessionId);
          return { projects: updatedProjects };
        }),

      getProjectForSession: (sessionId) => {
        const { projects } = get();
        return projects.find((p) => p.sessionIds.includes(sessionId));
      },

      addKnowledgeFile: (projectId, file) =>
        set((state) => {
          const knowledgeFile: KnowledgeFile = {
            ...file,
            id: nanoid(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const updatedProjects = state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  knowledgeBase: [...p.knowledgeBase, knowledgeFile],
                  updatedAt: new Date(),
                }
              : p
          );
          getPluginEventHooks().dispatchKnowledgeFileAdd(projectId, knowledgeFile);

          // Sync to IndexedDB using putKnowledgeFile to preserve store-generated ID
          projectRepository.putKnowledgeFile(projectId, knowledgeFile)
            .catch((err) => log.warn('Failed to sync knowledge file to IndexedDB', { err }));

          return { projects: updatedProjects };
        }),

      removeKnowledgeFile: (projectId, fileId) =>
        set((state) => {
          const updatedProjects = state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  knowledgeBase: p.knowledgeBase.filter((f) => f.id !== fileId),
                  updatedAt: new Date(),
                }
              : p
          );
          getPluginEventHooks().dispatchKnowledgeFileRemove(projectId, fileId);

          // Sync deletion to IndexedDB
          projectRepository.deleteKnowledgeFile(fileId)
            .catch((err) => log.warn('Failed to delete knowledge file from IndexedDB', { err }));

          return { projects: updatedProjects };
        }),

      updateKnowledgeFile: (projectId, fileId, content) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  knowledgeBase: p.knowledgeBase.map((f) =>
                    f.id === fileId
                      ? { ...f, content, size: content.length, updatedAt: new Date() }
                      : f
                  ),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));

        // Sync updated content to IndexedDB
        projectRepository.updateKnowledgeFile(fileId, { content, size: content.length })
          .catch((err) => log.warn('Failed to update knowledge file in IndexedDB', { err }));
      },

      // Tag management
      addTag: (projectId, tag) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && !p.tags?.includes(tag)
              ? {
                  ...p,
                  tags: [...(p.tags || []), tag],
                  updatedAt: new Date(),
                }
              : p
          ),
        })),

      removeTag: (projectId, tag) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tags: (p.tags || []).filter((t) => t !== tag),
                  updatedAt: new Date(),
                }
              : p
          ),
        })),

      setTags: (projectId, tags) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tags,
                  updatedAt: new Date(),
                }
              : p
          ),
        })),

      // Archive management
      archiveProject: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  isArchived: true,
                  archivedAt: new Date(),
                  updatedAt: new Date(),
                }
              : p
          ),
        })),

      unarchiveProject: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  isArchived: false,
                  archivedAt: undefined,
                  updatedAt: new Date(),
                }
              : p
          ),
        })),

      getArchivedProjects: () => {
        const { projects } = get();
        return projects.filter((p) => p.isArchived);
      },

      getActiveProjects: () => {
        const { projects } = get();
        return projects.filter((p) => !p.isArchived);
      },

      incrementMessageCount: (projectId, delta = 1) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  messageCount: p.messageCount + delta,
                  updatedAt: new Date(),
                }
              : p
          ),
        })),

      clearAllProjects: () =>
        set({
          projects: [],
          activeProjectId: null,
        }),

      importProjects: (projects) =>
        set((state) => ({
          projects: [...projects, ...state.projects],
        })),

      getProject: (id) => {
        const { projects } = get();
        return projects.find((p) => p.id === id);
      },

      getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId);
      },

      getProjectsBySessionCount: () => {
        const { projects } = get();
        return [...projects].sort((a, b) => b.sessionCount - a.sessionCount);
      },

      getProjectsByTag: (tag) => {
        const { projects } = get();
        return projects.filter((p) => p.tags?.includes(tag));
      },

      getAllTags: () => {
        const { projects } = get();
        const tagSet = new Set<string>();
        for (const project of projects) {
          for (const tag of project.tags || []) {
            tagSet.add(tag);
          }
        }
        return Array.from(tagSet).sort();
      },
    }),
    {
      name: 'cognia-projects',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (typeof window !== 'undefined' && Array.isArray(state.projects) && state.projects.length > 0) {
          try {
            localStorage.setItem(
              'cognia-projects-legacy-snapshot-v3',
              JSON.stringify({
                state: {
                  projects: state.projects,
                },
              })
            );
          } catch {
            // ignore snapshot write failures
          }
        }
        if (version === 0) {
          // v0 -> v1: Ensure knowledgeBase and tags exist on each project
          if (Array.isArray(state.projects)) {
            state.projects = (state.projects as Record<string, unknown>[]).map((p) => ({
              ...p,
              knowledgeBase: Array.isArray(p.knowledgeBase) ? p.knowledgeBase : [],
              tags: Array.isArray(p.tags) ? p.tags : [],
            }));
          }
        }
        return state;
      },
      partialize: (state) => ({
        projects: state.projects.map((p) => ({
          ...p,
          createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
          updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
          lastAccessedAt:
            p.lastAccessedAt instanceof Date ? p.lastAccessedAt.toISOString() : p.lastAccessedAt,
          // Strip file content from localStorage — content lives in IndexedDB
          knowledgeBase: p.knowledgeBase.map((f) => ({
            ...f,
            content: '', // Content stored in IndexedDB, not localStorage
            createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
            updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : f.updatedAt,
          })),
        })),
        activeProjectId: state.activeProjectId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.projects) {
          state.projects = state.projects.map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
            lastAccessedAt: new Date(p.lastAccessedAt),
            knowledgeBase: p.knowledgeBase.map((f) => ({
              ...f,
              createdAt: new Date(f.createdAt),
              updatedAt: new Date(f.updatedAt),
            })),
          }));

          // Restore knowledge file content from IndexedDB
          _rehydrateKnowledgeContent(state);
        }
      },
    }
  )
);

/**
 * Restore knowledge file content from IndexedDB after localStorage rehydration.
 * localStorage only stores metadata (content=''), so we load actual content async.
 */
async function _rehydrateKnowledgeContent(state: ProjectState) {
  try {
    const projectsWithContent = await Promise.all(
      state.projects.map(async (project) => {
        if (project.knowledgeBase.length === 0) return project;

        const dbFiles = await projectRepository.getKnowledgeFiles(project.id);
        if (dbFiles.length === 0) return project;

        const dbFileMap = new Map(dbFiles.map((f) => [f.id, f]));

        return {
          ...project,
          knowledgeBase: project.knowledgeBase.map((f) => {
            const dbFile = dbFileMap.get(f.id);
            return dbFile ? { ...f, content: dbFile.content } : f;
          }),
        };
      })
    );

    useProjectStore.setState({ projects: projectsWithContent });
  } catch (err) {
    log.warn('Failed to rehydrate knowledge content from IndexedDB', { err });
  }
}

// Selectors
export const selectProjects = (state: ProjectState) => state.projects;
export const selectActiveProjectId = (state: ProjectState) => state.activeProjectId;
