'use client';

/**
 * AISuggestionsPanel - Floating panel showing AI-generated suggestions
 * Can be triggered from the toolbar or element context menu
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  Sparkles,
  X,
  Lightbulb,
  Accessibility,
  Palette,
  Layout,
  Smartphone,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import {
  getAIStyleSuggestions,
  getAIAccessibilitySuggestions,
  getDesignerAIConfig,
  executeDesignerAIEdit,
  type AISuggestion,
} from '@/lib/designer';

interface AISuggestionsPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  className?: string;
  onClose?: () => void;
}

type SuggestionTab = 'style' | 'accessibility' | 'responsive' | 'layout';

const TAB_CONFIG: Record<SuggestionTab, { icon: React.ReactNode; label: string }> = {
  style: { icon: <Palette className="h-4 w-4" />, label: 'Style' },
  accessibility: { icon: <Accessibility className="h-4 w-4" />, label: 'A11y' },
  responsive: { icon: <Smartphone className="h-4 w-4" />, label: 'Responsive' },
  layout: { icon: <Layout className="h-4 w-4" />, label: 'Layout' },
};

const PRIORITY_CONFIG = {
  high: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950' },
  medium: { icon: <Info className="h-3.5 w-3.5" />, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  low: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' },
};

export function AISuggestionsPanel({
  code,
  onCodeChange,
  className,
  onClose,
}: AISuggestionsPanelProps) {
  const t = useTranslations('designer');
  const [activeTab, setActiveTab] = useState<SuggestionTab>('style');
  const [suggestions, setSuggestions] = useState<Record<SuggestionTab, AISuggestion[]>>({
    style: [],
    accessibility: [],
    responsive: [],
    layout: [],
  });
  const [loading, setLoading] = useState<Record<SuggestionTab, boolean>>({
    style: false,
    accessibility: false,
    responsive: false,
    layout: false,
  });
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings for AI
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  const getConfig = useCallback(() => {
    return getDesignerAIConfig(defaultProvider, providerSettings);
  }, [defaultProvider, providerSettings]);

  // Fetch suggestions for a tab
  const fetchSuggestions = useCallback(async (tab: SuggestionTab) => {
    setLoading((prev) => ({ ...prev, [tab]: true }));
    setError(null);

    try {
      const config = getConfig();
      let result;

      switch (tab) {
        case 'style':
          result = await getAIStyleSuggestions(code, config);
          break;
        case 'accessibility':
          result = await getAIAccessibilitySuggestions(code, config);
          break;
        case 'responsive':
          // Use style suggestions with responsive focus
          result = await getAIStyleSuggestions(code, config);
          if (result.suggestions) {
            result.suggestions = result.suggestions.filter(
              (s) => s.description.toLowerCase().includes('responsive') ||
                     s.description.toLowerCase().includes('mobile') ||
                     s.description.toLowerCase().includes('breakpoint')
            );
          }
          break;
        case 'layout':
          // Use style suggestions with layout focus
          result = await getAIStyleSuggestions(code, config);
          if (result.suggestions) {
            result.suggestions = result.suggestions.filter(
              (s) => s.description.toLowerCase().includes('layout') ||
                     s.description.toLowerCase().includes('flex') ||
                     s.description.toLowerCase().includes('grid') ||
                     s.description.toLowerCase().includes('spacing')
            );
          }
          break;
      }

      if (result.success && result.suggestions) {
        setSuggestions((prev) => ({
          ...prev,
          [tab]: result.suggestions || [],
        }));
      } else {
        setError(result.error || 'Failed to fetch suggestions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [code, getConfig]);

  // Apply a suggestion
  const applySuggestion = useCallback(async (suggestion: AISuggestion) => {
    setApplying(suggestion.id);
    setError(null);

    try {
      const config = getConfig();
      const prompt = `Apply this improvement: ${suggestion.title}. ${suggestion.description}${
        suggestion.code ? ` Suggested code: ${suggestion.code}` : ''
      }`;

      const result = await executeDesignerAIEdit(prompt, code, config);

      if (result.success && result.code) {
        onCodeChange(result.code);
        // Remove applied suggestion from list
        setSuggestions((prev) => ({
          ...prev,
          [activeTab]: prev[activeTab].filter((s) => s.id !== suggestion.id),
        }));
      } else {
        setError(result.error || 'Failed to apply suggestion');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setApplying(null);
    }
  }, [code, getConfig, onCodeChange, activeTab]);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    const newTab = tab as SuggestionTab;
    setActiveTab(newTab);
    
    // Auto-fetch if no suggestions yet
    if (suggestions[newTab].length === 0 && !loading[newTab]) {
      fetchSuggestions(newTab);
    }
  }, [suggestions, loading, fetchSuggestions]);

  const isLoading = loading[activeTab];

  return (
    <TooltipProvider>
      <div className={cn(
        'flex flex-col bg-background border rounded-lg shadow-lg overflow-hidden',
        'w-[360px] max-h-[500px]',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{t('aiSuggestions') || 'AI Suggestions'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => fetchSuggestions(activeTab)}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('refresh') || 'Refresh'}</TooltipContent>
            </Tooltip>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-4 mx-2 mt-2">
            {(Object.entries(TAB_CONFIG) as [SuggestionTab, typeof TAB_CONFIG[SuggestionTab]][]).map(
              ([key, config]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {config.icon}
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              )
            )}
          </TabsList>

          {/* Content */}
          {(Object.keys(TAB_CONFIG) as SuggestionTab[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="flex-1 m-0 mt-2 min-h-0">
              <ScrollArea className="h-[350px]">
                {loading[tab] ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {t('analyzing') || 'Analyzing your code...'}
                    </p>
                  </div>
                ) : suggestions[tab].length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium">
                      {t('noSuggestionsYet') || 'No suggestions yet'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('clickRefresh') || 'Click refresh to analyze your code'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => fetchSuggestions(tab)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('analyze') || 'Analyze'}
                    </Button>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {suggestions[tab].map((suggestion) => {
                      const priorityConfig = PRIORITY_CONFIG[suggestion.priority];
                      const isApplying = applying === suggestion.id;

                      return (
                        <div
                          key={suggestion.id}
                          className={cn(
                            'p-3 rounded-lg border transition-colors',
                            priorityConfig.bg,
                            'hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div className={cn('mt-0.5', priorityConfig.color)}>
                              {priorityConfig.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {suggestion.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn('text-[10px] px-1.5 py-0', priorityConfig.color)}
                                >
                                  {suggestion.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {suggestion.description}
                              </p>
                              {suggestion.code && (
                                <code className="block text-[10px] bg-muted/50 rounded px-2 py-1 mt-2 font-mono overflow-x-auto">
                                  {suggestion.code}
                                </code>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs gap-1"
                              onClick={() => applySuggestion(suggestion)}
                              disabled={isApplying}
                            >
                              {isApplying ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Zap className="h-3 w-3" />
                                  {t('apply') || 'Apply'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        {/* Error */}
        {error && (
          <div className="border-t px-3 py-2 bg-destructive/10">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default AISuggestionsPanel;
