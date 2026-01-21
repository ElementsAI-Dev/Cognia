'use client';

/**
 * Installation Preview Component
 * Shows installation configuration preview for MCP servers
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, CheckCheck, Key, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { McpInstallConfig } from '@/lib/mcp/marketplace';
import type { EnvironmentCheckResult } from '@/lib/mcp/marketplace-utils';

interface InstallationPreviewProps {
  installConfig: McpInstallConfig | null;
  mcpId: string;
  isRemote?: boolean;
  envValues: Record<string, string>;
  envCheck: EnvironmentCheckResult | null;
  isCheckingEnv: boolean;
  onEnvValueChange: (key: string, value: string) => void;
}

export function InstallationPreview({
  installConfig,
  mcpId,
  isRemote = false,
  envValues,
  envCheck,
  isCheckingEnv,
  onEnvValueChange,
}: InstallationPreviewProps) {
  const t = useTranslations('mcpMarketplace');
  const tCommon = useTranslations('common');
  
  const [copied, setCopied] = useState(false);

  const handleCopyCommand = async () => {
    const command = installConfig 
      ? `${installConfig.command} ${installConfig.args.join(' ')}`
      : `npx -y ${mcpId}`;
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4 pr-4">
        {/* Environment Check Warning */}
        {!isRemote && (
          isCheckingEnv ? (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription className="text-xs">
                {t('checkingEnvironment')}
              </AlertDescription>
            </Alert>
          ) : envCheck && !envCheck.supported ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {envCheck.message || t('environmentNotSupported')}
                {envCheck.missingDeps.length > 0 && (
                  <span className="block mt-1 font-mono text-[10px]">
                    {t('missingDeps')}: {envCheck.missingDeps.join(', ')}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ) : envCheck?.supported ? (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-xs">
                {t('environmentReady')}
                {envCheck.nodeVersion && (
                  <span className="ml-1 font-mono text-[10px]">
                    (Node {envCheck.nodeVersion})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ) : null
        )}

        {/* Install Command Preview */}
        <div>
          <h4 className="text-sm font-medium mb-1">{t('installCommand')}</h4>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md font-mono overflow-x-auto">
              {installConfig 
                ? `${installConfig.command} ${installConfig.args.join(' ')}`
                : `npx -y ${mcpId}`}
            </code>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCopyCommand}
                >
                  {copied ? (
                    <CheckCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? tCommon('copied') : tCommon('copy')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Connection Type */}
        {installConfig?.connectionType && (
          <div>
            <h4 className="text-sm font-medium mb-1">{t('connectionType')}</h4>
            <Badge variant="outline">
              {installConfig.connectionType.toUpperCase()}
            </Badge>
            {installConfig.connectionType === 'sse' && installConfig.url && (
              <p className="text-xs text-muted-foreground mt-1">
                {installConfig.url}
              </p>
            )}
          </div>
        )}

        {/* Environment Variables Form */}
        {installConfig?.envKeys && installConfig.envKeys.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t('environmentVariables')}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t('envVarsDescription')}
            </p>
            {installConfig.envKeys.map((key) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="text-xs font-mono">
                  {key}
                </Label>
                <Input
                  id={key}
                  type="password"
                  value={envValues[key] || ''}
                  onChange={(e) => onEnvValueChange(key, e.target.value)}
                  placeholder={t('enterEnvVar', { key })}
                  className="h-8 text-sm font-mono"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Key className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('noConfigRequired')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('noConfigRequiredDesc')}
            </p>
          </div>
        )}

        {/* Advanced Configuration Info */}
        {installConfig && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">{t('configPreview')}</h4>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto font-mono">
{JSON.stringify({
  command: installConfig.command,
  args: installConfig.args,
  connectionType: installConfig.connectionType,
  ...(installConfig.url && { url: installConfig.url }),
  env: Object.fromEntries(
    Object.entries(envValues).filter(([, v]) => v.trim())
  ),
}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
