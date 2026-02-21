'use client';

/**
 * VideoEditorPanel - Integrated video editing panel
 * 
 * Combines all video studio components into a cohesive editing experience:
 * - VideoTimeline for multi-track editing
 * - VideoPreview for playback
 * - VideoEffectsPanel for effects
 * - VideoTransitions for transitions
 * - VideoTrimmer for precise trimming
 * 
 * This component demonstrates how all the video studio components
 * work together with the useVideoEditor and useVideoTimeline hooks.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Film,
  FolderOpen,
  Palette,
  Layers,
  Music,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { EditorToolbar } from './editor-toolbar';

import { VideoTimeline } from '../timeline/video-timeline';
import { VideoPreview } from '../preview/video-preview';
import { VideoEffectsPanel, type AppliedEffect } from '../effects/video-effects-panel';
import { VideoTransitions } from '../effects/video-transitions';
import { VideoTrimmer } from '../timeline/video-trimmer';
import { VideoSubtitleTrack } from '../timeline/video-subtitle-track';
import { ZoomControls } from '../common/zoom-controls';
import { ColorCorrectionPanel, DEFAULT_COLOR_CORRECTION_SETTINGS, type ColorCorrectionSettings } from '../effects/color-correction-panel';
import { SpeedControls, DEFAULT_SPEED_SETTINGS, type SpeedSettings } from '../timeline/speed-controls';
import { MarkersPanel, type Marker } from '../timeline/markers-panel';
import { type HistoryEntry as _HistoryEntry } from '../common/history-panel';
import { KeyboardShortcutsPanel, DEFAULT_SHORTCUTS, type KeyboardShortcut } from '../common/keyboard-shortcuts-panel';
import { ProjectSettingsPanel, DEFAULT_PROJECT_SETTINGS, type ProjectSettings } from '../common/project-settings-panel';
import { ExportDialog, type ExportSettings } from '../export/export-dialog';
import { AudioMixerPanel, type AudioTrack } from '../audio/audio-mixer-panel';
import { LayerPanel, type VideoLayer } from '../composition/layer-panel';
import { useVideoEditor } from '@/hooks/video-studio/use-video-editor';
import { normalizeClipEffects } from '@/types/video-studio/types';
import type { VideoClip, EditorMode, SidePanelTab, AudioMixTrack } from '@/types/video-studio/types';
import { useVideoTimeline } from '@/hooks/video-studio/use-video-timeline';
import { useVideoSubtitles } from '@/hooks/video-studio/use-video-subtitles';
import type { SubtitleFormat } from '@/types/media/subtitle';
import { useVideoEditorStore } from '@/stores/media';
import type { ExportProgress } from '@/lib/plugin/api/media-api';
import { Progress } from '@/components/ui/progress';

export interface VideoEditorPanelProps {
  initialVideoUrl?: string;
  onExport?: (blob: Blob) => void;
  onSave?: () => void;
  className?: string;
}

export function VideoEditorPanel({
  initialVideoUrl,
  onExport,
  onSave: _onSave,
  className,
}: VideoEditorPanelProps) {
  const toSubtitleFormat = useCallback(
    (format: SubtitleFormat): 'srt' | 'vtt' | 'ass' | 'ssa' => {
      if (format === 'srt' || format === 'vtt' || format === 'ass' || format === 'ssa') {
        return format;
      }
      return 'vtt';
    },
    []
  );

  const toExportSubtitleFormat = useCallback(
    (format: SubtitleFormat): 'srt' | 'vtt' | 'ass' => {
      if (format === 'srt' || format === 'vtt') {
        return format;
      }
      if (format === 'ass' || format === 'ssa') {
        return 'ass';
      }
      return 'vtt';
    },
    []
  );

  const toMarkerColor = useCallback((color?: string): Marker['color'] => {
    switch (color) {
      case 'red':
      case 'orange':
      case 'yellow':
      case 'green':
      case 'blue':
      case 'purple':
      case 'pink':
      case 'gray':
        return color;
      default:
        return 'blue';
    }
  }, []);

  const toEffectParams = useCallback((value: object): Record<string, unknown> => {
    return value as Record<string, unknown>;
  }, []);

  const t = useTranslations('editorPanel');
  // State
  const [editorMode, setEditorMode] = useState<EditorMode>('timeline');
  const [selectedClipForTrim, setSelectedClipForTrim] = useState<VideoClip | null>(null);
  const [showTrimDialog, setShowTrimDialog] = useState(false);
  const [showTransitionsDialog, setShowTransitionsDialog] = useState(false);
  const [transitionClipId, setTransitionClipId] = useState<string | null>(null);
  const [transitionTargetClipId, setTransitionTargetClipId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [transitionDuration, setTransitionDuration] = useState(1);
  const [selectedSubtitleCueIds, setSelectedSubtitleCueIds] = useState<string[]>([]);
  
  // New state for enhanced features
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>('effects');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [colorSettings, setColorSettings] = useState<ColorCorrectionSettings>(DEFAULT_COLOR_CORRECTION_SETTINGS);
  const [speedSettings, setSpeedSettings] = useState<SpeedSettings>(DEFAULT_SPEED_SETTINGS);
  // Use the video editor store for history management
  const {
    pushHistory,
    undo: storeUndo,
    redo: storeRedo,
    canUndo,
    canRedo,
  } = useVideoEditorStore();

  // Track last action for history
  const lastActionRef = useRef<string>('initial');
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(DEFAULT_SHORTCUTS);
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(DEFAULT_PROJECT_SETTINGS);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [masterVolume, setMasterVolume] = useState(1);
  const [masterMuted, setMasterMuted] = useState(false);
  const [layers, setLayers] = useState<VideoLayer[]>([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);

  // Use the video editor hook
  const editor = useVideoEditor({
    onClipChange: (_clips) => {
      // Push to history when clips change (skip if this is from undo/redo)
      if (lastActionRef.current !== 'undo' && lastActionRef.current !== 'redo') {
        const tracks = editor?.state?.tracks;
        if (tracks && tracks.length > 0) {
          pushHistory(lastActionRef.current || 'edit', tracks, editor.state.duration);
        }
      }
      lastActionRef.current = 'edit';
    },
    onPlaybackChange: (isPlaying, time) => {
      timeline.setCurrentTime(time);
      timeline.setPlaying(isPlaying);
    },
  });

  // Use the timeline hook
  const timeline = useVideoTimeline({
    duration: editor.state.duration,
    onTimeChange: (time) => {
      editor.seek(time);
    },
  });

  // Use the subtitles hook
  const subtitles = useVideoSubtitles({
    language: 'en',
    onSubtitlesLoaded: (tracks) => {
      loggers.media.debug('Subtitles loaded', { count: tracks.length });
    },
  });
  const subtitleTracks = subtitles.tracks;
  const setSubtitlePlaybackTime = subtitles.setPlaybackTime;
  const setSubtitleBindings = editor.setSubtitleBindings;
  const setTimelineLayers = editor.setTimelineLayers;

  // Get the currently selected clip
  const selectedClip = useMemo(() => {
    if (editor.state.selectedClipIds.length !== 1) return null;
    const clipId = editor.state.selectedClipIds[0];
    for (const track of editor.state.tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) return clip;
    }
    return null;
  }, [editor.state.selectedClipIds, editor.state.tracks]);

  const selectedTrack = useMemo(() => {
    if (!selectedClip) {
      return null;
    }
    return editor.state.tracks.find((track) => track.clips.some((clip) => clip.id === selectedClip.id)) ?? null;
  }, [editor.state.tracks, selectedClip]);

  const adjacentClip = useMemo(() => {
    if (!selectedClip || !selectedTrack) {
      return null;
    }
    const ordered = [...selectedTrack.clips].sort((a, b) => a.startTime - b.startTime);
    const selectedIndex = ordered.findIndex((clip) => clip.id === selectedClip.id);
    if (selectedIndex === -1) {
      return null;
    }
    return ordered[selectedIndex + 1] ?? null;
  }, [selectedClip, selectedTrack]);

  const markers = useMemo<Marker[]>(
    () =>
      editor.timeline.markers.map((marker, index) => ({
        id: marker.id,
        time: marker.time,
        name: marker.name ?? marker.label ?? `Marker ${index + 1}`,
        type: marker.type ?? 'marker',
        description: marker.description,
        completed: marker.completed,
        color: toMarkerColor(marker.color),
      })),
    [editor.timeline.markers, toMarkerColor]
  );

  const appliedEffects = useMemo<AppliedEffect[]>(() => {
    if (!selectedClip) {
      return [];
    }
    return normalizeClipEffects(selectedClip.effects).map((effect) => ({
      id: effect.id,
      effectId: effect.effectId,
      name: effect.effectId.split(':').pop() || effect.effectId,
      enabled: effect.enabled,
      params: effect.params,
    }));
  }, [selectedClip]);

  useEffect(() => {
    setSubtitlePlaybackTime(editor.state.currentTime * 1000);
  }, [editor.state.currentTime, setSubtitlePlaybackTime]);

  useEffect(() => {
    const bindings = subtitleTracks.map((track) => ({
      id: track.id,
      trackId: track.id,
      source: track.source,
      format: toSubtitleFormat(track.format),
      burnIn: true,
      offsetMs: 0,
    }));
    setSubtitleBindings(bindings);
  }, [setSubtitleBindings, subtitleTracks, toSubtitleFormat]);

  const audioTracks = useMemo<AudioTrack[]>(() => {
    const mixLookup = new Map(editor.timeline.audioMix.map((track) => [track.id, track]));
    return editor.state.tracks.map((track) => {
      const mixTrack = mixLookup.get(track.id);
      return {
        id: track.id,
        name: track.name,
        type: track.type === 'audio' ? 'audio' : 'video',
        volume: mixTrack?.volume ?? track.volume,
        pan: mixTrack?.pan ?? 0,
        muted: mixTrack?.muted ?? track.muted,
        solo: Boolean(mixTrack?.solo),
        level: track.muted ? 0 : (mixTrack?.volume ?? track.volume),
      };
    });
  }, [editor.state.tracks, editor.timeline.audioMix]);

  const buildMixTracks = useCallback(
    (tracks: AudioTrack[]): AudioMixTrack[] => {
      return tracks.map((track) => ({
        id: track.id,
        sourceTrackId: track.id,
        volume: track.volume,
        muted: track.muted,
        pan: track.pan,
        solo: track.solo,
      }));
    },
    []
  );

  const displayMasterVolume = editor.state.tracks.length > 0 ? masterVolume : 0;

  useEffect(() => {
    const mappedLayers = layers.map((layer, index) => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      startTime: layer.startTime,
      duration: layer.duration,
      zIndex: index,
      payload: {
        blendMode: layer.blendMode,
        position: layer.position,
        scale: layer.scale,
        rotation: layer.rotation,
      },
    }));
    setTimelineLayers(mappedLayers);
  }, [layers, setTimelineLayers]);

  // Get preview URL (first selected clip or first clip overall)
  const previewUrl = useMemo(() => {
    if (selectedClip) return selectedClip.sourceUrl;
    if (editor.state.tracks.length > 0 && editor.state.tracks[0].clips.length > 0) {
      return editor.state.tracks[0].clips[0].sourceUrl;
    }
    return initialVideoUrl || '';
  }, [selectedClip, editor.state.tracks, initialVideoUrl]);

  // Handle file import
  const handleImportVideo = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      // Ensure we have at least one track
      let trackId = editor.state.tracks[0]?.id;
      if (!trackId) {
        trackId = editor.addTrack('video', 'Video Track 1');
      }

      // Add each video as a clip
      for (const file of Array.from(files)) {
        const url = URL.createObjectURL(file);
        await editor.addClip(trackId, url);
      }
    };

    input.click();
  }, [editor]);

  // Handle trim
  const handleOpenTrim = useCallback(() => {
    if (selectedClip) {
      setSelectedClipForTrim(selectedClip);
      setShowTrimDialog(true);
    }
  }, [selectedClip]);

  const handleTrimConfirm = useCallback(
    (inPoint: number, outPoint: number) => {
      if (selectedClipForTrim) {
        editor.trimClip(selectedClipForTrim.id, inPoint, outPoint);
      }
      setShowTrimDialog(false);
      setSelectedClipForTrim(null);
    },
    [selectedClipForTrim, editor]
  );

  const handleTrimCancel = useCallback(() => {
    setShowTrimDialog(false);
    setSelectedClipForTrim(null);
  }, []);

  // Handle transitions
  const handleEditorModeChange = useCallback(
    (nextMode: EditorMode) => {
      if (nextMode !== 'transitions') {
        setEditorMode(nextMode);
        return;
      }

      if (!selectedClip || !adjacentClip) {
        setShowTransitionsDialog(false);
        setTransitionClipId(null);
        setTransitionTargetClipId(null);
        setSelectedTransitionId(null);
        setEditorMode('timeline');
        return;
      }

      setTransitionClipId(selectedClip.id);
      setTransitionTargetClipId(adjacentClip.id);
      setShowTransitionsDialog(true);
      setEditorMode(nextMode);
    },
    [adjacentClip, selectedClip]
  );

  const handleTransitionApply = useCallback(() => {
    if (transitionClipId && transitionTargetClipId && selectedTransitionId) {
      editor.addTransition(transitionClipId, transitionTargetClipId, selectedTransitionId, transitionDuration);
    }
    setShowTransitionsDialog(false);
    setTransitionClipId(null);
    setTransitionTargetClipId(null);
    setSelectedTransitionId(null);
    setEditorMode('timeline');
  }, [transitionClipId, transitionTargetClipId, selectedTransitionId, transitionDuration, editor]);

  const handleTransitionCancel = useCallback(() => {
    setShowTransitionsDialog(false);
    setTransitionClipId(null);
    setTransitionTargetClipId(null);
    setSelectedTransitionId(null);
    setEditorMode('timeline');
  }, []);

  // Handle effects
  const handleAddEffect = useCallback(
    (effectId: string, defaultParams?: Record<string, unknown>) => {
      if (!selectedClip) return;
      editor.addEffect(selectedClip.id, effectId, defaultParams);
    },
    [selectedClip, editor]
  );

  const handleRemoveEffect = useCallback(
    (id: string) => {
      const effect = appliedEffects.find((e) => e.id === id);
      if (effect && selectedClip) {
        editor.removeEffect(selectedClip.id, effect.effectId);
      }
    },
    [appliedEffects, selectedClip, editor]
  );

  const handleToggleEffect = useCallback(
    (id: string, enabled: boolean) => {
      if (selectedClip) {
        editor.setEffectEnabled(selectedClip.id, id, enabled);
      }
    },
    [editor, selectedClip]
  );

  const handleUpdateEffectParams = useCallback(
    (id: string, params: Record<string, unknown>) => {
      if (selectedClip) {
        editor.updateEffectParams(selectedClip.id, id, params);
      }
    },
    [editor, selectedClip]
  );

  const handleReorderEffects = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (selectedClip) {
        editor.reorderEffects(selectedClip.id, fromIndex, toIndex);
      }
    },
    [editor, selectedClip]
  );

  // Handle export
  const handleExport = useCallback(async (settings: ExportSettings) => {
    // Map unsupported values to compatible ones
    const exportFormat = settings.format === 'mov' ? 'mp4' : settings.format;
    const exportResolution = settings.resolution === 'custom' ? '1080p' : settings.resolution;
    const exportQuality = settings.quality === 'ultra' ? 'maximum' : settings.quality;
    setShowExportDialog(false);
    setExportProgress({ phase: 'preparing', percent: 0, message: 'Starting export...' });

    const subtitleMode: 'burn-in' | 'sidecar' | 'both' = 'both';
    const subtitleTracks = subtitles.tracks.map((track) => {
      const exported = subtitles.exportForVideo(track.id, subtitleMode, track.format);
      return {
        id: track.id,
        format: toExportSubtitleFormat(track.format),
        content: exported.sidecar ?? exported.burnIn ?? '',
        burnIn: true,
      };
    });

    const blob = await editor.exportVideo({
      format: exportFormat,
      resolution: exportResolution,
      fps: settings.fps,
      quality: exportQuality,
      includeSubtitles: subtitleTracks.length > 0,
      subtitleMode,
      subtitleTracks,
      onProgress: (progress) => {
        setExportProgress(progress);
        if (progress.phase === 'complete' || progress.phase === 'error') {
          setTimeout(() => setExportProgress(null), 3000);
        }
      },
    });

    if (blob && onExport) {
      onExport(blob);
    }
  }, [editor, onExport, subtitles, toExportSubtitleFormat]);

  // Handle markers
  const handleAddMarker = useCallback((marker: Omit<Marker, 'id'>) => {
    const newMarker: Marker = {
      ...marker,
      id: `marker-${Date.now()}`,
    };
    const nextMarkers = [...markers, newMarker].sort((a, b) => a.time - b.time);
    editor.setTimelineMarkers(
      nextMarkers.map((item) => ({
        id: item.id,
        time: item.time,
        name: item.name,
        label: item.name,
        type: item.type,
        description: item.description,
        completed: item.completed,
        color: item.color,
      }))
    );
  }, [editor, markers]);

  const handleUpdateMarker = useCallback((id: string, updates: Partial<Marker>) => {
    const nextMarkers = markers.map((marker) =>
      marker.id === id ? { ...marker, ...updates } : marker
    );
    editor.setTimelineMarkers(
      nextMarkers.map((item) => ({
        id: item.id,
        time: item.time,
        name: item.name,
        label: item.name,
        type: item.type,
        description: item.description,
        completed: item.completed,
        color: item.color,
      }))
    );
  }, [editor, markers]);

  const handleDeleteMarker = useCallback((id: string) => {
    const nextMarkers = markers.filter((marker) => marker.id !== id);
    editor.setTimelineMarkers(
      nextMarkers.map((item) => ({
        id: item.id,
        time: item.time,
        name: item.name,
        label: item.name,
        type: item.type,
        description: item.description,
        completed: item.completed,
        color: item.color,
      }))
    );
  }, [editor, markers]);

  const handleJumpToMarker = useCallback((time: number) => {
    editor.seek(time);
  }, [editor]);

  // Handle history with store - actual track restoration
  const handleUndo = useCallback(() => {
    lastActionRef.current = 'undo';
    const snapshot = storeUndo();
    if (snapshot) {
      editor.setTracks(snapshot.tracks, snapshot.duration);
    }
  }, [storeUndo, editor]);

  const handleRedo = useCallback(() => {
    lastActionRef.current = 'redo';
    const snapshot = storeRedo();
    if (snapshot) {
      editor.setTracks(snapshot.tracks, snapshot.duration);
    }
  }, [storeRedo, editor]);

  // Handle side panel toggle
  const handleToggleSidePanel = useCallback((tab: SidePanelTab) => {
    if (showSidePanel && sidePanelTab === tab) {
      setShowSidePanel(false);
    } else {
      setSidePanelTab(tab);
      setShowSidePanel(true);
    }
  }, [showSidePanel, sidePanelTab]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <EditorToolbar
        editorMode={editorMode}
        setEditorMode={handleEditorModeChange}
        showSidePanel={showSidePanel}
        sidePanelTab={sidePanelTab}
        onToggleSidePanel={handleToggleSidePanel}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onImportVideo={handleImportVideo}
        onOpenTrim={handleOpenTrim}
        hasSelectedClip={!!selectedClip}
        zoom={editor.state.zoom}
        onZoomChange={editor.setZoom}
        onFitToView={() => editor.setZoom(1)}
        onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
        onShowProjectSettings={() => setShowProjectSettings(true)}
        onShowExportDialog={() => setShowExportDialog(true)}
      />

      {/* Export Progress Bar */}
      {exportProgress && (
        <div className="px-3 py-2 border-b bg-muted/50 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium capitalize">
              {exportProgress.phase === 'error' ? '❌ ' : ''}
              {exportProgress.message || exportProgress.phase}
            </span>
            <span className="text-muted-foreground">{exportProgress.percent}%</span>
          </div>
          <Progress
            value={exportProgress.percent}
            className={cn('h-1.5', exportProgress.phase === 'error' && '[&>div]:bg-destructive', exportProgress.phase === 'complete' && '[&>div]:bg-green-500')}
          />
          {exportProgress.currentFrame !== undefined && exportProgress.totalFrames !== undefined && (
            <div className="text-xs text-muted-foreground">
              Frame {exportProgress.currentFrame}/{exportProgress.totalFrames}
              {exportProgress.estimatedRemainingMs !== undefined && (
                <span className="ml-2">~{Math.ceil(exportProgress.estimatedRemainingMs / 1000)}s remaining</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview and Timeline area */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          {/* Video preview */}
          <ResizablePanel defaultSize={70} minSize={30}>
            <div className="h-full bg-black flex items-center justify-center">
              {previewUrl ? (
                <VideoPreview
                  src={previewUrl}
                  currentTime={editor.state.currentTime}
                  isPlaying={editor.state.isPlaying}
                  onTimeUpdate={editor.seek}
                  onPlayingChange={(playing) => playing ? editor.play() : editor.pause()}
                  className="w-full h-full"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Film className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>{t('importHint')}</p>
                  <Button variant="outline" className="mt-4" onClick={handleImportVideo}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {t('importVideo')}
                  </Button>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Timeline */}
          <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
            <div className="h-full border-t relative">
            {/* Zoom controls */}
            <div className="absolute top-2 right-2 z-10">
              <ZoomControls
                zoom={editor.state.zoom}
                minZoom={0.1}
                maxZoom={10}
                step={0.25}
                onZoomChange={editor.setZoom}
                onFitToView={() => editor.setZoom(1)}
                compact
              />
            </div>
            <VideoTimeline
              tracks={editor.state.tracks}
              currentTime={editor.state.currentTime}
              duration={editor.state.duration}
              zoom={editor.state.zoom}
              isPlaying={editor.state.isPlaying}
              selectedClipIds={editor.state.selectedClipIds}
              selectedTrackId={editor.state.selectedTrackId}
              onTimeChange={editor.seek}
              onPlay={editor.play}
              onPause={editor.pause}
              onSeekStart={() => {}}
              onSeekEnd={() => {}}
              onZoomChange={editor.setZoom}
              onClipSelect={editor.selectClips}
              onClipMove={editor.moveClip}
              onClipTrim={editor.trimClip}
              onClipSplit={editor.splitClip}
              onClipDelete={editor.removeClip}
              onClipDuplicate={editor.duplicateClip}
              onTrackSelect={editor.selectTrack}
              onTrackAdd={editor.addTrack}
              onTrackMute={editor.setTrackMuted}
              onTrackLock={(id, locked) => editor.updateTrack(id, { locked })}
              onTrackVisible={(id, visible) => editor.updateTrack(id, { visible })}
              onSnapToggle={timeline.toggleSnap}
              snapEnabled={timeline.state.snapEnabled}
              className="h-full"
            />
            
            {/* Subtitle tracks */}
            {subtitles.tracks.length > 0 && subtitles.activeTrack && (
              <VideoSubtitleTrack
                trackId={subtitles.activeTrack.id}
                trackName={subtitles.activeTrack.name}
                language={subtitles.activeTrack.language}
                cues={subtitles.activeTrack.cues}
                currentTime={editor.state.currentTime * 1000}
                duration={editor.state.duration * 1000}
                zoom={editor.state.zoom}
                pixelsPerSecond={100}
                isVisible={subtitles.activeTrack.isVisible}
                isLocked={subtitles.activeTrack.isLocked}
                selectedCueIds={selectedSubtitleCueIds}
                onCueSelect={setSelectedSubtitleCueIds}
                onCueUpdate={(cueId, updates) => subtitles.updateCue(subtitles.activeTrack!.id, cueId, updates)}
                onCueDelete={(cueId) => subtitles.removeCue(subtitles.activeTrack!.id, cueId)}
                onCueSplit={(cueId, atTime) => subtitles.splitCue(subtitles.activeTrack!.id, cueId, atTime)}
                onCueMerge={(cueIds) => subtitles.mergeCues(subtitles.activeTrack!.id, cueIds)}
                onCueDuplicate={(cueId) => {
                  if (subtitles.activeTrack) {
                    const cue = subtitles.activeTrack.cues.find(c => c.id === cueId);
                    if (cue) {
                      subtitles.addCue(subtitles.activeTrack.id, {
                        ...cue,
                        startTime: cue.endTime,
                        endTime: cue.endTime + (cue.endTime - cue.startTime),
                      });
                    }
                  }
                }}
                onTimeChange={(time) => editor.seek(time / 1000)}
              />
            )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Side panel with tabs */}
        {showSidePanel && (
          <div className="w-80 border-l flex flex-col bg-background">
            <Tabs value={sidePanelTab} onValueChange={(v) => setSidePanelTab(v as SidePanelTab)} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b px-2">
                <TabsTrigger value="effects" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{t('sidePanelTabs.effects')}</span>
                </TabsTrigger>
                <TabsTrigger value="color" className="gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{t('sidePanelTabs.color')}</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="gap-1.5">
                  <Music className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{t('sidePanelTabs.audio')}</span>
                </TabsTrigger>
                <TabsTrigger value="layers" className="gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{t('sidePanelTabs.layers')}</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="effects" className="flex-1 overflow-auto p-4 mt-0">
                <VideoEffectsPanel
                  appliedEffects={appliedEffects}
                  onAddEffect={handleAddEffect}
                  onRemoveEffect={handleRemoveEffect}
                  onToggleEffect={handleToggleEffect}
                  onUpdateParams={handleUpdateEffectParams}
                  onReorderEffects={handleReorderEffects}
                />
              </TabsContent>
              
              <TabsContent value="color" className="flex-1 overflow-auto p-4 mt-0">
                <ColorCorrectionPanel
                  settings={colorSettings}
                  onSettingsChange={(updates) => {
                    const nextSettings = { ...colorSettings, ...updates };
                    setColorSettings(nextSettings);
                    if (selectedClip) {
                      const params = toEffectParams(nextSettings);
                      editor.addEffect(selectedClip.id, 'color-correction', params);
                      editor.updateEffectParams(selectedClip.id, 'color-correction', params);
                    }
                  }}
                  onReset={() => {
                    setColorSettings(DEFAULT_COLOR_CORRECTION_SETTINGS);
                    if (selectedClip) {
                      const params = toEffectParams(DEFAULT_COLOR_CORRECTION_SETTINGS);
                      editor.addEffect(selectedClip.id, 'color-correction', params);
                      editor.updateEffectParams(
                        selectedClip.id,
                        'color-correction',
                        params
                      );
                    }
                  }}
                />
              </TabsContent>
              
              <TabsContent value="audio" className="flex-1 overflow-auto p-4 mt-0">
                <AudioMixerPanel
                  tracks={audioTracks}
                  masterVolume={displayMasterVolume}
                  masterMuted={masterMuted}
                  onTrackVolumeChange={(id, vol) => {
                    editor.setTrackVolume(id, vol);
                    const nextTracks = audioTracks.map((track) =>
                      track.id === id ? { ...track, volume: vol } : track
                    );
                    editor.setAudioMixTracks(buildMixTracks(nextTracks));
                  }}
                  onTrackPanChange={(id, pan) => {
                    const nextTracks = audioTracks.map((track) =>
                      track.id === id ? { ...track, pan } : track
                    );
                    editor.setAudioMixTracks(buildMixTracks(nextTracks));
                  }}
                  onTrackMuteToggle={(id) => {
                    const nextTracks = audioTracks.map((track) =>
                      track.id === id ? { ...track, muted: !track.muted } : track
                    );
                    const mutedTrack = nextTracks.find((track) => track.id === id);
                    if (mutedTrack) {
                      editor.setTrackMuted(id, mutedTrack.muted);
                    }
                    editor.setAudioMixTracks(buildMixTracks(nextTracks));
                  }}
                  onTrackSoloToggle={(id) => {
                    const nextTracks = audioTracks.map((track) =>
                      track.id === id ? { ...track, solo: !track.solo } : track
                    );
                    editor.setAudioMixTracks(buildMixTracks(nextTracks));
                  }}
                  onMasterVolumeChange={(volume) => {
                    setMasterVolume(volume);
                    const mixTracks: AudioMixTrack[] = audioTracks.map((track) => ({
                      id: track.id,
                      sourceTrackId: track.id,
                      volume: Math.max(0, Math.min(1, track.volume * volume)),
                      muted: masterMuted || track.muted,
                      pan: track.pan,
                      solo: track.solo,
                    }));
                    editor.setAudioMixTracks(mixTracks);
                  }}
                  onMasterMuteToggle={() => {
                    const nextMuted = !masterMuted;
                    setMasterMuted(nextMuted);
                    const mixTracks: AudioMixTrack[] = audioTracks.map((track) => ({
                      id: track.id,
                      sourceTrackId: track.id,
                      volume: track.volume,
                      muted: nextMuted || track.muted,
                      pan: track.pan,
                      solo: track.solo,
                    }));
                    editor.setAudioMixTracks(mixTracks);
                  }}
                />
              </TabsContent>
              
              <TabsContent value="layers" className="flex-1 overflow-auto p-4 mt-0">
                <LayerPanel
                  layers={layers}
                  selectedLayerIds={selectedLayerIds}
                  onLayerSelect={setSelectedLayerIds}
                  onLayerVisibilityToggle={(id) => setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))}
                  onLayerLockToggle={(id) => setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l))}
                  onLayerOpacityChange={(id, opacity) => setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l))}
                  onLayerBlendModeChange={(id, mode) => setLayers(prev => prev.map(l => l.id === id ? { ...l, blendMode: mode } : l))}
                  onLayerRename={(id, name) => setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l))}
                  onLayerReorder={(layerId, direction) => {
                    setLayers(prev => {
                      const idx = prev.findIndex(l => l.id === layerId);
                      if (idx === -1) return prev;
                      const newLayers = [...prev];
                      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
                      if (targetIdx < 0 || targetIdx >= newLayers.length) return prev;
                      const [removed] = newLayers.splice(idx, 1);
                      newLayers.splice(targetIdx, 0, removed);
                      return newLayers;
                    });
                  }}
                  onLayerDelete={(id) => setLayers(prev => prev.filter(l => l.id !== id))}
                  onLayerDuplicate={(id) => {
                    const layer = layers.find(l => l.id === id);
                    if (layer) {
                      setLayers(prev => [...prev, { ...layer, id: `layer-${Date.now()}`, name: `${layer.name} Copy` }]);
                    }
                  }}
                  onAddLayer={(type) => {
                    const newLayer: VideoLayer = {
                      id: `layer-${Date.now()}`,
                      name: `New ${type} Layer`,
                      type,
                      visible: true,
                      locked: false,
                      opacity: 1,
                      blendMode: 'normal',
                      startTime: 0,
                      duration: editor.state.duration,
                      position: { x: 0, y: 0 },
                      scale: { x: 1, y: 1 },
                      rotation: 0,
                    };
                    setLayers(prev => [...prev, newLayer]);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Bottom panel for speed/markers */}
        {(editorMode === 'speed' || editorMode === 'markers') && (
          <div className="absolute bottom-[200px] left-0 right-0 h-48 border-t bg-background z-10">
            {editorMode === 'speed' && (
              <SpeedControls
                settings={speedSettings}
                onSettingsChange={(updates) => {
                  const nextSettings = { ...speedSettings, ...updates };
                  setSpeedSettings(nextSettings);
                  if (selectedClip) {
                    editor.updateClip(selectedClip.id, {
                      playbackSpeed: Math.max(0.1, Math.min(4, nextSettings.speed)),
                    });
                    const params = toEffectParams(nextSettings);
                    editor.addEffect(selectedClip.id, 'speed-ramp', params);
                    editor.updateEffectParams(selectedClip.id, 'speed-ramp', params);
                  }
                }}
                duration={selectedClip?.duration || editor.state.duration}
                onReset={() => {
                  setSpeedSettings(DEFAULT_SPEED_SETTINGS);
                  if (selectedClip) {
                    editor.updateClip(selectedClip.id, {
                      playbackSpeed: DEFAULT_SPEED_SETTINGS.speed,
                    });
                    editor.updateEffectParams(
                      selectedClip.id,
                      'speed-ramp',
                      toEffectParams(DEFAULT_SPEED_SETTINGS)
                    );
                  }
                }}
                className="h-full"
              />
            )}
            {editorMode === 'markers' && (
              <MarkersPanel
                markers={markers}
                currentTime={editor.state.currentTime}
                duration={editor.state.duration}
                onAddMarker={handleAddMarker}
                onUpdateMarker={handleUpdateMarker}
                onDeleteMarker={handleDeleteMarker}
                onJumpToMarker={handleJumpToMarker}
                className="h-full"
              />
            )}
          </div>
        )}
      </div>

      {/* Trim Dialog */}
      <Dialog open={showTrimDialog} onOpenChange={setShowTrimDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('videoEditor.trimClip')}</DialogTitle>
          </DialogHeader>
          {selectedClipForTrim && (
            <VideoTrimmer
              sourceUrl={selectedClipForTrim.sourceUrl}
              duration={selectedClipForTrim.duration}
              inPoint={selectedClipForTrim.sourceStartTime}
              outPoint={selectedClipForTrim.sourceEndTime}
              onInPointChange={() => {}}
              onOutPointChange={() => {}}
              onConfirm={handleTrimConfirm}
              onCancel={handleTrimCancel}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Transitions Dialog */}
      <Dialog
        open={showTransitionsDialog}
        onOpenChange={(open) => {
          setShowTransitionsDialog(open);
          if (!open) {
            setTransitionClipId(null);
            setTransitionTargetClipId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addTransition')}</DialogTitle>
          </DialogHeader>
          <VideoTransitions
            selectedTransitionId={selectedTransitionId}
            transitionDuration={transitionDuration}
            onTransitionSelect={setSelectedTransitionId}
            onDurationChange={setTransitionDuration}
            onPreview={() => {
              // Preview transition by seeking to the clip's end point
              if (transitionClipId) {
                const clip = editor.state.tracks
                  .flatMap(t => t.clips)
                  .find(c => c.id === transitionClipId);
                if (clip) {
                  editor.seek(clip.startTime + clip.duration - transitionDuration);
                  editor.play();
                  setTimeout(() => editor.pause(), transitionDuration * 1000 + 500);
                }
              }
            }}
            onApply={handleTransitionApply}
            onCancel={handleTransitionCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsPanel
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
        shortcuts={shortcuts}
        onShortcutChange={(id, keys) => {
          setShortcuts(prev => prev.map(s => s.id === id ? { ...s, keys } : s));
        }}
        onResetDefaults={() => setShortcuts(DEFAULT_SHORTCUTS)}
      />

      {/* Project Settings Dialog */}
      <ProjectSettingsPanel
        open={showProjectSettings}
        onOpenChange={setShowProjectSettings}
        settings={projectSettings}
        onSettingsChange={(updates) => setProjectSettings(prev => ({ ...prev, ...updates }))}
        onSave={() => {
          loggers.media.info('Project settings saved', { settings: projectSettings });
          setShowProjectSettings(false);
        }}
        onReset={() => setProjectSettings(DEFAULT_PROJECT_SETTINGS)}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        projectName={projectSettings.name}
        duration={editor.state.duration}
        onExport={handleExport}
      />
    </div>
  );
}

export default VideoEditorPanel;
