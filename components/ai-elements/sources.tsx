"use client";

import { useTranslations } from 'next-intl';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  BookIcon, 
  ChevronDownIcon, 
  Globe, 
  FileText, 
  Video, 
  Image as ImageIcon,
  Link2,
  ExternalLink,
  Star,
  Clock,
} from "lucide-react";
import type { ComponentProps } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Source type configuration
export type SourceType = 'web' | 'document' | 'video' | 'image' | 'link' | 'book';

const sourceTypeConfig: Record<SourceType, { icon: React.ElementType; color: string; label: string }> = {
  web: { icon: Globe, color: 'text-blue-500 bg-blue-500/10', label: 'Web' },
  document: { icon: FileText, color: 'text-orange-500 bg-orange-500/10', label: 'Document' },
  video: { icon: Video, color: 'text-red-500 bg-red-500/10', label: 'Video' },
  image: { icon: ImageIcon, color: 'text-purple-500 bg-purple-500/10', label: 'Image' },
  link: { icon: Link2, color: 'text-green-500 bg-green-500/10', label: 'Link' },
  book: { icon: BookIcon, color: 'text-amber-500 bg-amber-500/10', label: 'Book' },
};

export type SourcesProps = ComponentProps<"div"> & {
  variant?: 'default' | 'compact' | 'detailed';
};

export const Sources = ({ className, variant = 'default', ...props }: SourcesProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-4 text-primary text-xs",
      "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
      variant === 'compact' && 'mb-2',
      className
    )}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
  variant?: 'default' | 'pill' | 'minimal';
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  variant = 'default',
  ...props
}: SourcesTriggerProps) => {
  const t = useTranslations('sources');
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex items-center gap-2 transition-all",
        variant === 'pill' && "px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20",
        variant === 'default' && "px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20",
        variant === 'minimal' && "px-2 py-1 rounded hover:bg-accent/50",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <BookIcon className="h-3.5 w-3.5" />
          <p className="font-medium">{t('usedSources', { count })}</p>
          <ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </>
      )}
    </CollapsibleTrigger>
  );
};

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent> & {
  maxHeight?: number;
};

export const SourcesContent = ({
  className,
  maxHeight,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-3 flex w-full flex-col gap-2 rounded-xl border border-border/30 bg-card/50 p-3",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in duration-200",
      maxHeight && "overflow-y-auto",
      className
    )}
    style={maxHeight ? { maxHeight } : undefined}
    {...props}
  />
);

export type SourceProps = ComponentProps<"a"> & {
  sourceType?: SourceType;
  snippet?: string;
  relevance?: number;
  timestamp?: string;
  favicon?: string;
  domain?: string;
};

export const Source = ({ 
  href, 
  title, 
  children, 
  sourceType = 'web',
  snippet,
  relevance,
  timestamp,
  favicon,
  domain,
  className,
  ...props 
}: SourceProps) => {
  const config = sourceTypeConfig[sourceType];
  const TypeIcon = config.icon;
  
  // Extract domain from href if not provided
  const displayDomain = domain || (href ? new URL(href).hostname.replace('www.', '') : undefined);

  return (
    <a
      className={cn(
        "flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all group border border-transparent hover:border-border/50",
        className
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children ?? (
        <>
          {/* Icon/Favicon */}
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
            config.color,
            "group-hover:scale-105"
          )}>
            {favicon ? (
              <Image src={favicon} alt="" width={16} height={16} className="rounded" unoptimized />
            ) : (
              <TypeIcon className="h-4 w-4" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Title row */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                {title}
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            
            {/* Domain/meta row */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {displayDomain && (
                <span className="truncate max-w-[120px]">{displayDomain}</span>
              )}
              {timestamp && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {timestamp}
                  </span>
                </>
              )}
              <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                {config.label}
              </Badge>
            </div>
            
            {/* Snippet preview */}
            {snippet && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {snippet}
              </p>
            )}
          </div>
          
          {/* Relevance indicator */}
          {relevance !== undefined && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 text-[10px] text-amber-500 shrink-0">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{Math.round(relevance * 100)}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Relevance score</TooltipContent>
            </Tooltip>
          )}
        </>
      )}
    </a>
  );
};

// Source group component for categorized sources
export type SourceGroupProps = {
  title: string;
  sources: Array<SourceProps & { id: string }>;
  defaultExpanded?: boolean;
  className?: string;
};

export const SourceGroup = ({ 
  title, 
  sources, 
  defaultExpanded = true,
  className 
}: SourceGroupProps) => (
  <Collapsible defaultOpen={defaultExpanded} className={cn("space-y-2", className)}>
    <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full group">
      <ChevronDownIcon className="h-3.5 w-3.5 transition-transform group-data-[state=closed]:-rotate-90" />
      <span>{title}</span>
      <Badge variant="secondary" className="text-[10px] h-4 ml-auto">
        {sources.length}
      </Badge>
    </CollapsibleTrigger>
    <CollapsibleContent className="space-y-1 pl-5">
      {sources.map((source) => (
        <Source key={source.id} {...source} />
      ))}
    </CollapsibleContent>
  </Collapsible>
);
