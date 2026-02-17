'use client';

/**
 * CollabToolbar - Collaboration controls for the Designer
 * Integrates useDesignerCollaboration hook and shows collaboration status
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Share2, Link2, LogOut, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useDesignerCollaboration } from '@/hooks/designer';
import { CollabUserList } from './user-list';
import { CollabConnectionStatus } from './connection-status';

export interface CollabToolbarProps {
  className?: string;
  documentId?: string;
  initialCode?: string;
  /** @deprecated Code updates are handled through the collaboration hook directly */
  onCodeUpdate?: (code: string) => void;
  onRemoteCodeChange?: (code: string) => void;
  sharedSessionSerialized?: string;
  websocketUrl?: string;
}

export function CollabToolbar({
  className,
  documentId,
  initialCode = '',
  onCodeUpdate,
  onRemoteCodeChange,
  sharedSessionSerialized,
  websocketUrl,
}: CollabToolbarProps) {
  const t = useTranslations('designer.collaboration');
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const attemptedSharedJoinRef = useRef(false);

  const {
    session,
    participants,
    connectionState,
    isConnected,
    localParticipant,
    connect,
    disconnect,
    shareSession,
    setParticipantInfo,
    importSharedSession,
    joinSession,
  } = useDesignerCollaboration({
    websocketUrl,
    participantName: participantName || 'Anonymous',
    onRemoteCodeChange: (code) => {
      onRemoteCodeChange?.(code);
      onCodeUpdate?.(code);
    },
  });

  useEffect(() => {
    if (!sharedSessionSerialized || attemptedSharedJoinRef.current || isConnected) return;
    attemptedSharedJoinRef.current = true;
    void (async () => {
      const importedSessionId = await importSharedSession(sharedSessionSerialized);
      if (importedSessionId) {
        await joinSession(importedSessionId);
      }
    })();
  }, [sharedSessionSerialized, isConnected, importSharedSession, joinSession]);

  // Start collaboration session
  const handleStartSession = useCallback(async () => {
    if (!documentId) return;
    
    try {
      await connect(documentId, initialCode);
    } catch (error) {
      console.error('Failed to start collaboration session:', error);
    }
  }, [documentId, initialCode, connect]);

  // End collaboration session
  const handleLeaveSession = useCallback(() => {
    disconnect();
    setShareLink('');
  }, [disconnect]);

  // Generate share link
  const handleShare = useCallback(() => {
    const serialized = shareSession();
    if (serialized && session) {
      const url = `${window.location.origin}/designer/join?session=${encodeURIComponent(serialized)}`;
      setShareLink(url);
      setShowSharePopover(true);
    }
  }, [shareSession, session]);

  // Copy share link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [shareLink]);

  // Update participant name
  const handleNameChange = useCallback((name: string) => {
    setParticipantName(name);
    if (isConnected) {
      setParticipantInfo(name);
    }
  }, [isConnected, setParticipantInfo]);

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {/* Connection status */}
        {session && (
          <CollabConnectionStatus
            state={connectionState}
            participantCount={participants.length}
            size="sm"
            showLabel={false}
          />
        )}

        {/* User list */}
        {isConnected && participants.length > 0 && (
          <CollabUserList
            users={participants.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              lastActive: p.lastActive,
              isOnline: p.isOnline,
            }))}
            localUserId={localParticipant?.id}
            maxVisible={3}
            size="sm"
          />
        )}

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Collaboration controls */}
        {!isConnected ? (
          // Not connected - show start button
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">{t('startSession')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="participant-name" className="text-xs">
                    {t('you')}
                  </Label>
                  <Input
                    id="participant-name"
                    value={participantName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Your name"
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  onClick={handleStartSession}
                  disabled={!documentId}
                  className="w-full h-8"
                  size="sm"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  {t('startSession')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          // Connected - show share and leave buttons
          <>
            {/* Share button */}
            <Popover open={showSharePopover} onOpenChange={setShowSharePopover}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5"
                      onClick={handleShare}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="text-xs hidden sm:inline">{t('shareLink')}</span>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('inviteCollaborators')}</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('shareLink')}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={shareLink}
                        readOnly
                        className="h-8 text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={handleCopyLink}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {linkCopied && (
                      <p className="text-xs text-green-600">{t('linkCopied')}</p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Leave session button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-destructive hover:text-destructive"
                  onClick={handleLeaveSession}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="text-xs hidden sm:inline">{t('leaveSession')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('leaveSession')}</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

export default CollabToolbar;
