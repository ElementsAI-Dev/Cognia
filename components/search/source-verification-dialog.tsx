'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Building2,
  GraduationCap,
  Newspaper,
  BookOpen,
  Users,
  MessageSquare,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Settings2,
} from 'lucide-react';
import type {
  VerifiedSearchResult,
  VerifiedSearchResponse,
  SourceType,
  CredibilityLevel,
} from '@/types/search';
import { cn } from '@/lib/utils';

interface SourceVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchResponse: VerifiedSearchResponse;
  onConfirm: (selectedResults: VerifiedSearchResult[]) => void;
  onSkip: () => void;
  onRememberChoice?: (choice: 'always-ask' | 'always-use' | 'always-skip') => void;
  onMarkTrusted?: (domain: string) => void;
  onMarkBlocked?: (domain: string) => void;
}

const sourceTypeIcons: Record<SourceType, React.ReactNode> = {
  government: <Building2 className="h-4 w-4" />,
  academic: <GraduationCap className="h-4 w-4" />,
  news: <Newspaper className="h-4 w-4" />,
  reference: <BookOpen className="h-4 w-4" />,
  organization: <Users className="h-4 w-4" />,
  corporate: <Building2 className="h-4 w-4" />,
  blog: <MessageSquare className="h-4 w-4" />,
  social: <Globe className="h-4 w-4" />,
  forum: <MessageSquare className="h-4 w-4" />,
  unknown: <HelpCircle className="h-4 w-4" />,
};

const sourceTypeLabels: Record<SourceType, string> = {
  government: '政府',
  academic: '学术',
  news: '新闻',
  reference: '参考资料',
  organization: '组织',
  corporate: '企业',
  blog: '博客',
  social: '社交媒体',
  forum: '论坛',
  unknown: '未知',
};

const credibilityColors: Record<CredibilityLevel, string> = {
  high: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-red-500/10 text-red-600 border-red-500/20',
  unknown: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const credibilityIcons: Record<CredibilityLevel, React.ReactNode> = {
  high: <ShieldCheck className="h-4 w-4 text-green-500" />,
  medium: <Shield className="h-4 w-4 text-yellow-500" />,
  low: <ShieldAlert className="h-4 w-4 text-red-500" />,
  unknown: <ShieldQuestion className="h-4 w-4 text-gray-500" />,
};

const credibilityLabels: Record<CredibilityLevel, string> = {
  high: '高可信度',
  medium: '中等可信度',
  low: '低可信度',
  unknown: '未知',
};

function SourceCard({
  result,
  isSelected,
  onToggle,
  onMarkTrusted,
  onMarkBlocked,
}: {
  result: VerifiedSearchResult;
  isSelected: boolean;
  onToggle: () => void;
  onMarkTrusted: () => void;
  onMarkBlocked: () => void;
}) {
  const verification = result.verification;
  const credibilityLevel = verification?.credibilityLevel || 'unknown';
  const sourceType = verification?.sourceType || 'unknown';

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
        verification?.userMarked === 'blocked' && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          disabled={verification?.userMarked === 'blocked'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn('p-1 rounded', credibilityColors[credibilityLevel])}>
                    {credibilityIcons[credibilityLevel]}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{credibilityLabels[credibilityLevel]}</p>
                  {verification && (
                    <p className="text-xs text-muted-foreground">
                      分数: {Math.round(verification.credibilityScore * 100)}%
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Badge variant="outline" className="text-xs">
              {sourceTypeIcons[sourceType]}
              <span className="ml-1">{sourceTypeLabels[sourceType]}</span>
            </Badge>

            {verification?.isHttps && (
              <Badge variant="outline" className="text-xs text-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" />
                HTTPS
              </Badge>
            )}

            {verification?.userMarked === 'trusted' && (
              <Badge className="text-xs bg-green-500">
                <ThumbsUp className="h-3 w-3 mr-1" />
                已信任
              </Badge>
            )}

            {verification?.userMarked === 'blocked' && (
              <Badge className="text-xs bg-red-500">
                <ThumbsDown className="h-3 w-3 mr-1" />
                已屏蔽
              </Badge>
            )}
          </div>

          <h4 className="font-medium text-sm line-clamp-1 mb-1">
            {result.title}
          </h4>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {result.content}
          </p>

          <div className="flex items-center justify-between">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {verification?.domain || new URL(result.url).hostname}
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkTrusted();
                      }}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>标记为可信来源</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkBlocked();
                      }}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>标记为不可信来源</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {verification && verification.trustIndicators.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {verification.trustIndicators.slice(0, 3).map((indicator, i) => (
                <Badge key={i} variant="outline" className="text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {indicator}
                </Badge>
              ))}
            </div>
          )}

          {verification && verification.warningIndicators.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {verification.warningIndicators.slice(0, 3).map((indicator, i) => (
                <Badge key={i} variant="outline" className="text-xs text-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {indicator}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SourceVerificationDialog({
  open,
  onOpenChange,
  searchResponse,
  onConfirm,
  onSkip,
  onRememberChoice,
  onMarkTrusted,
  onMarkBlocked,
}: SourceVerificationDialogProps) {
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(() => {
    const urls = new Set<string>();
    searchResponse.results.forEach((result) => {
      if (result.isEnabled) {
        urls.add(result.url);
      }
    });
    return urls;
  });

  const toggleResult = useCallback((url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedUrls(new Set(searchResponse.results.map((r) => r.url)));
  }, [searchResponse.results]);

  const selectNone = useCallback(() => {
    setSelectedUrls(new Set());
  }, []);

  const selectHighCredibility = useCallback(() => {
    setSelectedUrls(
      new Set(
        searchResponse.results
          .filter((r) => r.verification?.credibilityLevel === 'high')
          .map((r) => r.url)
      )
    );
  }, [searchResponse.results]);

  const handleConfirm = useCallback(() => {
    const selectedResults = searchResponse.results.filter((r) =>
      selectedUrls.has(r.url)
    );
    onConfirm(selectedResults);
  }, [searchResponse.results, selectedUrls, onConfirm]);

  const report = searchResponse.verificationReport;

  const stats = useMemo(() => {
    const total = searchResponse.results.length;
    const selected = selectedUrls.size;
    const high = searchResponse.results.filter(
      (r) => r.verification?.credibilityLevel === 'high'
    ).length;
    const medium = searchResponse.results.filter(
      (r) => r.verification?.credibilityLevel === 'medium'
    ).length;
    const low = searchResponse.results.filter(
      (r) => r.verification?.credibilityLevel === 'low'
    ).length;

    return { total, selected, high, medium, low };
  }, [searchResponse.results, selectedUrls]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            信源验证
          </DialogTitle>
          <DialogDescription>
            搜索找到 {stats.total} 个来源。请选择要使用的信源，或跳过直接使用全部。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="sources" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sources">信源列表</TabsTrigger>
            <TabsTrigger value="report">验证报告</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>已选择 {stats.selected} / {stats.total}</span>
                <span className="text-green-500">高: {stats.high}</span>
                <span className="text-yellow-500">中: {stats.medium}</span>
                <span className="text-red-500">低: {stats.low}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  全选
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  全不选
                </Button>
                <Button variant="outline" size="sm" onClick={selectHighCredibility}>
                  仅高可信度
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {searchResponse.results.map((result) => (
                  <SourceCard
                    key={result.url}
                    result={result}
                    isSelected={selectedUrls.has(result.url)}
                    onToggle={() => toggleResult(result.url)}
                    onMarkTrusted={() => {
                      const domain = result.verification?.domain || result.verification?.rootDomain;
                      if (domain && onMarkTrusted) {
                        onMarkTrusted(domain);
                        // Also select this source if marking as trusted
                        setSelectedUrls((prev) => new Set([...prev, result.url]));
                      }
                    }}
                    onMarkBlocked={() => {
                      const domain = result.verification?.domain || result.verification?.rootDomain;
                      if (domain && onMarkBlocked) {
                        onMarkBlocked(domain);
                        // Also deselect this source if marking as blocked
                        setSelectedUrls((prev) => {
                          const next = new Set(prev);
                          next.delete(result.url);
                          return next;
                        });
                      }
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            {report ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">可信度分布</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          高可信度
                        </span>
                        <span className="font-medium">{report.highCredibility}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4 text-yellow-500" />
                          中等可信度
                        </span>
                        <span className="font-medium">{report.mediumCredibility}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                          低可信度
                        </span>
                        <span className="font-medium">{report.lowCredibility}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">总体评估</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">平均可信度</span>
                        <span className="font-medium">
                          {Math.round(report.averageCredibility * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">信源总数</span>
                        <span className="font-medium">{report.totalSources}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {report.recommendations && report.recommendations.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">建议</h4>
                    <ul className="space-y-1">
                      {report.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.crossValidation && report.crossValidation.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">交叉验证</h4>
                    <div className="space-y-3">
                      {report.crossValidation.slice(0, 3).map((cv, i) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium">{cv.claim}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="text-green-500">
                              支持: {cv.supportingSources.length}
                            </span>
                            <span className="text-red-500">
                              反对: {cv.contradictingSources.length}
                            </span>
                            <span>
                              共识度: {Math.round(cv.consensusScore * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                暂无验证报告
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 mr-auto">
            {onRememberChoice && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRememberChoice('always-use')}
              >
                <Settings2 className="h-4 w-4 mr-1" />
                记住选择
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onSkip}>
            跳过验证
          </Button>
          <Button onClick={handleConfirm} disabled={selectedUrls.size === 0}>
            使用已选信源 ({selectedUrls.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
