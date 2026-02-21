'use client';

/**
 * ChatMessageItem — a single chat message row with rich interaction support.
 *
 * Features per role:
 * - **User messages**: inline edit with Enter-to-save / Escape-to-cancel.
 * - **Assistant messages**: copy, retry, bookmark, TTS (text-to-speech),
 *   share (Web Share API with clipboard fallback), translate (auto-detect direction),
 *   emoji reactions (persisted to IndexedDB + Langfuse quality score for 👍/👎),
 *   web-search source indicators, A2UI content rendering, artifact cards, analysis results.
 * - **Both roles**: branch button, swipe actions (mobile), text-selection popover for quoting.
 *
 * The component renders structured message parts via {@link MessagePartsRenderer}
 * and conditionally displays workflow result cards, provider icons, and timestamps.
 *
 * @module message/chat-message-item
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Copy,
  Check,
  Pencil,
  RotateCcw,
  Languages,
  Bookmark,
  BookmarkCheck,
  Volume2,
  VolumeX,
  Share2,
  Loader2,
} from 'lucide-react';
import {
  Message as MessageUI,
  MessageContent,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessagePartsRenderer } from '../message-parts/message-parts-renderer';
import { MessageReactions } from './message-reactions';
import { MessageSwipeActions, type SwipeAction } from '../ui/message-swipe-actions';
import { BranchButton } from '../selectors';
import { TextSelectionPopover } from '../popovers';
import { WorkflowResultCard, type WorkflowResultData } from '../workflow/workflow-result-card';
import { A2UIMessageRenderer, hasA2UIContent } from '@/components/a2ui';
import { MessageArtifacts, MessageAnalysisResults } from '@/components/artifacts';
import { SearchSourcesIndicator } from '@/components/search/search-sources-indicator';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import { useTTS } from '@/hooks';
import { countTokens } from '@/hooks/chat/use-token-count';
import { formatTokens } from '@/lib/observability/format-utils';
import { messageRepository } from '@/lib/db';
import type { UIMessage } from '@/types';
import type { EmojiReaction } from '@/types/core/message';

/**
 * Props for the {@link ChatMessageItem} component.
 */
export interface ChatMessageItemProps {
  /** The message object to render. */
  message: UIMessage;
  /** Parent session ID (used for branching, Langfuse tracing). */
  sessionId: string;
  /** Whether this message is currently being streamed (disables actions). */
  isStreaming: boolean;
  /** Whether this message is in inline-edit mode. */
  isEditing: boolean;
  /** Current text in the edit textarea (controlled). */
  editContent: string;
  /** Callback to update the edit textarea value. */
  onEditContentChange: (content: string) => void;
  /** Enter edit mode for this message. */
  onEdit: () => void;
  /** Cancel the current edit. */
  onCancelEdit: () => void;
  /** Save the edited content and regenerate the response. */
  onSaveEdit: () => void;
  /** Regenerate the AI response for this message. */
  onRetry: () => void;
  /** Copy messages up to a branch point into a new branch. */
  onCopyMessagesForBranch?: (branchPointMessageId: string, newBranchId: string) => Promise<unknown>;
  /** Translate this message's content inline. */
  onTranslate?: (messageId: string, content: string) => void;
  /** Optional workflow execution result to render as a card. */
  workflowResult?: WorkflowResultData;
  /** Callback to re-run the workflow with the same input. */
  onWorkflowRerun?: (input: Record<string, unknown>) => void;
  /** Hide action buttons (copy, edit, retry, etc.) — used in simplified mode. */
  hideMessageActions?: boolean;
  /** Hide per-message timestamps — used in simplified mode. */
  hideMessageTimestamps?: boolean;
  /** Show per-message token count next to timestamp. */
  showTokenUsageMeter?: boolean;
}

export function ChatMessageItem({
  message,
  sessionId,
  isStreaming,
  isEditing,
  editContent,
  onEditContentChange,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onRetry,
  onCopyMessagesForBranch,
  onTranslate,
  workflowResult,
  onWorkflowRerun,
  hideMessageActions = false,
  hideMessageTimestamps = false,
  showTokenUsageMeter = false,
}: ChatMessageItemProps) {
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(message.isBookmarked || false);
  const [reactions, setReactions] = useState<EmojiReaction[]>(message.reactions || []);
  const messageContentRef = useRef<HTMLDivElement>(null);

  // Per-message token count (estimation, memoized)
  const messageTokens = useMemo(() => {
    return countTokens(message.content);
  }, [message.content]);

  // TTS hook for multi-provider text-to-speech
  const { speak, stop: stopTTS, isPlaying: isSpeaking, isLoading: isTTSLoading } = useTTS({ source: 'chat' });
  const ttsTooltip = isTTSLoading ? 'Loading...' : isSpeaking ? 'Stop speaking' : 'Read aloud';

  /**
   * Toggle an emoji reaction on this message.
   * Persists to IndexedDB and sends a Langfuse quality score for 👍/👎 on assistant messages.
   */
  const handleReaction = async (emoji: string) => {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        if (existing.reacted) {
          if (existing.count === 1) {
            return prev.filter((r) => r.emoji !== emoji);
          }
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r
          );
        } else {
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r
          );
        }
      } else {
        return [...prev, { emoji, count: 1, reacted: true }];
      }
    });
    // Persist to database
    await messageRepository.update(message.id, { reactions });

    // Send quality score to Langfuse for 👍/👎 on assistant messages
    if (message.role === 'assistant' && (emoji === '👍' || emoji === '👎')) {
      try {
        const { addScore, isLangfuseEnabled, createChatTrace } = await import('@/lib/ai/observability/langfuse-client');
        if (isLangfuseEnabled()) {
          const trace = await createChatTrace({ sessionId });
          addScore(trace, {
            name: 'user-feedback',
            value: emoji === '👍' ? 1 : 0,
            comment: `User reacted with ${emoji} to message ${message.id}`,
          });
        }
      } catch {
        // Langfuse not available — ignore silently
      }
    }
  };

  /** Copy the full message content to the clipboard. */
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleTranslate = () => {
    if (onTranslate && !isTranslating) {
      setIsTranslating(true);
      onTranslate(message.id, message.content);
      setTimeout(() => setIsTranslating(false), 1000);
    }
  };

  /** Toggle the bookmark state and persist to IndexedDB. */
  const handleBookmark = useCallback(async () => {
    const newBookmarked = !isBookmarked;
    setIsBookmarked(newBookmarked);
    await messageRepository.update(message.id, { isBookmarked: newBookmarked });
  }, [isBookmarked, message.id]);

  /** Toggle text-to-speech playback for this message's content. */
  const handleSpeak = () => {
    if (isSpeaking) {
      stopTTS();
    } else {
      speak(message.content);
    }
  };

  /** Share via Web Share API; falls back to clipboard copy if unavailable. */
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Message',
          text: message.content,
        });
      } catch {
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  /**
   * Dispatch mobile swipe gesture actions (copy, edit, regenerate, bookmark, delete).
   */
  const handleSwipeAction = useCallback(
    (action: SwipeAction) => {
      switch (action) {
        case 'copy':
          handleCopy();
          break;
        case 'edit':
          if (message.role === 'user') onEdit();
          break;
        case 'regenerate':
          if (message.role === 'assistant') onRetry();
          break;
        case 'bookmark':
          handleBookmark();
          break;
        case 'delete':
          break;
      }
    },
    [handleCopy, handleBookmark, message.role, onEdit, onRetry]
  );

  return (
    <MessageSwipeActions
      onAction={handleSwipeAction}
      enabledActions={
        message.role === 'user' ? ['copy', 'edit'] : ['copy', 'regenerate', 'bookmark']
      }
      disabled={isEditing || isStreaming}
    >
      <MessageUI
        id={`message-${message.id}`}
        from={message.role as 'system' | 'user' | 'assistant'}
      >
        {/* Provider icon label for assistant messages */}
        {message.role === 'assistant' && message.provider && (
          <div className="flex items-center gap-1.5 mb-1">
            <ProviderIcon providerId={message.provider} size={16} className="shrink-0" />
            <span className="text-xs text-muted-foreground">
              {message.model || message.provider}
            </span>
          </div>
        )}
        <MessageContent>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder={t('editMessagePlaceholder')}
                aria-label={t('editMessage')}
                className="min-h-[100px] resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={onCancelEdit}
                  variant="outline"
                  size="sm"
                  aria-label={tCommon('cancel')}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={onSaveEdit}
                  variant="default"
                  size="sm"
                  aria-label={t('saveAndSubmit')}
                >
                  {t('saveAndSubmit')}
                </Button>
              </div>
            </div>
          ) : (
            <div ref={messageContentRef}>
              {/* Workflow Result Card - render if this message has workflow data */}
              {workflowResult && (
                <WorkflowResultCard
                  data={workflowResult}
                  onRerun={onWorkflowRerun}
                  className="mb-3"
                />
              )}
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : hasA2UIContent(message.content) ? (
                <A2UIMessageRenderer
                  content={message.content}
                  messageId={message.id}
                  textRenderer={(text) => (
                    <MessagePartsRenderer
                      parts={message.parts}
                      content={text}
                      isError={!!message.error}
                    />
                  )}
                />
              ) : (
                <MessagePartsRenderer
                  parts={message.parts}
                  content={message.content}
                  isError={!!message.error}
                />
              )}
              {/* Web search sources indicator */}
              {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                <div className="mt-2">
                  <SearchSourcesIndicator sources={message.sources} />
                </div>
              )}
              {/* Text selection popover for quoting */}
              <TextSelectionPopover
                containerRef={messageContentRef}
                messageId={message.id}
                messageRole={message.role as 'user' | 'assistant'}
              />
              {/* Message reactions */}
              {message.role === 'assistant' && !message.error && (
                <div className="mt-2">
                  <MessageReactions reactions={reactions} onReact={handleReaction} />
                </div>
              )}
              {/* Message artifacts */}
              {message.role === 'assistant' && <MessageArtifacts messageId={message.id} compact />}
              {/* Message analysis results */}
              {message.role === 'assistant' && <MessageAnalysisResults messageId={message.id} />}
              {/* Message timestamp and token count */}
              {!hideMessageTimestamps && message.createdAt && (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                  <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {showTokenUsageMeter && (
                    <span title={`~${messageTokens} tokens`}>· {formatTokens(messageTokens)}t</span>
                  )}
                </div>
              )}
            </div>
          )}
        </MessageContent>

        {!isEditing && !isStreaming && !hideMessageActions && (
          <MessageActions>
            {message.role === 'user' && (
              <MessageAction tooltip="Edit message" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </MessageAction>
            )}
            {message.role === 'assistant' && !message.error && (
              <>
                <MessageAction tooltip="Retry" onClick={onRetry}>
                  <RotateCcw className="h-4 w-4" />
                </MessageAction>
                <MessageAction tooltip={copied ? 'Copied!' : 'Copy'} onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </MessageAction>
                <MessageAction
                  tooltip={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  onClick={handleBookmark}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </MessageAction>
                <MessageAction tooltip={ttsTooltip} onClick={handleSpeak} disabled={isTTSLoading}>
                  {isTTSLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSpeaking ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </MessageAction>
                <MessageAction tooltip="Share" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </MessageAction>
                <MessageAction
                  tooltip="Translate"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                >
                  <Languages className="h-4 w-4" />
                </MessageAction>
              </>
            )}
            {/* Branch button for all messages */}
            <BranchButton
              sessionId={sessionId}
              messageId={message.id}
              onCopyMessages={onCopyMessagesForBranch}
            />
          </MessageActions>
        )}
      </MessageUI>
    </MessageSwipeActions>
  );
}
