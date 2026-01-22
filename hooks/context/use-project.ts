/**
 * useProject - Convenient hook for project management
 * Provides easy access to project-related state and actions
 */

import { useMemo, useCallback } from 'react';
import { useProjectStore, useSessionStore } from '@/stores';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types';

export interface UseProjectReturn {
  // State
  projects: Project[];
  activeProject: Project | undefined;
  activeProjectId: string | null;

  // Selectors
  getProject: (id: string) => Project | undefined;
  getProjectForSession: (sessionId: string) => Project | undefined;
  getActiveProjects: () => Project[];
  getArchivedProjects: () => Project[];
  getProjectsByTag: (tag: string) => Project[];
  getAllTags: () => string[];

  // Actions
  createProject: (input: CreateProjectInput) => Project;
  updateProject: (id: string, updates: UpdateProjectInput) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  duplicateProject: (id: string) => Project | null;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;

  // Session management
  addSessionToProject: (projectId: string, sessionId: string) => void;
  removeSessionFromProject: (projectId: string, sessionId: string) => void;
  linkCurrentSessionToProject: (projectId: string) => void;
  unlinkCurrentSession: () => void;

  // Computed
  hasProjects: boolean;
  projectCount: number;
  currentSessionProject: Project | undefined;
}

/**
 * Hook for managing projects with convenient access to state and actions
 */
export function useProject(): UseProjectReturn {
  // Project store
  const projects = useProjectStore((state) => state.projects);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const getProject = useProjectStore((state) => state.getProject);
  const getActiveProject = useProjectStore((state) => state.getActiveProject);
  const getProjectForSession = useProjectStore((state) => state.getProjectForSession);
  const getActiveProjects = useProjectStore((state) => state.getActiveProjects);
  const getArchivedProjects = useProjectStore((state) => state.getArchivedProjects);
  const getProjectsByTag = useProjectStore((state) => state.getProjectsByTag);
  const getAllTags = useProjectStore((state) => state.getAllTags);

  const createProject = useProjectStore((state) => state.createProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const duplicateProject = useProjectStore((state) => state.duplicateProject);
  const archiveProject = useProjectStore((state) => state.archiveProject);
  const unarchiveProject = useProjectStore((state) => state.unarchiveProject);
  const addSessionToProject = useProjectStore((state) => state.addSessionToProject);
  const removeSessionFromProject = useProjectStore((state) => state.removeSessionFromProject);

  // Session store
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const updateSession = useSessionStore((state) => state.updateSession);

  // Computed values
  const activeProject = useMemo(() => getActiveProject(), [getActiveProject]);

  const currentSession = useMemo(() => {
    return activeSessionId ? sessions.find((s) => s.id === activeSessionId) : undefined;
  }, [activeSessionId, sessions]);

  const currentSessionProject = currentSession?.projectId
    ? getProject(currentSession.projectId)
    : undefined;

  const hasProjects = projects.length > 0;
  const projectCount = projects.length;

  // Link current session to project
  const linkCurrentSessionToProject = useCallback(
    (projectId: string) => {
      if (!activeSessionId) return;

      // Remove from old project if exists
      if (currentSession?.projectId) {
        removeSessionFromProject(currentSession.projectId, activeSessionId);
      }

      // Add to new project
      addSessionToProject(projectId, activeSessionId);
      updateSession(activeSessionId, { projectId });
    },
    [activeSessionId, currentSession, addSessionToProject, removeSessionFromProject, updateSession]
  );

  // Unlink current session from project
  const unlinkCurrentSession = useCallback(() => {
    if (!activeSessionId || !currentSession?.projectId) return;

    removeSessionFromProject(currentSession.projectId, activeSessionId);
    updateSession(activeSessionId, { projectId: undefined });
  }, [activeSessionId, currentSession, removeSessionFromProject, updateSession]);

  return {
    // State
    projects,
    activeProject,
    activeProjectId,

    // Selectors
    getProject,
    getProjectForSession,
    getActiveProjects,
    getArchivedProjects,
    getProjectsByTag,
    getAllTags,

    // Actions
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    duplicateProject,
    archiveProject,
    unarchiveProject,

    // Session management
    addSessionToProject,
    removeSessionFromProject,
    linkCurrentSessionToProject,
    unlinkCurrentSession,

    // Computed
    hasProjects,
    projectCount,
    currentSessionProject,
  };
}

export default useProject;
