'use client';

/**
 * AIGenerationModeContent - AI video generation mode UI for Video Studio
 *
 * Renders the AI generation content area including:
 * - Favorites filter toolbar
 * - Video job grid
 * - Video details panel
 * - Preview dialog
 */

import { useState, useDeferredValue, useMemo } from 'react';
import { Star, Sparkles, Film, Clapperboard, Search, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  VideoJobCard,
  VideoDetailsPanel,
  VideoPreviewDialog,
  VIDEO_PROMPT_TEMPLATES,
  VIDEO_ZOOM_LEVELS,
} from '@/components/video-studio';
import type { UseAIGenerationModeReturn } from '@/hooks/video-studio/use-ai-generation-mode';

interface AIGenerationModeContentProps {
  gen: UseAIGenerationModeReturn;
  tGen: (key: string) => string;
}

export function AIGenerationModeContent({ gen, tGen }: AIGenerationModeContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(2); // index into VIDEO_ZOOM_LEVELS, default = 'M' (4 cols)
  const deferredSearch = useDeferredValue(searchQuery);
  const gridCols = VIDEO_ZOOM_LEVELS[zoomLevel]?.cols ?? 4;

  const filteredVideos = useMemo(() => {
    if (!deferredSearch.trim()) return gen.displayedVideos;
    const q = deferredSearch.trim().toLowerCase();
    return gen.displayedVideos.filter(
      (v) => v.prompt.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.provider.toLowerCase().includes(q)
    );
  }, [gen.displayedVideos, deferredSearch]);

  const pendingCount = gen.videoJobs.filter((j) => j.status === 'pending' || j.status === 'processing').length;

  return (
    <>
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-4 py-2 gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={gen.filterFavorites ? 'default' : 'ghost'}
              size="sm"
              onClick={() => gen.setFilterFavorites(!gen.filterFavorites)}
            >
              <Star className={cn('h-4 w-4', gen.filterFavorites && 'fill-current')} />
            </Button>
            <span className="text-sm text-muted-foreground">
              {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
            </span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                {pendingCount} generating
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 border-l pl-2">
              <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex gap-0.5">
                {VIDEO_ZOOM_LEVELS.map((level, idx) => (
                  <button
                    key={level.label}
                    type="button"
                    className={cn(
                      'w-5 h-5 rounded text-[9px] font-medium transition-colors',
                      idx === zoomLevel
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    onClick={() => setZoomLevel(idx)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <ScrollArea className="flex-1 p-4">
          {filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-8">
              <div className="max-w-2xl w-full space-y-8">
                {/* Hero */}
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500/20 to-purple-500/20 mb-2">
                    <Film className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">{tGen('noVideos') || 'No videos yet'}</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {tGen('generateFirst') || 'Describe a scene and let AI bring it to life. Click a template below to get started.'}
                  </p>
                </div>

                {/* Inspiration Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {VIDEO_PROMPT_TEMPLATES.map((template) => (
                    <Card
                      key={template.label}
                      className="group cursor-pointer p-3 hover:ring-2 hover:ring-primary/50 hover:shadow-md transition-all"
                      onClick={() => gen.setPrompt(template.prompt)}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Clapperboard className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-xs font-medium truncate">{template.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {template.prompt}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Quick Tips */}
                <div className="flex items-center justify-center gap-6 text-[11px] text-muted-foreground/60">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Use &quot;Enhance&quot; to improve prompts
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+Enter</kbd>{' '}
                    to generate
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
            >
              {filteredVideos.map((job) => (
                <VideoJobCard
                  key={job.id}
                  job={job}
                  isSelected={gen.selectedVideo?.id === job.id}
                  onSelect={gen.setSelectedVideo}
                  onPreview={gen.setPreviewVideo}
                  onDownload={gen.handleDownload}
                  onToggleFavorite={gen.handleToggleFavorite}
                  formatTime={gen.formatTime}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Selected Video Details */}
      {gen.selectedVideo && (
        <VideoDetailsPanel
          video={gen.selectedVideo}
          onDownload={gen.handleDownload}
          onToggleFavorite={gen.handleToggleFavorite}
          onDelete={gen.handleDeleteJob}
          onRegenerate={(video) => {
            gen.setPrompt(video.prompt);
            gen.setProvider(video.provider);
            gen.setModel(video.model);
            gen.setResolution(video.settings.resolution);
            gen.setAspectRatio(video.settings.aspectRatio);
            gen.setDuration(video.settings.duration);
            gen.setStyle(video.settings.style);
          }}
        />
      )}

      {/* Preview Dialog */}
      <VideoPreviewDialog
        video={gen.previewVideo}
        open={!!gen.previewVideo}
        onOpenChange={() => gen.setPreviewVideo(null)}
        title={tGen('videoPreview') || 'Video Preview'}
      />
    </>
  );
}
