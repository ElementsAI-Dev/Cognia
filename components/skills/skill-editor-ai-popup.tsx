'use client';

/**
 * Skill Editor AI Command Palette Popup
 *
 * Floating AI optimization popup that appears when text is selected in the editor.
 * Provides quick actions, rewrite styles, and custom instructions.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  X,
  Loader2,
  Pencil,
  RefreshCw,
  FileEdit,
  Eraser,
  Languages,
  FileText as SummarizeIcon,
  Briefcase,
  MessageCircle,
  Cpu,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export type OptimizeMode = 'improve' | 'simplify' | 'expand' | 'fix' | 'translate' | 'summarize' | 'formal' | 'casual' | 'technical' | 'custom';

interface SkillEditorAIPopupProps {
  position: { top: number; left: number };
  isOptimizing: boolean;
  optimizedText: string;
  optimizeMode: OptimizeMode | null;
  onOptimize: (mode: OptimizeMode, customInstruction?: string) => void;
  onApply: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export function SkillEditorAIPopup({
  position,
  isOptimizing,
  optimizedText,
  optimizeMode,
  onOptimize,
  onApply,
  onRetry,
  onClose,
}: SkillEditorAIPopupProps) {
  const t = useTranslations('skills');
  const [customPrompt, setCustomPrompt] = useState('');

  return (
    <div
      className="ai-popup absolute z-50 bg-popover/95 backdrop-blur-sm border rounded-xl shadow-2xl overflow-hidden min-w-[320px] max-w-[380px] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">{t('aiOptimize')}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!optimizeMode && !isOptimizing && (
        <div className="p-3 space-y-3">
          {/* Quick Actions */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">{t('quickActions')}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'improve', icon: Pencil, labelKey: 'aiImprove' },
                { id: 'simplify', icon: Eraser, labelKey: 'aiSimplify' },
                { id: 'expand', icon: FileEdit, labelKey: 'aiExpand' },
                { id: 'fix', icon: RefreshCw, labelKey: 'aiFixGrammar' },
                { id: 'summarize', icon: SummarizeIcon, labelKey: 'aiSummarize' },
                { id: 'translate', icon: Languages, labelKey: 'aiTranslate' },
              ].map(({ id, icon: Icon, labelKey }) => (
                <Button
                  key={id}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-9 text-xs hover:bg-primary/5 hover:text-primary"
                  onClick={() => onOptimize(id as OptimizeMode)}
                >
                  <Icon className="h-3.5 w-3.5 mr-2" />
                  {t(labelKey)}
                </Button>
              ))}
            </div>
          </div>

          {/* Rewrite Style */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">{t('rewriteStyle')}</div>
            <div className="flex gap-1.5">
              {[
                { id: 'formal', icon: Briefcase, labelKey: 'styleFormal' },
                { id: 'casual', icon: MessageCircle, labelKey: 'styleCasual' },
                { id: 'technical', icon: Cpu, labelKey: 'styleTechnical' },
              ].map(({ id, icon: Icon, labelKey }) => (
                <Button
                  key={id}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => onOptimize(id as OptimizeMode)}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {t(labelKey)}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">{t('customInstruction')}</div>
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (customPrompt.trim()) {
                  onOptimize('custom', customPrompt);
                }
              }}
            >
              <Input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t('customInstructionPlaceholder')}
                className="h-8 text-xs flex-1"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3"
                disabled={!customPrompt.trim()}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {isOptimizing && (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
          </div>
          <span className="text-sm text-muted-foreground mt-3">{t('optimizingText')}</span>
        </div>
      )}

      {optimizedText && !isOptimizing && (
        <div className="p-3 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">{t('result')}</div>
            <ScrollArea className="h-[120px] rounded-lg border bg-muted/30 p-2">
              <p className="text-sm whitespace-pre-wrap">{optimizedText}</p>
            </ScrollArea>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-9" onClick={onApply}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {t('apply')}
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {t('retry')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
