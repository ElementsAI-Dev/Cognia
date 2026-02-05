'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Music, Video, X } from 'lucide-react';
import type { Attachment } from '../chat-input';
import { formatFileSize, getFileIcon } from './utils';

interface AttachmentsPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  onPreview: (attachment: Attachment) => void;
  /** @deprecated Use internal i18n instead */
  removeLabel?: string;
}

export function AttachmentsPreview({ attachments, onRemove, onPreview, removeLabel }: AttachmentsPreviewProps) {
  const t = useTranslations('attachments');
  const label = removeLabel || t('remove');

  if (attachments.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="group relative flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 supports-[backdrop-filter]:bg-muted/30 backdrop-blur-sm px-3 py-2 cursor-pointer hover:bg-accent/50 hover:border-accent transition-all duration-150"
          onClick={() => onPreview(attachment)}
        >
          {attachment.type === 'image' ? (
            <Avatar className="h-8 w-8 rounded">
              <AvatarImage src={attachment.url} alt={attachment.name} className="object-cover" />
              <AvatarFallback className="rounded">{attachment.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : attachment.type === 'video' ? (
            <Avatar className="h-8 w-8 rounded">
              <AvatarFallback className="rounded bg-muted">
                <Video className="h-4 w-4 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          ) : attachment.type === 'audio' ? (
            <Avatar className="h-8 w-8 rounded">
              <AvatarFallback className="rounded bg-muted">
                <Music className="h-4 w-4 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          ) : (
            getFileIcon(attachment.type)
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate max-w-[150px]">
              {attachment.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size)}
            </span>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(attachment.id);
            }}
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 p-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:scale-110"
            aria-label={label}
            title={label}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
