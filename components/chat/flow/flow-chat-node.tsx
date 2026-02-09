'use client';

/**
 * FlowChatNode - Chat message node for flow canvas
 * Displays user/assistant messages in a card format with actions
 * Integrates with existing message rendering components
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useTranslations } from 'next-intl';
import {
  User,
  Bot,
  Settings,
  ChevronDown,
  ChevronUp,
  GitBranch,
  RotateCcw,
  Copy,
  Trash2,
  MessageSquare,
  MoreHorizontal,
  Check,
  Sparkles,
  Link2,
  Wrench,
  Brain,
  Layers,
  Bookmark,
  BookmarkCheck,
  Star,
  Scale,
  Image as ImageIcon,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ReasoningPart, SourcesPart } from '@/components/chat/message-parts';
import { A2UIMessageRenderer, hasA2UIContent } from '@/components/a2ui';
import { FlowNodeThumbnailStrip } from './flow-node-thumbnail-strip';
import { FlowNodeTags } from './flow-node-tags';
import { MarkdownRenderer } from '@/components/chat/utils/markdown-renderer';
import type { FlowChatNodeData, NodeAction, FlowNodeTag } from '@/types/chat/flow-chat';
import type { MessagePart, ToolInvocationPart } from '@/types/core/message';

const MAX_PREVIEW_LENGTH = 300;
const MAX_COLLAPSED_LENGTH = 100;

// Use simpler props interface for ReactFlow compatibility
interface FlowChatNodeComponentProps {
  data: FlowChatNodeData;
  id: string;
  selected?: boolean;
  onAction?: (action: NodeAction, data?: Record<string, unknown>) => void;
  /** Available tag definitions for adding tags */
  availableTags?: FlowNodeTag[];
  /** Callback when tag is added */
  onAddTag?: (tag: FlowNodeTag) => void;
  /** Callback when tag is removed */
  onRemoveTag?: (tagId: string) => void;
  /** Callback when new tag is created */
  onCreateTag?: (tag: Omit<FlowNodeTag, 'id'>) => void;
}

function FlowChatNodeComponent({
  data,
  id,
  selected,
  onAction,
  availableTags = [],
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: FlowChatNodeComponentProps & Omit<NodeProps, 'data'>) {
  const t = useTranslations('flowChat');
  const [copied, setCopied] = useState(false);

  const { 
    message, 
    role, 
    collapseState, 
    isBranchPoint, 
    isStreaming, 
    model, 
    provider,
    attachments,
    hasMedia,
    tags,
    linkedArtifacts,
    isBookmarked,
    rating,
    notes,
    isHighlighted,
  } = data;
  const providerDisplay = provider ? `${provider}` : '';
  const content = message.content || '';
  const parts = message.parts;

  const isCollapsed = collapseState === 'collapsed';
  const isExpanded = collapseState === 'expanded';

  // Check for special content types
  const hasToolCalls = useMemo(() => 
    parts?.some(p => p.type === 'tool-invocation'), [parts]);
  const hasReasoning = useMemo(() => 
    parts?.some(p => p.type === 'reasoning'), [parts]);
  const hasA2UI = useMemo(() => 
    hasA2UIContent(content), [content]);
  const hasSources = useMemo(() => 
    parts?.some(p => p.type === 'sources'), [parts]);
  const hasAttachments = useMemo(() => 
    (attachments?.length ?? 0) > 0 || hasMedia, [attachments, hasMedia]);
  const hasArtifacts = useMemo(() => 
    (linkedArtifacts?.length ?? 0) > 0, [linkedArtifacts]);

  // Tool calls for display
  const toolCalls = useMemo(() => 
    parts?.filter(p => p.type === 'tool-invocation') as ToolInvocationPart[] | undefined, 
    [parts]
  );

  // Reasoning parts for display
  const reasoningParts = useMemo(() => 
    parts?.filter(p => p.type === 'reasoning'), [parts]);

  // Sources parts
  const sourcesParts = useMemo(() => 
    parts?.filter(p => p.type === 'sources'), [parts]);

  // Get display content based on collapse state
  const displayContent = useMemo(() => {
    if (isCollapsed) {
      return content.slice(0, MAX_COLLAPSED_LENGTH) + (content.length > MAX_COLLAPSED_LENGTH ? '...' : '');
    }
    if (!isExpanded && content.length > MAX_PREVIEW_LENGTH) {
      return content.slice(0, MAX_PREVIEW_LENGTH) + '...';
    }
    return content;
  }, [content, isCollapsed, isExpanded]);

  const handleAction = useCallback(
    (action: NodeAction) => {
      onAction?.(action, { nodeId: id, messageId: message.id });
    },
    [onAction, id, message.id]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  const handleToggleCollapse = useCallback(() => {
    handleAction('collapse');
  }, [handleAction]);

  const roleIcon = role === 'user' ? (
    <User className="h-4 w-4" />
  ) : role === 'assistant' ? (
    <Bot className="h-4 w-4" />
  ) : (
    <Settings className="h-4 w-4" />
  );

  const roleColor = role === 'user'
    ? 'bg-primary/10 border-primary/20'
    : role === 'assistant'
    ? 'bg-secondary/50 border-secondary'
    : 'bg-muted border-muted-foreground/20';

  return (
    <div
      className={cn(
        'flow-chat-node rounded-lg border-2 shadow-sm transition-all duration-200',
        'min-w-[280px] max-w-[420px]',
        roleColor,
        selected && 'ring-2 ring-primary ring-offset-2',
        isHighlighted && 'ring-2 ring-yellow-400 ring-offset-1 shadow-lg shadow-yellow-200/30 dark:shadow-yellow-800/20',
        isStreaming && 'animate-pulse',
        isBranchPoint && 'border-dashed border-orange-400'
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !w-3 !h-3"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'p-1.5 rounded-full',
              role === 'user' ? 'bg-primary/20' : 'bg-secondary'
            )}
          >
            {roleIcon}
          </div>
          <span className="text-sm font-medium capitalize">{role}</span>
          {(model || providerDisplay) && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs gap-1">
                  {providerDisplay && <span className="opacity-60">{providerDisplay}/</span>}
                  {model || 'default'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {providerDisplay && `Provider: ${providerDisplay}`}
                {providerDisplay && model && ' • '}
                {model && `Model: ${model}`}
              </TooltipContent>
            </Tooltip>
          )}
          {isBranchPoint && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs gap-1">
                  <GitBranch className="h-3 w-3" />
                  {t('branchPoint')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{t('branchPointHint')}</TooltipContent>
            </Tooltip>
          )}
          {isBookmarked && (
            <Tooltip>
              <TooltipTrigger>
                <BookmarkCheck className="h-4 w-4 text-primary" />
              </TooltipTrigger>
              <TooltipContent>{t('bookmarked')}</TooltipContent>
            </Tooltip>
          )}
          {rating && rating > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
          )}
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleAction('follow-up')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('followUp')}
            </DropdownMenuItem>
            {role === 'assistant' && (
              <DropdownMenuItem onClick={() => handleAction('regenerate')}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('regenerate')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleAction('branch')}>
              <GitBranch className="h-4 w-4 mr-2" />
              {t('createBranch')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('reference')}>
              <Link2 className="h-4 w-4 mr-2" />
              {t('reference')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('parallel')}>
              <Sparkles className="h-4 w-4 mr-2" />
              {t('parallelGenerate')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('add-to-compare')}>
              <Scale className="h-4 w-4 mr-2" />
              {t('addToCompare')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('bookmark')}>
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 mr-2" />
              ) : (
                <Bookmark className="h-4 w-4 mr-2" />
              )}
              {isBookmarked ? t('removeBookmark') : t('addBookmark')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('rate')}>
              <Star className="h-4 w-4 mr-2" />
              {t('rateResponse')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('add-note')}>
              <StickyNote className="h-4 w-4 mr-2" />
              {t('addNote')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? t('copied') : t('copy')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAction('delete')}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <ScrollArea className={cn('px-3 py-2', isExpanded && 'max-h-80')}>
        {/* Tags */}
        {(tags && tags.length > 0) && (
          <div className="mb-2">
            <FlowNodeTags
              tags={tags}
              availableTags={availableTags}
              editable={isExpanded}
              maxVisible={3}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              onCreateTag={onCreateTag}
            />
          </div>
        )}

        {/* Media thumbnails */}
        {hasAttachments && attachments && attachments.length > 0 && (
          <div className="mb-2">
            <FlowNodeThumbnailStrip
              attachments={attachments}
              maxVisible={isExpanded ? 8 : 4}
              size={isExpanded ? 'md' : 'sm'}
              isExpanded={isExpanded}
              onMediaClick={() => handleAction('view-media')}
              onDownload={() => handleAction('download-media')}
            />
          </div>
        )}

        {/* Feature indicators */}
        {(hasToolCalls || hasReasoning || hasA2UI || hasSources || hasArtifacts) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {hasReasoning && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-purple-50 dark:bg-purple-950/30">
                <Brain className="h-2.5 w-2.5" />
                Thinking
              </Badge>
            )}
            {hasToolCalls && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-blue-50 dark:bg-blue-950/30">
                <Wrench className="h-2.5 w-2.5" />
                {toolCalls?.length || 0} Tools
              </Badge>
            )}
            {hasA2UI && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-green-50 dark:bg-green-950/30">
                <Layers className="h-2.5 w-2.5" />
                A2UI
              </Badge>
            )}
            {hasSources && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-amber-50 dark:bg-amber-950/30">
                Sources
              </Badge>
            )}
            {hasArtifacts && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-cyan-50 dark:bg-cyan-950/30">
                <ImageIcon className="h-2.5 w-2.5" />
                {linkedArtifacts?.length} Artifacts
              </Badge>
            )}
            {hasAttachments && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-pink-50 dark:bg-pink-950/30">
                <ImageIcon className="h-2.5 w-2.5" />
                {attachments?.length} Media
              </Badge>
            )}
          </div>
        )}

        {/* Reasoning preview (collapsed) */}
        {hasReasoning && reasoningParts && reasoningParts.length > 0 && !isExpanded && (
          <div className="mb-2 p-2 rounded bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/50">
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Reasoning
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2">
              {(reasoningParts[0] as MessagePart & { reasoning: string }).reasoning?.slice(0, 100)}...
            </div>
          </div>
        )}

        {/* Full reasoning (expanded) */}
        {hasReasoning && reasoningParts && isExpanded && (
          <div className="mb-2 space-y-1">
            {reasoningParts.map((part, index) => (
              <ReasoningPart key={`reasoning-${index}`} part={part as MessagePart & { type: 'reasoning' }} />
            ))}
          </div>
        )}

        {/* Tool calls preview */}
        {hasToolCalls && toolCalls && toolCalls.length > 0 && (
          <div className="mb-2 space-y-1">
            {(isExpanded ? toolCalls : toolCalls.slice(0, 2)).map((tool, index) => (
              <div 
                key={`tool-${tool.toolCallId || index}`}
                className="p-1.5 rounded bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50"
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Wrench className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">{tool.toolName}</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-[9px] ml-auto',
                      tool.state === 'output-available' ? 'bg-green-100 text-green-700' :
                      tool.state === 'output-error' ? 'bg-red-100 text-red-700' :
                      tool.state === 'input-streaming' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    )}
                  >
                    {tool.state.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
            {!isExpanded && toolCalls.length > 2 && (
              <div className="text-[10px] text-muted-foreground text-center">
                +{toolCalls.length - 2} more tools
              </div>
            )}
          </div>
        )}

        {/* A2UI content */}
        {hasA2UI && isExpanded && (
          <div className="mb-2">
            <A2UIMessageRenderer content={content} messageId={message.id} />
          </div>
        )}

        {/* Main text content */}
        <div
          className={cn(
            'text-sm break-words',
            isCollapsed && 'line-clamp-2'
          )}
        >
          {hasA2UI && !isExpanded ? (
            <span className="text-muted-foreground italic text-xs">[A2UI Content - Click expand to view]</span>
          ) : role === 'assistant' && isExpanded && displayContent.length > 0 ? (
            <MarkdownRenderer
              content={displayContent}
              className="text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              enableMermaid={false}
              enableVegaLite={false}
              enableSandpack={false}
            />
          ) : (
            <div className="whitespace-pre-wrap">{displayContent}</div>
          )}
        </div>

        {/* Sources preview */}
        {hasSources && sourcesParts && isExpanded && (
          <div className="mt-2">
            {sourcesParts.map((part, index) => (
              <SourcesPart key={`sources-${index}`} part={part as MessagePart & { type: 'sources' }} />
            ))}
          </div>
        )}

        {/* Linked artifacts preview */}
        {hasArtifacts && linkedArtifacts && isExpanded && (
          <div className="mt-2 space-y-1">
            {linkedArtifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="p-1.5 rounded bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-800/50"
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <ImageIcon className="h-3 w-3 text-cyan-500" />
                  <span className="font-medium text-cyan-700 dark:text-cyan-300">
                    {artifact.title}
                  </span>
                  <Badge variant="outline" className="text-[9px] ml-auto">
                    {artifact.type}
                  </Badge>
                </div>
                {artifact.previewContent && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {artifact.previewContent}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* User notes */}
        {notes && isExpanded && (
          <div className="mt-2 p-2 rounded bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200/50 dark:border-yellow-800/50">
            <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1 flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              Note
            </div>
            <p className="text-xs text-muted-foreground">{notes}</p>
          </div>
        )}

        {/* Expand/Collapse button */}
        {(content.length > MAX_COLLAPSED_LENGTH || hasToolCalls || hasReasoning || hasA2UI) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-6 text-xs"
            onClick={handleToggleCollapse}
          >
            {isCollapsed || !isExpanded ? (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                {t('expand')}
              </>
            ) : (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                {t('collapse')}
              </>
            )}
          </Button>
        )}
      </ScrollArea>

      {/* Quick action bar */}
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-t border-inherit bg-background/40 supports-[backdrop-filter]:bg-background/30">
        {/* Left side - bookmark */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleAction('bookmark')}
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isBookmarked ? t('removeBookmark') : t('addBookmark')}
          </TooltipContent>
        </Tooltip>

        {/* Right side - actions */}
        <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleAction('follow-up')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('followUp')}</TooltipContent>
        </Tooltip>

        {role === 'assistant' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleAction('regenerate')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('regenerate')}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleAction('branch')}
            >
              <GitBranch className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('createBranch')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('copy')}</TooltipContent>
        </Tooltip>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-3 !h-3"
      />
    </div>
  );
}

export const FlowChatNode = memo(FlowChatNodeComponent);
export default FlowChatNode;
