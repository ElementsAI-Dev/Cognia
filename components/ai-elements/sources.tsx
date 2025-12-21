"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BookIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type SourcesProps = ComponentProps<"div">;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-4 text-primary text-xs",
      "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
      className
    )}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      "group flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        <BookIcon className="h-3.5 w-3.5" />
        <p className="font-medium">Used {count} sources</p>
        <ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-3 flex w-full flex-col gap-2 rounded-xl border border-border/30 bg-card/50 p-3",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in duration-200",
      className
    )}
    {...props}
  />
);

export type SourceProps = ComponentProps<"a">;

export const Source = ({ href, title, children, ...props }: SourceProps) => (
  <a
    className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    {children ?? (
      <>
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <BookIcon className="h-3.5 w-3.5" />
        </div>
        <span className="block font-medium text-foreground group-hover:text-primary transition-colors">{title}</span>
      </>
    )}
  </a>
);
