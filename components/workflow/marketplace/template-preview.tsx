/**
 * Template Preview Component
 * 
 * Displays detailed information about a workflow template
 */

'use client';

import { useTranslations } from 'next-intl';
import type { WorkflowTemplate } from '@/types/workflow/template';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Star, Download, User, Calendar, GitBranch, FileJson } from 'lucide-react';
import { InlineCopyButton } from '@/components/chat/ui/copy-button';

interface TemplatePreviewProps {
  template: WorkflowTemplate;
  onUse?: (template: WorkflowTemplate) => void;
  onClone?: (template: WorkflowTemplate) => void;
  onExport?: (template: WorkflowTemplate) => void;
}

export function TemplatePreview({
  template,
  onUse,
  onClone,
  onExport,
}: TemplatePreviewProps) {
  const t = useTranslations('marketplace.previewPanel');
  const tMarketplace = useTranslations('marketplace');

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold">{template.name}</h3>
              {template.metadata.isOfficial && (
                <Badge variant="default">{tMarketplace('official')}</Badge>
              )}
              <Badge variant="outline">{template.version}</Badge>
            </div>
            <p className="text-muted-foreground">{template.description}</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <Star className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium">
                    {template.metadata.rating.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {template.metadata.ratingCount} {t('ratings')}
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>{t('ratings')}</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <div>
              <div className="text-sm font-medium">
                {template.metadata.usageCount}
              </div>
              <div className="text-xs text-muted-foreground">{t('uses')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <div>
              <div className="text-sm font-medium">{template.author}</div>
              <div className="text-xs text-muted-foreground">{t('author')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <div>
              <div className="text-sm font-medium">
                {new Date(template.metadata.createdAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground">{t('created')}</div>
            </div>
          </div>
        </div>

        {/* Git Info */}
        {template.metadata.source === 'git' && (
          <Card>
            <CardContent className="flex items-center gap-2 p-3">
              <GitBranch className="h-4 w-4" />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {template.metadata.gitUrl}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('branch')}: {template.metadata.gitBranch}
                </div>
              </div>
              {template.metadata.lastSyncAt && (
                <div className="text-xs text-muted-foreground">
                  {t('lastSync')}: {new Date(template.metadata.lastSyncAt).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
            <TabsTrigger value="workflow">{t('workflow')}</TabsTrigger>
            <TabsTrigger value="metadata">{t('metadata')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{t('description')}</h4>
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">{t('tags')}</h4>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">{t('source')}</h4>
              <Badge
                variant={
                  template.metadata.source === 'built-in'
                    ? 'default'
                    : template.metadata.source === 'user'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {template.metadata.source}
              </Badge>
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{t('workflowDetails')}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('type')}:</span>{' '}
                  {template.workflow.type}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('version')}:</span>{' '}
                  {template.workflow.version}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('nodes')}:</span>{' '}
                  {template.workflow.nodes?.length || 0}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('edges')}:</span>{' '}
                  {template.workflow.edges?.length || 0}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">{t('workflowSettings')}</h4>
              <Card>
                <CardContent className="p-4 relative">
                  <InlineCopyButton
                    content={JSON.stringify(template.workflow.settings, null, 2)}
                    className="absolute top-2 right-2"
                  />
                  <ScrollArea className="max-h-48">
                    <pre className="text-xs overflow-x-auto font-mono bg-muted/50 p-2 rounded">
                      {JSON.stringify(template.workflow.settings, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{t('fullMetadata')}</h4>
              <Card>
                <CardContent className="p-4 relative">
                  <InlineCopyButton
                    content={JSON.stringify(template.metadata, null, 2)}
                    className="absolute top-2 right-2"
                  />
                  <ScrollArea className="max-h-48">
                    <pre className="text-xs overflow-x-auto font-mono bg-muted/50 p-2 rounded">
                      {JSON.stringify(template.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-semibold mb-2">{t('templateData')}</h4>
              <Card>
                <CardContent className="p-4 relative">
                  <InlineCopyButton
                    content={JSON.stringify(
                      {
                        id: template.id,
                        name: template.name,
                        description: template.description,
                        category: template.category,
                        tags: template.tags,
                        author: template.author,
                        version: template.version,
                      },
                      null,
                      2
                    )}
                    className="absolute top-2 right-2"
                  />
                  <ScrollArea className="max-h-48">
                    <pre className="text-xs overflow-x-auto font-mono bg-muted/50 p-2 rounded">
                      {JSON.stringify(
                        {
                          id: template.id,
                          name: template.name,
                          description: template.description,
                          category: template.category,
                          tags: template.tags,
                          author: template.author,
                          version: template.version,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => onUse?.(template)}
            disabled={!onUse}
          >
            {tMarketplace('useTemplate')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onClone?.(template)}
            disabled={!onClone}
          >
            {tMarketplace('cloneTemplate')}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => onExport?.(template)}
                disabled={!onExport}
              >
                <FileJson className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('export')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
