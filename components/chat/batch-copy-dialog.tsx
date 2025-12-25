'use client';

/**
 * BatchCopyDialog - dialog for selecting and copying multiple messages
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Copy,
  CheckSquare,
  Square,
  FileText,
  FileJson,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCopy, type CopyFormat } from '@/hooks/use-copy';
import type { UIMessage } from '@/types';

interface BatchCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: UIMessage[];
}

type MessageRole = 'all' | 'user' | 'assistant';

export function BatchCopyDialog({
  open,
  onOpenChange,
  messages,
}: BatchCopyDialogProps) {
  const t = useTranslations('batchCopy');
  const tCommon = useTranslations('common');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<CopyFormat>('text');
  const [roleFilter, setRoleFilter] = useState<MessageRole>('all');
  const { copy, isCopying } = useCopy();

  const filteredMessages = useMemo(() => {
    if (roleFilter === 'all') return messages;
    return messages.filter((m) => m.role === roleFilter);
  }, [messages, roleFilter]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMessages.map((m) => m.id)));
    }
  }, [filteredMessages, selectedIds.size]);

  const handleToggleMessage = useCallback((messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const formatMessages = useCallback(
    (selectedMessages: UIMessage[], outputFormat: CopyFormat): string => {
      switch (outputFormat) {
        case 'markdown':
          return selectedMessages
            .map((m) => {
              const role = m.role === 'user' ? '**You**' : '**Assistant**';
              const timestamp = m.createdAt.toLocaleTimeString();
              return `### ${role} (${timestamp})\n\n${m.content}`;
            })
            .join('\n\n---\n\n');

        case 'json':
          return JSON.stringify(
            selectedMessages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt.toISOString(),
            })),
            null,
            2
          );

        case 'text':
        default:
          return selectedMessages
            .map((m) => {
              const role = m.role === 'user' ? 'You' : 'Assistant';
              return `[${role}]\n${m.content}`;
            })
            .join('\n\n---\n\n');
      }
    },
    []
  );

  const handleCopy = useCallback(async () => {
    const selectedMessages = messages.filter((m) => selectedIds.has(m.id));
    if (selectedMessages.length === 0) {
      toast.error(t('selectAtLeastOne'));
      return;
    }

    const content = formatMessages(selectedMessages, format);
    const result = await copy(content, {
      toastMessage: t('copiedMessages', { count: selectedMessages.length }),
    });

    if (result.success) {
      onOpenChange(false);
    }
  }, [messages, selectedIds, format, formatMessages, copy, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role filter */}
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground">{t('filter')}:</Label>
            <div className="flex gap-2">
              {(['all', 'user', 'assistant'] as MessageRole[]).map((role) => (
                <Badge
                  key={role}
                  variant={roleFilter === role ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setRoleFilter(role)}
                >
                  {role === 'all' ? t('all') : role === 'user' ? t('user') : t('assistant')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Select all */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} of {filteredMessages.length} selected
            </span>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedIds.size === filteredMessages.length ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  {t('deselectAll')}
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {t('selectAll')}
                </>
              )}
            </Button>
          </div>

          {/* Messages list */}
          <ScrollArea className="h-[200px] border rounded-lg p-2">
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <MessageSelectItem
                  key={message.id}
                  message={message}
                  selected={selectedIds.has(message.id)}
                  onToggle={() => handleToggleMessage(message.id)}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Format selection */}
          <div className="space-y-2">
            <Label className="text-sm">{t('outputFormat')}:</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as CopyFormat)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="flex items-center gap-1 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  {t('plainText')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="markdown" id="markdown" />
                <Label htmlFor="markdown" className="flex items-center gap-1 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  {t('markdown')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-1 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  {t('json')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleCopy}
              disabled={isCopying || selectedIds.size === 0}
            >
              {isCopying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {t('copyMessages', { count: selectedIds.size })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MessageSelectItemProps {
  message: UIMessage;
  selected: boolean;
  onToggle: () => void;
}

function MessageSelectItem({ message, selected, onToggle }: MessageSelectItemProps) {
  const preview = message.content.slice(0, 100) + (message.content.length > 100 ? '...' : '');
  
  return (
    <div
      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
      onClick={onToggle}
    >
      <Checkbox checked={selected} className="mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={message.role === 'user' ? 'default' : 'secondary'} className="text-xs">
            {message.role === 'user' ? 'You' : 'Assistant'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {message.createdAt.toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {preview}
        </p>
      </div>
    </div>
  );
}

export default BatchCopyDialog;
