'use client';

/**
 * SessionEnvSelector - Component for selecting virtual environment per session
 *
 * Allows users to:
 * - Select a virtual environment for the current chat session
 * - See the current environment source (session, project, global)
 * - Clear session-specific environment to use default
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Terminal,
  ChevronDown,
  Check,
  X,
  FolderOpen,
  Globe,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSessionEnv } from '@/hooks/sandbox';
import { cn } from '@/lib/utils';

interface SessionEnvSelectorProps {
  sessionId?: string;
  className?: string;
  compact?: boolean;
}

const SOURCE_ICONS = {
  session: Layers,
  project: FolderOpen,
  global: Globe,
  none: Terminal,
};

const SOURCE_LABELS = {
  session: 'Session',
  project: 'Project',
  global: 'Global',
  none: 'None',
};

export function SessionEnvSelector({
  sessionId,
  className,
  compact = false,
}: SessionEnvSelectorProps) {
  const t = useTranslations('virtualEnv');
  const [open, setOpen] = useState(false);

  const {
    environment,
    source,
    hasEnvironment,
    setEnvironment,
    clearEnvironment,
    availableEnvironments,
  } = useSessionEnv(sessionId);

  const SourceIcon = SOURCE_ICONS[source];

  if (availableEnvironments.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('h-7 px-2 gap-1', className)}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  {hasEnvironment && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1 text-[9px] font-normal"
                    >
                      {environment?.pythonVersion?.split('.').slice(0, 2).join('.') || 'py'}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                  <Terminal className="h-3.5 w-3.5" />
                  {t('selectEnvironment')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {hasEnvironment && (
                  <>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <SourceIcon className="h-3 w-3" />
                        <span>{SOURCE_LABELS[source]}:</span>
                        <span className="font-medium text-foreground">
                          {environment?.name}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem
                  onClick={() => {
                    clearEnvironment();
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-2" />
                  {t('useDefault')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {availableEnvironments.map((env) => (
                  <DropdownMenuItem
                    key={env.id}
                    onClick={() => {
                      setEnvironment(env.id, env.path);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5" />
                        <span>{env.name}</span>
                        {env.pythonVersion && (
                          <Badge variant="outline" className="h-4 px-1 text-[9px]">
                            {env.pythonVersion}
                          </Badge>
                        )}
                      </div>
                      {environment?.id === env.id && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              {hasEnvironment
                ? `${t('environment')}: ${environment?.name} (${SOURCE_LABELS[source]})`
                : t('noEnvironment')}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-2', className)}
        >
          <Terminal className="h-4 w-4" />
          <span className="text-xs truncate max-w-[120px]">
            {hasEnvironment ? environment?.name : t('noEnvironment')}
          </span>
          {hasEnvironment && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] font-normal"
            >
              {SOURCE_LABELS[source]}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          {t('selectEnvironment')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {hasEnvironment && (
          <>
            <div className="px-2 py-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <SourceIcon className="h-3.5 w-3.5" />
                <span>{SOURCE_LABELS[source]} environment</span>
              </div>
              <div className="font-medium">{environment?.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {environment?.path}
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          onClick={() => {
            clearEnvironment();
            setOpen(false);
          }}
        >
          <X className="h-4 w-4 mr-2" />
          <div>
            <div className="text-sm">{t('useDefault')}</div>
            <div className="text-[10px] text-muted-foreground">
              {t('useDefaultDesc')}
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal">
          {t('availableEnvironments')}
        </DropdownMenuLabel>

        {availableEnvironments.map((env) => (
          <DropdownMenuItem
            key={env.id}
            onClick={() => {
              setEnvironment(env.id, env.path);
              setOpen(false);
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <div>
                  <div className="text-sm">{env.name}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Badge variant="outline" className="h-4 px-1 text-[9px]">
                      {env.type}
                    </Badge>
                    {env.pythonVersion && (
                      <span>Python {env.pythonVersion}</span>
                    )}
                  </div>
                </div>
              </div>
              {environment?.id === env.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SessionEnvSelector;
