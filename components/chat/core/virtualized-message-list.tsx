'use client';

/**
 * VirtualizedChatMessageList — windowed message list using `react-virtuoso`.
 *
 * Key behaviours:
 * - **Virtualisation** — only visible messages are mounted in the DOM, using `Virtuoso`
 *   with a custom scroll parent from `use-stick-to-bottom`.
 * - **Infinite scroll upward** — when the user scrolls to the top and `hasOlderMessages`
 *   is `true`, `loadOlderMessages` is called. Scroll position is preserved by adjusting
 *   `firstItemIndex` based on the prepended message count.
 * - **Thinking indicator** — appends a pulsing "Thinking..." placeholder when `isLoading`
 *   and the last message is from the user.
 * - **Fallback** — renders a plain (non-virtualised) list until the scroll parent ref is available.
 *
 * Each message row is rendered by {@link ChatMessageItem}.
 *
 * @module core/virtualized-message-list
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import {
  Message as MessageUI,
  MessageContent,
} from '@/components/ai-elements/message';
import { Loader } from '@/components/ai-elements/loader';
import { ChatMessageItem } from '../message/chat-message-item';
import type { WorkflowResultData } from '../workflow/workflow-result-card';
import type { UIMessage } from '@/types';
import { useStickToBottomContext } from 'use-stick-to-bottom';

/**
 * Props for the {@link VirtualizedChatMessageList} component.
 */
export interface VirtualizedChatMessageListProps {
  /** Ordered array of messages to display. */
  messages: UIMessage[];
  /** Active session ID passed down to each {@link ChatMessageItem}. */
  sessionId: string;
  /** Whether the last assistant message is currently streaming. */
  isStreaming: boolean;
  /** Whether a new AI response is being generated (shows thinking indicator). */
  isLoading: boolean;
  /** ID of the message currently being edited, or `null`. */
  editingMessageId: string | null;
  /** Controlled edit textarea value. */
  editContent: string;
  /** Update the edit textarea value. */
  onEditContentChange: (content: string) => void;
  /** Enter edit mode for a specific message. */
  onEditMessage: (messageId: string, content: string) => void;
  /** Cancel the current inline edit. */
  onCancelEdit: () => void;
  /** Save the edited message and regenerate. */
  onSaveEdit: (messageId: string) => Promise<void>;
  /** Regenerate an assistant message. */
  onRetry: (messageId: string) => Promise<void>;
  /** Copy messages for creating a conversation branch. */
  onCopyMessagesForBranch?: (branchPointMessageId: string, newBranchId: string) => Promise<unknown>;
  /** Translate a message inline. */
  onTranslate?: (messageId: string, content: string) => void;
  /** Whether the backend has older messages that can be loaded. */
  hasOlderMessages: boolean;
  /** Whether older messages are currently being fetched. */
  isLoadingOlder: boolean;
  /** Fetch the next page of older messages (infinite scroll upward). */
  loadOlderMessages: () => Promise<void>;
  /** Map of message ID → workflow execution result data. */
  workflowResults?: Map<string, WorkflowResultData>;
  /** Callback to re-run a workflow from its result card. */
  onWorkflowRerun?: (input: Record<string, unknown>) => void;
  /** Hide message action buttons (simplified mode). */
  hideMessageActions?: boolean;
  /** Hide per-message timestamps (simplified mode). */
  hideMessageTimestamps?: boolean;
  /** Show per-message token count next to timestamp. */
  showTokenUsageMeter?: boolean;
}

/**
 * Windowed message list with infinite upward scroll for loading older messages.
 */
export function VirtualizedChatMessageList({
  messages,
  sessionId,
  isStreaming,
  isLoading,
  editingMessageId,
  editContent,
  onEditContentChange,
  onEditMessage,
  onCancelEdit,
  onSaveEdit,
  onRetry,
  onCopyMessagesForBranch,
  onTranslate,
  hasOlderMessages,
  isLoadingOlder,
  loadOlderMessages,
  workflowResults,
  onWorkflowRerun,
  hideMessageActions = false,
  hideMessageTimestamps = false,
  showTokenUsageMeter = false,
}: VirtualizedChatMessageListProps) {
  const { scrollRef } = useStickToBottomContext();

  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);

  const showThinking = isLoading && messages[messages.length - 1]?.role === 'user';

  useEffect(() => {
    if (scrollRef.current) {
      setScrollParent(scrollRef.current);
    }
  }, [scrollRef]);

  // Preserve scroll position when prepending older messages.
  const [firstItemIndex, setFirstItemIndex] = useState(0);
  const prevLenRef = useRef<number>(messages.length);
  const prevFirstIdRef = useRef<string | undefined>(messages[0]?.id);
  const prevLastIdRef = useRef<string | undefined>(messages[messages.length - 1]?.id);

  useEffect(() => {
    const prevLen = prevLenRef.current;
    const prevLastId = prevLastIdRef.current;
    const nextLastId = messages[messages.length - 1]?.id;
    const nextFirstId = messages[0]?.id;

    // Detect a prepend (older messages loaded) by: length increased, last item unchanged, first item changed.
    if (
      messages.length > prevLen &&
      prevLastId &&
      nextLastId === prevLastId &&
      nextFirstId &&
      nextFirstId !== prevFirstIdRef.current
    ) {
      const delta = messages.length - prevLen;
      setFirstItemIndex((v) => v - delta);
    }

    prevLenRef.current = messages.length;
    prevFirstIdRef.current = nextFirstId;
    prevLastIdRef.current = nextLastId;
  }, [messages]);

  const items = useMemo(() => {
    if (!showThinking) return messages as Array<UIMessage | { kind: 'thinking' }>;
    return [...messages, { kind: 'thinking' } as const];
  }, [messages, showThinking]);

  const lastItemIndex = messages.length - 1;

  // Fallback: plain list until scroll parent ref is available
  if (!scrollParent) {
    return (
      <>
        {messages.map((message, index) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            sessionId={sessionId}
            isStreaming={isStreaming && index === lastItemIndex && message.role === 'assistant'}
            isEditing={editingMessageId === message.id}
            editContent={editContent}
            onEditContentChange={onEditContentChange}
            onEdit={() => onEditMessage(message.id, message.content)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={() => onSaveEdit(message.id)}
            onRetry={() => onRetry(message.id)}
            onCopyMessagesForBranch={onCopyMessagesForBranch}
            onTranslate={onTranslate}
            workflowResult={workflowResults?.get(message.id)}
            onWorkflowRerun={onWorkflowRerun}
            hideMessageActions={hideMessageActions}
            hideMessageTimestamps={hideMessageTimestamps}
            showTokenUsageMeter={showTokenUsageMeter}
          />
        ))}
      </>
    );
  }

  return (
    <Virtuoso
      data={items}
      customScrollParent={scrollParent}
      firstItemIndex={firstItemIndex}
      startReached={() => {
        if (hasOlderMessages && !isLoadingOlder) {
          void loadOlderMessages();
        }
      }}
      computeItemKey={(_index, item) => {
        if ((item as { kind?: string }).kind === 'thinking') return 'thinking';
        return (item as UIMessage).id;
      }}
      components={{
        List: (() => {
          const VirtualizedList = React.forwardRef<
            HTMLDivElement,
            React.HTMLAttributes<HTMLDivElement>
          >((props, ref) => <div {...props} ref={ref} className="flex flex-col gap-5 w-full" />);
          VirtualizedList.displayName = 'VirtualizedList';
          return VirtualizedList;
        })(),
      }}
      itemContent={(index, item) => {
        if ((item as { kind?: string }).kind === 'thinking') {
          return (
            <MessageUI from="assistant">
              <MessageContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader size={18} />
                  <span className="text-sm animate-pulse">Thinking...</span>
                </div>
              </MessageContent>
            </MessageUI>
          );
        }

        const message = item as UIMessage;
        return (
          <ChatMessageItem
            message={message}
            sessionId={sessionId}
            isStreaming={isStreaming && index === lastItemIndex && message.role === 'assistant'}
            isEditing={editingMessageId === message.id}
            editContent={editContent}
            onEditContentChange={onEditContentChange}
            onEdit={() => onEditMessage(message.id, message.content)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={() => onSaveEdit(message.id)}
            onRetry={() => onRetry(message.id)}
            onCopyMessagesForBranch={onCopyMessagesForBranch}
            onTranslate={onTranslate}
            workflowResult={workflowResults?.get(message.id)}
            onWorkflowRerun={onWorkflowRerun}
            hideMessageActions={hideMessageActions}
            hideMessageTimestamps={hideMessageTimestamps}
            showTokenUsageMeter={showTokenUsageMeter}
          />
        );
      }}
    />
  );
}
