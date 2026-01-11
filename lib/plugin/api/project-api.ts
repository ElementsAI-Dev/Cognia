/**
 * Plugin Project API Implementation
 * 
 * Provides project management capabilities to plugins.
 */

import { useProjectStore } from '@/stores/project/project-store';
import type {
  PluginProjectAPI,
  ProjectFilter,
  ProjectFileInput,
} from '@/types/plugin/plugin-extended';
import type { Project, KnowledgeFile } from '@/types';

/**
 * Create the Project API for a plugin
 */
export function createProjectAPI(pluginId: string): PluginProjectAPI {
  return {
    getCurrentProject: () => {
      const store = useProjectStore.getState();
      if (!store.activeProjectId) return null;
      return store.projects.find(p => p.id === store.activeProjectId) || null;
    },

    getCurrentProjectId: () => {
      return useProjectStore.getState().activeProjectId;
    },

    getProject: async (id: string) => {
      const store = useProjectStore.getState();
      return store.projects.find(p => p.id === id) || null;
    },

    createProject: async (options) => {
      const store = useProjectStore.getState();
      const project = store.createProject(options);
      console.log(`[Plugin:${pluginId}] Created project: ${project.id}`);
      return project;
    },

    updateProject: async (id: string, updates) => {
      const store = useProjectStore.getState();
      store.updateProject(id, updates);
      console.log(`[Plugin:${pluginId}] Updated project: ${id}`);
    },

    deleteProject: async (id: string) => {
      const store = useProjectStore.getState();
      store.deleteProject(id);
      console.log(`[Plugin:${pluginId}] Deleted project: ${id}`);
    },

    setActiveProject: async (id: string | null) => {
      const store = useProjectStore.getState();
      store.setActiveProject(id);
      console.log(`[Plugin:${pluginId}] Set active project: ${id}`);
    },

    listProjects: async (filter?: ProjectFilter) => {
      const store = useProjectStore.getState();
      let projects = [...store.projects];

      if (filter) {
        if (filter.isArchived !== undefined) {
          projects = projects.filter(p => p.isArchived === filter.isArchived);
        }
        if (filter.tags && filter.tags.length > 0) {
          projects = projects.filter(p => 
            filter.tags!.some(tag => p.tags?.includes(tag))
          );
        }
        if (filter.createdAfter) {
          projects = projects.filter(p => new Date(p.createdAt) > filter.createdAfter!);
        }
        if (filter.createdBefore) {
          projects = projects.filter(p => new Date(p.createdAt) < filter.createdBefore!);
        }

        // Sort
        if (filter.sortBy) {
          projects.sort((a, b) => {
            const aVal = a[filter.sortBy!];
            const bVal = b[filter.sortBy!];
            if (aVal instanceof Date && bVal instanceof Date) {
              return filter.sortOrder === 'desc'
                ? bVal.getTime() - aVal.getTime()
                : aVal.getTime() - bVal.getTime();
            }
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return filter.sortOrder === 'desc'
                ? bVal.localeCompare(aVal)
                : aVal.localeCompare(bVal);
            }
            return 0;
          });
        }

        // Pagination
        if (filter.offset) {
          projects = projects.slice(filter.offset);
        }
        if (filter.limit) {
          projects = projects.slice(0, filter.limit);
        }
      }

      return projects;
    },

    archiveProject: async (id: string) => {
      const store = useProjectStore.getState();
      store.archiveProject(id);
      console.log(`[Plugin:${pluginId}] Archived project: ${id}`);
    },

    unarchiveProject: async (id: string) => {
      const store = useProjectStore.getState();
      store.unarchiveProject(id);
      console.log(`[Plugin:${pluginId}] Unarchived project: ${id}`);
    },

    addKnowledgeFile: async (projectId: string, file: ProjectFileInput) => {
      const store = useProjectStore.getState();
      
      // Infer type from extension if not provided
      let fileType = file.type;
      if (!fileType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const typeMap: Record<string, KnowledgeFile['type']> = {
          'txt': 'text',
          'md': 'markdown',
          'pdf': 'pdf',
          'json': 'json',
          'js': 'code',
          'ts': 'code',
          'py': 'code',
          'html': 'html',
          'csv': 'csv',
          'doc': 'word',
          'docx': 'word',
          'xls': 'excel',
          'xlsx': 'excel',
        };
        fileType = typeMap[ext || ''] || 'text';
      }

      const knowledgeFile: Omit<KnowledgeFile, 'id' | 'createdAt' | 'updatedAt'> = {
        name: file.name,
        content: file.content,
        type: fileType,
        size: new Blob([file.content]).size,
        mimeType: file.mimeType,
      };

      store.addKnowledgeFile(projectId, knowledgeFile);
      
      // Get the newly added file
      const project = store.projects.find(p => p.id === projectId);
      const addedFile = project?.knowledgeBase[project.knowledgeBase.length - 1];
      
      console.log(`[Plugin:${pluginId}] Added knowledge file to project ${projectId}: ${file.name}`);
      
      return addedFile!;
    },

    removeKnowledgeFile: async (projectId: string, fileId: string) => {
      const store = useProjectStore.getState();
      store.removeKnowledgeFile(projectId, fileId);
      console.log(`[Plugin:${pluginId}] Removed knowledge file ${fileId} from project ${projectId}`);
    },

    updateKnowledgeFile: async (projectId: string, fileId: string, content: string) => {
      const store = useProjectStore.getState();
      store.updateKnowledgeFile(projectId, fileId, content);
      console.log(`[Plugin:${pluginId}] Updated knowledge file ${fileId} in project ${projectId}`);
    },

    getKnowledgeFiles: async (projectId: string) => {
      const store = useProjectStore.getState();
      const project = store.projects.find(p => p.id === projectId);
      return project?.knowledgeBase || [];
    },

    linkSession: async (projectId: string, sessionId: string) => {
      const store = useProjectStore.getState();
      store.addSessionToProject(projectId, sessionId);
      console.log(`[Plugin:${pluginId}] Linked session ${sessionId} to project ${projectId}`);
    },

    unlinkSession: async (projectId: string, sessionId: string) => {
      const store = useProjectStore.getState();
      store.removeSessionFromProject(projectId, sessionId);
      console.log(`[Plugin:${pluginId}] Unlinked session ${sessionId} from project ${projectId}`);
    },

    getProjectSessions: async (projectId: string) => {
      const store = useProjectStore.getState();
      const project = store.projects.find(p => p.id === projectId);
      return project?.sessionIds || [];
    },

    onProjectChange: (handler: (project: Project | null) => void) => {
      let lastProjectId: string | null = null;
      
      const unsubscribe = useProjectStore.subscribe((state) => {
        if (state.activeProjectId !== lastProjectId) {
          lastProjectId = state.activeProjectId;
          const project = state.activeProjectId
            ? state.projects.find(p => p.id === state.activeProjectId) || null
            : null;
          handler(project);
        }
      });

      return unsubscribe;
    },

    addTag: async (projectId: string, tag: string) => {
      const store = useProjectStore.getState();
      store.addTag(projectId, tag);
      console.log(`[Plugin:${pluginId}] Added tag "${tag}" to project ${projectId}`);
    },

    removeTag: async (projectId: string, tag: string) => {
      const store = useProjectStore.getState();
      store.removeTag(projectId, tag);
      console.log(`[Plugin:${pluginId}] Removed tag "${tag}" from project ${projectId}`);
    },
  };
}
