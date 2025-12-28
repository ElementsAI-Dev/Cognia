"use client";

import { Button } from "@/components/ui/button";
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { 
  Sparkles, 
  ArrowRight, 
  Lightbulb, 
  MessageSquare, 
  Search, 
  Code, 
  FileText,
  Zap,
} from "lucide-react";

// Suggestion category configuration
export type SuggestionCategory = 'general' | 'follow-up' | 'explore' | 'code' | 'write' | 'quick';

const categoryConfig: Record<SuggestionCategory, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  general: { icon: Sparkles, color: 'text-purple-500', bgColor: 'bg-purple-500/10 hover:bg-purple-500/20' },
  'follow-up': { icon: MessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-500/10 hover:bg-blue-500/20' },
  explore: { icon: Search, color: 'text-green-500', bgColor: 'bg-green-500/10 hover:bg-green-500/20' },
  code: { icon: Code, color: 'text-orange-500', bgColor: 'bg-orange-500/10 hover:bg-orange-500/20' },
  write: { icon: FileText, color: 'text-pink-500', bgColor: 'bg-pink-500/10 hover:bg-pink-500/20' },
  quick: { icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10 hover:bg-amber-500/20' },
};

export type SuggestionsProps = ComponentProps<typeof ScrollArea> & {
  variant?: 'horizontal' | 'vertical' | 'grid';
  title?: string;
  showTitle?: boolean;
};

export const Suggestions = ({
  className,
  children,
  variant = 'horizontal',
  title,
  showTitle = false,
  ...props
}: SuggestionsProps) => {
  if (variant === 'vertical') {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {showTitle && title && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>{title}</span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {children}
        </div>
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {showTitle && title && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>{title}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showTitle && title && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Lightbulb className="h-3.5 w-3.5" />
          <span>{title}</span>
        </div>
      )}
      <ScrollArea className="w-full overflow-x-auto whitespace-nowrap py-1" {...props}>
        <div className={cn("flex w-max flex-nowrap items-center gap-2 px-1", className)}>
          {children}
        </div>
        <ScrollBar className="hidden" orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
  category?: SuggestionCategory;
  icon?: ReactNode;
  description?: string;
  badge?: string;
  showArrow?: boolean;
  highlighted?: boolean;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  style,
  category = 'general',
  icon,
  description,
  badge,
  showArrow = false,
  highlighted = false,
  ...props
}: SuggestionProps) => {
  const handleClick = () => {
    onClick?.(suggestion);
  };

  const config = categoryConfig[category];
  const CategoryIcon = config.icon;

  // Simple pill style for horizontal layout
  if (!description) {
    return (
      <Button
        className={cn(
          "cursor-pointer rounded-full px-4 border-border/50 bg-background/80 backdrop-blur-sm",
          "hover:bg-accent hover:border-accent hover:shadow-sm hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-none",
          "transition-all duration-150 gap-2",
          highlighted && "ring-2 ring-primary/50 border-primary/50",
          className
        )}
        onClick={handleClick}
        size={size}
        type="button"
        variant={variant}
        style={style}
        {...props}
      >
        {icon || <CategoryIcon className={cn("h-3.5 w-3.5", config.color)} />}
        <span>{children || suggestion}</span>
        {badge && (
          <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">
            {badge}
          </Badge>
        )}
        {showArrow && <ArrowRight className="h-3 w-3 opacity-50" />}
      </Button>
    );
  }

  // Card style for vertical/grid layout with description
  return (
    <button
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm text-left",
        "hover:bg-accent/50 hover:border-accent hover:shadow-sm",
        "active:shadow-none",
        "transition-all duration-150 group w-full",
        highlighted && "ring-2 ring-primary/50 border-primary/50",
        className
      )}
      onClick={handleClick}
      type="button"
      style={style}
      {...props}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
        config.bgColor
      )}>
        {icon || <CategoryIcon className={cn("h-4 w-4", config.color)} />}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {children || suggestion}
          </span>
          {badge && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
      {showArrow && (
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
      )}
    </button>
  );
};

// Suggestion group for categorized suggestions
export type SuggestionGroupProps = {
  title: string;
  category?: SuggestionCategory;
  suggestions: Array<SuggestionProps & { id: string }>;
  variant?: 'horizontal' | 'vertical';
  className?: string;
  onSuggestionClick?: (suggestion: string) => void;
};

export const SuggestionGroup = ({
  title,
  category = 'general',
  suggestions,
  variant = 'horizontal',
  className,
  onSuggestionClick,
}: SuggestionGroupProps) => {
  const config = categoryConfig[category];
  const CategoryIcon = config.icon;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <CategoryIcon className={cn("h-3.5 w-3.5", config.color)} />
        <span>{title}</span>
        <Badge variant="outline" className="text-[10px] h-4 ml-auto">
          {suggestions.length}
        </Badge>
      </div>
      <Suggestions variant={variant}>
        {suggestions.map((suggestion) => (
          <Suggestion 
            key={suggestion.id} 
            {...suggestion} 
            category={category}
            onClick={onSuggestionClick || suggestion.onClick}
          />
        ))}
      </Suggestions>
    </div>
  );
};
