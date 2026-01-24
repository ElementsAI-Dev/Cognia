'use client';

/**
 * SidebarQuickActions - Quick action buttons widget for sidebar
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ImageIcon,
  Video,
  ChevronDown,
  ChevronRight,
  Palette,
  Monitor,
  Presentation,
  Zap,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  description?: string;
}

interface SidebarQuickActionsProps {
  className?: string;
  collapsed?: boolean;
  defaultOpen?: boolean;
}

const quickActions: QuickAction[] = [
  {
    id: 'ppt-studio',
    label: 'pptStudio',
    icon: <Presentation className="h-4 w-4" />,
    href: '/ppt',
    color: 'text-orange-500',
    description: 'pptStudioDesc',
  },
  {
    id: 'image-studio',
    label: 'imageStudio',
    icon: <ImageIcon className="h-4 w-4" />,
    href: '/image-studio',
    color: 'text-pink-500',
    description: 'imageStudioDesc',
  },
  {
    id: 'video-studio',
    label: 'videoStudio',
    icon: <Video className="h-4 w-4" />,
    href: '/video-studio',
    color: 'text-red-500',
    description: 'videoStudioDesc',
  },
  {
    id: 'video-editor',
    label: 'videoEditor',
    icon: <Monitor className="h-4 w-4" />,
    href: '/video-studio?mode=recording',
    color: 'text-violet-500',
    description: 'videoEditorDesc',
  },
  {
    id: 'selection-toolbar-settings',
    label: 'selectionToolbar',
    icon: <Palette className="h-4 w-4" />,
    href: '/settings?section=selection',
    color: 'text-cyan-500',
    description: 'selectionToolbarDesc',
  },
];

export function SidebarQuickActions({
  className,
  collapsed,
  defaultOpen = false,
}: SidebarQuickActionsProps) {
  const t = useTranslations('sidebar');
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (collapsed) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {quickActions.slice(0, 3).map((action) => (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <Link
                href={action.href}
                className={cn(
                  'flex items-center justify-center p-2 rounded-md',
                  'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  'transition-colors'
                )}
              >
                <span className={action.color}>{action.icon}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t(action.label) || action.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger
        className={cn(
          'flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors',
          'group'
        )}
      >
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span>{t('quickActions') || 'Quick Actions'}</span>
        </span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pt-1 pb-2">
        <div className="grid grid-cols-2 gap-1.5">
          {quickActions.map((action) => (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Link
                  href={action.href}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-2 rounded-md',
                    'text-sm text-muted-foreground hover:text-foreground',
                    'border border-transparent hover:bg-accent/50 hover:border-border/50',
                    'transition-colors'
                  )}
                >
                  <span className={action.color}>{action.icon}</span>
                  <span className="truncate text-xs">{t(action.label) || action.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-50">
                <p className="font-medium">{t(action.label) || action.label}</p>
                {action.description && (
                  <p className="text-xs text-muted-foreground">
                    {t(action.description) || action.description}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default SidebarQuickActions;
