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
import { TemplateSelector } from './template-selector';
import { Button } from '@/components/ui/button';
import type { ChatTemplate } from '@/types/template';
import { cn } from '@/lib/utils';
import type { ChatMode } from '@/types';
import type { AgentModeConfig } from '@/types/agent-mode';
import { AgentModeSelector } from '@/components/agent';

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
  chat: <Sparkles className="h-8 w-8 sm:h-10 sm:w-10" />,
  agent: <Bot className="h-8 w-8 sm:h-10 sm:w-10" />,
  research: <Search className="h-8 w-8 sm:h-10 sm:w-10" />,
  learning: <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10" />,
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
}: {
  suggestion: SuggestionCard;
  onClick?: () => void;
  index?: number;
  tryItLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-1 sm:gap-1.5 rounded-lg border border-border/50 bg-card/50 p-2 sm:p-2.5 text-left transition-all duration-200 hover:bg-accent hover:border-accent hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-1.5">
        <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4">
          {suggestion.icon}
        </div>
        <span className="font-semibold text-xs sm:text-sm">{suggestion.title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-tight line-clamp-1 sm:line-clamp-2">{suggestion.description}</p>
      <div className="hidden sm:flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        <span>{tryItLabel}</span>
        <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}

function FeatureBadge({ feature, index = 0 }: { feature: string; index?: number }) {
  return (
    <span 
      className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary animate-in fade-in-0 zoom-in-95"
      style={{ animationDelay: `${300 + index * 50}ms`, animationFillMode: 'backwards' }}
    >
      <Zap className="mr-0.5 h-2.5 w-2.5" />
      {feature}
    </span>
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
    <div className="flex h-full flex-col items-center justify-center px-3 py-2 sm:px-4 sm:py-3">
      <div className="w-full max-w-3xl space-y-2 sm:space-y-3">
        {/* Header with gradient background */}
        <div className={cn(
          'flex flex-col items-center space-y-1.5 sm:space-y-2 rounded-xl sm:rounded-2xl bg-linear-to-br p-3 sm:p-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500',
          modeGradients[mode]
        )}>
          <div className="text-primary animate-in zoom-in-50 duration-500" style={{ animationDelay: '100ms' }}>
            {modeIcons[mode]}
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '150ms' }}>
            {t(`modes.${mode}.title`)}
          </h1>
          <p className="max-w-lg text-center text-xs sm:text-sm text-muted-foreground leading-relaxed animate-in fade-in-0 duration-500 line-clamp-2" style={{ animationDelay: '200ms' }}>
            {t(`modes.${mode}.description`)}
          </p>
          <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
            {features.map((feature, index) => (
              <FeatureBadge key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>

        {/* Mode switcher and Template button */}
        <div className="flex justify-center items-center gap-1 flex-wrap animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '400ms' }}>
          {/* Template Selector */}
          <TemplateSelector
            trigger={
              <Button variant="outline" size="sm" className="gap-1 rounded-full hover:bg-accent transition-colors h-7 text-xs px-2">
                <LayoutTemplate className="h-3 w-3" />
                <span className="hidden sm:inline">{t('templates')}</span>
              </Button>
            }
            onSelectTemplate={(template) => {
              onSelectTemplate?.(template);
              if (template.suggestedQuestions?.[0]) {
                onSuggestionClick?.(template.suggestedQuestions[0]);
              }
            }}
          />
          <div className="h-4 w-px bg-border/50 mx-0.5" />
          {(['chat', 'agent', 'research', 'learning'] as ChatMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange?.(m)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all duration-200',
                m === mode
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted/50 hover:bg-accent hover:shadow-sm'
              )}
            >
              {m === 'chat' && <Sparkles className="h-3 w-3" />}
              {m === 'agent' && <Bot className="h-3 w-3" />}
              {m === 'research' && <Search className="h-3 w-3" />}
              {m === 'learning' && <GraduationCap className="h-3 w-3" />}
              <span className="capitalize hidden sm:inline">{m === 'chat' ? tChat('modeChat') : m === 'agent' ? tChat('modeAgent') : m === 'research' ? tChat('modeResearch') : tChat('modeLearning')}</span>
            </button>
          ))}
        </div>

        {/* Agent Mode Selector - only shown in agent mode */}
        {mode === 'agent' && onAgentModeChange && (
          <div className="flex justify-center animate-in fade-in-0 duration-500" style={{ animationDelay: '425ms' }}>
            <AgentModeSelector
              selectedModeId={agentModeId}
              onModeChange={onAgentModeChange}
            />
          </div>
        )}

        {/* Quick Access - Designer & Projects */}
        <div className="animate-in fade-in-0 duration-500" style={{ animationDelay: '450ms' }}>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <Link href="/designer" className="group">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2 sm:p-2.5 transition-all duration-200 hover:bg-accent hover:border-purple-500/30 hover:shadow-md">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-500 transition-colors group-hover:bg-purple-500 group-hover:text-white">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs sm:text-sm">{t('designer')}</h3>
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">{t('designerDesc')}</p>
                </div>
              </div>
            </Link>
            <Link href="/projects" className="group">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2 sm:p-2.5 transition-all duration-200 hover:bg-accent hover:border-blue-500/30 hover:shadow-md">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs sm:text-sm">{t('projects')}</h3>
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">{t('projectsDesc')}</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Suggestions grid */}
        <div className="animate-in fade-in-0 duration-500" style={{ animationDelay: '550ms' }}>
          <h2 className="mb-1.5 sm:mb-2 text-center text-xs font-medium text-muted-foreground">
            {t('tryPrompts')}
          </h2>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {suggestions.map((suggestion, index) => (
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
