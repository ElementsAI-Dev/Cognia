"use client";

import { memo, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
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

interface ChatWidgetSuggestionsProps {
  onSelect: (prompt: string) => void;
  className?: string;
}

export const ChatWidgetSuggestions = memo(function ChatWidgetSuggestions({
  onSelect,
  className,
}: ChatWidgetSuggestionsProps) {
  const t = useTranslations("chatWidget.suggestions");
  const [expanded, setExpanded] = useState(false);

  const QUICK_SUGGESTIONS: Suggestion[] = useMemo(() => [
    // Common suggestions (always visible)
    {
      icon: <MessageSquare className="h-3 w-3" />,
      label: t("explain"),
      prompt: t("explainPrompt"),
      category: "common",
    },
    {
      icon: <Code className="h-3 w-3" />,
      label: t("writeCode"),
      prompt: t("writeCodePrompt"),
      category: "common",
    },
    {
      icon: <Languages className="h-3 w-3" />,
      label: t("translate"),
      prompt: t("translatePrompt"),
      category: "common",
    },
    {
      icon: <HelpCircle className="h-3 w-3" />,
      label: t("howTo"),
      prompt: t("howToPrompt"),
      category: "common",
    },
    // Advanced suggestions (expandable)
    {
      icon: <FileText className="h-3 w-3" />,
      label: t("summarize"),
      prompt: t("summarizePrompt"),
      category: "advanced",
    },
    {
      icon: <Sparkles className="h-3 w-3" />,
      label: t("optimize"),
      prompt: t("optimizePrompt"),
      category: "advanced",
    },
    {
      icon: <Brain className="h-3 w-3" />,
      label: t("brainstorm"),
      prompt: t("brainstormPrompt"),
      category: "advanced",
    },
    {
      icon: <CheckCircle className="h-3 w-3" />,
      label: t("checkErrors"),
      prompt: t("checkErrorsPrompt"),
      category: "advanced",
    },
  ], [t]);

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
              <span>{expanded ? t("collapse") : t("more")}</span>
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});

export default ChatWidgetSuggestions;
