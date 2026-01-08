'use client';

/**
 * PromptFeedbackDialog - Dialog for collecting user feedback on prompt effectiveness
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { PromptFeedback } from '@/types/prompt-template';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Sparkles,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

interface PromptFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  onSubmit: (feedback: Omit<PromptFeedback, 'id' | 'templateId' | 'createdAt'>) => void;
  context?: {
    model?: string;
    provider?: string;
    inputTokens?: number;
    outputTokens?: number;
    responseTime?: number;
  };
}

const EFFECTIVENESS_OPTIONS = [
  { value: 'excellent', label: 'Excellent', icon: Sparkles, color: 'text-green-500' },
  { value: 'good', label: 'Good', icon: ThumbsUp, color: 'text-blue-500' },
  { value: 'average', label: 'Average', icon: Meh, color: 'text-yellow-500' },
  { value: 'poor', label: 'Poor', icon: ThumbsDown, color: 'text-red-500' },
] as const;

type Effectiveness = typeof EFFECTIVENESS_OPTIONS[number]['value'];

export function PromptFeedbackDialog({
  open,
  onOpenChange,
  templateId: _templateId,
  templateName,
  onSubmit,
  context,
}: PromptFeedbackDialogProps) {
  const t = useTranslations('promptFeedback');
  const tCommon = useTranslations('common');
  
  // State
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [effectiveness, setEffectiveness] = useState<Effectiveness | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = useCallback(async () => {
    if (rating === 0 || !effectiveness) return;
    
    setIsSubmitting(true);
    
    try {
      onSubmit({
        rating: rating as 1 | 2 | 3 | 4 | 5,
        effectiveness,
        comment: comment.trim() || undefined,
        context,
      });
      
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        // Reset state after closing
        setRating(0);
        setEffectiveness(null);
        setComment('');
        setSubmitted(false);
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, effectiveness, comment, context, onSubmit, onOpenChange]);
  
  const handleClose = useCallback(() => {
    onOpenChange(false);
    setRating(0);
    setEffectiveness(null);
    setComment('');
    setSubmitted(false);
  }, [onOpenChange]);
  
  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">{t('thankYou')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('feedbackReceived')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description', { name: templateName })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>{t('rating')}</Label>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(value)}
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      (hoveredRating || rating) >= value
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {rating > 0 ? t(`ratingLabel.${rating}`) : t('selectRating')}
            </p>
          </div>
          
          {/* Effectiveness */}
          <div className="space-y-3">
            <Label>{t('effectiveness')}</Label>
            <RadioGroup
              value={effectiveness || ''}
              onValueChange={(v) => setEffectiveness(v as Effectiveness)}
              className="grid grid-cols-2 gap-2"
            >
              {EFFECTIVENESS_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border-2 border-muted p-3 transition-all',
                        'hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                      )}
                    >
                      <Icon className={cn('h-5 w-5', option.color)} />
                      <span className="text-sm font-medium">{t(`effectiveness.${option.value}`)}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
          
          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">{t('comment')}</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('commentPlaceholder')}
              className="min-h-[80px] resize-none"
            />
          </div>
          
          {/* Context Info */}
          {context && (context.model || context.responseTime) && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-4">
                {context.model && (
                  <span>Model: {context.model}</span>
                )}
                {context.responseTime && (
                  <span>Response: {(context.responseTime / 1000).toFixed(2)}s</span>
                )}
                {context.inputTokens && context.outputTokens && (
                  <span>Tokens: {context.inputTokens} / {context.outputTokens}</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || !effectiveness || isSubmitting}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PromptFeedbackDialog;
