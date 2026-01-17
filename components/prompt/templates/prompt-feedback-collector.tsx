'use client';

/**
 * PromptFeedbackCollector
 * Component for collecting user feedback on prompt effectiveness
 */

import { useState, useCallback } from 'react';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { toast } from '@/components/ui/sonner';
import { usePromptTemplateStore } from '@/stores';
import type { PromptFeedback } from '@/types/content/prompt-template';

interface PromptFeedbackCollectorProps {
  templateId: string;
  templateName?: string;
  context?: {
    model?: string;
    provider?: string;
    inputTokens?: number;
    outputTokens?: number;
    responseTime?: number;
  };
  variant?: 'inline' | 'popover' | 'compact';
  onFeedbackSubmitted?: (feedback: PromptFeedback) => void;
}

const EFFECTIVENESS_OPTIONS: Array<{
  value: PromptFeedback['effectiveness'];
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { value: 'excellent', label: 'Excellent', icon: <Sparkles className="h-4 w-4" />, color: 'text-green-500' },
  { value: 'good', label: 'Good', icon: <ThumbsUp className="h-4 w-4" />, color: 'text-blue-500' },
  { value: 'average', label: 'Average', icon: <AlertCircle className="h-4 w-4" />, color: 'text-yellow-500' },
  { value: 'poor', label: 'Poor', icon: <ThumbsDown className="h-4 w-4" />, color: 'text-red-500' },
];

export function PromptFeedbackCollector({
  templateId,
  templateName,
  context,
  variant = 'popover',
  onFeedbackSubmitted,
}: PromptFeedbackCollectorProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [effectiveness, setEffectiveness] = useState<PromptFeedback['effectiveness'] | null>(null);
  const [comment, setComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const recordFeedback = usePromptTemplateStore(state => state.recordFeedback);
  
  const handleSubmit = useCallback(() => {
    if (rating === 0 || !effectiveness) {
      toast.error('Please provide a rating and effectiveness assessment');
      return;
    }
    
    const feedbackData: Omit<PromptFeedback, 'id' | 'templateId' | 'createdAt'> = {
      rating: rating as 1 | 2 | 3 | 4 | 5,
      effectiveness,
      comment: comment.trim() || undefined,
      context,
    };
    
    recordFeedback(templateId, feedbackData);
    
    setIsSubmitted(true);
    toast.success('Thank you for your feedback!');
    
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted({
        id: '',
        templateId,
        createdAt: new Date(),
        ...feedbackData,
      });
    }
    
    // Reset after delay
    setTimeout(() => {
      setRating(0);
      setEffectiveness(null);
      setComment('');
      setIsOpen(false);
      setIsSubmitted(false);
    }, 1500);
  }, [rating, effectiveness, comment, context, templateId, recordFeedback, onFeedbackSubmitted]);
  
  const handleQuickFeedback = useCallback((isPositive: boolean) => {
    const feedbackData: Omit<PromptFeedback, 'id' | 'templateId' | 'createdAt'> = {
      rating: isPositive ? 5 : 2,
      effectiveness: isPositive ? 'good' : 'poor',
      context,
    };
    
    recordFeedback(templateId, feedbackData);
    toast.success('Feedback recorded!');
    
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted({
        id: '',
        templateId,
        createdAt: new Date(),
        ...feedbackData,
      });
    }
  }, [templateId, context, recordFeedback, onFeedbackSubmitted]);
  
  const feedbackFormContent = (
    <div className="space-y-4">
      {templateName && (
        <div className="text-sm font-medium">{templateName}</div>
      )}
      
      {/* Star Rating */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Rate this prompt</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={cn(
                  'h-6 w-6 transition-colors',
                  star <= (hoverRating || rating)
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">
              {rating}/5
            </span>
          )}
        </div>
      </div>
      
      {/* Effectiveness */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">How effective was it?</Label>
        <div className="flex flex-wrap gap-2">
          {EFFECTIVENESS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={effectiveness === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEffectiveness(option.value)}
              className={cn(
                'gap-1.5',
                effectiveness === option.value && 'ring-2 ring-offset-2'
              )}
            >
              <span className={option.color}>{option.icon}</span>
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Comment */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Additional comments (optional)</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What worked well? What could be improved?"
          rows={3}
          className="resize-none"
        />
      </div>
      
      {/* Context info */}
      {context && (context.model || context.responseTime) && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {context.model && <Badge variant="outline">{context.model}</Badge>}
          {context.responseTime && (
            <Badge variant="outline">{(context.responseTime / 1000).toFixed(1)}s</Badge>
          )}
          {context.outputTokens && (
            <Badge variant="outline">{context.outputTokens} tokens</Badge>
          )}
        </div>
      )}
      
      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={rating === 0 || !effectiveness || isSubmitted}
        className="w-full gap-2"
      >
        {isSubmitted ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Submitted!
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Feedback
          </>
        )}
      </Button>
    </div>
  );
  
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuickFeedback(true)}
            >
              <ThumbsUp className="h-4 w-4 text-green-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Helpful</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuickFeedback(false)}
            >
              <ThumbsDown className="h-4 w-4 text-red-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Not helpful</TooltipContent>
        </Tooltip>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            {feedbackFormContent}
          </PopoverContent>
        </Popover>
      </div>
    );
  }
  
  if (variant === 'inline') {
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-sm">How was this prompt?</h4>
        </div>
        {feedbackFormContent}
      </div>
    );
  }
  
  // Default: popover variant
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Star className="h-4 w-4" />
          Rate this prompt
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-sm">How was this prompt?</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {feedbackFormContent}
      </PopoverContent>
    </Popover>
  );
}

export default PromptFeedbackCollector;
