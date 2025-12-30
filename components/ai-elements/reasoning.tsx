"use client";

import { useTranslations } from 'next-intl';
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, memo, useContext, useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { Shimmer } from "./shimmer";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: undefined,
    });

    const [hasAutoClosed, setHasAutoClosed] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Track duration when streaming starts and ends
    useEffect(() => {
      queueMicrotask(() => {
        if (isStreaming) {
          if (startTime === null) {
            setStartTime(Date.now());
          }
        } else if (startTime !== null) {
          setDuration(Math.ceil((Date.now() - startTime) / MS_IN_S));
          setStartTime(null);
        }
      });
    }, [isStreaming, startTime, setDuration]);

    // Auto-open when streaming starts, auto-close when streaming ends (once only)
    useEffect(() => {
      if (defaultOpen && !isStreaming && isOpen && !hasAutoClosed) {
        // Add a small delay before closing to allow user to see the content
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosed(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosed]);

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration }}
      >
        <Collapsible
          className={cn(
            "not-prose mb-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
            className
          )}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getThinkingMessage?: (isStreaming: boolean, duration?: number, t?: any) => ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number, t?: any) => {
  const thinking = t ? t('thinking') : 'Thinking...';
  const thoughtFewSeconds = t ? t('thoughtFewSeconds') : 'Thought for a few seconds';
  const thoughtSeconds = t ? t('thoughtSeconds', { duration }) : `Thought for ${duration} seconds`;
  
  if (isStreaming || duration === 0) {
    return <Shimmer duration={1}>{thinking}</Shimmer>;
  }
  if (duration === undefined) {
    return <p>{thoughtFewSeconds}</p>;
  }
  return <p>{thoughtSeconds}</p>;
};

export const ReasoningTrigger = memo(
  ({ className, children, getThinkingMessage = defaultGetThinkingMessage, ...props }: ReasoningTriggerProps) => {
    const t = useTranslations('reasoning');
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          "px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/50",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-lg transition-colors",
              isStreaming ? "bg-primary/20 text-primary" : "bg-muted"
            )}>
              <BrainIcon className="size-3.5" />
            </div>
            {getThinkingMessage(isStreaming, duration, t)}
            <ChevronDownIcon
              className={cn(
                "size-4 ml-auto transition-transform duration-200",
                isOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => (
    <CollapsibleContent
      className={cn(
        "mt-3 text-sm",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in duration-200",
        className
      )}
      {...props}
    >
      <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
        <Streamdown {...props}>{children}</Streamdown>
      </div>
    </CollapsibleContent>
  )
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
