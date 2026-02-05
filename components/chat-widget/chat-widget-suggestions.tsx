"use client";

import { memo, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Suggestion, 
  type SuggestionCategory,
} from "@/components/ai-elements/suggestion";
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

interface QuickSuggestion {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  visibility: "common" | "advanced";
  category: SuggestionCategory;
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

  const QUICK_SUGGESTIONS: QuickSuggestion[] = useMemo(() => [
    // Common suggestions (always visible)
    {
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      label: t("explain"),
      prompt: t("explainPrompt"),
      visibility: "common",
      category: "general",
    },
    {
      icon: <Code className="h-3.5 w-3.5" />,
      label: t("writeCode"),
      prompt: t("writeCodePrompt"),
      visibility: "common",
      category: "code",
    },
    {
      icon: <Languages className="h-3.5 w-3.5" />,
      label: t("translate"),
      prompt: t("translatePrompt"),
      visibility: "common",
      category: "write",
    },
    {
      icon: <HelpCircle className="h-3.5 w-3.5" />,
      label: t("howTo"),
      prompt: t("howToPrompt"),
      visibility: "common",
      category: "explore",
    },
    // Advanced suggestions (expandable)
    {
      icon: <FileText className="h-3.5 w-3.5" />,
      label: t("summarize"),
      prompt: t("summarizePrompt"),
      visibility: "advanced",
      category: "write",
    },
    {
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: t("optimize"),
      prompt: t("optimizePrompt"),
      visibility: "advanced",
      category: "code",
    },
    {
      icon: <Brain className="h-3.5 w-3.5" />,
      label: t("brainstorm"),
      prompt: t("brainstormPrompt"),
      visibility: "advanced",
      category: "general",
    },
    {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      label: t("checkErrors"),
      prompt: t("checkErrorsPrompt"),
      visibility: "advanced",
      category: "code",
    },
  ], [t]);

  const commonSuggestions = QUICK_SUGGESTIONS.filter(s => s.visibility === "common");
  const advancedSuggestions = QUICK_SUGGESTIONS.filter(s => s.visibility === "advanced");

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
            <Suggestion
              suggestion={suggestion.prompt}
              category={suggestion.category}
              icon={suggestion.icon}
              onClick={() => onSelect(suggestion.prompt)}
              className="h-auto px-3 py-1"
              size="sm"
            >
              {suggestion.label}
            </Suggestion>
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
              <Suggestion
                suggestion={suggestion.prompt}
                category={suggestion.category}
                icon={suggestion.icon}
                onClick={() => onSelect(suggestion.prompt)}
                className="h-auto px-3 py-1"
                size="sm"
              >
                {suggestion.label}
              </Suggestion>
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
