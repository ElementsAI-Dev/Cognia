'use client';

/**
 * CollaborationPanel - Real-time collaborative editing UI for Canvas
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Share2, Check, Link2, UserPlus, Wifi, WifiOff, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useCollaborativeSession } from '@/hooks/canvas';
import { getConnectionStatusColor } from '@/lib/canvas/utils';
import type { Participant } from '@/types/canvas/collaboration';

interface CollaborationPanelProps {
  documentId: string;
  documentContent: string;
  trigger?: React.ReactNode;
}

export function CollaborationPanel({
  documentId,
  documentContent,
  trigger,
}: CollaborationPanelProps) {
  const t = useTranslations('canvas');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState('');

  const {
    session,
    participants,
    connectionState,
    isConnected,
    connect,
    disconnect,
    shareSession,
    joinSession,
  } = useCollaborativeSession();

  const handleStartSession = useCallback(async () => {
    await connect(documentId, documentContent);
  }, [connect, documentId, documentContent]);

  const handleEndSession = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleCopyShareLink = useCallback(async () => {
    const state = shareSession();
    if (state) {
      const shareUrl = `${window.location.origin}/canvas/join?session=${encodeURIComponent(state)}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareSession]);

  const handleJoinSession = useCallback(async () => {
    if (joinSessionId.trim()) {
      await joinSession(joinSessionId.trim());
      setJoinSessionId('');
    }
  }, [joinSession, joinSessionId]);

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return t('connected');
      case 'connecting':
        return t('connecting');
      case 'error':
        return t('connectionError');
      default:
        return t('disconnected');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('collaborate')}</span>
            {isConnected && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                {participants.length}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[350px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('collaboration')}
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 text-yellow-600 border-yellow-400">
              {t('experimental')}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className={cn('h-4 w-4', getConnectionStatusColor(connectionState))} />
              ) : (
                <WifiOff className={cn('h-4 w-4', getConnectionStatusColor(connectionState))} />
              )}
              <span className="text-sm">{getConnectionStatusText()}</span>
            </div>
            {session && (
              <Badge variant="outline" className="text-xs">
                {session.id.slice(0, 8)}...
              </Badge>
            )}
          </div>

          {/* Session Controls */}
          {!session ? (
            <div className="space-y-3">
              <Button className="w-full" onClick={handleStartSession}>
                <Share2 className="h-4 w-4 mr-2" />
                {t('startSession')}
              </Button>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('joinExisting')}</label>
                <div className="flex gap-2">
                  <Input
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value)}
                    placeholder={t('sessionIdPlaceholder')}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleJoinSession}
                    disabled={!joinSessionId.trim()}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex-1" onClick={handleCopyShareLink}>
                      {copied ? (
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Link2 className="h-4 w-4 mr-2" />
                      )}
                      {copied ? t('copied') : t('copyLink')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('copyShareLink')}</TooltipContent>
                </Tooltip>
                <Button variant="destructive" onClick={handleEndSession}>
                  {t('endSession')}
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Participants List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('participants')} ({participants.length})
            </h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noParticipants')}
                  </p>
                ) : (
                  participants.map((participant) => (
                    <ParticipantItem key={participant.id} participant={participant} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ParticipantItemProps {
  participant: Participant;
}

function ParticipantItem({ participant }: ParticipantItemProps) {
  const t = useTranslations('canvas');
  const initials = participant.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
      <Avatar className="h-8 w-8">
        <AvatarFallback
          style={{ backgroundColor: participant.color }}
          className="text-white text-xs"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{participant.name}</p>
        <p className="text-xs text-muted-foreground">
          {participant.isOnline ? (
            <span className="flex items-center gap-1">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              {t('online')}
            </span>
          ) : (
            t('offline')
          )}
        </p>
      </div>
    </div>
  );
}

