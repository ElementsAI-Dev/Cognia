'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { VideoJob } from './types';

export interface VideoPreviewDialogProps {
  video: VideoJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function VideoPreviewDialog({
  video,
  open,
  onOpenChange,
  title = 'Video Preview',
}: VideoPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Preview video content
          </DialogDescription>
        </DialogHeader>
        {video && (video.videoUrl || video.videoBase64) && (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={video.videoUrl || `data:video/mp4;base64,${video.videoBase64}`}
              poster={video.thumbnailUrl}
              className="w-full h-full object-contain"
              controls
              autoPlay
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
