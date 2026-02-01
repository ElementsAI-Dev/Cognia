'use client';

import { useTranslations } from 'next-intl';
import {
  Clipboard,
  Camera,
  Monitor,
  Eye,
  Activity,
  Terminal,
  Sparkles,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface NativeToolItem {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  description?: string;
}

export const NATIVE_TOOLS: NativeToolItem[] = [
  { id: 'clipboard', icon: Clipboard, labelKey: 'history', description: 'Clipboard history' },
  { id: 'clipboard-context', icon: Sparkles, labelKey: 'smart', description: 'Smart clipboard' },
  { id: 'templates', icon: FileText, labelKey: 'templates', description: 'Text templates' },
  { id: 'screenshot', icon: Camera, labelKey: 'screenshot', description: 'Screenshot capture' },
  { id: 'focus', icon: Monitor, labelKey: 'focus', description: 'Focus tracking' },
  { id: 'context', icon: Eye, labelKey: 'context', description: 'Context awareness' },
  { id: 'system', icon: Activity, labelKey: 'system', description: 'System monitor' },
  { id: 'sandbox', icon: Terminal, labelKey: 'sandbox', description: 'Code sandbox' },
];

interface NativeToolSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed?: boolean;
  className?: string;
}

export function NativeToolSidebar({
  activeTab,
  onTabChange,
  collapsed = false,
  className,
}: NativeToolSidebarProps) {
  const t = useTranslations('nativeToolsPage');

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-muted/30',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-56',
        className
      )}
    >
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-2" role="navigation" aria-label="Native tools">
          {NATIVE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTab === tool.id;
            const label = t(`tabs.${tool.labelKey}`);

            const buttonContent = (
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-11',
                  'transition-all duration-200',
                  isActive && 'bg-primary/10 text-primary font-medium',
                  !isActive && 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  collapsed && 'justify-center px-0'
                )}
                onClick={() => onTabChange(tool.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'shrink-0 transition-colors',
                    collapsed ? 'h-5 w-5' : 'h-4 w-4',
                    isActive && 'text-primary'
                  )}
                />
                {!collapsed && (
                  <span className="truncate">{label}</span>
                )}
              </Button>
            );

            if (collapsed) {
              return (
                <Tooltip key={tool.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {buttonContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={tool.id}>{buttonContent}</div>;
          })}
        </nav>
      </ScrollArea>

    </aside>
  );
}

export default NativeToolSidebar;
