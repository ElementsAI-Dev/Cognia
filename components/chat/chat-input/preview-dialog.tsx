'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Music } from 'lucide-react';
import type { Attachment } from '../chat-input';
import { formatFileSize, getFileIcon } from './utils';

interface PreviewDialogProps {
  attachment: Attachment | null;
  onOpenChange: (open: boolean) => void;
}

export function PreviewDialog({ attachment, onOpenChange }: PreviewDialogProps) {
  const t = useTranslations('preview');

  return (
    <Dialog open={!!attachment} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{attachment?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {attachment?.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-h-[60vh] max-w-full rounded-lg object-contain"
            />
          ) : attachment?.type === 'audio' ? (
            <div className="flex flex-col items-center gap-4 py-4 w-full">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <audio
                controls
                className="w-full max-w-md"
                src={attachment.url}
              >
                {t('audioNotSupported')}
              </audio>
              <span className="text-sm text-muted-foreground">
                {attachment.mimeType} • {formatFileSize(attachment.size)}
              </span>
            </div>
          ) : attachment?.type === 'video' ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <video
                controls
                className="max-h-[60vh] max-w-full rounded-lg"
                src={attachment.url}
              >
                {t('videoNotSupported')}
              </video>
              <span className="text-sm text-muted-foreground">
                {attachment.mimeType} • {formatFileSize(attachment.size)}
              </span>
            </div>
          ) : attachment ? (
            <div className="flex flex-col items-center gap-2 py-8">
              {getFileIcon(attachment.type)}
              <span className="text-lg font-medium">{attachment.name}</span>
              <span className="text-sm text-muted-foreground">
                {attachment.mimeType} • {formatFileSize(attachment.size)}
              </span>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
