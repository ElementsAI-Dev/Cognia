/**
 * Template Preview Component
 * 
 * Displays detailed information about a workflow template
 */

'use client';

import type { WorkflowTemplate } from '@/types/workflow/template';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Star, Download, User, Calendar, GitBranch, FileJson } from 'lucide-react';

interface TemplatePreviewProps {
  template: WorkflowTemplate;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-2xl font-bold">{template.name}</h3>
            {template.metadata.isOfficial && (
              <Badge variant="default">Official</Badge>
            )}
            <Badge variant="outline">{template.version}</Badge>
          </div>
          <p className="text-muted-foreground">{template.description}</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          <div>
            <div className="text-sm font-medium">
              {template.metadata.rating.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              {template.metadata.ratingCount} ratings
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <div>
            <div className="text-sm font-medium">
              {template.metadata.usageCount}
            </div>
            <div className="text-xs text-muted-foreground">uses</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <div>
            <div className="text-sm font-medium">{template.author}</div>
            <div className="text-xs text-muted-foreground">author</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <div>
            <div className="text-sm font-medium">
              {new Date(template.metadata.createdAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">created</div>
          </div>
        </div>
      </div>

      {/* Git Info */}
      {template.metadata.source === 'git' && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <GitBranch className="h-4 w-4" />
          <div className="flex-1">
            <div className="text-sm font-medium">
              {template.metadata.gitUrl}
            </div>
            <div className="text-xs text-muted-foreground">
              Branch: {template.metadata.gitBranch}
            </div>
          </div>
          {template.metadata.lastSyncAt && (
            <div className="text-xs text-muted-foreground">
              Last sync: {new Date(template.metadata.lastSyncAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">
              {template.description}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Source</h4>
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
            <h4 className="font-semibold mb-2">Workflow Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>{' '}
                {template.workflow.type}
              </div>
              <div>
                <span className="text-muted-foreground">Version:</span>{' '}
                {template.workflow.version}
              </div>
              <div>
                <span className="text-muted-foreground">Nodes:</span>{' '}
                {template.workflow.nodes?.length || 0}
              </div>
              <div>
                <span className="text-muted-foreground">Edges:</span>{' '}
                {template.workflow.edges?.length || 0}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Workflow Settings</h4>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(template.workflow.settings, null, 2)}
              </pre>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Full Metadata</h4>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(template.metadata, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Template Data</h4>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
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
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="lg" className="flex-1">
          Use Template
        </Button>
        <Button size="lg" variant="outline">
          Clone Template
        </Button>
        <Button size="lg" variant="ghost">
          <FileJson className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
}
