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
import type {
  AudioMixTrack,
  MediaProjectTimelineV2,
  SubtitleTrackBinding,
  TimelineLayer,
  TimelineMarker,
  VideoTrack,
} from '@/types/video-studio/types';
import { normalizeClipEffects } from '@/types/video-studio/types';
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
  timeline: MediaProjectTimelineV2;
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
  revision: number;
  tracks: VideoTrack[];
  duration: number;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  currentTime: number;
  markers: TimelineMarker[];
  layers: TimelineLayer[];
  subtitleBindings: SubtitleTrackBinding[];
  audioMix: AudioMixTrack[];
}

export type VideoEditSessionSourceType = 'recording' | 'ai-generation' | 'import' | 'unknown';

export interface VideoEditSession {
  sessionId: string;
  sourceType: VideoEditSessionSourceType;
  sourceRef: string;
  sourceMetadata?: Record<string, unknown>;
  workingProjectId: string | null;
  lastCommittedRevision: number;
  pendingOperation: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TimelineMutationInput {
  action: string;
  tracks: VideoTrack[];
  duration: number;
  selectedClipIds?: string[];
  selectedTrackId?: string | null;
  currentTime?: number;
  markers?: TimelineMarker[];
  layers?: TimelineLayer[];
  subtitleBindings?: SubtitleTrackBinding[];
  audioMix?: AudioMixTrack[];
}

export interface StartEditSessionInput {
  sourceType: VideoEditSessionSourceType;
  sourceRef: string;
  sourceMetadata?: Record<string, unknown>;
  workingProjectId?: string | null;
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
  timelineRevision: number;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  currentTime: number;

  // Editor session
  editSession: VideoEditSession | null;

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
  pushHistory: (
    action: string,
    tracks: VideoTrack[],
    duration: number,
    snapshot?: Partial<
      Pick<
        HistorySnapshot,
        | 'selectedClipIds'
        | 'selectedTrackId'
        | 'currentTime'
        | 'markers'
        | 'layers'
        | 'subtitleBindings'
        | 'audioMix'
      >
    >
  ) => HistorySnapshot;
  commitTimelineMutation: (input: TimelineMutationInput) => HistorySnapshot;
  undo: () => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  jumpToHistory: (index: number) => HistorySnapshot | null;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Session
  startEditSession: (input: StartEditSessionInput) => VideoEditSession;
  resumeEditSession: (
    input?: Partial<Omit<StartEditSessionInput, 'sourceType' | 'sourceRef'>> & {
      sessionId?: string;
      sourceType?: VideoEditSessionSourceType;
      sourceRef?: string;
    }
  ) => VideoEditSession | null;
  updatePendingOperation: (operation: string | null) => void;
  endEditSession: () => void;

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

interface TimelineExtras {
  markers?: TimelineMarker[];
  layers?: TimelineLayer[];
  subtitleBindings?: SubtitleTrackBinding[];
  audioMix?: AudioMixTrack[];
}

function normalizeTracks(tracks: VideoTrack[]): VideoTrack[] {
  return tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => ({
      ...clip,
      effects: normalizeClipEffects(clip.effects),
    })),
  }));
}

function buildTimelineV2(
  tracks: VideoTrack[],
  duration: number,
  extras: TimelineExtras = {}
): MediaProjectTimelineV2 {
  const normalizedTracks = normalizeTracks(tracks);
  const transitions = normalizedTracks.flatMap((track) => {
    const orderedClips = [...track.clips].sort((left, right) => left.startTime - right.startTime);
    return orderedClips.flatMap((clip, index) => {
      if (!clip.transition) {
        return [];
      }

      const transitionParams = clip.transition.params;
      const explicitToClipId =
        typeof transitionParams?.toClipId === 'string' ? String(transitionParams.toClipId) : null;
      const inferredToClipId = orderedClips[index + 1]?.id ?? clip.id;
      const toClipId = explicitToClipId ?? inferredToClipId;

      return [
        {
          id: `transition-${clip.id}-${toClipId}`,
          type: clip.transition.type ?? 'fade',
          duration: clip.transition.duration ?? 0.5,
          params: {
            ...(transitionParams ?? {}),
            toClipId,
          },
          fromClipId: clip.id,
          toClipId,
        },
      ];
    });
  });

  return {
    version: 2,
    duration,
    tracks: normalizedTracks,
    transitions,
    markers: structuredClone(extras.markers ?? []),
    layers: structuredClone(extras.layers ?? []),
    subtitleBindings: structuredClone(extras.subtitleBindings ?? []),
    audioMix: structuredClone(extras.audioMix ?? []),
    exportDefaults: {
      format: 'mp4',
      resolution: '1080p',
      fps: 30,
      quality: 'high',
    },
  };
}

function generateId(): string {
  return nanoid();
}

function getClipIds(tracks: VideoTrack[]): Set<string> {
  const ids = new Set<string>();
  for (const track of tracks) {
    for (const clip of track.clips) {
      ids.add(clip.id);
    }
  }
  return ids;
}

function sanitizeSnapshotSelection(
  tracks: VideoTrack[],
  duration: number,
  selection: {
    selectedClipIds?: string[];
    selectedTrackId?: string | null;
    currentTime?: number;
  }
): Pick<HistorySnapshot, 'selectedClipIds' | 'selectedTrackId' | 'currentTime'> {
  const clipIds = getClipIds(tracks);
  const trackIds = new Set(tracks.map((track) => track.id));

  const selectedClipIds = (selection.selectedClipIds ?? []).filter((id) => clipIds.has(id));
  const selectedTrackId =
    selection.selectedTrackId && trackIds.has(selection.selectedTrackId)
      ? selection.selectedTrackId
      : null;
  const currentTime = Math.max(0, Math.min(selection.currentTime ?? 0, duration));

  return {
    selectedClipIds,
    selectedTrackId,
    currentTime,
  };
}

function snapshotTimeline(
  timeline?: TimelineExtras
): Pick<HistorySnapshot, 'markers' | 'layers' | 'subtitleBindings' | 'audioMix'> {
  return {
    markers: structuredClone(timeline?.markers ?? []),
    layers: structuredClone(timeline?.layers ?? []),
    subtitleBindings: structuredClone(timeline?.subtitleBindings ?? []),
    audioMix: structuredClone(timeline?.audioMix ?? []),
  };
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
      timelineRevision: 0,
      selectedClipIds: [],
      selectedTrackId: null,
      currentTime: 0,
      editSession: null,
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
          timeline: buildTimelineV2([], 0),
        };

        set({
          currentProject: project,
          history: [],
          historyIndex: -1,
          timelineRevision: 0,
          selectedClipIds: [],
          selectedTrackId: null,
          currentTime: 0,
        });

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
            const normalizedTracks = normalizeTracks(data.tracks);
            set({
              currentProject: {
                id: data.id,
                name: data.name,
                createdAt: data.createdAt.getTime(),
                updatedAt: data.updatedAt.getTime(),
                resolution: data.resolution,
                frameRate: data.frameRate,
                aspectRatio: data.aspectRatio,
                tracks: normalizedTracks,
                duration: data.duration,
                timeline: buildTimelineV2(normalizedTracks, data.duration),
              },
              isLoading: false,
              history: [],
              historyIndex: -1,
              timelineRevision: 0,
              selectedClipIds: [],
              selectedTrackId: null,
              currentTime: 0,
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
          set({
            currentProject: null,
            history: [],
            historyIndex: -1,
            timelineRevision: 0,
            selectedClipIds: [],
            selectedTrackId: null,
            currentTime: 0,
            editSession: null,
          });
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
          currentProject: {
            ...currentProject,
            tracks,
            timeline: buildTimelineV2(tracks, currentProject.duration, {
              markers: currentProject.timeline.markers,
              layers: currentProject.timeline.layers,
              subtitleBindings: currentProject.timeline.subtitleBindings,
              audioMix: currentProject.timeline.audioMix,
            }),
            updatedAt: Date.now(),
          },
        });
      },

      updateDuration: (duration) => {
        const { currentProject } = get();
        if (!currentProject) return;

        set({
          currentProject: {
            ...currentProject,
            duration,
            timeline: buildTimelineV2(currentProject.tracks, duration, {
              markers: currentProject.timeline.markers,
              layers: currentProject.timeline.layers,
              subtitleBindings: currentProject.timeline.subtitleBindings,
              audioMix: currentProject.timeline.audioMix,
            }),
            updatedAt: Date.now(),
          },
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
      pushHistory: (action, tracks, duration, snapshot = {}) => {
        const {
          history,
          historyIndex,
          maxHistorySize,
          timelineRevision,
          selectedClipIds,
          selectedTrackId,
          currentTime,
          currentProject,
          editSession,
        } = get();

        const selection = sanitizeSnapshotSelection(tracks, duration, {
          selectedClipIds: snapshot.selectedClipIds ?? selectedClipIds,
          selectedTrackId: snapshot.selectedTrackId ?? selectedTrackId,
          currentTime: snapshot.currentTime ?? currentTime,
        });

        const timeline = snapshotTimeline({
          markers: snapshot.markers ?? currentProject?.timeline.markers,
          layers: snapshot.layers ?? currentProject?.timeline.layers,
          subtitleBindings: snapshot.subtitleBindings ?? currentProject?.timeline.subtitleBindings,
          audioMix: snapshot.audioMix ?? currentProject?.timeline.audioMix,
        });

        const nextRevision = timelineRevision + 1;
        const historySnapshot: HistorySnapshot = {
          id: generateId(),
          timestamp: Date.now(),
          action,
          revision: nextRevision,
          tracks: structuredClone(tracks),
          duration,
          ...selection,
          ...timeline,
        };

        // Remove any redo history
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(historySnapshot);

        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        set({
          currentProject: currentProject
            ? {
                ...currentProject,
                tracks: structuredClone(tracks),
                duration,
                timeline: buildTimelineV2(tracks, duration, timeline),
                updatedAt: Date.now(),
              }
            : null,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          timelineRevision: nextRevision,
          selectedClipIds: historySnapshot.selectedClipIds,
          selectedTrackId: historySnapshot.selectedTrackId,
          currentTime: historySnapshot.currentTime,
          editSession: editSession
            ? {
                ...editSession,
                lastCommittedRevision: nextRevision,
                pendingOperation: null,
                updatedAt: Date.now(),
              }
            : null,
        });

        return historySnapshot;
      },

      commitTimelineMutation: (input) => {
        return get().pushHistory(input.action, input.tracks, input.duration, {
          selectedClipIds: input.selectedClipIds,
          selectedTrackId: input.selectedTrackId,
          currentTime: input.currentTime,
          markers: input.markers,
          layers: input.layers,
          subtitleBindings: input.subtitleBindings,
          audioMix: input.audioMix,
        });
      },

      undo: () => {
        const { history, historyIndex, currentProject, editSession } = get();
        if (historyIndex <= 0) return null;

        const newIndex = historyIndex - 1;
        const snapshot = history[newIndex];
        const selection = sanitizeSnapshotSelection(snapshot.tracks, snapshot.duration, snapshot);
        const timeline = snapshotTimeline(snapshot);

        set({
          historyIndex: newIndex,
          selectedClipIds: selection.selectedClipIds,
          selectedTrackId: selection.selectedTrackId,
          currentTime: selection.currentTime,
          currentProject: currentProject
            ? {
                ...currentProject,
                tracks: structuredClone(snapshot.tracks),
                duration: snapshot.duration,
                timeline: buildTimelineV2(snapshot.tracks, snapshot.duration, timeline),
                updatedAt: Date.now(),
              }
            : null,
          editSession: editSession
            ? {
                ...editSession,
                lastCommittedRevision: snapshot.revision,
                pendingOperation: 'undo',
                updatedAt: Date.now(),
              }
            : null,
        });
        return snapshot;
      },

      redo: () => {
        const { history, historyIndex, currentProject, editSession } = get();
        if (historyIndex >= history.length - 1) return null;

        const newIndex = historyIndex + 1;
        const snapshot = history[newIndex];
        const selection = sanitizeSnapshotSelection(snapshot.tracks, snapshot.duration, snapshot);
        const timeline = snapshotTimeline(snapshot);

        set({
          historyIndex: newIndex,
          selectedClipIds: selection.selectedClipIds,
          selectedTrackId: selection.selectedTrackId,
          currentTime: selection.currentTime,
          currentProject: currentProject
            ? {
                ...currentProject,
                tracks: structuredClone(snapshot.tracks),
                duration: snapshot.duration,
                timeline: buildTimelineV2(snapshot.tracks, snapshot.duration, timeline),
                updatedAt: Date.now(),
              }
            : null,
          editSession: editSession
            ? {
                ...editSession,
                lastCommittedRevision: snapshot.revision,
                pendingOperation: 'redo',
                updatedAt: Date.now(),
              }
            : null,
        });
        return snapshot;
      },

      jumpToHistory: (index) => {
        const { history, currentProject, editSession } = get();
        if (index < 0 || index >= history.length) {
          return null;
        }

        const snapshot = history[index];
        const selection = sanitizeSnapshotSelection(snapshot.tracks, snapshot.duration, snapshot);
        const timeline = snapshotTimeline(snapshot);

        set({
          historyIndex: index,
          selectedClipIds: selection.selectedClipIds,
          selectedTrackId: selection.selectedTrackId,
          currentTime: selection.currentTime,
          currentProject: currentProject
            ? {
                ...currentProject,
                tracks: structuredClone(snapshot.tracks),
                duration: snapshot.duration,
                timeline: buildTimelineV2(snapshot.tracks, snapshot.duration, timeline),
                updatedAt: Date.now(),
              }
            : null,
          editSession: editSession
            ? {
                ...editSession,
                lastCommittedRevision: snapshot.revision,
                pendingOperation: 'history-jump',
                updatedAt: Date.now(),
              }
            : null,
        });
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

      // Session
      startEditSession: (input) => {
        const now = Date.now();
        const { timelineRevision } = get();
        const session: VideoEditSession = {
          sessionId: generateId(),
          sourceType: input.sourceType,
          sourceRef: input.sourceRef,
          sourceMetadata: input.sourceMetadata,
          workingProjectId: input.workingProjectId ?? get().currentProject?.id ?? null,
          lastCommittedRevision: timelineRevision,
          pendingOperation: null,
          createdAt: now,
          updatedAt: now,
        };

        set({ editSession: session });
        return session;
      },

      resumeEditSession: (input) => {
        const { editSession, currentProject, timelineRevision } = get();
        const now = Date.now();

        if (editSession && (!input?.sessionId || input.sessionId === editSession.sessionId)) {
          const resumed: VideoEditSession = {
            ...editSession,
            sourceType: input?.sourceType ?? editSession.sourceType,
            sourceRef: input?.sourceRef ?? editSession.sourceRef,
            sourceMetadata: input?.sourceMetadata ?? editSession.sourceMetadata,
            workingProjectId: input?.workingProjectId ?? editSession.workingProjectId,
            updatedAt: now,
          };
          set({ editSession: resumed });
          return resumed;
        }

        if (!editSession) {
          const resumed: VideoEditSession = {
            sessionId: input?.sessionId ?? generateId(),
            sourceType: input?.sourceType ?? 'unknown',
            sourceRef: input?.sourceRef ?? currentProject?.id ?? 'unknown-source',
            sourceMetadata: input?.sourceMetadata,
            workingProjectId: input?.workingProjectId ?? currentProject?.id ?? null,
            lastCommittedRevision: timelineRevision,
            pendingOperation: null,
            createdAt: now,
            updatedAt: now,
          };
          set({ editSession: resumed });
          return resumed;
        }

        return null;
      },

      updatePendingOperation: (operation) => {
        const { editSession } = get();
        if (!editSession) {
          return;
        }
        set({
          editSession: {
            ...editSession,
            pendingOperation: operation,
            updatedAt: Date.now(),
          },
        });
      },

      endEditSession: () => {
        set({ editSession: null });
      },

      // State management
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      reset: () => {
        set({
          currentProject: null,
          history: [],
          historyIndex: -1,
          timelineRevision: 0,
          selectedClipIds: [],
          selectedTrackId: null,
          currentTime: 0,
          editSession: null,
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
export const selectEditSession = (state: VideoEditorState) => state.editSession;
export const selectCanUndo = (state: VideoEditorState & VideoEditorActions) => state.canUndo();
export const selectCanRedo = (state: VideoEditorState & VideoEditorActions) => state.canRedo();
