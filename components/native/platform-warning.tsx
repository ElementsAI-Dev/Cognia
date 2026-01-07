'use client';

/**
 * Platform Warning Component
 *
 * Displays warnings for platform-specific features that may not work
 * on the current operating system.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { isTauri } from '@/lib/native/utils';
import { cn } from '@/lib/utils';

export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'unknown';
  }
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('win')) {
    return 'windows';
  } else if (userAgent.includes('mac')) {
    return 'macos';
  } else if (userAgent.includes('linux')) {
    return 'linux';
  }
  
  return 'unknown';
}

/**
 * Hook to get the current platform
 */
export function usePlatform(): Platform {
  // Initialize with the detected platform to avoid setState in effect
  const [platform] = useState<Platform>(() => detectPlatform());
  
  return platform;
}

interface PlatformWarningProps {
  /** Platforms where this feature is supported */
  supportedPlatforms: Platform[];
  /** Feature name for the warning message */
  featureName: string;
  /** Optional custom message */
  message?: string;
  /** Display mode */
  mode?: 'alert' | 'badge' | 'inline' | 'tooltip';
  /** Additional CSS classes */
  className?: string;
  /** Children to render (for tooltip mode) */
  children?: React.ReactNode;
}

export function PlatformWarning({
  supportedPlatforms,
  featureName,
  message,
  mode = 'alert',
  className,
  children,
}: PlatformWarningProps) {
  const t = useTranslations('platformWarning');
  const platform = usePlatform();
  
  // Don't render in web environment
  if (!isTauri()) {
    return mode === 'tooltip' ? <>{children}</> : null;
  }
  
  // Check if current platform is supported
  const isSupported = supportedPlatforms.includes(platform) || platform === 'unknown';
  
  // If supported, don't show warning (or just render children for tooltip mode)
  if (isSupported) {
    return mode === 'tooltip' ? <>{children}</> : null;
  }
  
  const platformNames: Record<Platform, string> = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    unknown: 'Unknown',
  };
  
  const supportedList = supportedPlatforms
    .map(p => platformNames[p])
    .join(', ');
  
  const warningMessage = message || t('notSupported', { 
    feature: featureName, 
    platforms: supportedList 
  });

  switch (mode) {
    case 'badge':
      return (
        <Badge variant="outline" className={cn('text-yellow-600 border-yellow-600', className)}>
          <AlertTriangle className="h-3 w-3 mr-1" />
          {supportedList} only
        </Badge>
      );
      
    case 'inline':
      return (
        <span className={cn('inline-flex items-center gap-1 text-xs text-yellow-600', className)}>
          <AlertTriangle className="h-3 w-3" />
          {warningMessage}
        </span>
      );
      
    case 'tooltip':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center">
              {children}
              <AlertTriangle className="h-3 w-3 ml-1 text-yellow-600" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{warningMessage}</p>
          </TooltipContent>
        </Tooltip>
      );
      
    case 'alert':
    default:
      return (
        <Alert variant="default" className={cn('border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20', className)}>
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-500">
            {t('limitedSupport')}
          </AlertTitle>
          <AlertDescription className="text-yellow-600 dark:text-yellow-400">
            {warningMessage}
          </AlertDescription>
        </Alert>
      );
  }
}

interface PlatformBadgeProps {
  platform: Platform | Platform[];
  className?: string;
}

/**
 * Simple badge showing supported platforms
 */
export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const platforms = Array.isArray(platform) ? platform : [platform];
  
  const platformIcons: Record<Platform, string> = {
    windows: '🪟',
    macos: '🍎',
    linux: '🐧',
    unknown: '❓',
  };
  
  return (
    <Badge variant="secondary" className={cn('text-xs', className)}>
      {platforms.map(p => platformIcons[p]).join(' ')}
      <span className="ml-1">
        {platforms.map(p => p === 'windows' ? 'Win' : p === 'macos' ? 'Mac' : 'Linux').join('/')}
      </span>
    </Badge>
  );
}

interface DesktopOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Wrapper that only renders children in desktop (Tauri) environment
 */
export function DesktopOnly({ children, fallback, className }: DesktopOnlyProps) {
  const t = useTranslations('platformWarning');
  
  if (!isTauri()) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className={cn('flex flex-col items-center justify-center p-4 text-center', className)}>
        <Info className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {t('desktopOnly')}
        </p>
      </div>
    );
  }
  
  return <>{children}</>;
}

export default PlatformWarning;
