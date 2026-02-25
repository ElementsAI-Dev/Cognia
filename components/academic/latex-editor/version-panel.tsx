'use client';

/**
 * Version Control Panel
 * Displays version history for the current document with create/restore actions.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { GitBranch, RotateCcw, Plus, Clock } from 'lucide-react';

interface VersionEntry {
  id: string;
  timestamp: number;
  message?: string;
}

interface VersionPanelProps {
  versions: VersionEntry[];
  onCreateVersion: (message?: string) => void;
  onRestoreVersion: (versionId: string) => void;
  className?: string;
}

export function VersionPanel({ versions, onCreateVersion, onRestoreVersion, className }: VersionPanelProps) {
  const t = useTranslations('latex');
  const [newMessage, setNewMessage] = useState('');

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.timestamp - a.timestamp),
    [versions]
  );

  const handleCreate = () => {
    onCreateVersion(newMessage.trim() || undefined);
    setNewMessage('');
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">
            {t('version.title', { defaultValue: 'Version History' })}
          </h3>
        </div>

        {/* Create Version */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('version.messagePlaceholder', { defaultValue: 'Version message (optional)' })}
            className="text-sm h-8"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <Button size="sm" className="h-8 gap-1 shrink-0" onClick={handleCreate}>
            <Plus className="h-3.5 w-3.5" />
            {t('version.create', { defaultValue: 'Save' })}
          </Button>
        </div>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-auto">
        {sortedVersions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <Clock className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">{t('version.empty', { defaultValue: 'No versions yet' })}</p>
            <p className="text-xs mt-1">
              {t('version.emptyHint', { defaultValue: 'Create a snapshot to track changes' })}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedVersions.map((version, idx) => {
              const date = new Date(version.timestamp);
              const isLatest = idx === 0;

              return (
                <div
                  key={version.id}
                  className={cn(
                    'px-3 py-2 rounded-md border text-sm',
                    isLatest ? 'border-primary/40 bg-primary/5' : 'border-border/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {version.message || t('version.untitled', { defaultValue: 'Untitled snapshot' })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isLatest && (
                          <span className="ml-2 text-primary">{t('version.latest', { defaultValue: '(latest)' })}</span>
                        )}
                      </p>
                    </div>

                    {!isLatest && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 shrink-0">
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t('version.restore', { defaultValue: 'Restore' })}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t('version.restoreConfirmTitle', { defaultValue: 'Restore version?' })}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('version.restoreConfirmDesc', {
                                defaultValue: 'This will replace the current content with this version. Your current changes will be lost.',
                              })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onRestoreVersion(version.id)}>
                              {t('version.restore', { defaultValue: 'Restore' })}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default VersionPanel;
