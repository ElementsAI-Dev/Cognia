'use client';

/**
 * BatchExportDialog - Export multiple sessions at once
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2, FileArchive, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores';
import { messageRepository } from '@/lib/db';
import {
  exportSessionsToZip,
  downloadZip,
  estimateExportSize,
  type BatchExportFormat,
  type SessionWithMessages,
} from '@/lib/export';
import type { Session } from '@/types';

interface BatchExportDialogProps {
  trigger?: React.ReactNode;
}

export function BatchExportDialog({ trigger }: BatchExportDialogProps) {
  const t = useTranslations('batchExport');
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<BatchExportFormat>('mixed');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState(0);

  const sessions = useSessionStore((state) => state.sessions);

  // Update estimated size when selection changes
  useEffect(() => {
    const updateEstimate = async () => {
      if (selectedIds.size === 0) {
        setEstimatedSize(0);
        return;
      }

      setIsLoadingMessages(true);
      try {
        const sessionsWithMessages: SessionWithMessages[] = [];
        for (const id of selectedIds) {
          const session = sessions.find((s) => s.id === id);
          if (session) {
            const messages = await messageRepository.getBySessionId(id);
            sessionsWithMessages.push({ session, messages });
          }
        }
        setEstimatedSize(estimateExportSize(sessionsWithMessages));
      } catch (error) {
        console.error('Error estimating size:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    const debounce = setTimeout(updateEstimate, 300);
    return () => clearTimeout(debounce);
  }, [selectedIds, sessions]);

  const toggleSession = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(sessions.map((s) => s.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) return;

    setIsExporting(true);

    try {
      // Load messages for selected sessions
      const sessionsWithMessages: SessionWithMessages[] = [];
      for (const id of selectedIds) {
        const session = sessions.find((s) => s.id === id);
        if (session) {
          const messages = await messageRepository.getBySessionId(id);
          sessionsWithMessages.push({ session, messages });
        }
      }

      // Export to ZIP
      const result = await exportSessionsToZip(sessionsWithMessages, {
        format,
        includeIndex: true,
        includeMetadata: true,
        includeAttachments: true,
        theme: 'system',
      });

      if (result.success && result.blob) {
        downloadZip(result.blob, result.filename);
        setOpen(false);
      } else {
        console.error('Export failed:', result.error);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatLabels: Record<BatchExportFormat, string> = {
    markdown: t('formatMarkdown'),
    json: t('formatJson'),
    html: t('formatHtml'),
    'animated-html': t('formatAnimatedHtml'),
    text: t('formatText'),
    mixed: t('formatMixed'),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FileArchive className="h-4 w-4 mr-2" />
            {t('batchExport')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>{t('exportFormat')}</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as BatchExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(formatLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {t('selectSessions', { selected: selectedIds.size, total: sessions.length })}
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  <Check className="h-3 w-3 mr-1" />
                  {t('all')}
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  <X className="h-3 w-3 mr-1" />
                  {t('none')}
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[250px] rounded-md border p-2">
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noSessions')}
                  </p>
                ) : (
                  sessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      selected={selectedIds.has(session.id)}
                      onToggle={() => toggleSession(session.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Size Estimate */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('estimatedSize')}</span>
              <span>
                {isLoadingMessages ? (
                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                ) : (
                  `~${estimatedSize} KB`
                )}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedIds.size === 0}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('exporting')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('exportSessions', { count: selectedIds.size })}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Session item component
interface SessionItemProps {
  session: Session;
  selected: boolean;
  onToggle: () => void;
}

function SessionItem({ session, selected, onToggle }: SessionItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        selected ? 'bg-primary/10' : 'hover:bg-muted'
      )}
      onClick={onToggle}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{session.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{session.createdAt.toLocaleDateString()}</span>
          <Badge variant="outline" className="text-xs">
            {session.mode}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default BatchExportDialog;
