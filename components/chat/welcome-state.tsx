'use client';

/**
 * WelcomeState - mode-specific welcome pages for Chat, Agent, and Research modes
 */

// Note: useTranslations can be used for i18n in the future
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
    icon: <ImageIcon className="h-5 w-5" aria-hidden="true" />,
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
  index = 0,
}: {
  suggestion: SuggestionCard;
  onClick?: () => void;
  index?: number;
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
        <span>Try it</span>
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
  const config = modeConfig[mode];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header with gradient background */}
        <div className={cn(
          'flex flex-col items-center space-y-5 rounded-3xl bg-linear-to-br p-10 animate-in fade-in-0 slide-in-from-bottom-4 duration-500',
          config.gradient
        )}>
          <div className="text-primary animate-in zoom-in-50 duration-500" style={{ animationDelay: '100ms' }}>
            {config.icon}
          </div>
          <h1 className="text-3xl font-bold tracking-tight animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '150ms' }}>
            {config.title}
          </h1>
          <p className="max-w-lg text-center text-muted-foreground leading-relaxed animate-in fade-in-0 duration-500" style={{ animationDelay: '200ms' }}>
            {config.description}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {config.features.map((feature, index) => (
              <FeatureBadge key={feature} feature={feature} index={index} />
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
                <span>Templates</span>
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
          {(Object.keys(modeConfig) as ChatMode[]).map((m) => (
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
              <span className="capitalize">{m}</span>
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
                  <h3 className="font-semibold">Designer</h3>
                  <p className="text-sm text-muted-foreground">Build UI components with AI</p>
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
                  <h3 className="font-semibold">Projects</h3>
                  <p className="text-sm text-muted-foreground">Manage knowledge & contexts</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        </div>

        {/* Suggestions grid */}
        <div className="animate-in fade-in-0 duration-500" style={{ animationDelay: '550ms' }}>
          <h2 className="mb-5 text-center text-sm font-medium text-muted-foreground">
            Try these prompts to get started
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {config.suggestions.map((suggestion, index) => (
              <SuggestionCardComponent
                key={index}
                suggestion={suggestion}
                index={index}
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
