/**
 * Video Editor Store
 *
 * Zustand store for managing video editor state with persistence
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { persist } from 'zustand/middleware';
import { loggers } from '@/lib/logger';
import { videoProjectRepository } from '@/lib/db/repositories/video-project-repository';
import type { VideoTrack } from '@/hooks/video-studio/use-video-editor';
import {
  DEFAULT_VIDEO_PROCESSING_SETTINGS,
  type VideoProcessingSettings,
} from '@/types/media/video-processing';

// Project settings
export interface VideoProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  resolution: { width: number; height: number };
  frameRate: number;
  aspectRatio: string;
  tracks: VideoTrack[];
  duration: number;
}

// Recent project reference
export interface RecentProject {
  id: string;
  name: string;
  updatedAt: number;
  thumbnailUrl?: string;
}

// Editor preferences
export interface EditorPreferences {
  snapEnabled: boolean;
  snapThreshold: number;
  defaultZoom: number;
  showWaveforms: boolean;
  showThumbnails: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  timelineHeight: number;
  sidePanelWidth: number;
  theme: 'light' | 'dark' | 'system';
  processing: VideoProcessingSettings;
}

// History entry for undo/redo
export interface HistorySnapshot {
  id: string;
  timestamp: number;
  action: string;
  tracks: VideoTrack[];
  duration: number;
}

interface VideoEditorState {
  // Current project
  currentProject: VideoProject | null;

  // Recent projects list
  recentProjects: RecentProject[];

  // Editor preferences
  preferences: EditorPreferences;

  // History for undo/redo
  history: HistorySnapshot[];
  historyIndex: number;
  maxHistorySize: number;

  // UI state
  isLoading: boolean;
  error: string | null;
}

interface VideoEditorActions {
  // Project management
  createProject: (name: string, resolution?: { width: number; height: number }, frameRate?: number) => string;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  updateProjectName: (name: string) => void;
  updateProjectSettings: (settings: Partial<Pick<VideoProject, 'resolution' | 'frameRate' | 'aspectRatio'>>) => void;

  // Track management
  setTracks: (tracks: VideoTrack[]) => void;
  updateDuration: (duration: number) => void;

  // Recent projects
  addRecentProject: (project: RecentProject) => void;
  removeRecentProject: (projectId: string) => void;
  clearRecentProjects: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<EditorPreferences>) => void;
  resetPreferences: () => void;

  // History (undo/redo)
  pushHistory: (action: string, tracks: VideoTrack[], duration: number) => void;
  undo: () => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const DEFAULT_PREFERENCES: EditorPreferences = {
  snapEnabled: true,
  snapThreshold: 10,
  defaultZoom: 1,
  showWaveforms: true,
  showThumbnails: true,
  autoSave: true,
  autoSaveInterval: 60,
  timelineHeight: 200,
  sidePanelWidth: 320,
  theme: 'system',
  processing: DEFAULT_VIDEO_PROCESSING_SETTINGS,
};

const DEFAULT_RESOLUTION = { width: 1920, height: 1080 };
const DEFAULT_FRAME_RATE = 30;
const MAX_RECENT_PROJECTS = 10;
const MAX_HISTORY_SIZE = 50;

function generateId(): string {
  return nanoid();
}

export const useVideoEditorStore = create<VideoEditorState & VideoEditorActions>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      recentProjects: [],
      preferences: DEFAULT_PREFERENCES,
      history: [],
      historyIndex: -1,
      maxHistorySize: MAX_HISTORY_SIZE,
      isLoading: false,
      error: null,

      // Project management
      createProject: (name, resolution = DEFAULT_RESOLUTION, frameRate = DEFAULT_FRAME_RATE) => {
        const id = generateId();
        const now = Date.now();
        const project: VideoProject = {
          id,
          name,
          createdAt: now,
          updatedAt: now,
          resolution,
          frameRate,
          aspectRatio: `${resolution.width}:${resolution.height}`,
          tracks: [],
          duration: 0,
        };

        set({ currentProject: project, history: [], historyIndex: -1 });

        // Add to recent projects
        get().addRecentProject({
          id,
          name,
          updatedAt: now,
        });

        return id;
      },

      loadProject: async (projectId) => {
        set({ isLoading: true });

        try {
          const data = await videoProjectRepository.getById(projectId);
          if (data) {
            set({
              currentProject: {
                id: data.id,
                name: data.name,
                createdAt: data.createdAt.getTime(),
                updatedAt: data.updatedAt.getTime(),
                resolution: data.resolution,
                frameRate: data.frameRate,
                aspectRatio: data.aspectRatio,
                tracks: data.tracks,
                duration: data.duration,
              },
              isLoading: false,
              history: [],
              historyIndex: -1,
            });
          } else {
            loggers.media.warn('Video project not found', { projectId });
            set({ isLoading: false, error: 'Project not found' });
          }
        } catch (error) {
          loggers.media.error('Failed to load video project', error);
          set({ isLoading: false, error: 'Failed to load project' });
        }
      },

      saveProject: async () => {
        const { currentProject } = get();
        if (!currentProject) return;

        const now = Date.now();
        const updatedProject = { ...currentProject, updatedAt: now };
        set({ currentProject: updatedProject });

        try {
          const existing = await videoProjectRepository.getById(currentProject.id);
          if (existing) {
            await videoProjectRepository.update(currentProject.id, {
              name: updatedProject.name,
              resolution: updatedProject.resolution,
              frameRate: updatedProject.frameRate,
              aspectRatio: updatedProject.aspectRatio,
              tracks: updatedProject.tracks,
              duration: updatedProject.duration,
            });
          } else {
            await videoProjectRepository.create({
              id: updatedProject.id,
              name: updatedProject.name,
              resolution: updatedProject.resolution,
              frameRate: updatedProject.frameRate,
              aspectRatio: updatedProject.aspectRatio,
              tracks: updatedProject.tracks,
              duration: updatedProject.duration,
              createdAt: new Date(updatedProject.createdAt),
              updatedAt: new Date(now),
            });
          }

          // Update in recent projects
          get().addRecentProject({
            id: currentProject.id,
            name: currentProject.name,
            updatedAt: now,
          });

          loggers.media.debug('Video project saved', { id: currentProject.id });
        } catch (error) {
          loggers.media.error('Failed to save video project', error);
          set({ error: 'Failed to save project' });
        }
      },

      deleteProject: async (projectId) => {
        const { currentProject } = get();
        if (currentProject?.id === projectId) {
          set({ currentProject: null, history: [], historyIndex: -1 });
        }
        get().removeRecentProject(projectId);
        try {
          await videoProjectRepository.delete(projectId);
        } catch (error) {
          loggers.media.error('Failed to delete video project', error);
        }
      },

      updateProjectName: (name) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: { ...currentProject, name, updatedAt: Date.now() },
        });
      },

      updateProjectSettings: (settings) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: { ...currentProject, ...settings, updatedAt: Date.now() },
        });
      },

      // Track management
      setTracks: (tracks) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: { ...currentProject, tracks, updatedAt: Date.now() },
        });
      },

      updateDuration: (duration) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: { ...currentProject, duration, updatedAt: Date.now() },
        });
      },

      // Recent projects
      addRecentProject: (project) => {
        set((state) => {
          const filtered = state.recentProjects.filter((p) => p.id !== project.id);
          const updated = [project, ...filtered].slice(0, MAX_RECENT_PROJECTS);
          return { recentProjects: updated };
        });
      },

      removeRecentProject: (projectId) => {
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.id !== projectId),
        }));
      },

      clearRecentProjects: () => {
        set({ recentProjects: [] });
      },

      // Preferences
      updatePreferences: (preferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        }));
      },

      resetPreferences: () => {
        set({ preferences: DEFAULT_PREFERENCES });
      },

      // History (undo/redo)
      pushHistory: (action, tracks, duration) => {
        const { history, historyIndex, maxHistorySize } = get();

        const snapshot: HistorySnapshot = {
          id: generateId(),
          timestamp: Date.now(),
          action,
          tracks: structuredClone(tracks),
          duration,
        };

        // Remove any redo history
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(snapshot);

        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return null;

        const newIndex = historyIndex - 1;
        const snapshot = history[newIndex];

        set({ historyIndex: newIndex });
        return snapshot;
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return null;

        const newIndex = historyIndex + 1;
        const snapshot = history[newIndex];

        set({ historyIndex: newIndex });
        return snapshot;
      },

      clearHistory: () => {
        set({ history: [], historyIndex: -1 });
      },

      canUndo: () => {
        const { historyIndex } = get();
        return historyIndex > 0;
      },

      canRedo: () => {
        const { history, historyIndex } = get();
        return historyIndex < history.length - 1;
      },

      // State management
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      reset: () => {
        set({
          currentProject: null,
          history: [],
          historyIndex: -1,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'cognia-video-editor',
      partialize: (state) => ({
        recentProjects: state.recentProjects,
        preferences: state.preferences,
      }),
    }
  )
);

// Selector helpers
export const selectCurrentProject = (state: VideoEditorState) => state.currentProject;
export const selectRecentProjects = (state: VideoEditorState) => state.recentProjects;
export const selectPreferences = (state: VideoEditorState) => state.preferences;
export const selectCanUndo = (state: VideoEditorState & VideoEditorActions) => state.canUndo();
export const selectCanRedo = (state: VideoEditorState & VideoEditorActions) => state.canRedo();
