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

interface WelcomeStateProps {
  mode: ChatMode;
  onSuggestionClick?: (suggestion: string) => void;
  onModeChange?: (mode: ChatMode) => void;
  onSelectTemplate?: (template: ChatTemplate) => void;
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
  chat: <Sparkles className="h-12 w-12" />,
  agent: <Bot className="h-12 w-12" />,
  research: <Search className="h-12 w-12" />,
  learning: <GraduationCap className="h-12 w-12" />,
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
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border/50 bg-card/50 p-5 text-left transition-all duration-200 hover:bg-accent hover:border-accent hover:shadow-lg hover:-translate-y-0.5 animate-in fade-in-0 slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {suggestion.icon}
        </div>
        <span className="font-semibold">{suggestion.title}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{suggestion.description}</p>
      <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        <span>{tryItLabel}</span>
        <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}

function FeatureBadge({ feature, index = 0 }: { feature: string; index?: number }) {
  return (
    <span 
      className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary animate-in fade-in-0 zoom-in-95"
      style={{ animationDelay: `${300 + index * 50}ms`, animationFillMode: 'backwards' }}
    >
      <Zap className="mr-1.5 h-3 w-3" />
      {feature}
    </span>
  );
}

export function WelcomeState({ mode, onSuggestionClick, onModeChange, onSelectTemplate }: WelcomeStateProps) {
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
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header with gradient background */}
        <div className={cn(
          'flex flex-col items-center space-y-5 rounded-3xl bg-linear-to-br p-10 animate-in fade-in-0 slide-in-from-bottom-4 duration-500',
          modeGradients[mode]
        )}>
          <div className="text-primary animate-in zoom-in-50 duration-500" style={{ animationDelay: '100ms' }}>
            {modeIcons[mode]}
          </div>
          <h1 className="text-3xl font-bold tracking-tight animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '150ms' }}>
            {t(`modes.${mode}.title`)}
          </h1>
          <p className="max-w-lg text-center text-muted-foreground leading-relaxed animate-in fade-in-0 duration-500" style={{ animationDelay: '200ms' }}>
            {t(`modes.${mode}.description`)}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {features.map((feature, index) => (
              <FeatureBadge key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>

        {/* Mode switcher and Template button */}
        <div className="flex justify-center items-center gap-2 flex-wrap animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '400ms' }}>
          {/* Template Selector */}
          <TemplateSelector
            trigger={
              <Button variant="outline" size="sm" className="gap-2 rounded-full hover:bg-accent transition-colors">
                <LayoutTemplate className="h-4 w-4" />
                <span>{t('templates')}</span>
              </Button>
            }
            onSelectTemplate={(template) => {
              onSelectTemplate?.(template);
              if (template.suggestedQuestions?.[0]) {
                onSuggestionClick?.(template.suggestedQuestions[0]);
              }
            }}
          />
          <div className="h-6 w-px bg-border/50 mx-2" />
          {(['chat', 'agent', 'research', 'learning'] as ChatMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange?.(m)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                m === mode
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted/50 hover:bg-accent hover:shadow-sm'
              )}
            >
              {m === 'chat' && <Sparkles className="h-4 w-4" />}
              {m === 'agent' && <Bot className="h-4 w-4" />}
              {m === 'research' && <Search className="h-4 w-4" />}
              {m === 'learning' && <GraduationCap className="h-4 w-4" />}
              <span className="capitalize">{m === 'chat' ? tChat('modeChat') : m === 'agent' ? tChat('modeAgent') : m === 'research' ? tChat('modeResearch') : tChat('modeLearning')}</span>
            </button>
          ))}
        </div>

        {/* Quick Access - Designer & Projects */}
        <div className="animate-in fade-in-0 duration-500" style={{ animationDelay: '450ms' }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/designer" className="group">
              <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all duration-200 hover:bg-accent hover:border-purple-500/30 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition-colors group-hover:bg-purple-500 group-hover:text-white">
                  <Wand2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t('designer')}</h3>
                  <p className="text-sm text-muted-foreground">{t('designerDesc')}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
            <Link href="/projects" className="group">
              <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all duration-200 hover:bg-accent hover:border-blue-500/30 hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t('projects')}</h3>
                  <p className="text-sm text-muted-foreground">{t('projectsDesc')}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        </div>

        {/* Suggestions grid */}
        <div className="animate-in fade-in-0 duration-500" style={{ animationDelay: '550ms' }}>
          <h2 className="mb-5 text-center text-sm font-medium text-muted-foreground">
            {t('tryPrompts')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
