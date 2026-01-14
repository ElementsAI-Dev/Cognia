'use client';

/**
 * FlowNodeReference - Component for referencing other nodes in flow canvas
 * Similar to Flowith's node reference feature
 * Allows users to reference content from other messages/nodes
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Link2,
  Search,
  MessageSquare,
  User,
  Bot,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { UIMessage } from '@/types';

interface NodeReference {
  id: string;
  messageId: string;
  label?: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
}

interface FlowNodeReferenceProps {
  /** Available messages to reference */
  messages: UIMessage[];
  /** Currently selected references */
  selectedReferences: NodeReference[];
  /** Callback when references change */
  onReferencesChange: (references: NodeReference[]) => void;
  /** Max content length to show in preview */
  maxPreviewLength?: number;
  className?: string;
}

export function FlowNodeReference({
  messages,
  selectedReferences,
  onReferencesChange,
  maxPreviewLength = 100,
  className,
}: FlowNodeReferenceProps) {
  const t = useTranslations('flowChat');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(m => 
      m.content?.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  // Add reference
  const addReference = useCallback((message: UIMessage) => {
    const content = message.content || '';
    const newRef: NodeReference = {
      id: `ref-${Date.now()}`,
      messageId: message.id,
      content: content.slice(0, 500), // Store truncated content
      role: message.role as 'user' | 'assistant' | 'system',
      label: `${message.role} message`,
    };
    onReferencesChange([...selectedReferences, newRef]);
  }, [selectedReferences, onReferencesChange]);

  // Remove reference
  const removeReference = useCallback((refId: string) => {
    onReferencesChange(selectedReferences.filter(r => r.id !== refId));
  }, [selectedReferences, onReferencesChange]);

  // Check if message is already referenced
  const isReferenced = useCallback((messageId: string) => {
    return selectedReferences.some(r => r.messageId === messageId);
  }, [selectedReferences]);

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-3 w-3" />;
      case 'assistant':
        return <Bot className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  // Truncate content for display
  const truncateContent = (content: string, maxLength: number) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected references */}
      {selectedReferences.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedReferences.map((ref) => (
            <Tooltip key={ref.id}>
              <TooltipTrigger asChild>
                <Badge 
                  variant="secondary" 
                  className="gap-1 pr-1 cursor-default"
                >
                  {getRoleIcon(ref.role)}
                  <span className="max-w-[100px] truncate text-xs">
                    {ref.label || truncateContent(ref.content, 20)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-0.5 hover:bg-destructive/20"
                    onClick={() => removeReference(ref.id)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs whitespace-pre-wrap">
                  {truncateContent(ref.content, maxPreviewLength)}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Add reference button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-7">
            <Link2 className="h-3.5 w-3.5" />
            {t('reference')}
            {selectedReferences.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {selectedReferences.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          {/* Messages list */}
          <ScrollArea className="h-[250px]">
            <div className="p-2 space-y-1">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No messages to reference</p>
                </div>
              ) : (
                filteredMessages.map((message) => {
                  const isSelected = isReferenced(message.id);
                  const content = message.content || '';
                  
                  return (
                    <Button
                      key={message.id}
                      variant={isSelected ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'w-full justify-start h-auto py-2 px-2',
                        isSelected && 'bg-primary/10'
                      )}
                      onClick={() => {
                        if (isSelected) {
                          const ref = selectedReferences.find(r => r.messageId === message.id);
                          if (ref) removeReference(ref.id);
                        } else {
                          addReference(message);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <div className={cn(
                          'p-1 rounded-full shrink-0 mt-0.5',
                          message.role === 'user' ? 'bg-primary/20' : 'bg-secondary'
                        )}>
                          {getRoleIcon(message.role)}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-medium capitalize">
                              {message.role}
                            </span>
                            {isSelected && (
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                                Referenced
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {truncateContent(content, 80)}
                          </p>
                        </div>
                        {!isSelected && (
                          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {selectedReferences.length > 0 && (
            <div className="p-2 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                {selectedReferences.length} node(s) referenced
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Formats references for inclusion in a prompt
 */
export function formatReferencesForPrompt(references: NodeReference[]): string {
  if (references.length === 0) return '';
  
  const formattedRefs = references.map((ref, index) => {
    return `[Reference ${index + 1} - ${ref.role}]:\n${ref.content}`;
  }).join('\n\n');
  
  return `\n\n--- Referenced Content ---\n${formattedRefs}\n--- End References ---\n\n`;
}

/**
 * Creates a reference edge for the flow canvas
 */
export function createReferenceEdge(
  sourceNodeId: string,
  targetNodeId: string,
  label?: string
) {
  return {
    id: `ref-edge-${sourceNodeId}-${targetNodeId}`,
    source: sourceNodeId,
    target: targetNodeId,
    type: 'reference',
    animated: true,
    style: { stroke: '#f59e0b', strokeDasharray: '5,5' },
    data: {
      edgeType: 'reference' as const,
      label: label || 'references',
    },
  };
}

export default FlowNodeReference;
