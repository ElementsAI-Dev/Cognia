'use client';

/**
 * Clipboard Context Panel
 *
 * Enhanced clipboard panel with context awareness, smart actions,
 * content analysis, and template support.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useClipboardContext, CATEGORY_INFO, TRANSFORM_ACTIONS } from '@/hooks/context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/layout/feedback/empty-state';
import {
  Copy,
  RefreshCw,
  Clipboard,
  Wand2,
  FileText,
  Code,
  Link,
  Mail,
  Terminal,
  Braces,
  ShieldAlert,
  ExternalLink,
  Sparkles,
  Play,
  FileCode,
  Hash,
  Calendar,
  Globe,
  Palette,
  Database,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipboardContextPanelProps {
  className?: string;
}

export function ClipboardContextPanel({ className }: ClipboardContextPanelProps) {
  const t = useTranslations('clipboardContextPanel');
  const [activeTab, setActiveTab] = useState('current');

  const {
    content,
    analysis,
    isAnalyzing,
    isMonitoring,
    error,
    hasSensitiveContent,
    contentPreview,
    category,
    language,
    entities,
    suggestedActions,
    stats,
    formatting,
    readAndAnalyze,
    quickTransform,
    executeAction,
    getApplicableTransforms,
    startMonitoring,
    stopMonitoring,
    writeText,
    clearClipboard,
  } = useClipboardContext({ autoMonitor: true });

  const applicableTransforms = useMemo(() => getApplicableTransforms(), [getApplicableTransforms]);

  const getCategoryIcon = (cat?: string) => {
    switch (cat) {
      case 'Code':
      case 'Sql':
        return <Code className="h-4 w-4" />;
      case 'Url':
        return <Link className="h-4 w-4" />;
      case 'Email':
        return <Mail className="h-4 w-4" />;
      case 'Command':
        return <Terminal className="h-4 w-4" />;
      case 'Json':
        return <Braces className="h-4 w-4" />;
      case 'Markup':
      case 'Markdown':
        return <FileCode className="h-4 w-4" />;
      case 'Color':
        return <Palette className="h-4 w-4" />;
      case 'DateTime':
        return <Calendar className="h-4 w-4" />;
      case 'Uuid':
        return <Hash className="h-4 w-4" />;
      case 'IpAddress':
        return <Globe className="h-4 w-4" />;
      case 'StructuredData':
        return <Database className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const categoryInfo = category ? CATEGORY_INFO[category] : null;

  return (
    <div className={cn('flex flex-col h-full min-h-0 overflow-hidden', className)}>
      <div className="flex items-center justify-between p-2 sm:p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Clipboard className="h-5 w-5" />
          <span className="font-medium">{t('title')}</span>
          {isMonitoring && (
            <Badge variant="secondary" className="text-xs">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1" />
              {t('monitoring')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => (isMonitoring ? stopMonitoring() : startMonitoring())}
              >
                {isMonitoring ? (
                  <span className="h-4 w-4 rounded bg-red-500" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('toggleMonitoring')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={readAndAnalyze}
                disabled={isAnalyzing}
              >
                <RefreshCw className={cn('h-4 w-4', isAnalyzing && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('refreshClipboard')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 mx-2 mt-2 grid w-auto grid-cols-3">
          <TabsTrigger value="current" className="text-xs">
            {t('current')}
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            {t('actions')}
          </TabsTrigger>
          <TabsTrigger value="entities" className="text-xs">
            {t('entities')}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="current"
          className="flex-1 m-0 mt-2 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-3">
              {error && (
                <div className="text-sm text-destructive p-2 bg-destructive/10 rounded">
                  {error}
                </div>
              )}

              {content ? (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span>{categoryInfo?.label || t('content')}</span>
                        </div>
                        {hasSensitiveContent && (
                          <Badge variant="destructive" className="text-xs">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            {t('sensitive')}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div
                        className={cn(
                          'p-2 rounded bg-muted/50 text-sm font-mono',
                          formatting?.preserve_whitespace && 'whitespace-pre-wrap',
                          'max-h-40 overflow-auto'
                        )}
                      >
                        {contentPreview || content}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {category && (
                          <Badge variant="secondary" className="text-xs">
                            {categoryInfo?.label}
                          </Badge>
                        )}
                        {language && (
                          <Badge variant="outline" className="text-xs">
                            {language}
                          </Badge>
                        )}
                        {analysis?.confidence && (
                          <div className="flex justify-between text-xs mb-1">
                            <span>
                              {Math.round(analysis.confidence * 100)}% {t('confidence')}
                            </span>
                          </div>
                        )}
                      </div>

                      {stats && (
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>
                            {stats.char_count} {t('chars')}
                          </div>
                          <div>
                            {stats.word_count} {t('words')}
                          </div>
                          <div>
                            {stats.line_count} {t('lines')}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        {t('quickActions')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => writeText(content)}
                          className="text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {t('copy')}
                        </Button>

                        {applicableTransforms.slice(0, 3).map((transform) => (
                          <Button
                            key={transform.id}
                            size="sm"
                            variant="outline"
                            onClick={() => quickTransform(transform.id)}
                            className="text-xs"
                          >
                            {transform.label}
                          </Button>
                        ))}

                        {applicableTransforms.length > 3 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>{t('moreTransforms')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {applicableTransforms.slice(3).map((transform) => (
                                <DropdownMenuItem
                                  key={transform.id}
                                  onClick={() => quickTransform(transform.id)}
                                >
                                  {transform.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearClipboard}
                          className="text-xs text-destructive"
                        >
                          {t('clear')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <EmptyState
                  icon={Clipboard}
                  title={t('noClipboardContent')}
                  description={t('copyToSeeAnalysis')}
                  compact
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="actions"
          className="flex-1 m-0 mt-2 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-2">
              {suggestedActions.length > 0 ? (
                suggestedActions.map((action) => (
                  <Button
                    key={action.action_id}
                    variant="outline"
                    data-testid={`suggested-action-${action.action_id}`}
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => executeAction(action.action_id)}
                  >
                    <div className="flex items-start gap-2">
                      <ActionIcon actionId={action.action_id} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{action.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <EmptyState
                  icon={Wand2}
                  title={t('noSuggestedActions')}
                  description={t('actionsWillAppear')}
                  compact
                />
              )}

              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {t('allTransforms')}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {TRANSFORM_ACTIONS.map((transform) => (
                    <Button
                      key={transform.id}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-xs h-8"
                      onClick={() => quickTransform(transform.id)}
                      disabled={!content}
                    >
                      {transform.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="entities"
          className="flex-1 m-0 mt-2 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-2">
              {entities.length > 0 ? (
                entities.map((entity, index) => (
                  <Card key={index} className="p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Badge variant="secondary" className="text-xs mb-1">
                          {entity.entity_type}
                        </Badge>
                        <div className="text-sm font-mono truncate">{entity.value}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => writeText(entity.value)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {entity.entity_type === 'url' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => window.open(entity.value, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {entity.entity_type === 'email' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => window.open(`mailto:${entity.value}`, '_blank')}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={Hash}
                  title={t('noEntitiesDetected')}
                  description={t('entitiesWillAppear')}
                  compact
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActionIcon({ actionId }: { actionId: string }) {
  switch (actionId) {
    case 'copy':
      return <Copy className="h-4 w-4 shrink-0" />;
    case 'open_url':
      return <ExternalLink className="h-4 w-4 shrink-0" />;
    case 'compose_email':
      return <Mail className="h-4 w-4 shrink-0" />;
    case 'format_json':
    case 'minify_json':
    case 'validate_json':
      return <Braces className="h-4 w-4 shrink-0" />;
    case 'format_code':
    case 'explain_code':
      return <Code className="h-4 w-4 shrink-0" />;
    case 'open_file':
      return <FileText className="h-4 w-4 shrink-0" />;
    case 'convert_color':
      return <Palette className="h-4 w-4 shrink-0" />;
    case 'summarize':
    case 'translate':
      return <Sparkles className="h-4 w-4 shrink-0" />;
    case 'extract_urls':
      return <Link className="h-4 w-4 shrink-0" />;
    default:
      return <Wand2 className="h-4 w-4 shrink-0" />;
  }
}

export default ClipboardContextPanel;
