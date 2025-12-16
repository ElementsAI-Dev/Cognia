'use client';

/**
 * MessageEditDialog - Dialog for editing a message
 */

import { useState } from 'react';
import { Edit, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { UIMessage } from '@/types';

interface MessageEditDialogProps {
  message: UIMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (messageId: string, newContent: string) => void;
}

export function MessageEditDialog({
  message,
  open,
  onOpenChange,
  onSave,
}: MessageEditDialogProps) {
  const [showHistory, setShowHistory] = useState(false);
  
  // Use message content as initial state, reset when message changes
  const [content, setContent] = useState(message?.content || '');
  const [lastMessageId, setLastMessageId] = useState(message?.id);
  
  // Reset content when message changes (controlled by key prop or message id)
  if (message && message.id !== lastMessageId) {
    setContent(message.content);
    setShowHistory(false);
    setLastMessageId(message.id);
  }

  if (!message) return null;

  const handleSave = () => {
    if (content.trim() && content !== message.content) {
      onSave(message.id, content.trim());
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    setContent(message.content);
    onOpenChange(false);
  };

  const hasHistory = message.editHistory && message.editHistory.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Message
          </DialogTitle>
          <DialogDescription>
            Edit your message. The AI will regenerate its response based on your changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-y"
            placeholder="Enter your message..."
          />

          {hasHistory && (
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <History className="h-4 w-4" />
                  Edit History ({message.editHistory!.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-[200px] mt-2 rounded-lg border p-3">
                  <div className="space-y-3">
                    {message.originalContent && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Original
                        </div>
                        <div className="text-sm p-2 bg-muted rounded">
                          {message.originalContent}
                        </div>
                      </div>
                    )}
                    {message.editHistory!.map((edit, index) => (
                      <div key={index} className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Edit {index + 1} - {edit.editedAt.toLocaleString()}
                        </div>
                        <div className="text-sm p-2 bg-muted rounded">
                          {edit.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || content === message.content}
          >
            Save & Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MessageEditDialog;
