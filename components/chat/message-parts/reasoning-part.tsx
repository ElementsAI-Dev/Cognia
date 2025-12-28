'use client';

/**
 * ReasoningPart - Renders AI reasoning/thinking process
 * Enhanced with ChainOfThought visualization and search results highlighting
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning';
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from '@/components/ai-elements/chain-of-thought';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Brain,
  Search,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { ReasoningPart as ReasoningPartType } from '@/types/message';

interface ReasoningPartProps {
  part: ReasoningPartType;
  showChainOfThought?: boolean;
}

// Parse reasoning content to extract steps and search results
interface ParsedReasoning {
  steps: Array<{
    id: string;
    label: string;
    content: string;
    type: 'thought' | 'search' | 'conclusion' | 'question';
    searchResults?: Array<{ title: string; url?: string }>;
  }>;
  rawContent: string;
}

function parseReasoningContent(content: string): ParsedReasoning {
  const steps: ParsedReasoning['steps'] = [];
  
  // Try to parse structured reasoning patterns (compatible with ES2017)
  const thoughtPattern = /(?:^|\n)(?:(?:Step|Thought|考虑|思考)\s*\d*[:.：]?\s*)([^\n]+)/gi;
  const searchPattern = /(?:^|\n)(?:(?:Search|搜索|查询)[:.：]?\s*)([^\n]+)/gi;
  const conclusionPattern = /(?:^|\n)(?:(?:Conclusion|结论|Therefore|因此)[:.：]?\s*)([^\n]+)/gi;
  
  let stepId = 0;
  
  // Extract thoughts
  let match;
  while ((match = thoughtPattern.exec(content)) !== null) {
    steps.push({
      id: `step-${stepId++}`,
      label: `Thought ${steps.filter(s => s.type === 'thought').length + 1}`,
      content: match[1].trim(),
      type: 'thought',
    });
  }
  
  // Extract search queries and results
  while ((match = searchPattern.exec(content)) !== null) {
    const searchContent = match[1].trim();
    const urlMatches = searchContent.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    const searchResults = urlMatches?.map(m => {
      const titleMatch = m.match(/\[([^\]]+)\]/);
      const urlMatch = m.match(/\(([^)]+)\)/);
      return {
        title: titleMatch?.[1] || m,
        url: urlMatch?.[1],
      };
    });
    
    steps.push({
      id: `step-${stepId++}`,
      label: 'Search',
      content: searchContent,
      type: 'search',
      searchResults,
    });
  }
  
  // Extract conclusions
  while ((match = conclusionPattern.exec(content)) !== null) {
    steps.push({
      id: `step-${stepId++}`,
      label: 'Conclusion',
      content: match[1].trim(),
      type: 'conclusion',
    });
  }
  
  // If no structured content found, treat as single thought
  if (steps.length === 0 && content.trim()) {
    // Split by newlines for multiple thoughts
    const lines = content.split(/\n\n+/).filter(l => l.trim());
    lines.forEach((line, index) => {
      steps.push({
        id: `step-${index}`,
        label: lines.length > 1 ? `Thought ${index + 1}` : 'Thinking',
        content: line.trim(),
        type: 'thought',
      });
    });
  }
  
  return { steps, rawContent: content };
}

// Get icon for step type
function getStepIcon(type: ParsedReasoning['steps'][0]['type']) {
  switch (type) {
    case 'search':
      return Search;
    case 'conclusion':
      return CheckCircle;
    case 'question':
      return AlertCircle;
    default:
      return Lightbulb;
  }
}

export function ReasoningPart({ part, showChainOfThought = true }: ReasoningPartProps) {
  const t = useTranslations('reasoning');
  const [viewMode, setViewMode] = useState<'chain' | 'raw'>(showChainOfThought ? 'chain' : 'raw');
  const [copied, setCopied] = useState(false);
  
  // Parse the reasoning content
  const parsed = useMemo(() => parseReasoningContent(part.content), [part.content]);
  
  // Copy reasoning to clipboard
  const handleCopy = async () => {
    await navigator.clipboard.writeText(part.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Determine if we should show chain of thought view
  const hasMultipleSteps = parsed.steps.length > 1;
  const shouldShowChainView = showChainOfThought && hasMultipleSteps;
  
  return (
    <div className="space-y-2">
      {/* Toggle and actions bar */}
      {hasMultipleSteps && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'chain' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setViewMode('chain')}
            >
              <Brain className="h-3 w-3" />
              {t('chainView')}
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode('raw')}
            >
              {t('rawView')}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px]">
              {parsed.steps.length} {t('steps')}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Chain of Thought View */}
      {viewMode === 'chain' && shouldShowChainView ? (
        <ChainOfThought defaultOpen>
          <ChainOfThoughtHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span>{t('chainOfThought')}</span>
              {part.isStreaming && (
                <span className="text-xs text-blue-500 animate-pulse">{t('thinking')}...</span>
              )}
              {part.duration && (
                <Badge variant="secondary" className="text-[10px]">
                  {(part.duration / 1000).toFixed(1)}s
                </Badge>
              )}
            </div>
          </ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            {parsed.steps.map((step, index) => {
              const StepIcon = getStepIcon(step.type);
              const isLast = index === parsed.steps.length - 1;
              const status = part.isStreaming && isLast ? 'active' : 'complete';
              
              return (
                <ChainOfThoughtStep
                  key={step.id}
                  icon={StepIcon}
                  label={
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        step.type === 'conclusion' && "text-green-600 dark:text-green-400",
                        step.type === 'search' && "text-blue-600 dark:text-blue-400"
                      )}>
                        {step.label}
                      </span>
                      {step.type === 'conclusion' && (
                        <ArrowRight className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  }
                  status={status}
                  description={step.content}
                >
                  {/* Search results */}
                  {step.searchResults && step.searchResults.length > 0 && (
                    <ChainOfThoughtSearchResults>
                      {step.searchResults.map((result, idx) => (
                        <ChainOfThoughtSearchResult key={idx}>
                          {result.url ? (
                            <a 
                              href={result.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              {result.title}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            result.title
                          )}
                        </ChainOfThoughtSearchResult>
                      ))}
                    </ChainOfThoughtSearchResults>
                  )}
                </ChainOfThoughtStep>
              );
            })}
          </ChainOfThoughtContent>
        </ChainOfThought>
      ) : (
        /* Raw/Simple View - using original Reasoning component */
        <Reasoning isStreaming={part.isStreaming} duration={part.duration}>
          <ReasoningTrigger />
          <ReasoningContent>{part.content}</ReasoningContent>
        </Reasoning>
      )}
    </div>
  );
}
