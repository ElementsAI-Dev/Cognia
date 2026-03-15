'use client';

import { Check, FileText, GitCommit, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { GitFileStatus } from '@/types/system/git';

interface GitCommitComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  messageLabel: string;
  messagePlaceholder: string;
  reviewLabel: string;
  stagedSummary: string;
  unstagedSummary: string;
  autoStageMessage?: string;
  cancelLabel: string;
  confirmLabel: string;
  fileStatus: GitFileStatus[];
  commitMessage: string;
  onCommitMessageChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function GitCommitComposer({
  open,
  onOpenChange,
  title,
  description,
  messageLabel,
  messagePlaceholder,
  reviewLabel,
  stagedSummary,
  unstagedSummary,
  autoStageMessage,
  cancelLabel,
  confirmLabel,
  fileStatus,
  commitMessage,
  onCommitMessageChange,
  onSubmit,
  isSubmitting = false,
}: GitCommitComposerProps) {
  const stagedCount = fileStatus.filter((file) => file.staged).length;
  const unstagedCount = fileStatus.filter((file) => !file.staged).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              <span>{stagedSummary}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{unstagedSummary}</span>
            </div>
          </div>

          {fileStatus.length > 0 && (
            <div className="space-y-1">
              <Label>{reviewLabel}</Label>
              <ScrollArea className="h-32 rounded-md border bg-muted/20">
                <div className="p-2 space-y-0.5">
                  {fileStatus.map((file) => (
                    <div key={file.path} className="flex items-center gap-2 text-xs font-mono">
                      <span
                        className={cn(
                          'w-4 text-center font-bold',
                          file.status === 'added' && 'text-green-500',
                          file.status === 'modified' && 'text-yellow-500',
                          file.status === 'deleted' && 'text-red-500',
                          file.status === 'renamed' && 'text-blue-500'
                        )}
                      >
                        {file.status === 'added'
                          ? 'A'
                          : file.status === 'modified'
                            ? 'M'
                            : file.status === 'deleted'
                              ? 'D'
                              : file.status === 'renamed'
                                ? 'R'
                                : '?'}
                      </span>
                      <span className="truncate">{file.path}</span>
                      {!file.staged && <span className="text-muted-foreground">(unstaged)</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="commitMessage">{messageLabel}</Label>
            <Textarea
              id="commitMessage"
              value={commitMessage}
              onChange={(e) => onCommitMessageChange(e.target.value)}
              placeholder={messagePlaceholder}
              rows={4}
            />
          </div>

          {autoStageMessage && unstagedCount > 0 && (
            <p className="text-xs text-muted-foreground">{autoStageMessage}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button onClick={onSubmit} disabled={!commitMessage.trim() || isSubmitting || (stagedCount === 0 && unstagedCount === 0)}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <GitCommit className="h-4 w-4 mr-2" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
