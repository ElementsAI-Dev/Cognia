"use client";

import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import React, { isValidElement } from "react";
import type { ComponentProps, ReactNode } from "react";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-4 w-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm",
      "transition-all duration-200 hover:shadow-md hover:border-border",
      "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
      className
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

const statusIcons: Record<ToolUIPart["state"], ReactNode> = {
  "input-streaming": <CircleIcon className="size-4" />,
  "input-available": <ClockIcon className="size-4 animate-pulse" />,
  // @ts-expect-error state only available in AI SDK v6
  "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
  "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
  "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
  "output-error": <XCircleIcon className="size-4 text-red-600" />,
  "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
};

const statusLabelKeys: Record<ToolUIPart["state"], string> = {
  "input-streaming": "pending",
  "input-available": "running",
  // @ts-expect-error state only available in AI SDK v6
  "approval-requested": "awaitingApproval",
  "approval-responded": "responded",
  "output-available": "completed",
  "output-error": "error",
  "output-denied": "denied",
};

function StatusBadge({ status }: { status: ToolUIPart["state"] }) {
  const t = useTranslations('toolStatus');
  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {statusIcons[status]}
      {t(statusLabelKeys[status])}
    </Badge>
  );
}

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "group flex w-full items-center justify-between gap-4 p-3 rounded-t-xl transition-colors hover:bg-accent/50",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <WrenchIcon className="size-4" />
      </div>
      <span className="font-medium text-sm">
        {title ?? type.split("-").slice(1).join("-")}
      </span>
      <StatusBadge status={state} />
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = {
  children?: ReactNode;
  className?: string;
};

export const ToolContent = ({ className, children }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "border-t border-border/30",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in duration-200",
      className
    )}
  >
    {children}
  </CollapsibleContent>
);

export type ToolArgs = Record<string, unknown>;

export interface ToolInputProps {
  input: unknown;
  className?: string;
}

export function ToolInput({ className, input }: ToolInputProps): React.ReactElement {
  const t = useTranslations('toolStatus');
  const inputData = (input ?? {}) as Record<string, unknown>;
  return (
    <div className={cn("space-y-2 overflow-hidden p-4", className)}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-2">
        <span className="h-px flex-1 bg-border/50" />
        {t('parameters')}
        <span className="h-px flex-1 bg-border/50" />
      </h4>
      <div className="rounded-lg bg-muted/30 border border-border/30 overflow-hidden">
        <CodeBlock code={JSON.stringify(inputData, null, 2)} language="json" />
      </div>
    </div>
  );
}

export interface ToolOutputProps {
  output: unknown;
  errorText?: string;
  className?: string;
}

export function ToolOutput({
  className,
  output,
  errorText,
}: ToolOutputProps) {
  const t = useTranslations('toolStatus');
  
  if (!(output || errorText)) {
    return null;
  }

  // Render output based on its type
  const renderOutput = (): ReactNode => {
    if (output === null || output === undefined) {
      return null;
    }
    if (typeof output === "string") {
      return <CodeBlock code={output} language="json" />;
    }
    if (typeof output === "number" || typeof output === "boolean") {
      return <CodeBlock code={String(output)} language="json" />;
    }
    if (isValidElement(output)) {
      return output;
    }
    if (typeof output === "object") {
      return <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
    }
    // Fallback for other types
    return <CodeBlock code={String(output)} language="json" />;
  };

  const Output = renderOutput();

  return (
    <div className={cn("space-y-2 p-4", className)}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-2">
        <span className="h-px flex-1 bg-border/50" />
        {errorText ? t('error') : t('result')}
        <span className="h-px flex-1 bg-border/50" />
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-lg text-xs [&_table]:w-full border border-border/30",
          errorText
            ? "bg-destructive/10 text-destructive border-destructive/30"
            : "bg-muted/30 text-foreground"
        )}
      >
        {errorText && <div className="p-3">{errorText}</div>}
        {Output}
      </div>
    </div>
  );
}
