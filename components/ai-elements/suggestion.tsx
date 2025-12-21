"use client";

import { Button } from "@/components/ui/button";
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <ScrollArea className="w-full overflow-x-auto whitespace-nowrap py-1" {...props}>
    <div className={cn("flex w-max flex-nowrap items-center gap-2 px-1", className)}>
      {children}
    </div>
    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  style,
  ...props
}: SuggestionProps) => {
  const handleClick = () => {
    onClick?.(suggestion);
  };

  return (
    <Button
      className={cn(
        "cursor-pointer rounded-full px-4 border-border/50 bg-background/80 backdrop-blur-sm",
        "hover:bg-accent hover:border-accent hover:shadow-sm hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-none",
        "transition-all duration-150",
        className
      )}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      style={style}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
