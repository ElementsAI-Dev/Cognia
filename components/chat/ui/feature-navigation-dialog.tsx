'use client';

/**
 * Feature Navigation Dialog
 * 
 * Confirmation dialog shown when user intent is detected for a feature page.
 * Allows user to navigate to the feature page or continue in chat.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Video,
  Image,
  Wand2,
  Presentation,
  GraduationCap,
  Workflow,
  Sparkles,
  FolderKanban,
  Settings,
  Wrench,
  GitBranch,
  Activity,
  MessageSquare,
  ArrowRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FeatureRoute } from '@/types/routing/feature-router';

/**
 * Icon mapping for features
 */
const FEATURE_ICONS: Record<string, LucideIcon> = {
  Video: Video,
  Image: Image,
  Wand2: Wand2,
  Presentation: Presentation,
  GraduationCap: GraduationCap,
  Workflow: Workflow,
  Sparkles: Sparkles,
  FolderKanban: FolderKanban,
  Settings: Settings,
  Wrench: Wrench,
  GitBranch: GitBranch,
  Activity: Activity,
  MessageSquare: MessageSquare,
};

/**
 * Category colors for visual distinction
 */
const CATEGORY_COLORS: Record<string, string> = {
  creation: 'from-purple-500 to-pink-500',
  research: 'from-blue-500 to-cyan-500',
  automation: 'from-green-500 to-emerald-500',
  management: 'from-orange-500 to-amber-500',
  system: 'from-gray-500 to-slate-500',
  development: 'from-indigo-500 to-violet-500',
  chat: 'from-gray-400 to-gray-500',
};

interface FeatureNavigationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** The detected feature route */
  feature: FeatureRoute | null;
  /** Detection confidence score */
  confidence: number;
  /** Original user message that triggered detection */
  originalMessage: string;
  /** Matched patterns for display */
  matchedPatterns?: string[];
  /** Callback when user confirms navigation */
  onNavigate: () => void;
  /** Callback when user wants to continue in chat */
  onContinue: () => void;
  /** Callback when user dismisses (don't show again for this feature) */
  onDismiss: () => void;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
}

export function FeatureNavigationDialog({
  open,
  feature,
  confidence,
  originalMessage,
  matchedPatterns = [],
  onNavigate,
  onContinue,
  onDismiss,
  onOpenChange,
}: FeatureNavigationDialogProps) {
  const t = useTranslations('navigation.featureRouting');

  // Get icon component
  const IconComponent = useMemo(() => {
    if (!feature?.icon) return MessageSquare;
    return FEATURE_ICONS[feature.icon] || MessageSquare;
  }, [feature?.icon]);

  // Get category gradient
  const categoryGradient = useMemo(() => {
    if (!feature?.category) return CATEGORY_COLORS.chat;
    return CATEGORY_COLORS[feature.category] || CATEGORY_COLORS.chat;
  }, [feature]);

  // Format confidence as percentage
  const confidencePercent = Math.round(confidence * 100);

  if (!feature) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn(
              'h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0',
              categoryGradient
            )}>
              <IconComponent className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <AlertDialogTitle className="text-base">
                {t('intentDetected') || '检测到功能意图'}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t('suggestNavigation', { feature: feature.nameZh }) || 
                  `您的请求更适合在${feature.nameZh}中完成`}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {/* Feature info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{feature.nameZh}</span>
              <Badge variant="secondary" className="text-xs">
                {t('confidence') || '置信度'}: {confidencePercent}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {feature.descriptionZh}
            </p>
          </div>

          {/* Original message preview */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {t('yourRequest') || '您的请求'}:
            </span>
            <div className="bg-muted/30 rounded-md px-3 py-2 text-sm line-clamp-2">
              &ldquo;{originalMessage}&rdquo;
            </div>
          </div>

          {/* Matched patterns (if any) */}
          {matchedPatterns.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {matchedPatterns.slice(0, 3).map((pattern, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {pattern}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Checkbox
              id="dont-show-again"
              onCheckedChange={(checked) => {
                if (checked) {
                  onDismiss();
                }
              }}
            />
            <Label htmlFor="dont-show-again" className="text-xs text-muted-foreground cursor-pointer">
              {t('dontShowAgain') || '不再提示此功能'}
            </Label>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" onClick={onContinue}>
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                {t('continueChat') || '继续对话'}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" onClick={onNavigate}>
                {t('goToFeature') || `前往${feature.nameZh}`}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Compact inline suggestion for feature navigation
 * Can be used as an alternative to the dialog
 */
interface FeatureNavigationSuggestionProps {
  feature: FeatureRoute;
  confidence: number;
  onNavigate: () => void;
  onDismiss: () => void;
  className?: string;
}

export function FeatureNavigationSuggestion({
  feature,
  confidence: _confidence,
  onNavigate,
  onDismiss,
  className,
}: FeatureNavigationSuggestionProps) {
  const t = useTranslations('navigation.featureRouting');
  
  const IconComponent = FEATURE_ICONS[feature.icon] || MessageSquare;
  const categoryGradient = CATEGORY_COLORS[feature.category] || CATEGORY_COLORS.chat;

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg bg-muted/50 border text-sm',
      className
    )}>
      <div className={cn(
        'h-7 w-7 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0',
        categoryGradient
      )}>
        <IconComponent className="h-3.5 w-3.5 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">
          {t('suggestFeature') || '建议使用'}{' '}
        </span>
        <span className="font-medium">{feature.nameZh}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onNavigate}>
          {t('go') || '前往'}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default FeatureNavigationDialog;
