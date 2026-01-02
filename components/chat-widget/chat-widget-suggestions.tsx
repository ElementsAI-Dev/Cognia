"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Code,
  FileText,
  Languages,
  Sparkles,
} from "lucide-react";

interface Suggestion {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

const QUICK_SUGGESTIONS: Suggestion[] = [
  {
    icon: <MessageSquare className="h-3 w-3" />,
    label: "解释一下",
    prompt: "请用简单的语言解释一下这个概念：",
  },
  {
    icon: <Code className="h-3 w-3" />,
    label: "写代码",
    prompt: "帮我写一段代码来实现：",
  },
  {
    icon: <FileText className="h-3 w-3" />,
    label: "总结文章",
    prompt: "请帮我总结以下内容的要点：",
  },
  {
    icon: <Languages className="h-3 w-3" />,
    label: "翻译",
    prompt: "请将以下内容翻译成中文/英文：",
  },
  {
    icon: <Sparkles className="h-3 w-3" />,
    label: "优化文字",
    prompt: "请帮我优化以下文字，使其更加清晰流畅：",
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
  return (
    <div className={cn("flex flex-wrap gap-1.5 px-3 py-2", className)}>
      {QUICK_SUGGESTIONS.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion.prompt)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full",
            "text-xs font-medium",
            "bg-muted/50 hover:bg-muted",
            "border border-border/50 hover:border-border",
            "transition-all duration-200",
            "hover:shadow-sm"
          )}
        >
          <span className="text-primary">{suggestion.icon}</span>
          <span>{suggestion.label}</span>
        </button>
      ))}
    </div>
  );
});

export default ChatWidgetSuggestions;
