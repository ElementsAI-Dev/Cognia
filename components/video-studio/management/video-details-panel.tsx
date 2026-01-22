'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  MoreHorizontal,
  Download,
  Star,
  StarOff,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VideoJob } from '../../../types/video-studio/types';
import { getStatusBadge } from '../generation/video-job-card';

export interface VideoDetailsPanelProps {
  video: VideoJob;
  onDownload?: (video: VideoJob) => void;
  onToggleFavorite?: (videoId: string) => void;
  onDelete?: (videoId: string) => void;
  onRegenerate?: (video: VideoJob) => void;
}

export const VideoDetailsPanel = forwardRef<HTMLVideoElement, VideoDetailsPanelProps>(
  function VideoDetailsPanel({ video, onDownload, onToggleFavorite, onDelete, onRegenerate }, ref) {
    const t = useTranslations('videoDetails');
    return (
      <aside className="w-80 border-l p-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{t('title')}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {video.status === 'completed' && onDownload && (
                  <DropdownMenuItem onClick={() => onDownload(video)}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('download')}
                  </DropdownMenuItem>
                )}
                {onToggleFavorite && (
                  <DropdownMenuItem onClick={() => onToggleFavorite(video.id)}>
                    {video.isFavorite ? (
                      <>
                        <StarOff className="h-4 w-4 mr-2" />
                        {t('removeFromFavorites')}
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        {t('addToFavorites')}
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(video.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Preview */}
          {video.status === 'completed' && (video.videoUrl || video.videoBase64) && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={ref}
                src={video.videoUrl || `data:video/mp4;base64,${video.videoBase64}`}
                poster={video.thumbnailUrl}
                className="w-full h-full object-contain"
                controls
              />
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            {getStatusBadge(video.status)}
            {(video.status === 'pending' || video.status === 'processing') && (
              <Progress value={video.progress} className="flex-1" />
            )}
          </div>

          {video.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{video.error}</AlertDescription>
            </Alert>
          )}

          {/* Prompt */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('prompt')}</Label>
            <p className="text-sm">{video.prompt}</p>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('provider')}:</span>
              <p className="font-medium">
                {video.provider === 'google-veo' ? 'Google Veo' : 'OpenAI Sora'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('model')}:</span>
              <p className="font-medium">{video.model}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('resolution')}:</span>
              <p className="font-medium">{video.settings.resolution}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('aspectRatio')}:</span>
              <p className="font-medium">{video.settings.aspectRatio}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('duration')}:</span>
              <p className="font-medium">{video.settings.duration}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('style')}:</span>
              <p className="font-medium capitalize">{video.settings.style}</p>
            </div>
          </div>

          {/* Actions */}
          {onRegenerate && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onRegenerate(video)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('regenerate')}
              </Button>
            </div>
          )}
        </div>
      </aside>
    );
  }
);
