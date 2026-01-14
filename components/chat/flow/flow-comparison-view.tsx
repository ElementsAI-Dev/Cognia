'use client';

/**
 * FlowComparisonView - Side-by-side comparison of multiple flow nodes
 * Allows comparing responses from different models or regenerations
 */

import { memo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Scale,
  Copy,
  Check,
  Star,
  ThumbsUp,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCopy } from '@/hooks/ui';
import type { UIMessage } from '@/types/core/message';

interface ComparisonNode {
  messageId: string;
  message: UIMessage;
  model?: string;
  provider?: string;
  rating?: number;
}

interface FlowComparisonViewProps {
  /** Nodes to compare */
  nodes: ComparisonNode[];
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Callback when a node is removed from comparison */
  onRemoveNode?: (messageId: string) => void;
  /** Callback when a node is rated */
  onRateNode?: (messageId: string, rating: number) => void;
  /** Callback when user selects a preferred response */
  onSelectPreferred?: (messageId: string) => void;
  className?: string;
}

function ComparisonCard({
  node,
  index,
  isPreferred,
  onRemove,
  onRate,
  onSelectPreferred,
  onCopy,
  isCopying,
}: {
  node: ComparisonNode;
  index: number;
  isPreferred: boolean;
  onRemove: () => void;
  onRate: (rating: number) => void;
  onSelectPreferred: () => void;
  onCopy: () => void;
  isCopying: boolean;
}) {
  const t = useTranslations('flowChat');
  const content = node.message.content || '';

  return (
    <div
      className={cn(
        'flex flex-col h-full border rounded-lg overflow-hidden transition-all',
        isPreferred && 'ring-2 ring-primary border-primary'
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            #{index + 1}
          </Badge>
          {node.provider && node.model && (
            <span className="text-xs text-muted-foreground">
              {node.provider}/{node.model}
            </span>
          )}
          {isPreferred && (
            <Badge className="text-[10px] gap-1 bg-primary">
              <Star className="h-2.5 w-2.5" />
              Preferred
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onCopy}
              >
                {isCopying ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove from comparison</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-3">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </ScrollArea>

      {/* Rating and actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
        {/* Star rating */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onRate(star)}
              className={cn(
                'p-0.5 transition-colors',
                (node.rating || 0) >= star
                  ? 'text-yellow-500'
                  : 'text-muted-foreground hover:text-yellow-400'
              )}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  (node.rating || 0) >= star && 'fill-current'
                )}
              />
            </button>
          ))}
        </div>

        {/* Select as preferred */}
        <Button
          variant={isPreferred ? 'secondary' : 'outline'}
          size="sm"
          className="h-7 gap-1"
          onClick={onSelectPreferred}
        >
          <ThumbsUp className="h-3 w-3" />
          {isPreferred ? t('preferred') : t('selectPreferred')}
        </Button>
      </div>
    </div>
  );
}

function FlowComparisonViewComponent({
  nodes,
  open,
  onOpenChange,
  onRemoveNode,
  onRateNode,
  onSelectPreferred,
  className,
}: FlowComparisonViewProps) {
  const t = useTranslations('flowChat');
  const tToasts = useTranslations('toasts');
  const { copy, isCopying } = useCopy({ toastMessage: tToasts('messageCopied') });
  
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // For mobile: show 2 at a time
  const nodesPerPage = 2;
  const totalPages = Math.ceil(nodes.length / nodesPerPage);
  const visibleNodes = nodes.slice(
    currentPage * nodesPerPage,
    (currentPage + 1) * nodesPerPage
  );

  const handleSelectPreferred = useCallback((messageId: string) => {
    setPreferredId(messageId);
    onSelectPreferred?.(messageId);
  }, [onSelectPreferred]);

  const handleRemove = useCallback((messageId: string) => {
    onRemoveNode?.(messageId);
    if (preferredId === messageId) {
      setPreferredId(null);
    }
  }, [onRemoveNode, preferredId]);

  const handleRate = useCallback((messageId: string, rating: number) => {
    onRateNode?.(messageId, rating);
  }, [onRateNode]);

  const handleCopy = useCallback(async (content: string) => {
    await copy(content);
  }, [copy]);

  if (nodes.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 overflow-hidden',
          isFullscreen
            ? 'max-w-[100vw] max-h-[100vh] w-screen h-screen rounded-none'
            : 'max-w-[90vw] max-h-[85vh] w-[1200px]',
          className
        )}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            <DialogTitle>{t('compareResponses')}</DialogTitle>
            <DialogDescription className="sr-only">
              Compare multiple AI responses side by side
            </DialogDescription>
            <Badge variant="secondary" className="text-xs">
              {nodes.length} {t('responses')}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
              </TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Comparison grid */}
        <div
          className={cn(
            'flex-1 p-4 overflow-hidden',
            isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[calc(85vh-120px)]'
          )}
        >
          {/* Desktop: show all */}
          <div className="hidden md:grid gap-4 h-full" style={{
            gridTemplateColumns: `repeat(${Math.min(nodes.length, 4)}, 1fr)`
          }}>
            {nodes.map((node, index) => (
              <ComparisonCard
                key={node.messageId}
                node={node}
                index={index}
                isPreferred={preferredId === node.messageId}
                onRemove={() => handleRemove(node.messageId)}
                onRate={(rating) => handleRate(node.messageId, rating)}
                onSelectPreferred={() => handleSelectPreferred(node.messageId)}
                onCopy={() => handleCopy(node.message.content || '')}
                isCopying={isCopying}
              />
            ))}
          </div>

          {/* Mobile: paginated view */}
          <div className="md:hidden h-full flex flex-col">
            <div className="flex-1 grid gap-4" style={{
              gridTemplateColumns: `repeat(${visibleNodes.length}, 1fr)`
            }}>
              {visibleNodes.map((node, index) => (
                <ComparisonCard
                  key={node.messageId}
                  node={node}
                  index={currentPage * nodesPerPage + index}
                  isPreferred={preferredId === node.messageId}
                  onRemove={() => handleRemove(node.messageId)}
                  onRate={(rating) => handleRate(node.messageId, rating)}
                  onSelectPreferred={() => handleSelectPreferred(node.messageId)}
                  onCopy={() => handleCopy(node.message.content || '')}
                  isCopying={isCopying}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Summary footer */}
        {preferredId && (
          <div className="px-4 py-3 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-primary" />
                <span>{t('preferredResponse')}:</span>
                <Badge variant="outline">
                  {nodes.find((n) => n.messageId === preferredId)?.model || 'Response'}
                </Badge>
              </div>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                {t('done')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const FlowComparisonView = memo(FlowComparisonViewComponent);
export default FlowComparisonView;
