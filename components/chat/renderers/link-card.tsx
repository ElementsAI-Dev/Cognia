'use client';

/**
 * LinkCard - Rich link preview renderer
 * Features:
 * - Open Graph metadata display
 * - Favicon display
 * - Hover preview
 * - External link indicator
 * - Loading states
 */

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ExternalLink,
  Link2,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  url: string;
}

interface LinkCardProps {
  href: string;
  children?: React.ReactNode;
  className?: string;
  showPreview?: boolean;
  metadata?: LinkMetadata;
  variant?: 'inline' | 'card' | 'compact';
}

export const LinkCard = memo(function LinkCard({
  href,
  children,
  className,
  showPreview = true,
  metadata,
  variant = 'inline',
}: LinkCardProps) {
  const _t = useTranslations('renderer');
  const [_isHovered, setIsHovered] = useState(false);

  // Extract domain from URL
  const domain = getDomain(href);
  const isExternal = href.startsWith('http');

  // Inline variant - simple link with optional hover preview
  if (variant === 'inline') {
    const link = (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={cn(
          'inline-flex items-center gap-1 text-primary hover:underline',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
        {isExternal && <ExternalLink className="h-3 w-3 inline" />}
      </a>
    );

    if (!showPreview || !metadata) {
      return link;
    }

    return (
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>{link}</HoverCardTrigger>
        <HoverCardContent className="w-80 p-0">
          <LinkPreviewContent metadata={metadata} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  // Compact variant - small card with favicon and title
  if (variant === 'compact') {
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={cn(
          'inline-flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors text-sm',
          className
        )}
      >
        {metadata?.favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={metadata.favicon} alt="" className="h-4 w-4 rounded" />
        ) : (
          <Globe className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="truncate max-w-[200px]">
          {metadata?.title || children || domain}
        </span>
        {isExternal && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
      </a>
    );
  }

  // Card variant - full card display
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={cn(
        'block rounded-lg border bg-card hover:bg-accent/50 transition-colors overflow-hidden my-4 group',
        className
      )}
    >
      {metadata?.image && (
        <div className="relative h-40 bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={metadata.image}
            alt={metadata.title || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {metadata?.title || children || href}
          </h3>
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {metadata?.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metadata?.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metadata.favicon} alt="" className="h-4 w-4 rounded" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          <span className="truncate">{metadata?.siteName || domain}</span>
        </div>
      </div>
    </a>
  );
});

/**
 * Link preview content for hover cards
 */
const LinkPreviewContent = memo(function LinkPreviewContent({
  metadata,
}: {
  metadata: LinkMetadata;
}) {
  return (
    <div className="overflow-hidden">
      {metadata.image && (
        <div className="relative h-32 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={metadata.image}
            alt={metadata.title || ''}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-3 space-y-1.5">
        <h4 className="font-semibold text-sm line-clamp-2">{metadata.title || metadata.url}</h4>
        {metadata.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {metadata.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metadata.favicon} alt="" className="h-3 w-3 rounded" />
          ) : (
            <Globe className="h-3 w-3" />
          )}
          <span className="truncate">{metadata.siteName || getDomain(metadata.url)}</span>
        </div>
      </div>
    </div>
  );
});

/**
 * Loading skeleton for link cards
 */
export const LinkCardSkeleton = memo(function LinkCardSkeleton({
  variant = 'card',
  className,
}: {
  variant?: 'card' | 'compact';
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center gap-2 px-2 py-1', className)}>
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden my-4', className)}>
      <Skeleton className="h-40 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
});

/**
 * Extract domain from URL
 */
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * LinkGroup - Group multiple links together
 */
interface LinkGroupProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const LinkGroup = memo(function LinkGroup({
  children,
  className,
  title,
}: LinkGroupProps) {
  return (
    <div className={cn('my-4 space-y-2', className)}>
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Link2 className="h-4 w-4" />
          <span>{title}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
});

export default LinkCard;
