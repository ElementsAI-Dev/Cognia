'use client';

/**
 * Routing Indicator Component
 * Displays auto-routing decisions and allows user overrides
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Scale,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Eye,
  Wrench,
  Code,
  Lightbulb,
  Info,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import type { ModelSelection, TaskClassification, ModelTier } from '@/types/provider/auto-router';
import type { ProviderName } from '@/types/provider';

interface RoutingIndicatorProps {
  selection: ModelSelection | null;
  isVisible?: boolean;
  onOverride?: (provider: ProviderName, model: string) => void;
  onDismiss?: () => void;
  availableModels?: {
    fast: Array<{ provider: ProviderName; model: string }>;
    balanced: Array<{ provider: ProviderName; model: string }>;
    powerful: Array<{ provider: ProviderName; model: string }>;
  };
  compact?: boolean;
  className?: string;
}

const tierConfig: Record<ModelTier, { icon: React.ReactNode; color: string; label: string }> = {
  fast: {
    icon: <Zap className="h-3.5 w-3.5" />,
    color: 'text-green-500 bg-green-500/10 border-green-500/20',
    label: 'Fast',
  },
  balanced: {
    icon: <Scale className="h-3.5 w-3.5" />,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    label: 'Balanced',
  },
  powerful: {
    icon: <Brain className="h-3.5 w-3.5" />,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    label: 'Powerful',
  },
  reasoning: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    label: 'Reasoning',
  },
};

const categoryIcons: Record<string, React.ReactNode> = {
  coding: <Code className="h-3 w-3" />,
  analysis: <Brain className="h-3 w-3" />,
  creative: <Lightbulb className="h-3 w-3" />,
  research: <Eye className="h-3 w-3" />,
  general: <Info className="h-3 w-3" />,
  conversation: <Info className="h-3 w-3" />,
};

function ClassificationBadges({ classification }: { classification: TaskClassification }) {
  const badges: Array<{ key: string; label: string; icon: React.ReactNode }> = [];

  if (classification.requiresReasoning) {
    badges.push({ key: 'reasoning', label: 'Reasoning', icon: <Brain className="h-3 w-3" /> });
  }
  if (classification.requiresVision) {
    badges.push({ key: 'vision', label: 'Vision', icon: <Eye className="h-3 w-3" /> });
  }
  if (classification.requiresTools) {
    badges.push({ key: 'tools', label: 'Tools', icon: <Wrench className="h-3 w-3" /> });
  }
  if (classification.requiresCoding) {
    badges.push({ key: 'coding', label: 'Code', icon: <Code className="h-3 w-3" /> });
  }
  if (classification.requiresCreativity) {
    badges.push({ key: 'creative', label: 'Creative', icon: <Lightbulb className="h-3 w-3" /> });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {badges.map((badge) => (
        <Badge
          key={badge.key}
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-4 gap-0.5 font-normal"
        >
          {badge.icon}
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

export function RoutingIndicator({
  selection,
  isVisible = true,
  onOverride,
  onDismiss,
  availableModels,
  compact = false,
  className,
}: RoutingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (!selection || !isVisible) return null;

  const tier = tierConfig[selection.tier] || tierConfig.balanced;
  const categoryIcon = categoryIcons[selection.classification.category] || categoryIcons.general;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
                tier.color,
                className
              )}
            >
              {tier.icon}
              <span className="font-medium">{tier.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium">{selection.reason}</div>
              <div className="text-muted-foreground text-xs">
                {selection.provider}/{selection.model}
              </div>
              {selection.routingLatency && (
                <div className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selection.routingLatency}ms routing
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'bg-card border rounded-lg shadow-sm overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className={cn('p-1 rounded', tier.color)}>
              {tier.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">Auto-routed to {tier.label}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                  <ProviderIcon providerId={selection.provider} size={10} className="shrink-0" />
                  {selection.provider}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {categoryIcon}
                <span className="capitalize">{selection.classification.category}</span>
                <span className="mx-1">•</span>
                <span className="capitalize">{selection.classification.complexity}</span>
                {selection.routingLatency && (
                  <>
                    <span className="mx-1">•</span>
                    <Clock className="h-3 w-3" />
                    <span>{selection.routingLatency}ms</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t"
            >
              <div className="px-3 py-2 space-y-2">
                {/* Model Info */}
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Model: </span>
                    <span className="font-mono text-xs">{selection.model}</span>
                  </div>
                  {selection.estimatedCost && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span>${selection.estimatedCost.totalCost.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="text-xs text-muted-foreground">
                  {selection.reason}
                </div>

                {/* Classification Badges */}
                <ClassificationBadges classification={selection.classification} />

                {/* Token Estimates */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    ~{selection.classification.estimatedInputTokens} input tokens
                  </span>
                  <span>
                    ~{selection.classification.estimatedOutputTokens} output tokens
                  </span>
                </div>

                {/* Alternatives */}
                {availableModels && onOverride && (
                  <Popover open={showAlternatives} onOpenChange={setShowAlternatives}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Choose Different Model
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Available Models</h4>
                        
                        {(['fast', 'balanced', 'powerful'] as const).map((tierKey) => {
                          const models = availableModels[tierKey];
                          if (!models || models.length === 0) return null;
                          
                          const tierInfo = tierConfig[tierKey];
                          return (
                            <div key={tierKey}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={cn('p-0.5 rounded', tierInfo.color)}>
                                  {tierInfo.icon}
                                </span>
                                <span className="text-xs font-medium">{tierInfo.label}</span>
                              </div>
                              <div className="space-y-1 pl-5">
                                {models.map((m) => (
                                  <button
                                    key={`${m.provider}-${m.model}`}
                                    className={cn(
                                      'w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors flex items-center justify-between',
                                      selection.provider === m.provider && selection.model === m.model && 'bg-muted'
                                    )}
                                    onClick={() => {
                                      onOverride(m.provider, m.model);
                                      setShowAlternatives(false);
                                    }}
                                  >
                                    <span>
                                      <span className="text-muted-foreground">{m.provider}/</span>
                                      {m.model}
                                    </span>
                                    {selection.provider === m.provider && selection.model === m.model && (
                                      <Check className="h-3 w-3 text-primary" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact inline routing badge for message headers
 */
export function RoutingBadge({
  selection,
  className,
}: {
  selection: ModelSelection | null;
  className?: string;
}) {
  if (!selection) return null;

  const tier = tierConfig[selection.tier] || tierConfig.balanced;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border',
              tier.color,
              className
            )}
          >
            {tier.icon}
            <span className="font-medium">{tier.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium text-xs">
              {selection.provider}/{selection.model}
            </div>
            <div className="text-muted-foreground text-[10px]">
              {selection.reason}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default RoutingIndicator;
