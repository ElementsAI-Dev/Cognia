'use client';

/**
 * Skill Marketplace Detail Dialog
 * Shows detailed information about a skill
 */

import { useTranslations } from 'next-intl';
import {
  Star,
  Download,
  CheckCircle,
  Loader2,
  ExternalLink,
  Package,
  User,
  Calendar,
  FileText,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SkillsMarketplaceItem, SkillsMarketplaceDetail as DetailType } from '@/types/skill/skill-marketplace';
import { formatSkillsStarCount, formatSkillsRelativeTime } from '@/types/skill/skill-marketplace';
import { useSkillMarketplace } from '@/hooks/skills/use-skill-marketplace';

interface SkillMarketplaceDetailProps {
  item: SkillsMarketplaceItem;
  detail: DetailType | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export function SkillMarketplaceDetail({
  item,
  detail,
  isLoading,
  isOpen,
  onClose,
  onInstall,
}: SkillMarketplaceDetailProps) {
  const t = useTranslations('skills');
  const { isInstalled, getInstallStatus } = useSkillMarketplace();

  const installStatus = getInstallStatus(item);
  const installed = isInstalled(item) || installStatus === 'installed';
  const installing = installStatus === 'installing';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                {item.name}
                {installed && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('installed') || 'Installed'}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {item.author}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {formatSkillsStarCount(item.stars)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatSkillsRelativeTime(item.updatedAt)}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">{item.description}</p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Content tabs */}
          <Tabs defaultValue="readme" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="readme" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                README
              </TabsTrigger>
              <TabsTrigger value="skillmd" className="text-xs">
                <Code className="h-3 w-3 mr-1" />
                SKILL.md
              </TabsTrigger>
            </TabsList>

            <TabsContent value="readme" className="mt-4">
              <ScrollArea className="h-[250px] border rounded-lg p-4">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : detail?.readmeContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-2 rounded">
                      {detail.readmeContent}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('marketplace.noReadme') || 'No README available'}
                  </p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="skillmd" className="mt-4">
              <ScrollArea className="h-[250px] border rounded-lg p-4">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : detail?.skillmdContent ? (
                  <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-2 rounded">
                    {detail.skillmdContent}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('marketplace.noSkillmd') || 'No SKILL.md available'}
                  </p>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('marketplace.repository') || 'Repository'}:</span>
              <a
                href={`https://github.com/${item.repository}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {item.repository}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {item.license && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('marketplace.license') || 'License'}:</span>
                <span>{item.license}</span>
              </div>
            )}
            {item.version && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('marketplace.version') || 'Version'}:</span>
                <span>{item.version}</span>
              </div>
            )}
            {item.downloads !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('marketplace.downloads') || 'Downloads'}:</span>
                <span>{item.downloads.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.close') || 'Close'}
          </Button>
          {!installed && (
            <Button onClick={onInstall} disabled={installing}>
              {installing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('marketplace.installing') || 'Installing...'}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t('install') || 'Install'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SkillMarketplaceDetail;
