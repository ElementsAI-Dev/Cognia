'use client';

import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import type { ThemeMenuItemProps } from '../types';

/**
 * ThemeMenuItem - Theme selector item with hover preview
 */
export function ThemeMenuItem({ theme, onSelect }: ThemeMenuItemProps) {
  const t = useTranslations('workflow');
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <DropdownMenuItem
          onClick={onSelect}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: theme.primaryColor }}
          />
          <span className="truncate">{theme.name}</span>
        </DropdownMenuItem>
      </HoverCardTrigger>
      <HoverCardContent side="left" className="w-64 p-0">
        <div
          className="rounded-md overflow-hidden"
          style={{ backgroundColor: theme.backgroundColor }}
        >
          {/* Mini slide preview */}
          <div className="aspect-video p-4 flex flex-col justify-center">
            <h3
              className="text-sm font-bold truncate"
              style={{
                color: theme.primaryColor,
                fontFamily: theme.headingFont,
              }}
            >
              {theme.name}
            </h3>
            <p
              className="text-xs mt-1 opacity-80"
              style={{
                color: theme.textColor,
                fontFamily: theme.bodyFont,
              }}
            >
              Sample presentation text
            </p>
            <div className="flex gap-1 mt-2">
              <div
                className="h-1.5 w-8 rounded-full"
                style={{ backgroundColor: theme.primaryColor }}
              />
              <div
                className="h-1.5 w-6 rounded-full"
                style={{ backgroundColor: theme.secondaryColor }}
              />
              <div
                className="h-1.5 w-4 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
            </div>
          </div>
          {/* Color swatches */}
          <div className="flex border-t" style={{ borderColor: theme.textColor + '20' }}>
            <div
              className="flex-1 h-6"
              style={{ backgroundColor: theme.primaryColor }}
              title={t('theme') + ' - Primary'}
            />
            <div
              className="flex-1 h-6"
              style={{ backgroundColor: theme.secondaryColor }}
              title={t('theme') + ' - Secondary'}
            />
            <div
              className="flex-1 h-6"
              style={{ backgroundColor: theme.accentColor }}
              title={t('theme') + ' - Accent'}
            />
          </div>
        </div>
        <div className="p-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Heading: {theme.headingFont}</span>
          </div>
          <div className="flex justify-between">
            <span>Body: {theme.bodyFont}</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default ThemeMenuItem;
