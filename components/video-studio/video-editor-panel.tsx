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

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Scissors,
  Sparkles,
  Film,
  Upload,
  Save,
  Undo,
  Redo,
  FolderOpen,
  Type,
  Mic,
} from 'lucide-react';

import { VideoTimeline } from './video-timeline';
import { VideoPreview } from './video-preview';
import { VideoEffectsPanel, type AppliedEffect } from './video-effects-panel';
import { VideoTransitions } from './video-transitions';
import { VideoTrimmer } from './video-trimmer';
import { VideoSubtitleTrack } from './video-subtitle-track';
import { ZoomControls } from './zoom-controls';
import { useVideoEditor, type VideoClip } from '@/hooks/video-studio/use-video-editor';
import { useVideoTimeline } from '@/hooks/video-studio/use-video-timeline';
import { useVideoSubtitles } from '@/hooks/video-studio/use-video-subtitles';

export interface VideoEditorPanelProps {
  initialVideoUrl?: string;
  onExport?: (blob: Blob) => void;
  onSave?: () => void;
  className?: string;
}

type EditorMode = 'timeline' | 'trim' | 'effects' | 'transitions' | 'subtitles';

export function VideoEditorPanel({
  initialVideoUrl,
  onExport,
  onSave,
  className,
}: VideoEditorPanelProps) {
  // State
  const [editorMode, setEditorMode] = useState<EditorMode>('timeline');
  const [selectedClipForTrim, setSelectedClipForTrim] = useState<VideoClip | null>(null);
  const [showTrimDialog, setShowTrimDialog] = useState(false);
  const [showTransitionsDialog, setShowTransitionsDialog] = useState(false);
  const [transitionClipId, setTransitionClipId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [transitionDuration, setTransitionDuration] = useState(1);
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);
  const [selectedSubtitleCueIds, setSelectedSubtitleCueIds] = useState<string[]>([]);

  // Use the video editor hook
  const editor = useVideoEditor({
    onClipChange: (clips) => {
      console.log('Clips changed:', clips.length);
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
      console.log('Subtitles loaded:', tracks.length);
    },
  });

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
  const handleOpenTransitions = useCallback(() => {
    if (selectedClip) {
      setTransitionClipId(selectedClip.id);
      setShowTransitionsDialog(true);
    }
  }, [selectedClip]);

  const handleTransitionApply = useCallback(() => {
    if (transitionClipId && selectedTransitionId) {
      editor.addTransition(transitionClipId, '', selectedTransitionId, transitionDuration);
    }
    setShowTransitionsDialog(false);
    setTransitionClipId(null);
    setSelectedTransitionId(null);
  }, [transitionClipId, selectedTransitionId, transitionDuration, editor]);

  const handleTransitionCancel = useCallback(() => {
    setShowTransitionsDialog(false);
    setTransitionClipId(null);
    setSelectedTransitionId(null);
  }, []);

  // Handle effects
  const handleAddEffect = useCallback(
    (effectId: string) => {
      if (!selectedClip) return;

      const newEffect: AppliedEffect = {
        id: `effect-${Date.now()}`,
        effectId,
        name: effectId.split(':').pop() || effectId,
        enabled: true,
        params: {},
      };

      setAppliedEffects((prev) => [...prev, newEffect]);
      editor.addEffect(selectedClip.id, effectId);
    },
    [selectedClip, editor]
  );

  const handleRemoveEffect = useCallback(
    (id: string) => {
      const effect = appliedEffects.find((e) => e.id === id);
      if (effect && selectedClip) {
        editor.removeEffect(selectedClip.id, effect.effectId);
      }
      setAppliedEffects((prev) => prev.filter((e) => e.id !== id));
    },
    [appliedEffects, selectedClip, editor]
  );

  const handleToggleEffect = useCallback((id: string, enabled: boolean) => {
    setAppliedEffects((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled } : e))
    );
  }, []);

  const handleUpdateEffectParams = useCallback(
    (id: string, params: Record<string, unknown>) => {
      setAppliedEffects((prev) =>
        prev.map((e) => (e.id === id ? { ...e, params } : e))
      );
    },
    []
  );

  const handleReorderEffects = useCallback((fromIndex: number, toIndex: number) => {
    setAppliedEffects((prev) => {
      const newEffects = [...prev];
      const [removed] = newEffects.splice(fromIndex, 1);
      newEffects.splice(toIndex, 0, removed);
      return newEffects;
    });
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    const blob = await editor.exportVideo({
      format: 'mp4',
      resolution: '1080p',
      fps: 30,
      quality: 'high',
    });

    if (blob && onExport) {
      onExport(blob);
    }
  }, [editor, onExport]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleImportVideo}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import Video</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled>
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled>
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editorMode === 'trim' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={handleOpenTrim}
                disabled={!selectedClip}
              >
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Trim Clip</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editorMode === 'effects' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setEditorMode(editorMode === 'effects' ? 'timeline' : 'effects')}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Effects</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editorMode === 'transitions' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={handleOpenTransitions}
                disabled={!selectedClip}
              >
                <Film className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Transitions</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editorMode === 'subtitles' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setEditorMode(editorMode === 'subtitles' ? 'timeline' : 'subtitles')}
              >
                <Type className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Subtitles</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => subtitles.transcribeVideo(previewUrl)}
                disabled={!previewUrl || subtitles.isTranscribing}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Transcribe Audio</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button size="sm" onClick={handleExport} disabled={editor.state.isProcessing}>
            <Upload className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview area */}
        <div className="flex-1 flex flex-col">
          {/* Video preview */}
          <div className="flex-1 bg-black flex items-center justify-center">
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
                <p>Import a video to get started</p>
                <Button variant="outline" className="mt-4" onClick={handleImportVideo}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Import Video
                </Button>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="h-[200px] border-t relative">
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
                onCueDuplicate={() => {}}
                onTimeChange={(time) => editor.seek(time / 1000)}
              />
            )}
          </div>
        </div>

        {/* Side panel for effects */}
        {editorMode === 'effects' && (
          <div className="w-80 border-l p-4">
            <VideoEffectsPanel
              appliedEffects={appliedEffects}
              onAddEffect={handleAddEffect}
              onRemoveEffect={handleRemoveEffect}
              onToggleEffect={handleToggleEffect}
              onUpdateParams={handleUpdateEffectParams}
              onReorderEffects={handleReorderEffects}
            />
          </div>
        )}
      </div>

      {/* Trim Dialog */}
      <Dialog open={showTrimDialog} onOpenChange={setShowTrimDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Trim Clip</DialogTitle>
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
      <Dialog open={showTransitionsDialog} onOpenChange={setShowTransitionsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Transition</DialogTitle>
          </DialogHeader>
          <VideoTransitions
            selectedTransitionId={selectedTransitionId}
            transitionDuration={transitionDuration}
            onTransitionSelect={setSelectedTransitionId}
            onDurationChange={setTransitionDuration}
            onPreview={() => {}}
            onApply={handleTransitionApply}
            onCancel={handleTransitionCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VideoEditorPanel;
