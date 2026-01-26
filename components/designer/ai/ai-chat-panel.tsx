'use client';

/**
 * AIChatPanel - Iterative AI conversation panel for the designer
 * Allows multi-turn conversation to refine component design
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { useTranslations } from 'next-intl';
import {
  Send,
  Loader2,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Accessibility,
  Palette,
  Zap,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import {
  continueDesignConversation,
  getAIStyleSuggestions,
  getAIAccessibilitySuggestions,
  getDesignerAIConfig,
  executeDesignerAIEdit,
  QUICK_AI_ACTIONS,
  type AIConversationMessage,
  type AISuggestion,
} from '@/lib/designer';

interface AIChatPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AIChatPanel({
  code,
  onCodeChange,
  className,
  isOpen = true,
  onClose,
}: AIChatPanelProps) {
  const t = useTranslations('designer');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<AIConversationMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'style' | 'accessibility'>('style');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Settings for AI
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  // Get AI config
  const getConfig = useCallback(() => {
    return getDesignerAIConfig(defaultProvider, providerSettings);
  }, [defaultProvider, providerSettings]);

  // Send message to AI
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isProcessing) return;

    const userMessage: AIConversationMessage = {
      id: nanoid(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setConversation((prev) => [...prev, userMessage]);
    setMessage('');
    setIsProcessing(true);
    setError(null);

    try {
      const config = getConfig();
      const result = await continueDesignConversation(
        code,
        conversation,
        message,
        config
      );

      if (result.success && result.response) {
        const assistantMessage: AIConversationMessage = {
          id: nanoid(),
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          codeSnapshot: result.code,
        };

        setConversation((prev) => [...prev, assistantMessage]);

        // Apply code if provided
        if (result.code) {
          onCodeChange(result.code);
        }
      } else {
        setError(result.error || 'Failed to get response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [message, isProcessing, code, conversation, getConfig, onCodeChange]);

  // Apply quick action
  const handleQuickAction = useCallback(async (prompt: string) => {
    setIsProcessing(true);
    setError(null);

    const quickUserMessage: AIConversationMessage = {
      id: nanoid(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    setConversation((prev) => [...prev, quickUserMessage]);

    try {
      const config = getConfig();
      const result = await executeDesignerAIEdit(prompt, code, config);

      if (result.success && result.code) {
        const quickAssistantMessage: AIConversationMessage = {
          id: nanoid(),
          role: 'assistant',
          content: 'Done! I\'ve applied the changes.',
          timestamp: new Date(),
          codeSnapshot: result.code,
        };
        setConversation((prev) => [...prev, quickAssistantMessage]);
        onCodeChange(result.code);
      } else {
        setError(result.error || 'Quick action failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [code, getConfig, onCodeChange]);

  // Get suggestions
  const handleGetSuggestions = useCallback(async (type: 'style' | 'accessibility') => {
    setIsLoadingSuggestions(true);
    setSuggestionType(type);
    setShowSuggestions(true);
    setError(null);

    try {
      const config = getConfig();
      const result = type === 'style'
        ? await getAIStyleSuggestions(code, config)
        : await getAIAccessibilitySuggestions(code, config);

      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
      } else {
        setError(result.error || 'Failed to get suggestions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [code, getConfig]);

  // Apply suggestion
  const handleApplySuggestion = useCallback(async (suggestion: AISuggestion) => {
    const prompt = `Apply this improvement: ${suggestion.title}. ${suggestion.description}${suggestion.code ? ` Use this: ${suggestion.code}` : ''}`;
    await handleQuickAction(prompt);
  }, [handleQuickAction]);

  // Copy message content
  const handleCopyMessage = useCallback(async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Clear conversation
  const handleClearConversation = useCallback(() => {
    setConversation([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
  }, []);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full bg-background border-l', className)}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t('aiAssistant') || 'AI Assistant'}</span>
            {conversation.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {conversation.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {conversation.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleClearConversation}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('clearChat') || 'Clear chat'}</TooltipContent>
              </Tooltip>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-b p-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AI_ACTIONS.slice(0, 4).map((action) => (
              <Badge
                key={action.id}
                variant="outline"
                className="cursor-pointer hover:bg-secondary text-xs py-0.5"
                onClick={() => handleQuickAction(action.prompt)}
              >
                {action.label}
              </Badge>
            ))}
          </div>
          
          {/* Suggestion buttons */}
          <div className="flex gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 flex-1"
              onClick={() => handleGetSuggestions('style')}
              disabled={isLoadingSuggestions}
            >
              <Palette className="h-3.5 w-3.5" />
              {t('styleTips') || 'Style Tips'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 flex-1"
              onClick={() => handleGetSuggestions('accessibility')}
              disabled={isLoadingSuggestions}
            >
              <Accessibility className="h-3.5 w-3.5" />
              {t('a11yCheck') || 'A11y Check'}
            </Button>
          </div>
        </div>

        {/* Suggestions Panel */}
        {showSuggestions && (
          <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 border-b hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {suggestionType === 'style' ? 'Style Suggestions' : 'Accessibility Issues'}
                </span>
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {suggestions.length}
                  </Badge>
                )}
              </div>
              {showSuggestions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="max-h-48">
                {isLoadingSuggestions ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {t('noSuggestions') || 'No suggestions found'}
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="p-2 rounded-md border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => handleApplySuggestion(suggestion)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">
                                {suggestion.title}
                              </span>
                              <Badge
                                variant={
                                  suggestion.priority === 'high'
                                    ? 'destructive'
                                    : suggestion.priority === 'medium'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="text-[10px] px-1 py-0"
                              >
                                {suggestion.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {suggestion.description}
                            </p>
                          </div>
                          <Zap className="h-4 w-4 text-primary shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Conversation */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-3 space-y-3">
            {conversation.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t('aiChatWelcome') || 'Ask me to help improve your design'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t('aiChatHint') || 'Try: "Make this more modern" or "Add animations"'}
                </p>
              </div>
            ) : (
              conversation.map((msg, index) => {
                const msgId = `msg-${index}`;
                return (
                  <div
                    key={msgId}
                    className={cn(
                      'flex gap-2',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.codeSnapshot && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                          <Badge variant="outline" className="text-[10px]">
                            Code updated
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleCopyMessage(msg.codeSnapshot!, msgId)}
                          >
                            {copiedId === msgId ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <Badge variant="destructive" className="text-xs">
                  {error}
                </Badge>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('aiChatPlaceholder') || 'Describe what you want to change...'}
              className="min-h-[60px] max-h-[120px] resize-none text-sm"
              disabled={isProcessing}
            />
            <Button
              size="icon"
              className="h-[60px] w-10 shrink-0"
              onClick={handleSendMessage}
              disabled={!message.trim() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default AIChatPanel;
