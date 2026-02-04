'use client';

/**
 * CollabUserList - Displays list of users in a collaborative session
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CollabUserState } from '@/lib/designer/collaboration/collab-awareness';

export interface CollabUserListProps {
  users: CollabUserState[];
  localUserId?: string;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showNames?: boolean;
  showStatus?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const overlapClasses = {
  sm: '-ml-2',
  md: '-ml-3',
  lg: '-ml-4',
};

export function CollabUserList({
  users,
  localUserId,
  maxVisible = 5,
  size = 'md',
  className,
  showNames = false,
  showStatus = true,
}: CollabUserListProps) {
  const t = useTranslations('designer.collaboration');

  const { visibleUsers, hiddenCount } = useMemo(() => {
    const online = users.filter((u) => u.isOnline);
    const offline = users.filter((u) => !u.isOnline);
    const sorted = [...online, ...offline];

    if (sorted.length <= maxVisible) {
      return { visibleUsers: sorted, hiddenCount: 0 };
    }

    return {
      visibleUsers: sorted.slice(0, maxVisible),
      hiddenCount: sorted.length - maxVisible,
    };
  }, [users, maxVisible]);

  if (users.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        <div className="flex items-center">
          {visibleUsers.map((user, index) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative ring-2 ring-background rounded-full',
                    index > 0 && overlapClasses[size]
                  )}
                  style={{ zIndex: visibleUsers.length - index }}
                >
                  <Avatar className={cn(sizeClasses[size], 'border-2')} style={{ borderColor: user.color }}>
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    ) : null}
                    <AvatarFallback
                      className="text-white font-medium"
                      style={{ backgroundColor: user.color }}
                    >
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {showStatus && (
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 block rounded-full ring-2 ring-background',
                        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
                        user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      )}
                    />
                  )}
                  {user.id === localUserId && (
                    <span
                      className={cn(
                        'absolute -top-0.5 -right-0.5 block rounded-full bg-blue-500 ring-2 ring-background',
                        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
                      )}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex flex-col gap-1">
                <span className="font-medium">
                  {user.name}
                  {user.id === localUserId && ` (${t('you')})`}
                </span>
                <span className={cn('text-xs', user.isOnline ? 'text-green-500' : 'text-muted-foreground')}>
                  {user.isOnline ? t('online') : t('offline')}
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative ring-2 ring-background rounded-full',
                    overlapClasses[size]
                  )}
                  style={{ zIndex: 0 }}
                >
                  <Avatar className={cn(sizeClasses[size], 'bg-muted')}>
                    <AvatarFallback className="text-muted-foreground font-medium">
                      +{hiddenCount}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t('moreUsers', { count: hiddenCount })}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {showNames && visibleUsers.length === 1 && (
          <span className="ml-2 text-sm font-medium truncate max-w-[120px]">
            {visibleUsers[0].name}
            {visibleUsers[0].id === localUserId && ` (${t('you')})`}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default CollabUserList;
