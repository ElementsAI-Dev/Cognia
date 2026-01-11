'use client';

/**
 * WelcomeState - mode-specific welcome pages for Chat, Agent, and Research modes
 */

import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Bot,
  Search,
  MessageSquare,
  Code,
  FileText,
  Globe,
  Zap,
  Brain,
  Wrench,
  BookOpen,
  TrendingUp,
  Lightbulb,
  Database,
  ImageIcon,
  Languages,
  LayoutTemplate,
  ArrowRight,
  Wand2,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { TemplateSelector } from './selectors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ChatTemplate } from '@/types/content/template';
import { cn } from '@/lib/utils';
import type { ChatMode } from '@/types';
import type { AgentModeConfig } from '@/types/agent/agent-mode';
import { AgentModeSelector } from '@/components/agent';
import { WelcomeA2UIDemo } from './welcome-a2ui-demo';

interface WelcomeStateProps {
  mode: ChatMode;
  onSuggestionClick?: (suggestion: string) => void;
  onModeChange?: (mode: ChatMode) => void;
  onSelectTemplate?: (template: ChatTemplate) => void;
  /** Current agent sub-mode ID (when mode is 'agent') */
  agentModeId?: string;
  /** Callback when agent sub-mode changes */
  onAgentModeChange?: (agentMode: AgentModeConfig) => void;
}

interface SuggestionCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

interface SuggestionKey {
  icon: React.ReactNode;
  key: string;
}

const chatSuggestionKeys: SuggestionKey[] = [
  { icon: <MessageSquare className="h-5 w-5" />, key: 'conversation' },
  { icon: <Code className="h-5 w-5" />, key: 'codeHelp' },
  { icon: <FileText className="h-5 w-5" />, key: 'writing' },
  { icon: <Languages className="h-5 w-5" />, key: 'translation' },
];

const agentSuggestionKeys: SuggestionKey[] = [
  { icon: <Wrench className="h-5 w-5" />, key: 'buildProject' },
  { icon: <Database className="h-5 w-5" />, key: 'dataAnalysis' },
  { icon: <ImageIcon className="h-5 w-5" aria-hidden="true" />, key: 'imageTasks' },
  { icon: <Brain className="h-5 w-5" />, key: 'complexTask' },
];

const researchSuggestionKeys: SuggestionKey[] = [
  { icon: <Globe className="h-5 w-5" />, key: 'webResearch' },
  { icon: <TrendingUp className="h-5 w-5" />, key: 'marketAnalysis' },
  { icon: <BookOpen className="h-5 w-5" />, key: 'literatureReview' },
  { icon: <Lightbulb className="h-5 w-5" />, key: 'factCheck' },
];

const learningSuggestionKeys: SuggestionKey[] = [
  { icon: <HelpCircle className="h-5 w-5" />, key: 'conceptExplore' },
  { icon: <Target className="h-5 w-5" />, key: 'problemSolving' },
  { icon: <Brain className="h-5 w-5" />, key: 'deepUnderstanding' },
  { icon: <BookOpen className="h-5 w-5" />, key: 'skillMastery' },
];

const featureKeys: Record<ChatMode, string[]> = {
  chat: ['fast', 'languages', 'context', 'creative'],
  agent: ['code', 'file', 'data', 'multi'],
  research: ['search', 'citations', 'factCheck', 'report'],
  learning: ['socratic', 'stepByStep', 'noDirectAnswers', 'discovery'],
};

const suggestionKeyMap: Record<ChatMode, SuggestionKey[]> = {
  chat: chatSuggestionKeys,
  agent: agentSuggestionKeys,
  research: researchSuggestionKeys,
  learning: learningSuggestionKeys,
};

const modeIcons: Record<ChatMode, React.ReactNode> = {
  chat: <Sparkles />,
  agent: <Bot />,
  research: <Search />,
  learning: <GraduationCap />,
};

const modeGradients: Record<ChatMode, string> = {
  chat: 'from-blue-500/10 to-purple-500/10',
  agent: 'from-green-500/10 to-emerald-500/10',
  research: 'from-orange-500/10 to-amber-500/10',
  learning: 'from-violet-500/10 to-pink-500/10',
};

function SuggestionCardComponent({
  suggestion,
  onClick,
  index = 0,
  tryItLabel,
  compact = false,
}: {
  suggestion: SuggestionCard;
  onClick?: () => void;
  index?: number;
  tryItLabel: string;
  compact?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "group h-auto flex flex-col items-start text-left transition-all duration-200 hover:bg-accent hover:border-accent hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm",
        compact ? "gap-1 p-2.5" : "gap-0.5 sm:gap-1.5 p-2 sm:p-3"
      )}
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className={cn(
          "flex items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground",
          compact ? "h-7 w-7 [&>svg]:h-3.5 [&>svg]:w-3.5" : "h-6 w-6 sm:h-8 sm:w-8 [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4"
        )}>
          {suggestion.icon}
        </div>
        <span className={cn(
          "font-semibold",
          compact ? "text-xs" : "text-xs sm:text-sm"
        )}>{suggestion.title}</span>
      </div>
      <p className={cn(
        "text-muted-foreground leading-snug",
        compact ? "text-[11px] line-clamp-2" : "text-[11px] sm:text-xs line-clamp-2"
      )}>{suggestion.description}</p>
      <div className="hidden sm:flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
        <span>{tryItLabel}</span>
        <ArrowRight className="h-3 w-3" />
      </div>
    </Button>
  );
}

function FeatureBadge({ feature, index = 0 }: { feature: string; index?: number }) {
  return (
    <Badge
      variant="secondary"
      className="animate-in fade-in-0 zoom-in-95"
      style={{ animationDelay: `${300 + index * 50}ms`, animationFillMode: 'backwards' }}
    >
      <Zap className="mr-0.5 h-2.5 w-2.5" />
      {feature}
    </Badge>
  );
}

export function WelcomeState({
  mode,
  onSuggestionClick,
  onModeChange,
  onSelectTemplate,
  agentModeId = 'general',
  onAgentModeChange,
}: WelcomeStateProps) {
  const t = useTranslations('welcome');
  const tChat = useTranslations('chat');
  
  const features = featureKeys[mode].map(key => t(`modes.${mode}.features.${key}`));
  const suggestions: SuggestionCard[] = suggestionKeyMap[mode].map(({ icon, key }) => ({
    icon,
    title: t(`suggestions.${mode}.${key}.title`),
    description: t(`suggestions.${mode}.${key}.description`),
    prompt: t(`suggestions.${mode}.${key}.prompt`),
  }));

  return (
    <div className="flex h-full flex-col items-center justify-center px-3 py-2 sm:px-4 sm:py-3 overflow-y-auto">
      <div className="w-full max-w-3xl space-y-3 sm:space-y-4">
        {/* Header with gradient background - optimized for all screens */}
        <div className={cn(
          'flex flex-col items-center rounded-xl sm:rounded-2xl bg-linear-to-br p-3 sm:p-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500',
          modeGradients[mode]
        )}>
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <div className="text-primary [&>svg]:h-7 [&>svg]:w-7 sm:[&>svg]:h-10 sm:[&>svg]:w-10">
              {modeIcons[mode]}
            </div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-center">
              {t(`modes.${mode}.title`)}
            </h1>
          </div>
          <p className="max-w-lg text-center text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5 sm:mt-2 line-clamp-2 sm:line-clamp-none">
            {t(`modes.${mode}.description`)}
          </p>
          <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 mt-2">
            {features.slice(0, 3).map((feature, index) => (
              <FeatureBadge key={index} feature={feature} index={index} />
            ))}
            <span className="hidden sm:contents">
              {features.slice(3).map((feature, index) => (
                <FeatureBadge key={index + 3} feature={feature} index={index + 3} />
              ))}
            </span>
          </div>
        </div>

        {/* Mode switcher and Template button */}
        <div className="flex justify-center items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Template Selector */}
          <TemplateSelector
            trigger={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-full hover:bg-accent transition-colors h-7 sm:h-8 text-xs px-2.5 sm:px-3">
                    <LayoutTemplate className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden xs:inline">{t('templates')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('templates')}</p>
                </TooltipContent>
              </Tooltip>
            }
            onSelectTemplate={(template) => {
              onSelectTemplate?.(template);
              if (template.suggestedQuestions?.[0]) {
                onSuggestionClick?.(template.suggestedQuestions[0]);
              }
            }}
          />
          <div className="h-4 w-px bg-border/50" />
          <Tabs 
            value={mode} 
            onValueChange={(value) => onModeChange?.(value as ChatMode)}
            className="flex justify-center"
          >
            <TabsList className="gap-0.5 h-8 sm:h-9">
              {(['chat', 'agent', 'research', 'learning'] as ChatMode[]).map((m) => (
                <Tooltip key={m}>
                  <TooltipTrigger asChild>
                    <TabsTrigger 
                      value={m} 
                      className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      {m === 'chat' && <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      {m === 'agent' && <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      {m === 'research' && <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      {m === 'learning' && <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      <span className="capitalize hidden sm:inline">{m === 'chat' ? tChat('modeChat') : m === 'agent' ? tChat('modeAgent') : m === 'research' ? tChat('modeResearch') : tChat('modeLearning')}</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="capitalize">{m === 'chat' ? tChat('modeChat') : m === 'agent' ? tChat('modeAgent') : m === 'research' ? tChat('modeResearch') : tChat('modeLearning')}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Agent Mode Selector - shown in agent mode on all screens */}
        {mode === 'agent' && onAgentModeChange && (
          <div className="flex justify-center">
            <AgentModeSelector
              selectedModeId={agentModeId}
              onModeChange={onAgentModeChange}
            />
          </div>
        )}

        {/* Quick Access - Designer & Projects - visible on all screens */}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="ghost" className="h-auto p-0">
            <Link href="/designer" className="group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-200 hover:bg-accent hover:border-purple-500/30 hover:shadow-md">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 transition-colors group-hover:bg-purple-500 group-hover:text-white">
                <Wand2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm">{t('designer')}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('designerDesc')}</p>
              </div>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-auto p-0">
            <Link href="/projects" className="group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-200 hover:bg-accent hover:border-blue-500/30 hover:shadow-md">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm">{t('projects')}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('projectsDesc')}</p>
              </div>
            </Link>
          </Button>
        </div>

        {/* A2UI Interactive Demo - Desktop only */}
        <div className="hidden sm:block">
          <WelcomeA2UIDemo
            onSuggestionClick={onSuggestionClick}
            showSettings={false}
            className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          />
        </div>

        {/* Suggestions - responsive grid on all screens */}
        <div>
          <h2 className="mb-1.5 sm:mb-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
            {t('tryPrompts')}
          </h2>
          {/* Mobile: compact 2-column cards */}
          <div className="grid grid-cols-2 gap-1.5 sm:hidden">
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <SuggestionCardComponent
                key={index}
                suggestion={suggestion}
                index={index}
                onClick={() => onSuggestionClick?.(suggestion.prompt)}
                tryItLabel={t('tryIt')}
                compact
              />
            ))}
          </div>
          {/* Desktop: full cards */}
          <div className="hidden sm:grid grid-cols-2 gap-2">
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <SuggestionCardComponent
                key={index}
                suggestion={suggestion}
                index={index}
                onClick={() => onSuggestionClick?.(suggestion.prompt)}
                tryItLabel={t('tryIt')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeState;
