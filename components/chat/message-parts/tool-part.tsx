'use client';

/**
 * ToolPart - Renders tool invocations with status and results
 * Enhanced with state transition animations and detailed error display
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import type { ToolInvocationPart, ToolState } from '@/types/core/message';
import type { McpServerStatus } from '@/types/mcp';
import { A2UIToolOutput, hasA2UIToolOutput } from '@/components/a2ui';
import { MCPServerBadge } from '@/components/mcp';

interface ToolPartProps {
  part: ToolInvocationPart;
  /** MCP server ID (if this is an MCP tool call) */
  serverId?: string;
  /** MCP server display name */
  serverName?: string;
  /** MCP server status */
  serverStatus?: McpServerStatus;
  /** Show detailed view with tabs */
  showDetails?: boolean;
  onRetry?: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
}

// Helper to format tool name for display
function formatToolName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format duration for display
function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// Map our extended tool state to the AI SDK's expected states
function mapToolState(state: ToolState): 'input-streaming' | 'input-available' | 'output-available' | 'output-error' {
  switch (state) {
    case 'input-streaming':
      return 'input-streaming';
    case 'input-available':
    case 'approval-requested':
    case 'approval-responded':
      return 'input-available';
    case 'output-available':
      return 'output-available';
    case 'output-error':
    case 'output-denied':
      return 'output-error';
    default:
      return 'input-available';
  }
}

// Get risk level badge color
function getRiskBadgeVariant(riskLevel?: 'low' | 'medium' | 'high'): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (riskLevel) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    default:
      return 'outline';
  }
}

// State indicator component
function StateIndicator({ state }: { state: ToolState }) {
  const stateConfig: Record<ToolState, { icon: React.ElementType; color: string; animate: boolean }> = {
    'input-streaming': { icon: Clock, color: 'text-blue-500', animate: true },
    'input-available': { icon: Clock, color: 'text-blue-500', animate: true },
    'approval-requested': { icon: ShieldAlert, color: 'text-yellow-500', animate: true },
    'approval-responded': { icon: Shield, color: 'text-green-500', animate: false },
    'output-available': { icon: CheckCircle, color: 'text-green-500', animate: false },
    'output-error': { icon: XCircle, color: 'text-red-500', animate: false },
    'output-denied': { icon: AlertTriangle, color: 'text-orange-500', animate: false },
  };
  
  const config = stateConfig[state];
  const Icon = config.icon;
  
  return (
    <Icon className={cn(
      'h-4 w-4 transition-all duration-300',
      config.color,
      config.animate && 'animate-pulse'
    )} />
  );
}

export function ToolPart({ 
  part, 
  serverId,
  serverName,
  serverStatus,
  showDetails = false,
  onRetry, 
  onApprove, 
  onDeny 
}: ToolPartProps) {
  const t = useTranslations('toolStatus');
  const tMcp = useTranslations('mcp');
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Live elapsed time counter for running tools
  useEffect(() => {
    if (part.state === 'input-streaming' || part.state === 'input-available') {
      const startTime = part.startedAt?.getTime() || Date.now();
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [part.state, part.startedAt]);
  
  // Display time: use duration if available, otherwise elapsed time
  const displayTime = part.duration || elapsedTime;
  
  // Copy result to clipboard
  const handleCopyResult = async () => {
    if (part.result) {
      const text = typeof part.result === 'string' 
        ? part.result 
        : JSON.stringify(part.result, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const isRunning = part.state === 'input-streaming' || part.state === 'input-available';
  const isApprovalRequired = part.state === 'approval-requested';
  const isError = part.state === 'output-error' || part.state === 'output-denied';
  const isComplete = part.state === 'output-available';

  return (
    <Tool 
      defaultOpen={part.state !== 'output-available'}
      className={cn(
        'transition-all duration-300',
        isRunning && 'ring-2 ring-blue-500/20',
        isApprovalRequired && 'ring-2 ring-yellow-500/30',
        isError && 'ring-2 ring-red-500/20'
      )}
    >
      <ToolHeader
        title={formatToolName(part.toolName)}
        type="tool-invocation"
        state={mapToolState(part.state)}
      />
      {/* MCP Server badge - show when server info is available */}
      {serverId && (
        <div className="px-4 py-1.5 border-b border-border/30 bg-muted/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tMcp('server')}:</span>
            <MCPServerBadge
              serverId={serverId}
              serverName={serverName}
              status={serverStatus}
              size="sm"
              showStatus={!!serverStatus}
            />
          </div>
        </div>
      )}
      <ToolContent>
        {/* Enhanced metadata bar */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-3">
            <StateIndicator state={part.state} />
            
            {/* Duration / Elapsed time */}
            {(isRunning || displayTime > 0) && (
              <span className="text-xs text-muted-foreground font-mono">
                {formatDuration(displayTime)}
              </span>
            )}
            
            {/* Tool call ID for debugging */}
            {showDetails && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                    {part.toolCallId.slice(0, 8)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-mono text-xs">{part.toolCallId}</span>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Risk level indicator */}
            {part.riskLevel && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={getRiskBadgeVariant(part.riskLevel)} className="text-[10px] gap-1">
                    {part.riskLevel === 'high' && <ShieldAlert className="h-3 w-3" />}
                    {part.riskLevel === 'medium' && <Shield className="h-3 w-3" />}
                    {t(`risk.${part.riskLevel}`)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t(`riskDescription.${part.riskLevel}`)}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {isComplete && part.result !== undefined ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopyResult}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            ) : null}
            
            {/* Retry button for errors */}
            {isError && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3" />
                {t('retry')}
              </Button>
            )}
          </div>
        </div>
        
        {/* Running progress indicator */}
        {isRunning && (
          <div className="px-4 py-2">
            <Progress value={undefined} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1 animate-pulse">
              {t('executing')}...
            </p>
          </div>
        )}
        
        {/* Approval request UI */}
        {isApprovalRequired && (
          <div className="px-4 py-3 bg-yellow-500/5 border-b border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                {t('approvalRequired')}
              </span>
            </div>
            {part.description && (
              <p className="text-xs text-muted-foreground mb-3">
                {part.description}
              </p>
            )}
            {(onApprove || onDeny) && (
              <div className="flex gap-2">
                {onApprove && (
                  <Button size="sm" onClick={onApprove} className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {t('approve')}
                  </Button>
                )}
                {onDeny && (
                  <Button size="sm" variant="outline" onClick={onDeny} className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {t('deny')}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        
        {!isApprovalRequired && part.description ? (
          <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/10 border-b border-border/20">
            {part.description}
          </div>
        ) : null}
        
        <ToolInput input={part.args} />
        
        {isError && part.errorText ? (
          <div className="px-4 py-3 bg-destructive/5 border-t border-destructive/20">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">{t('errorOccurred')}</p>
                <p className="text-xs text-destructive/80 mt-1 whitespace-pre-wrap break-words">
                  {part.errorText}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        
        {isComplete && part.result !== undefined ? (
          hasA2UIToolOutput(part.result) ? (
            <A2UIToolOutput
              toolId={part.toolCallId}
              toolName={part.toolName}
              output={part.result}
            />
          ) : (
            <ToolOutput output={part.result} errorText={part.errorText} />
          )
        ) : null}
      </ToolContent>
    </Tool>
  );
}
