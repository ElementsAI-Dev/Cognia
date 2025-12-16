'use client';

/**
 * MessageActionsMenu - Context menu for message actions
 */

import { useState } from 'react';
import {
  Copy,
  Edit,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  Languages,
  GitBranch,
  Share2,
  MoreHorizontal,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { UIMessage, MessageReaction } from '@/types';

interface MessageActionsMenuProps {
  message: UIMessage;
  onCopy?: () => void;
  onEdit?: () => void;
  onBookmark?: () => void;
  onReaction?: (reaction: MessageReaction | null) => void;
  onTranslate?: (targetLang: string) => void;
  onBranch?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
  showRegenerate?: boolean;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
];

export function MessageActionsMenu({
  message,
  onCopy,
  onEdit,
  onBookmark,
  onReaction,
  onTranslate,
  onBranch,
  onShare,
  onDelete,
  onRegenerate,
  showEdit = true,
  showDelete = false,
  showRegenerate = false,
}: MessageActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy?.();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </DropdownMenuItem>

        {showEdit && message.role === 'user' && (
          <DropdownMenuItem onClick={() => { onEdit?.(); setOpen(false); }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => { onBookmark?.(); setOpen(false); }}>
          {message.isBookmarked ? (
            <>
              <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
              Remove Bookmark
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmark
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Reactions */}
        <DropdownMenuItem
          onClick={() => {
            onReaction?.(message.reaction === 'like' ? null : 'like');
            setOpen(false);
          }}
        >
          <ThumbsUp
            className={`h-4 w-4 mr-2 ${message.reaction === 'like' ? 'text-green-500 fill-green-500' : ''}`}
          />
          {message.reaction === 'like' ? 'Remove Like' : 'Like'}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            onReaction?.(message.reaction === 'dislike' ? null : 'dislike');
            setOpen(false);
          }}
        >
          <ThumbsDown
            className={`h-4 w-4 mr-2 ${message.reaction === 'dislike' ? 'text-red-500 fill-red-500' : ''}`}
          />
          {message.reaction === 'dislike' ? 'Remove Dislike' : 'Dislike'}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Translate submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className="h-4 w-4 mr-2" />
            Translate
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => {
                  onTranslate?.(lang.code);
                  setOpen(false);
                }}
              >
                {lang.label}
                {message.translatedTo === lang.code && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem onClick={() => { onBranch?.(); setOpen(false); }}>
          <GitBranch className="h-4 w-4 mr-2" />
          Branch from here
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => { onShare?.(); setOpen(false); }}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </DropdownMenuItem>

        {showRegenerate && message.role === 'assistant' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onRegenerate?.(); setOpen(false); }}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerate
            </DropdownMenuItem>
          </>
        )}

        {showDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { onDelete?.(); setOpen(false); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MessageActionsMenu;
