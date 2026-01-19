'use client';

/**
 * Plugin Dependency Tree - Visualize plugin dependencies
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePluginStore } from '@/stores/plugin';
import {
  getDependencyResolver,
  type DependencyNode,
} from '@/lib/plugin/dependency-resolver';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  GitBranch,
  ChevronRight,
  ChevronDown,
  Package,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PluginDependencyTreeProps {
  pluginId?: string;
  className?: string;
}

interface TreeNodeProps {
  node: DependencyNode;
  depth: number;
  installedPlugins: Set<string>;
}

function TreeNode({ node, depth, installedPlugins }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const hasChildren = node.dependencies && node.dependencies.length > 0;
  const isInstalled = installedPlugins.has(node.id);

  return (
    <div className="select-none">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors',
            depth === 0 && 'font-medium'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <span className="w-5" />
          )}

          <Package className="h-4 w-4 text-muted-foreground" />

          <span className="flex-1 truncate">{node.id}</span>

          {node.version && (
            <Badge variant="outline" className="text-xs font-mono">
              {node.version}
            </Badge>
          )}


          {isInstalled ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>

        {hasChildren && (
          <CollapsibleContent>
            {node.dependencies.map((child, idx) => (
              <TreeNode
                key={`${child.id}-${idx}`}
                node={child}
                depth={depth + 1}
                installedPlugins={installedPlugins}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function PluginDependencyTree({
  pluginId,
  className,
}: PluginDependencyTreeProps) {
  const t = useTranslations('pluginDependencyTree');
  const { plugins, getEnabledPlugins } = usePluginStore();
  const [selectedPlugin, setSelectedPlugin] = useState<string | undefined>(pluginId);
  const [dependencyTree, setDependencyTree] = useState<DependencyNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const installedPlugins = useMemo(() => {
    return new Set(Object.keys(plugins));
  }, [plugins]);

  const enabledPlugins = getEnabledPlugins();

  useEffect(() => {
    if (!selectedPlugin) {
      setDependencyTree(null);
      return;
    }

    const plugin = plugins[selectedPlugin];
    if (!plugin) {
      setDependencyTree(null);
      return;
    }

    setIsLoading(true);

    const resolver = getDependencyResolver();
    resolver.buildDependencyTree(selectedPlugin).then((tree) => {
      setDependencyTree(tree);
      setIsLoading(false);
    }).catch(() => {
      setDependencyTree(null);
      setIsLoading(false);
    });
  }, [selectedPlugin, plugins]);

  const stats = useMemo(() => {
    if (!dependencyTree) return { total: 0, satisfied: 0, missing: 0 };

    let total = 0;
    let satisfied = 0;
    let missing = 0;

    const countNodes = (node: DependencyNode) => {
      if (node.dependencies) {
        for (const child of node.dependencies) {
          total++;
          if (installedPlugins.has(child.id)) {
            satisfied++;
          } else {
            missing++;
          }
          countNodes(child);
        }
      }
    };

    countNodes(dependencyTree);
    return { total, satisfied, missing };
  }, [dependencyTree, installedPlugins]);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {t('title')}
          </CardTitle>
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Plugin Selector */}
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {enabledPlugins.map((plugin) => (
            <Button
              key={plugin.manifest.id}
              variant={selectedPlugin === plugin.manifest.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlugin(plugin.manifest.id)}
            >
              {plugin.manifest.name}
            </Button>
          ))}
        </div>

        {/* Stats */}
        {dependencyTree && stats.total > 0 && (
          <div className="flex flex-wrap gap-3 mb-3 text-xs sm:text-sm shrink-0">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{t('stats.dependencies', { count: stats.total })}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{t('stats.satisfied', { count: stats.satisfied })}</span>
            </div>
            {stats.missing > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>{t('stats.missing', { count: stats.missing })}</span>
              </div>
            )}
          </div>
        )}

        {/* Tree View */}
        <ScrollArea className="flex-1 min-h-0">
          {!selectedPlugin ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t('emptyState.selectPlugin')}
              </p>
            </div>
          ) : !dependencyTree ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t('emptyState.noDependencies')}
              </p>
            </div>
          ) : (
            <TreeNode
              node={dependencyTree}
              depth={0}
              installedPlugins={installedPlugins}
            />
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export type { PluginDependencyTreeProps };
