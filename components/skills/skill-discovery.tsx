'use client';

/**
 * Skill Discovery Component
 *
 * Allows users to discover and install skills from configured repositories.
 * Uses the native skill service for repository-based skill management.
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Loader2,
  Package,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';
import {
  useSkillSync,
  useSkillSyncAvailable,
  useNativeSkills,
  useNativeSkillAvailable,
  type DiscoverableSkill,
} from '@/hooks/skills';
import { SkillRepoManagerDialog } from './skill-repo-manager-dialog';

interface SkillDiscoveryProps {
  className?: string;
  onSkillInstalled?: (skillName: string) => void;
}

/**
 * Skill card for discoverable skills
 */
function DiscoverableSkillCard({
  skill,
  isInstalling,
  isInstalled,
  onInstall,
}: {
  skill: DiscoverableSkill;
  isInstalling: boolean;
  isInstalled: boolean;
  onInstall: () => void;
}) {
  const t = useTranslations('skills');

  return (
    <Card className={cn('transition-all', isInstalled && 'border-green-500/50 bg-green-500/5')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              {skill.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1 text-xs">
              <GitBranch className="h-3 w-3" />
              {skill.repoOwner}/{skill.repoName}
            </CardDescription>
          </div>
          {isInstalled ? (
            <Badge variant="default" className="shrink-0 bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t('installed')}
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onInstall}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  {t('install')}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {skill.description || t('noDescription')}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="secondary" className="text-xs">
            {skill.directory}
          </Badge>
          {skill.readmeUrl && (
            <a
              href={skill.readmeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {t('viewSource')}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main skill discovery component
 */
export function SkillDiscovery({ className, onSkillInstalled }: SkillDiscoveryProps) {
  const t = useTranslations('skills');
  const isAvailable = useSkillSyncAvailable();
  const isNativeAvailable = useNativeSkillAvailable();

  const {
    discoverable,
    isDiscovering,
    isSyncing: _isSyncing, // Used for future sync status indicator
    syncError,
    discoverFromRepos,
    installFromRepo,
  } = useSkillSync();

  const {
    repos,
    installed,
    addRepo,
    removeRepo,
    toggleRepo,
  } = useNativeSkills();

  const [searchQuery, setSearchQuery] = useState('');
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());

  // Filter discoverable skills
  const filteredSkills = useMemo(() => {
    if (!searchQuery) return discoverable;
    const query = searchQuery.toLowerCase();
    return discoverable.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.directory.toLowerCase().includes(query)
    );
  }, [discoverable, searchQuery]);

  // Check if skill is already installed
  const isInstalled = useCallback(
    (skill: DiscoverableSkill) => {
      const legacyInstallName = skill.directory.split('/').pop() || skill.directory;
      return installed.some(
        (i) =>
          i.id === skill.key ||
          i.directory === skill.directory ||
          i.directory === legacyInstallName ||
          i.name === skill.name
      );
    },
    [installed]
  );

  // Handle skill installation
  const handleInstall = useCallback(
    async (skill: DiscoverableSkill) => {
      setInstallingIds((prev) => new Set(prev).add(skill.key));
      try {
        const result = await installFromRepo(skill);
        if (result) {
          toast.success(t('installed'), skill.name);
          onSkillInstalled?.(skill.name);
        }
      } catch (error) {
        toast.error(t('installFailed'), String(error));
      } finally {
        setInstallingIds((prev) => {
          const next = new Set(prev);
          next.delete(skill.key);
          return next;
        });
      }
    },
    [installFromRepo, onSkillInstalled, t]
  );

  // Not available in web mode
  if (!isAvailable) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">{t('nativeNotAvailable')}</p>
            <p className="text-sm mt-1">{t('nativeNotAvailableDesc')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchDiscoverable')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isNativeAvailable && (
            <SkillRepoManagerDialog
              repos={repos}
              onAddRepo={addRepo}
              onRemoveRepo={removeRepo}
              onToggleRepo={toggleRepo}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={discoverFromRepos}
            disabled={isDiscovering}
          >
            {isDiscovering ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {syncError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {syncError.startsWith('i18n:') ? t(syncError.replace('i18n:', '')) : syncError}
          </AlertDescription>
        </Alert>
      )}

      {/* Skills grid */}
      <ScrollArea className="max-h-[60vh]">
        {isDiscovering && discoverable.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">
              {searchQuery ? t('noSearchResults') : t('noDiscoverableSkills')}
            </p>
            <p className="text-sm mt-1">
              {searchQuery ? t('tryDifferentSearch') : t('clickRefreshToDiscover')}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={discoverFromRepos}
                disabled={isDiscovering}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('discoverSkills')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSkills.map((skill) => (
              <DiscoverableSkillCard
                key={skill.key}
                skill={skill}
                isInstalling={installingIds.has(skill.key)}
                isInstalled={isInstalled(skill)}
                onInstall={() => handleInstall(skill)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Stats */}
      {discoverable.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
          <span>
            {t('showingSkills', {
              count: filteredSkills.length,
              total: discoverable.length,
            })}
          </span>
          <span>
            {t('installedCount', { count: installed.length })}
          </span>
        </div>
      )}
    </div>
  );
}

export default SkillDiscovery;
