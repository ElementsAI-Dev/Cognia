import { Button } from '@/components/ui/button';
import { Music, Video, X } from 'lucide-react';
import type { Attachment } from '../chat-input';
import { formatFileSize, getFileIcon } from './utils';

interface AttachmentsPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  onPreview: (attachment: Attachment) => void;
  removeLabel: string;
}

export function AttachmentsPreview({ attachments, onRemove, onPreview, removeLabel }: AttachmentsPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="group relative flex items-center gap-2 rounded-xl border border-border/50 bg-muted/50 px-3 py-2 cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150"
          onClick={() => onPreview(attachment)}
        >
          {attachment.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.url}
              alt={attachment.name}
              className="h-8 w-8 rounded object-cover"
            />
          ) : attachment.type === 'video' ? (
            <div className="relative h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
              <Video className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : attachment.type === 'audio' ? (
            <div className="relative h-8 w-8 rounded bg-muted flex items-center justify-center">
              <Music className="h-4 w-4 text-muted-foreground" />
            </div>
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
            aria-label={removeLabel}
            title={removeLabel}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
