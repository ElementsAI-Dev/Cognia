'use client';

/**
 * Video Studio Page - Unified video editing and generation interface
 *
 * Thin orchestrator that delegates to mode-specific hooks and components:
 * - Recording Mode: useRecordingMode + RecordingModeContent
 * - AI Generation Mode: useAIGenerationMode + AIGenerationModeContent
 * - Editor Mode: VideoEditorPanel (self-contained)
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, Disc, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  VideoStudioHeader,
  RecordingSidebar,
  AIGenerationSidebar,
  VideoEditorPanel,
  type StudioMode,
} from '@/components/video-studio';
import { useRecordingMode } from '@/hooks/video-studio/use-recording-mode';
import { useAIGenerationMode } from '@/hooks/video-studio/use-ai-generation-mode';
import { RecordingModeContent } from './recording-mode';
import { AIGenerationModeContent } from './ai-generation-mode';

export default function VideoStudioPage() {
  const t = useTranslations('videoStudio');
  const tEditor = useTranslations('videoEditor');
  const tGen = useTranslations('videoGeneration');
  const searchParams = useSearchParams();

  // Get initial mode from URL query parameter
  const modeParam = searchParams.get('mode');
  const initialMode: StudioMode = modeParam === 'recording' ? 'recording' : modeParam === 'editor' ? 'editor' : 'ai-generation';

  // Studio Mode State
  const [studioMode, setStudioMode] = useState<StudioMode>(initialMode);
  const [showSidebar, setShowSidebar] = useState(true);

  // Mode-specific hooks
  const rec = useRecordingMode({ tEditor });
  const gen = useAIGenerationMode();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <VideoStudioHeader
        studioMode={studioMode}
        onStudioModeChange={setStudioMode}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        isRecordingAvailable={rec.isRecordingAvailable}
        isRecording={rec.isRecording}
        isPaused={rec.isPaused}
        isCountdown={rec.isCountdown}
        isProcessing={rec.isRecordingProcessing}
        recordingDuration={rec.recordingDuration}
        monitors={rec.monitors}
        selectedMonitor={rec.selectedMonitor}
        onSelectMonitor={rec.setSelectedMonitor}
        onStartRecording={() => rec.startFullscreen(rec.selectedMonitor ?? 0)}
        onPauseRecording={rec.pauseRecording}
        onResumeRecording={rec.resumeRecording}
        onStopRecording={rec.stopRecording}
        onCancelRecording={rec.cancelRecording}
        onRefreshHistory={rec.refreshHistory}
        formatRecordingDuration={rec.formatRecordingDuration}
        t={t}
        tEditor={tEditor}
        tGen={tGen}
      />

      {/* Recording Error Alert */}
      {studioMode === 'recording' && rec.recordingError && (
        <Alert variant="destructive" className="mx-4 mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{rec.recordingError}</span>
            <Button variant="ghost" size="sm" onClick={rec.clearError}>
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-64 sm:w-80 border-r flex flex-col shrink-0 min-h-0 overflow-hidden">
            {/* Mode selector for mobile */}
            <div className="sm:hidden p-2 border-b">
              <Select value={studioMode} onValueChange={(v) => setStudioMode(v as StudioMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recording">
                    <span className="flex items-center gap-2">
                      <Disc className="h-4 w-4" />
                      Recording
                    </span>
                  </SelectItem>
                  <SelectItem value="ai-generation">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Generation
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recording Mode Sidebar */}
            {studioMode === 'recording' && (
              <RecordingSidebar
                history={rec.filteredHistory}
                selectedRecording={rec.selectedRecording}
                searchQuery={rec.searchQuery}
                onSearchChange={rec.setSearchQuery}
                onSelectRecording={rec.handleSelectRecording}
                onDeleteClick={rec.handleDeleteClick}
                onCloseSidebar={() => setShowSidebar(false)}
                t={tEditor}
              />
            )}

            {/* AI Generation Mode Sidebar */}
            {studioMode === 'ai-generation' && (
              <AIGenerationSidebar
                activeTab={gen.activeTab}
                onActiveTabChange={gen.setActiveTab}
                prompt={gen.prompt}
                onPromptChange={gen.setPrompt}
                negativePrompt={gen.negativePrompt}
                onNegativePromptChange={gen.setNegativePrompt}
                referenceImage={gen.referenceImage}
                onImageUpload={gen.handleImageUpload}
                onClearImage={gen.handleClearReferenceImage}
                showSettings={gen.showSettings}
                onShowSettingsChange={gen.setShowSettings}
                showMoreTemplates={gen.showMoreTemplates}
                onShowMoreTemplatesChange={gen.setShowMoreTemplates}
                provider={gen.provider}
                onProviderChange={gen.setProvider}
                model={gen.model}
                onModelChange={gen.setModel}
                providerModels={gen.providerModels}
                resolution={gen.resolution}
                onResolutionChange={gen.setResolution}
                aspectRatio={gen.aspectRatio}
                onAspectRatioChange={gen.setAspectRatio}
                duration={gen.duration}
                onDurationChange={gen.setDuration}
                style={gen.style}
                onStyleChange={gen.setStyle}
                fps={gen.fps}
                onFpsChange={gen.setFps}
                enhancePrompt={gen.enhancePrompt}
                onEnhancePromptChange={gen.setEnhancePrompt}
                includeAudio={gen.includeAudio}
                onIncludeAudioChange={gen.setIncludeAudio}
                audioPrompt={gen.audioPrompt}
                onAudioPromptChange={gen.setAudioPrompt}
                seed={gen.seed}
                onSeedChange={gen.setSeed}
                isGenerating={gen.isGenerating}
                error={gen.error}
                estimatedCost={gen.estimatedCost}
                onGenerate={gen.handleGenerate}
              />
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {studioMode === 'recording' && (
            <RecordingModeContent rec={rec} tEditor={tEditor} />
          )}

          {studioMode === 'ai-generation' && (
            <AIGenerationModeContent gen={gen} tGen={tGen} />
          )}

          {studioMode === 'editor' && (
            <VideoEditorPanel
              initialVideoUrl={rec.selectedRecording?.file_path ? `file://${rec.selectedRecording.file_path}` : undefined}
              onExport={(blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `edited-video-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex-1"
            />
          )}
        </main>
      </div>
    </div>
  );
}
