'use client';

import {
  Video as VideoIcon,
  AlertCircle,
  Loader2,
  Play,
  Download,
  Star,
  Clock,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { VideoStatus } from '@/types/video';
import type { VideoJob } from './types';

export interface VideoJobCardProps {
  job: VideoJob;
  isSelected?: boolean;
  onSelect?: (job: VideoJob) => void;
  onPreview?: (job: VideoJob) => void;
  onDownload?: (job: VideoJob) => void;
  onToggleFavorite?: (jobId: string) => void;
  formatTime?: (timestamp: number) => string;
}

export function getStatusBadge(status: VideoStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case 'processing':
      return <Badge variant="default" className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    case 'completed':
      return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function VideoJobCard({
  job,
  isSelected = false,
  onSelect,
  onPreview,
  onDownload,
  onToggleFavorite,
  formatTime,
}: VideoJobCardProps) {
  const defaultFormatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const timeFormatter = formatTime || defaultFormatTime;

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect?.(job)}
    >
      <div className="relative aspect-video bg-muted">
        {job.status === 'completed' && (job.videoUrl || job.videoBase64) ? (
          <video
            src={job.videoUrl || `data:video/mp4;base64,${job.videoBase64}`}
            poster={job.thumbnailUrl}
            className="w-full h-full object-cover"
            muted
            loop
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {job.status === 'pending' || job.status === 'processing' ? (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <Progress value={job.progress} className="mt-2 w-20" />
                <p className="text-xs text-muted-foreground mt-1">{job.progress}%</p>
              </div>
            ) : job.status === 'failed' ? (
              <AlertCircle className="h-8 w-8 text-destructive" />
            ) : (
              <VideoIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}
        
        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {job.status === 'completed' && (
            <>
              {onPreview && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(job);
                  }}
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
              {onDownload && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(job);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {onToggleFavorite && (
            <Button
              size="icon"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(job.id);
              }}
            >
              <Star className={cn("h-4 w-4", job.isFavorite && "fill-yellow-500 text-yellow-500")} />
            </Button>
          )}
        </div>
      </div>
      <CardContent className="p-3">
        <p className="text-sm truncate">{job.prompt}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">{timeFormatter(job.createdAt)}</span>
          {getStatusBadge(job.status)}
        </div>
      </CardContent>
    </Card>
  );
}
