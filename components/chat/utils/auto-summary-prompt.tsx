'use client';

/**
 * AutoSummaryPrompt - Shows a prompt to generate summary when conversation is long
 * 
 * Features:
 * - Appears when show prop is true
 * - Dismissible with option to disable future prompts
 * - Quick actions to generate summary
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Sparkles, FileText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSummaryStore } from '@/stores/chat';

interface AutoSummaryPromptProps {
  /** Whether to show the prompt */
  show: boolean;
  /** Number of messages in conversation */
  messageCount: number;
  /** Approximate token count */
  tokenCount: number;
  /** Callback when user clicks generate summary */
  onGenerateSummary: () => void;
  /** Callback when user dismisses the prompt */
  onDismiss: () => void;
  /** Optional className */
  className?: string;
}

export function AutoSummaryPrompt({
  show,
  messageCount,
  tokenCount,
  onGenerateSummary,
  onDismiss,
  className,
}: AutoSummaryPromptProps) {
  const t = useTranslations('chatSummary');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = useCallback(() => {
    if (dontShowAgain) {
      useSummaryStore.getState().updateAutoSummaryConfig({ enabled: false });
    }
    onDismiss();
  }, [dontShowAgain, onDismiss]);

  const handleGenerateSummary = useCallback(() => {
    onGenerateSummary();
    onDismiss();
  }, [onGenerateSummary, onDismiss]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
          'bg-background/95 backdrop-blur-md border rounded-lg shadow-lg',
          'px-4 py-3 max-w-md w-full mx-4',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">
              {t('autoSummaryTitle') || 'Long conversation detected'}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t('autoSummaryDescription', { 
                messages: messageCount, 
                tokens: Math.round(tokenCount / 1000) 
              }) || `This conversation has ${messageCount} messages (~${Math.round(tokenCount / 1000)}k tokens). Generate a summary to keep track of key points.`}
            </p>
            
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleGenerateSummary}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t('generateSummary') || 'Generate Summary'}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                {t('later') || 'Later'}
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <Label
                htmlFor="dont-show-again"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                {t('dontShowAgain') || "Don't show again"}
              </Label>
            </div>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Stats indicator */}
        <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {messageCount} {t('messages') || 'messages'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ~{Math.round(tokenCount / 1000)}k tokens
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AutoSummaryPrompt;
