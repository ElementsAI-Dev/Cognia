'use client';

/**
 * FloatingPromptBar - v0-style AI prompt input bar
 * Central, prominent input for AI-powered design modifications
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Loader2,
  Wand2,
  X,
  Lightbulb,
  Palette,
  Layout,
  Type,
  Smartphone,
  Accessibility,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Smart suggestion categories
interface SuggestionCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  suggestions: string[];
}

const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    id: 'style',
    label: 'Style',
    icon: <Palette className="h-3.5 w-3.5" />,
    suggestions: [
      'Make it more modern with rounded corners and shadows',
      'Add a gradient background',
      'Use a dark theme color scheme',
      'Add subtle animations on hover',
    ],
  },
  {
    id: 'layout',
    label: 'Layout',
    icon: <Layout className="h-3.5 w-3.5" />,
    suggestions: [
      'Center everything vertically and horizontally',
      'Add more spacing between elements',
      'Make it a two-column layout',
      'Stack elements vertically on mobile',
    ],
  },
  {
    id: 'typography',
    label: 'Typography',
    icon: <Type className="h-3.5 w-3.5" />,
    suggestions: [
      'Increase font sizes for better readability',
      'Use a more modern font family',
      'Add proper heading hierarchy',
      'Improve text contrast',
    ],
  },
  {
    id: 'responsive',
    label: 'Responsive',
    icon: <Smartphone className="h-3.5 w-3.5" />,
    suggestions: [
      'Make it mobile-friendly',
      'Add responsive breakpoints',
      'Adjust padding for smaller screens',
      'Hide sidebar on mobile',
    ],
  },
  {
    id: 'accessibility',
    label: 'A11y',
    icon: <Accessibility className="h-3.5 w-3.5" />,
    suggestions: [
      'Add proper aria labels',
      'Improve color contrast for accessibility',
      'Add keyboard navigation support',
      'Add focus indicators',
    ],
  },
  {
    id: 'quick',
    label: 'Quick',
    icon: <Zap className="h-3.5 w-3.5" />,
    suggestions: [
      'Add a loading spinner',
      'Add a success message',
      'Add form validation',
      'Add a call-to-action button',
    ],
  },
];

interface FloatingPromptBarProps {
  onSubmit: (prompt: string) => Promise<void>;
  isProcessing?: boolean;
  error?: string | null;
  onClearError?: () => void;
  className?: string;
  placeholder?: string;
  conversationContext?: string[];
}

export function FloatingPromptBar({
  onSubmit,
  isProcessing = false,
  error,
  onClearError,
  className,
  placeholder,
  conversationContext = [],
}: FloatingPromptBarProps) {
  const t = useTranslations('designer');
  const [prompt, setPrompt] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isProcessing) return;
    
    try {
      await onSubmit(prompt.trim());
      setPrompt('');
      setIsExpanded(false);
    } catch {
      // Error is handled by parent
    }
  }, [prompt, isProcessing, onSubmit]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        setIsExpanded(false);
        textareaRef.current?.blur();
      }
    },
    [handleSubmit]
  );

  // Apply suggestion
  const applySuggestion = useCallback((suggestion: string) => {
    setPrompt(suggestion);
    textareaRef.current?.focus();
  }, []);

  // Filter suggestions based on context
  const contextAwareSuggestions = useMemo(() => {
    if (!activeCategory) return [];
    const category = SUGGESTION_CATEGORIES.find((c) => c.id === activeCategory);
    return category?.suggestions || [];
  }, [activeCategory]);

  return (
    <TooltipProvider>
      <div className={cn('w-full', className)}>
        {/* Main prompt bar */}
        <div
          className={cn(
            'relative rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg transition-all duration-200',
            isExpanded && 'ring-2 ring-primary/20',
            error && 'ring-2 ring-destructive/50'
          )}
        >
          {/* Input area */}
          <div className="flex items-start gap-2 p-3">
            <div className="flex-shrink-0 mt-1">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || t('aiPromptPlaceholder', { fallback: 'Describe what you want to change...' })}
                className={cn(
                  'min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent p-0',
                  'focus-visible:ring-0 focus-visible:ring-offset-0',
                  'text-sm placeholder:text-muted-foreground/60'
                )}
                disabled={isProcessing}
                rows={1}
              />

              {/* Conversation context indicator */}
              {conversationContext.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {conversationContext.length} previous messages
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                  >
                    <Lightbulb
                      className={cn('h-4 w-4', showSuggestions && 'text-primary')}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle suggestions</TooltipContent>
              </Tooltip>

              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!prompt.trim() || isProcessing}
                className="h-8 px-3"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-3 pb-2 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
                  <span className="flex-1">{error}</span>
                  {onClearError && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={onClearError}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestions panel */}
          <AnimatePresence>
            {isExpanded && showSuggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t"
              >
                <div className="p-2">
                  {/* Category tabs */}
                  <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1">
                    {SUGGESTION_CATEGORIES.map((category) => (
                      <Button
                        key={category.id}
                        variant={activeCategory === category.id ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs flex-shrink-0"
                        onClick={() =>
                          setActiveCategory(
                            activeCategory === category.id ? null : category.id
                          )
                        }
                      >
                        {category.icon}
                        <span className="ml-1">{category.label}</span>
                      </Button>
                    ))}
                  </div>

                  {/* Suggestions grid */}
                  {activeCategory ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {contextAwareSuggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="h-auto py-2 px-3 text-xs text-left justify-start font-normal hover:bg-muted"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Select a category to see suggestions
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard hint */}
        {isExpanded && (
          <div className="flex justify-center mt-2">
            <span className="text-[10px] text-muted-foreground">
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">⌘</kbd>+
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to
              generate
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default FloatingPromptBar;
