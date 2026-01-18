"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Code,
  FileText,
  Languages,
  Sparkles,
  Brain,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Suggestion {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  category?: "common" | "advanced";
}

const QUICK_SUGGESTIONS: Suggestion[] = [
  // Common suggestions (always visible)
  {
    icon: <MessageSquare className="h-3 w-3" />,
    label: "解释一下",
    prompt: "请用简单的语言解释一下这个概念：",
    category: "common",
  },
  {
    icon: <Code className="h-3 w-3" />,
    label: "写代码",
    prompt: "帮我写一段代码来实现：",
    category: "common",
  },
  {
    icon: <Languages className="h-3 w-3" />,
    label: "翻译",
    prompt: "请将以下内容翻译成中文/英文：",
    category: "common",
  },
  {
    icon: <HelpCircle className="h-3 w-3" />,
    label: "怎么做",
    prompt: "请告诉我如何：",
    category: "common",
  },
  // Advanced suggestions (expandable)
  {
    icon: <FileText className="h-3 w-3" />,
    label: "总结文章",
    prompt: "请帮我总结以下内容的要点：",
    category: "advanced",
  },
  {
    icon: <Sparkles className="h-3 w-3" />,
    label: "优化文字",
    prompt: "请帮我优化以下文字，使其更加清晰流畅：",
    category: "advanced",
  },
  {
    icon: <Brain className="h-3 w-3" />,
    label: "头脑风暴",
    prompt: "帮我头脑风暴一下关于这个话题的想法：",
    category: "advanced",
  },
  {
    icon: <CheckCircle className="h-3 w-3" />,
    label: "检查错误",
    prompt: "请帮我检查以下内容是否有错误：",
    category: "advanced",
  },
];

interface ChatWidgetSuggestionsProps {
  onSelect: (prompt: string) => void;
  className?: string;
}

export const ChatWidgetSuggestions = memo(function ChatWidgetSuggestions({
  onSelect,
  className,
}: ChatWidgetSuggestionsProps) {
  const [expanded, setExpanded] = useState(false);

  const commonSuggestions = QUICK_SUGGESTIONS.filter(s => s.category === "common");
  const advancedSuggestions = QUICK_SUGGESTIONS.filter(s => s.category === "advanced");
  const visibleSuggestions = expanded 
    ? QUICK_SUGGESTIONS 
    : commonSuggestions;

  return (
    <div className={cn("px-3 py-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {visibleSuggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className={cn(
              "h-auto px-2 py-1 rounded-full",
              "text-xs font-medium",
              "hover:bg-muted/50 hover:shadow-sm",
              "transition-all duration-200"
            )}
            onClick={() => onSelect(suggestion.prompt)}
          >
            <span className="text-primary mr-1">{suggestion.icon}</span>
            <span>{suggestion.label}</span>
          </Button>
        ))}
        
        {/* Expand/Collapse button */}
        {advancedSuggestions.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              "h-auto px-2 py-1 rounded-full",
              "text-xs font-medium text-muted-foreground",
              "hover:bg-muted/50",
              "transition-all duration-200"
            )}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                <span>收起</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                <span>更多</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
});

export default ChatWidgetSuggestions;
