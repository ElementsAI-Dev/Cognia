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
  Image,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMode } from '@/types';

interface WelcomeStateProps {
  mode: ChatMode;
  onSuggestionClick?: (suggestion: string) => void;
  onModeChange?: (mode: ChatMode) => void;
}

interface SuggestionCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

const chatSuggestions: SuggestionCard[] = [
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'Conversation',
    description: 'Have a natural conversation',
    prompt: 'Let\'s have a conversation about something interesting.',
  },
  {
    icon: <Code className="h-5 w-5" />,
    title: 'Code Help',
    description: 'Get programming assistance',
    prompt: 'Help me write a function that...',
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: 'Writing',
    description: 'Draft emails, articles, or content',
    prompt: 'Help me write a professional email about...',
  },
  {
    icon: <Languages className="h-5 w-5" />,
    title: 'Translation',
    description: 'Translate text between languages',
    prompt: 'Translate the following text to...',
  },
];

const agentSuggestions: SuggestionCard[] = [
  {
    icon: <Wrench className="h-5 w-5" />,
    title: 'Build Project',
    description: 'Create a complete application',
    prompt: 'Build a React component that...',
  },
  {
    icon: <Database className="h-5 w-5" />,
    title: 'Data Analysis',
    description: 'Analyze and transform data',
    prompt: 'Analyze this dataset and provide insights...',
  },
  {
    icon: <Image className="h-5 w-5" aria-hidden="true" />,
    title: 'Image Tasks',
    description: 'Process and analyze images',
    prompt: 'Analyze this image and describe...',
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: 'Complex Task',
    description: 'Multi-step problem solving',
    prompt: 'Help me solve this complex problem step by step...',
  },
];

const researchSuggestions: SuggestionCard[] = [
  {
    icon: <Globe className="h-5 w-5" />,
    title: 'Web Research',
    description: 'Search and summarize web content',
    prompt: 'Research the latest developments in...',
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Market Analysis',
    description: 'Analyze market trends and data',
    prompt: 'Analyze the current market trends for...',
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: 'Literature Review',
    description: 'Summarize academic papers',
    prompt: 'Summarize the key findings about...',
  },
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: 'Fact Check',
    description: 'Verify claims and find sources',
    prompt: 'Fact check the following claim...',
  },
];

const modeConfig: Record<ChatMode, {
  icon: React.ReactNode;
  title: string;
  description: string;
  suggestions: SuggestionCard[];
  gradient: string;
  features: string[];
}> = {
  chat: {
    icon: <Sparkles className="h-12 w-12" />,
    title: 'Chat Mode',
    description: 'Have natural conversations with AI. Perfect for quick questions, brainstorming, and everyday assistance.',
    suggestions: chatSuggestions,
    gradient: 'from-blue-500/10 to-purple-500/10',
    features: ['Fast responses', 'Multiple languages', 'Context aware', 'Creative writing'],
  },
  agent: {
    icon: <Bot className="h-12 w-12" />,
    title: 'Agent Mode',
    description: 'AI agent with tool access for complex tasks. Execute code, analyze data, and build applications.',
    suggestions: agentSuggestions,
    gradient: 'from-green-500/10 to-emerald-500/10',
    features: ['Code execution', 'File operations', 'Data analysis', 'Multi-step tasks'],
  },
  research: {
    icon: <Search className="h-12 w-12" />,
    title: 'Research Mode',
    description: 'Deep web research with source citations. Search, analyze, and synthesize information from the web.',
    suggestions: researchSuggestions,
    gradient: 'from-orange-500/10 to-amber-500/10',
    features: ['Web search', 'Source citations', 'Fact checking', 'Report generation'],
  },
};

function SuggestionCardComponent({
  suggestion,
  onClick,
}: {
  suggestion: SuggestionCard;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left transition-all hover:bg-accent hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-primary">
        {suggestion.icon}
        <span className="font-medium">{suggestion.title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
    </button>
  );
}

function FeatureBadge({ feature }: { feature: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <Zap className="mr-1 h-3 w-3" />
      {feature}
    </span>
  );
}

export function WelcomeState({ mode, onSuggestionClick, onModeChange }: WelcomeStateProps) {
  const config = modeConfig[mode];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header with gradient background */}
        <div className={cn(
          'flex flex-col items-center space-y-4 rounded-2xl bg-gradient-to-br p-8',
          config.gradient
        )}>
          <div className="text-primary">
            {config.icon}
          </div>
          <h1 className="text-2xl font-bold">{config.title}</h1>
          <p className="max-w-lg text-center text-muted-foreground">
            {config.description}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {config.features.map((feature) => (
              <FeatureBadge key={feature} feature={feature} />
            ))}
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex justify-center gap-2">
          {(Object.keys(modeConfig) as ChatMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange?.(m)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                m === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              )}
            >
              {m === 'chat' && <Sparkles className="h-4 w-4" />}
              {m === 'agent' && <Bot className="h-4 w-4" />}
              {m === 'research' && <Search className="h-4 w-4" />}
              <span className="capitalize">{m}</span>
            </button>
          ))}
        </div>

        {/* Suggestions grid */}
        <div>
          <h2 className="mb-4 text-center text-sm font-medium text-muted-foreground">
            Try these prompts to get started
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {config.suggestions.map((suggestion, index) => (
              <SuggestionCardComponent
                key={index}
                suggestion={suggestion}
                onClick={() => onSuggestionClick?.(suggestion.prompt)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeState;
