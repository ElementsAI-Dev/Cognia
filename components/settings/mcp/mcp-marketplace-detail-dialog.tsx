'use client';

/**
 * MCP Marketplace Detail Dialog
 * Shows detailed information about an MCP server and allows installation
 * Enhanced with Markdown rendering, icon display, version info, and smart installation
 */

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ExternalLink,
  Star,
  Download,
  Key,
  Github,
  Loader2,
  AlertCircle,
  Check,
  Copy,
  CheckCheck,
  Shield,
  Cloud,
  Globe,
  Heart,
  HeartOff,
  Package,
  Scale,
  Clock,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMcpMarketplaceStore } from '@/stores/mcp';
import { useMcpStore } from '@/stores/mcp';
import type { McpMarketplaceItem } from '@/types/mcp/mcp-marketplace';
import { formatDownloadCount, formatStarCount, formatRelativeTime, parseInstallationConfig } from '@/lib/mcp/marketplace';
import { getSourceColor, checkMcpEnvironment, type EnvironmentCheckResult } from '@/lib/mcp/marketplace-utils';

interface McpMarketplaceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: McpMarketplaceItem | null;
  isInstalled: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (mcpId: string) => void;
}

export function McpMarketplaceDetailDialog({
  open,
  onOpenChange,
  item,
  isInstalled,
  isFavorite = false,
  onToggleFavorite,
}: McpMarketplaceDetailDialogProps) {
  const t = useTranslations('mcpMarketplace');
  const tCommon = useTranslations('common');

  const {
    downloadDetails,
    isLoadingDetails,
    fetchItemDetails,
    setInstallStatus,
    getInstallStatus,
  } = useMcpMarketplaceStore();

  const { addServer } = useMcpStore();

  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'readme' | 'install'>('overview');
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState(false);
  const [envCheck, setEnvCheck] = useState<EnvironmentCheckResult | null>(null);
  const [isCheckingEnv, setIsCheckingEnv] = useState(false);

  // Check environment when dialog opens for stdio connections
  useEffect(() => {
    if (open && item && !item.remote) {
      setIsCheckingEnv(true);
      checkMcpEnvironment()
        .then(setEnvCheck)
        .finally(() => setIsCheckingEnv(false));
    }
  }, [open, item]);

  // Parse installation configuration from readme or llms content
  const installConfig = useMemo(() => {
    if (!item || !downloadDetails) return null;
    return parseInstallationConfig(item, downloadDetails);
  }, [item, downloadDetails]);

  // Initialize env values when install config changes
  useEffect(() => {
    if (installConfig?.envKeys) {
      const initialEnv: Record<string, string> = {};
      installConfig.envKeys.forEach((key) => {
        initialEnv[key] = '';
      });
      setEnvValues(initialEnv);
    }
  }, [installConfig]);

  // Fetch details when dialog opens
  useEffect(() => {
    if (open && item) {
      fetchItemDetails(item.mcpId);
    }
  }, [open, item, fetchItemDetails]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setInstallError(null);
      setIsInstalling(false);
      setActiveTab('overview');
      setEnvValues({});
      setImageError(false);
    }
  }, [open]);

  const handleInstall = async () => {
    if (!item) return;

    setIsInstalling(true);
    setInstallError(null);
    setInstallStatus(item.mcpId, 'installing');

    try {
      // Use parsed install config or generate default
      const config = installConfig || {
        command: 'npx',
        args: ['-y', item.mcpId],
        connectionType: 'stdio' as const,
      };

      // Build environment variables from form
      const env: Record<string, string> = {};
      Object.entries(envValues).forEach(([key, value]) => {
        if (value.trim()) {
          env[key] = value.trim();
        }
      });

      // Create server config
      const serverConfig = {
        name: item.name,
        command: config.command,
        args: config.args,
        env,
        connectionType: config.connectionType,
        url: config.url,
        enabled: true,
        autoStart: false,
      };

      await addServer(item.mcpId, serverConfig);
      setInstallStatus(item.mcpId, 'installed');
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to install MCP server';
      setInstallError(errorMessage);
      setInstallStatus(item.mcpId, 'error', errorMessage);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleCopyCommand = async () => {
    if (!item) return;
    
    const command = `npx -y ${item.mcpId}`;
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGitHub = () => {
    if (downloadDetails?.githubUrl) {
      window.open(downloadDetails.githubUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const installStatus = item ? getInstallStatus(item.mcpId) : 'not_installed';
  const isCurrentlyInstalled = isInstalled || installStatus === 'installed';

  if (!item) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              {/* Server Icon */}
              <div className="shrink-0">
                {item.iconUrl && !imageError ? (
                  <Image
                    src={item.iconUrl}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover bg-muted"
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <DialogTitle className="text-lg flex items-center gap-2 flex-wrap">
                  {item.name}
                  {item.verified && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>{t('verified')}</TooltipContent>
                    </Tooltip>
                  )}
                  {item.remote && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Cloud className="h-4 w-4 text-green-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>{t('remoteHosting')}</TooltipContent>
                    </Tooltip>
                  )}
                  {isCurrentlyInstalled && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Check className="h-3 w-3 mr-1" />
                      {t('installed')}
                    </Badge>
                  )}
                  {item.source && (
                    <Badge variant="outline" className={`text-[10px] ${getSourceColor(item.source)}`}>
                      {item.source}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm flex items-center gap-2">
                  {t('byAuthor', { author: item.author })}
                  {item.version && (
                    <Badge variant="outline" className="text-[9px] font-mono">
                      v{item.version}
                    </Badge>
                  )}
                </DialogDescription>
              </div>

              {/* Favorite Button */}
              {onToggleFavorite && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => onToggleFavorite(item.mcpId)}
                    >
                      {isFavorite ? (
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      ) : (
                        <HeartOff className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1.5 cursor-help">
                    <Star className="h-4 w-4" />
                    {formatStarCount(item.githubStars)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('githubStars')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1.5 cursor-help">
                    <Download className="h-4 w-4" />
                    {formatDownloadCount(item.downloadCount)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('downloads')}</TooltipContent>
              </Tooltip>
              {item.updatedAt && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 cursor-help">
                      <Clock className="h-4 w-4" />
                      {formatRelativeTime(item.updatedAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{t('lastUpdated')}</TooltipContent>
                </Tooltip>
              )}
              {item.license && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 cursor-help">
                      <Scale className="h-4 w-4" />
                      {item.license}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{t('license')}</TooltipContent>
                </Tooltip>
              )}
              {item.requiresApiKey && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 cursor-help text-yellow-500">
                      <Key className="h-4 w-4" />
                      {t('requiresApiKey')}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{t('requiresApiKeyDesc')}</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>

          <Separator className="my-2" />

          {/* Content */}
          <div className="flex-1 min-h-0">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : downloadDetails?.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{downloadDetails.error}</AlertDescription>
              </Alert>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
                  <TabsTrigger value="readme">{t('readme')}</TabsTrigger>
                  <TabsTrigger value="install" className="gap-1">
                    <Settings2 className="h-3.5 w-3.5" />
                    {t('installConfig')}
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="flex-1 mt-4">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4 pr-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">{t('descriptionLabel')}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>

                      {/* Links Section */}
                      <div className="flex flex-wrap gap-2">
                        {downloadDetails?.githubUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={handleOpenGitHub}
                          >
                            <Github className="h-4 w-4" />
                            {t('viewOnGitHub')}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {item.homepage && item.homepage !== downloadDetails?.githubUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => window.open(item.homepage, '_blank', 'noopener,noreferrer')}
                          >
                            <Globe className="h-4 w-4" />
                            {t('homepage')}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Install Command Preview */}
                      <div>
                        <h4 className="text-sm font-medium mb-1">{t('installCommand')}</h4>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md font-mono overflow-x-auto">
                            {installConfig ? `${installConfig.command} ${installConfig.args.join(' ')}` : `npx -y ${item.mcpId}`}
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

                      {/* Required API Keys Notice */}
                      {(item.requiresApiKey || (installConfig?.envKeys && installConfig.envKeys.length > 0)) && (
                        <Alert>
                          <Key className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {t('apiKeyNote')}
                            {installConfig?.envKeys && installConfig.envKeys.length > 0 && (
                              <span className="block mt-1 font-mono">
                                {installConfig.envKeys.join(', ')}
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Readme Tab with Markdown Rendering */}
                <TabsContent value="readme" className="flex-1 mt-4">
                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    {downloadDetails?.readmeContent ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {children}
                              </a>
                            ),
                            code: ({ className, children, ...props }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className={`${className} block bg-muted p-2 rounded text-xs overflow-x-auto`} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {downloadDetails.readmeContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {t('noReadme')}
                      </p>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Install Configuration Tab */}
                <TabsContent value="install" className="flex-1 mt-4">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4 pr-4">
                      {/* Environment Check Warning */}
                      {!item?.remote && (
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
                                onChange={(e) =>
                                  setEnvValues({ ...envValues, [key]: e.target.value })
                                }
                                placeholder={t('enterEnvVar', { key })}
                                className="h-8 text-sm font-mono"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Settings2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
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
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Error Alert */}
          {installError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{installError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('close')}
            </Button>
            <Button
              onClick={handleInstall}
              disabled={isCurrentlyInstalled || isInstalling || isLoadingDetails}
            >
              {isInstalling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  {t('installing')}
                </>
              ) : isCurrentlyInstalled ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  {t('installed')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1.5" />
                  {t('install')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
