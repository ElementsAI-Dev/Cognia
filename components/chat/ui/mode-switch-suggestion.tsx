'use client';

/**
 * Mode Switch Suggestion Component
 * 
 * Displays a suggestion to switch to a different chat mode when
 * learning or research intent is detected in the user's message.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Search, 
  Bot, 
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMode } from '@/types/core/session';
import type { IntentDetectionResult } from '@/lib/ai/tools/intent-detection';
import { cn } from '@/lib/utils';

interface ModeSwitchSuggestionProps {
  result: IntentDetectionResult;
  currentMode: ChatMode;
  onAccept: (mode: ChatMode) => void;
  onDismiss: () => void;
  onKeepCurrent: () => void;
  className?: string;
}

const MODE_ICONS: Record<ChatMode, typeof GraduationCap> = {
  chat: Sparkles,
  learning: GraduationCap,
  research: Search,
  agent: Bot,
};

const MODE_COLORS: Record<ChatMode, string> = {
  chat: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  learning: 'from-green-500/20 to-emerald-600/20 border-green-500/30',
  research: 'from-purple-500/20 to-violet-600/20 border-purple-500/30',
  agent: 'from-orange-500/20 to-amber-600/20 border-orange-500/30',
};

const MODE_NAMES: Record<ChatMode, { zh: string; en: string }> = {
  chat: { zh: '聊天模式', en: 'Chat Mode' },
  learning: { zh: '学习模式', en: 'Learning Mode' },
  research: { zh: '研究模式', en: 'Research Mode' },
  agent: { zh: 'Agent模式', en: 'Agent Mode' },
};

const MODE_FEATURES: Record<ChatMode, string[]> = {
  chat: ['快速问答', '自由对话'],
  learning: ['交互式教学', '闪卡复习', '测验练习', '概念解释'],
  research: ['论文搜索', '文献分析', '引用管理', '研究总结'],
  agent: ['工具调用', '任务自动化', '多步骤执行'],
};

export function ModeSwitchSuggestion({
  result,
  currentMode,
  onAccept,
  onDismiss,
  onKeepCurrent,
  className,
}: ModeSwitchSuggestionProps) {
  const [isVisible, setIsVisible] = useState(true);

  const suggestedMode = result.suggestedMode;

  const handleAccept = useCallback(() => {
    if (!suggestedMode) return;
    setIsVisible(false);
    setTimeout(() => onAccept(suggestedMode), 200);
  }, [onAccept, suggestedMode]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 200);
  }, [onDismiss]);

  const handleKeepCurrent = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onKeepCurrent(), 200);
  }, [onKeepCurrent]);

  // Early return after all hooks
  if (!suggestedMode || suggestedMode === currentMode) return null;

  const SuggestedIcon = MODE_ICONS[suggestedMode];
  const suggestedName = MODE_NAMES[suggestedMode];
  const suggestedFeatures = MODE_FEATURES[suggestedMode];
  const colorClass = MODE_COLORS[suggestedMode];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'relative overflow-hidden rounded-xl border bg-gradient-to-br p-4',
            colorClass,
            className
          )}
        >
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-background/50 hover:text-foreground transition-colors"
            aria-label="关闭建议"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 rounded-lg bg-background/50 p-2">
              <SuggestedIcon className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                建议切换到{suggestedName.zh}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {result.reason}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {suggestedFeatures.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center rounded-full bg-background/50 px-2 py-0.5 text-xs"
              >
                {feature}
              </span>
            ))}
          </div>

          {/* Matched keywords (if any) */}
          {result.matchedKeywords.length > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              检测到关键词：{result.matchedKeywords.slice(0, 3).join('、')}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 gap-1.5"
            >
              切换到{suggestedName.zh}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleKeepCurrent}
              className="flex-shrink-0"
            >
              保持当前模式
            </Button>
          </div>

          {/* Confidence indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>置信度：</span>
            <div className="flex-1 h-1.5 bg-background/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.confidence * 100}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-full bg-foreground/30 rounded-full"
              />
            </div>
            <span>{Math.round(result.confidence * 100)}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline mode suggestion (smaller, less intrusive)
 */
export function InlineModeSuggestion({
  suggestedMode,
  onAccept,
  onDismiss,
}: {
  suggestedMode: ChatMode;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const SuggestedIcon = MODE_ICONS[suggestedMode];
  const modeName = MODE_NAMES[suggestedMode];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm"
    >
      <SuggestedIcon className="h-4 w-4" />
      <span>切换到{modeName.zh}？</span>
      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onAccept}>
        是
      </Button>
      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onDismiss}>
        否
      </Button>
    </motion.div>
  );
}

export default ModeSwitchSuggestion;
