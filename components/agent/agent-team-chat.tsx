'use client';

/**
 * AgentTeamChat - Direct messaging UI for agent team communication
 *
 * Allows users to:
 * - Send direct messages to specific teammates
 * - Broadcast messages to all teammates
 * - View message timeline with type icons
 * - Select message recipient
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Send,
  Users,
  User,
  MessageSquare,
  Radio,
  Settings2,
  FileCheck,
  Share2,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { cn } from '@/lib/utils';
import type { AgentTeamMessage, TeamMessageType } from '@/types/agent/agent-team';

// ============================================================================
// Types
// ============================================================================

interface AgentTeamChatProps {
  teamId: string;
  className?: string;
  maxHeight?: string;
}

// ============================================================================
// Message type icons
// ============================================================================

const MESSAGE_TYPE_CONFIG: Record<TeamMessageType, { icon: typeof MessageSquare; label: string; color: string }> = {
  direct: { icon: MessageSquare, label: 'Direct', color: 'text-blue-500' },
  broadcast: { icon: Radio, label: 'Broadcast', color: 'text-purple-500' },
  system: { icon: Bell, label: 'System', color: 'text-yellow-500' },
  plan_approval: { icon: Settings2, label: 'Plan', color: 'text-orange-500' },
  plan_feedback: { icon: FileCheck, label: 'Feedback', color: 'text-green-500' },
  task_update: { icon: Settings2, label: 'Task Update', color: 'text-cyan-500' },
  result_share: { icon: Share2, label: 'Result', color: 'text-emerald-500' },
};

// ============================================================================
// Component
// ============================================================================

export function AgentTeamChat({ teamId, className, maxHeight = '400px' }: AgentTeamChatProps) {
  const t = useTranslations('agentTeam');
  const [messageText, setMessageText] = useState('');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const team = useAgentTeamStore((s) => s.teams[teamId]);
  const allTeammates = useAgentTeamStore((s) => s.teammates);
  const allMessages = useAgentTeamStore((s) => s.messages);
  const addMessage = useAgentTeamStore((s) => s.addMessage);

  const teammates = useMemo(() => {
    if (!team) return [];
    return team.teammateIds
      .map(id => allTeammates[id])
      .filter(Boolean);
  }, [team, allTeammates]);

  const messages = useMemo(() => {
    if (!team) return [];
    return team.messageIds
      .map(id => allMessages[id])
      .filter((m): m is AgentTeamMessage => m !== undefined)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [team, allMessages]);

  const selectedRecipient = recipientId ? allTeammates[recipientId] : null;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!messageText.trim() || !team) return;

    // Use the lead as sender (user messages go through the lead)
    addMessage({
      teamId,
      senderId: team.leadId,
      content: messageText.trim(),
      recipientId: recipientId || undefined,
      type: recipientId ? 'direct' : 'broadcast',
    });

    setMessageText('');
  }, [messageText, teamId, recipientId, team, addMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!team) return null;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Message list */}
      <ScrollArea style={{ maxHeight }} className="flex-1 px-3 py-2" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {t('messages.noMessages') || 'No messages yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isLead={msg.senderId === team.leadId} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-2 flex items-center gap-2">
        {/* Recipient selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-8 text-xs">
              {selectedRecipient ? (
                <>
                  <User className="h-3 w-3" />
                  {selectedRecipient.name}
                </>
              ) : (
                <>
                  <Users className="h-3 w-3" />
                  {t('messages.broadcast') || 'All'}
                </>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => setRecipientId(null)}>
              <Users className="h-3.5 w-3.5 mr-2" />
              <span>{t('messages.broadcast') || 'Broadcast to All'}</span>
            </DropdownMenuItem>
            {teammates
              .filter(tm => tm.id !== team.leadId)
              .map(tm => (
                <DropdownMenuItem key={tm.id} onClick={() => setRecipientId(tm.id)}>
                  <User className="h-3.5 w-3.5 mr-2" />
                  <span className="truncate">{tm.name}</span>
                  <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1">
                    {tm.status}
                  </Badge>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Message input */}
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedRecipient
              ? `${t('messages.messageTo') || 'Message'} ${selectedRecipient.name}...`
              : `${t('messages.broadcast') || 'Broadcast'}...`
          }
          className="h-8 text-sm"
        />

        {/* Send button */}
        <Button
          size="sm"
          className="shrink-0 h-8 w-8 p-0"
          onClick={handleSend}
          disabled={!messageText.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MessageBubble
// ============================================================================

function MessageBubble({ message, isLead }: { message: AgentTeamMessage; isLead: boolean }) {
  const config = MESSAGE_TYPE_CONFIG[message.type] || MESSAGE_TYPE_CONFIG.direct;
  const Icon = config.icon;
  const time = new Date(message.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className={cn('flex gap-2 text-sm', isLead ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium',
        isLead ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {message.senderName.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className={cn('max-w-[80%]', isLead ? 'text-right' : 'text-left')}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {!isLead && (
            <span className="font-medium text-xs">{message.senderName}</span>
          )}
          <Icon className={cn('h-3 w-3', config.color)} />
          {message.recipientName && (
            <span className="text-[10px] text-muted-foreground">
              → {message.recipientName}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{timeStr}</span>
        </div>
        <div className={cn(
          'rounded-lg px-3 py-1.5 text-xs leading-relaxed',
          isLead
            ? 'bg-primary/10 text-foreground'
            : 'bg-muted/50 text-foreground'
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
}

export type { AgentTeamChatProps };
