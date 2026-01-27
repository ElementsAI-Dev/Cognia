'use client';

/**
 * Server Card Component
 * Displays a single MCP server with controls
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ServerStatusIcon } from './server-status-icon';
import type { McpServerState } from '@/types/mcp';
import { getStatusText, getStatusColor, isServerConnected, isServerError } from '@/types/mcp';

interface ServerCardProps {
  server: McpServerState;
  actionLoading: string | null;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: (server: McpServerState) => void;
  onRemove: (id: string) => void;
  onToggleEnabled: (server: McpServerState) => void;
}

export function ServerCard({
  server,
  actionLoading,
  onConnect,
  onDisconnect,
  onEdit,
  onRemove,
  onToggleEnabled,
}: ServerCardProps) {
  const t = useTranslations('mcpSettings');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ServerStatusIcon status={server.status} />
              <span className="truncate">{server.name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {server.config.connectionType.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription className="text-[10px] font-mono truncate">
              {server.config.connectionType === 'stdio'
                ? `${server.config.command} ${server.config.args.join(' ')}`
                : server.config.url}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] ${getStatusColor(server.status)}`}>
              {getStatusText(server.status)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Tools/Resources/Prompts counts */}
        {isServerConnected(server.status) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{t('toolsCount', { count: server.tools.length })}</span>
              </TooltipTrigger>
              <TooltipContent>{t('toolsTooltip')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{t('resourcesCount', { count: server.resources.length })}</span>
              </TooltipTrigger>
              <TooltipContent>{t('resourcesTooltip')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{t('promptsCount', { count: server.prompts.length })}</span>
              </TooltipTrigger>
              <TooltipContent>{t('promptsTooltip')}</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Error message */}
        {isServerError(server.status) && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">{server.status.message}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {isServerConnected(server.status) ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onDisconnect(server.id)}
                disabled={actionLoading === server.id}
              >
                {actionLoading === server.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t('disconnect')
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onConnect(server.id)}
                disabled={
                  actionLoading === server.id || !server.config.enabled
                }
              >
                {actionLoading === server.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t('connect')
                )}
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(server)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('editServer')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onRemove(server.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('removeServer')}</TooltipContent>
            </Tooltip>
          </div>
          <Switch
            checked={server.config.enabled}
            onCheckedChange={() => onToggleEnabled(server)}
          />
        </div>

        {/* Tools list (expandable) */}
        {isServerConnected(server.status) && server.tools.length > 0 && (
          <Collapsible
            open={isExpanded}
            onOpenChange={setIsExpanded}
          >
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {t('showTools')} ({server.tools.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1 pl-4">
              {server.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-start gap-2 text-xs"
                >
                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded shrink-0">
                    {tool.name}
                  </code>
                  {tool.description && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {tool.description}
                    </span>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
