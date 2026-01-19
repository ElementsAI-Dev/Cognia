"use client";

import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

  return (
    <div className={cn("px-3 py-2", className)}>
      <motion.div 
        className="flex flex-wrap gap-1.5"
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Common suggestions - always visible */}
        {commonSuggestions.map((suggestion, index) => (
          <motion.div
            key={`common-${index}`}
            layout
            initial={false}
          >
            <Button
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
          </motion.div>
        ))}
        
        {/* Advanced suggestions - animated appearance */}
        <AnimatePresence mode="popLayout">
          {expanded && advancedSuggestions.map((suggestion, index) => (
            <motion.div
              key={`advanced-${index}`}
              layout
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ 
                duration: 0.2, 
                delay: index * 0.05,
                ease: "easeOut"
              }}
            >
              <Button
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
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Expand/Collapse button */}
        {advancedSuggestions.length > 0 && (
          <motion.div layout>
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
              <motion.span
                className="flex items-center"
                initial={false}
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3 w-3 mr-1" />
              </motion.span>
              <span>{expanded ? "收起" : "更多"}</span>
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});

export default ChatWidgetSuggestions;
