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

import { Video as VideoIcon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  VideoJobCard,
  VideoDetailsPanel,
  VideoPreviewDialog,
} from '@/components/video-studio';
import type { UseAIGenerationModeReturn } from '@/hooks/video-studio/use-ai-generation-mode';

interface AIGenerationModeContentProps {
  gen: UseAIGenerationModeReturn;
  tGen: (key: string) => string;
}

export function AIGenerationModeContent({ gen, tGen }: AIGenerationModeContentProps) {
  return (
    <>
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant={gen.filterFavorites ? 'default' : 'ghost'}
              size="sm"
              onClick={() => gen.setFilterFavorites(!gen.filterFavorites)}
            >
              <Star className={cn('h-4 w-4', gen.filterFavorites && 'fill-current')} />
            </Button>
            <span className="text-sm text-muted-foreground">
              {gen.displayedVideos.length} video{gen.displayedVideos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Video Grid */}
        <ScrollArea className="flex-1 p-4">
          {gen.displayedVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <VideoIcon className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{tGen('noVideos') || 'No videos yet'}</p>
              <p className="text-sm">
                {tGen('generateFirst') || 'Generate your first video to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gen.displayedVideos.map((job) => (
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
