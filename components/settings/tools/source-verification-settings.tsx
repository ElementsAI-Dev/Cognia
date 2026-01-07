'use client';

/**
 * SourceVerificationSettings - Configure source verification for web search results
 * Allows setting verification mode, credibility thresholds, cross-validation,
 * and managing trusted/blocked domains.
 */

import { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  Settings2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettingsStore } from '@/stores';
import type { SourceVerificationMode } from '@/types/search';
import { cn } from '@/lib/utils';

interface SourceVerificationSettingsProps {
  className?: string;
  compact?: boolean;
}

const modeDescriptions: Record<SourceVerificationMode, { label: string; description: string }> = {
  ask: {
    label: '询问确认',
    description: '每次搜索后显示验证对话框，让您选择使用哪些来源',
  },
  auto: {
    label: '自动过滤',
    description: '自动应用可信度过滤，不显示对话框',
  },
  disabled: {
    label: '已禁用',
    description: '不进行来源验证，使用所有搜索结果',
  },
};

export function SourceVerificationSettings({ className, compact = false }: SourceVerificationSettingsProps) {
  const [newTrustedDomain, setNewTrustedDomain] = useState('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');
  const [domainsExpanded, setDomainsExpanded] = useState(false);

  // Settings from store
  const {
    sourceVerificationSettings,
    setSourceVerificationSettings,
    setSourceVerificationEnabled,
    setSourceVerificationMode,
    setMinimumCredibilityScore,
    setAutoFilterLowCredibility,
    setEnableCrossValidation,
    addTrustedDomain,
    removeTrustedDomain,
    addBlockedDomain,
    removeBlockedDomain,
  } = useSettingsStore();

  const {
    enabled,
    mode,
    minimumCredibilityScore,
    autoFilterLowCredibility,
    showVerificationBadges,
    trustedDomains,
    blockedDomains,
    enableCrossValidation,
  } = sourceVerificationSettings;

  const handleAddTrustedDomain = () => {
    const domain = newTrustedDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (domain && !trustedDomains.includes(domain)) {
      addTrustedDomain(domain);
      setNewTrustedDomain('');
    }
  };

  const handleAddBlockedDomain = () => {
    const domain = newBlockedDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (domain && !blockedDomains.includes(domain)) {
      addBlockedDomain(domain);
      setNewBlockedDomain('');
    }
  };

  const credibilityPercentage = Math.round(minimumCredibilityScore * 100);

  if (compact) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <Label htmlFor="source-verification-enabled" className="text-sm font-medium">
              信源验证
            </Label>
          </div>
          <Switch
            id="source-verification-enabled"
            checked={enabled}
            onCheckedChange={setSourceVerificationEnabled}
          />
        </div>

        {enabled && (
          <>
            {/* Mode Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">验证模式</Label>
              <Select value={mode} onValueChange={(value) => setSourceVerificationMode(value as SourceVerificationMode)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(modeDescriptions).map(([key, { label }]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                {trustedDomains.length} 可信
              </Badge>
              <Badge variant="outline" className="text-xs">
                <XCircle className="h-3 w-3 mr-1 text-red-500" />
                {blockedDomains.length} 屏蔽
              </Badge>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-base">信源验证</CardTitle>
          </div>
          <Switch
            id="source-verification-enabled-full"
            checked={enabled}
            onCheckedChange={setSourceVerificationEnabled}
          />
        </div>
        <CardDescription className="text-xs">
          验证搜索结果的可信度，过滤低质量来源，交叉验证信息准确性
        </CardDescription>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-6">
          {/* Verification Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">验证模式</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(modeDescriptions) as [SourceVerificationMode, typeof modeDescriptions['ask']][]).map(([key, { label, description }]) => (
                <TooltipProvider key={key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSourceVerificationMode(key)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                          mode === key
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {key === 'ask' && <ShieldQuestion className="h-5 w-5" />}
                        {key === 'auto' && <ShieldCheck className="h-5 w-5" />}
                        {key === 'disabled' && <ShieldAlert className="h-5 w-5 text-muted-foreground" />}
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="max-w-xs text-xs">{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Credibility Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">最低可信度阈值</Label>
              <span className="text-sm font-mono text-muted-foreground">{credibilityPercentage}%</span>
            </div>
            <Slider
              value={[credibilityPercentage]}
              onValueChange={([value]) => setMinimumCredibilityScore(value / 100)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>宽松</span>
              <span>严格</span>
            </div>
          </div>

          {/* Auto Filter Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">自动过滤低可信度</Label>
              <p className="text-xs text-muted-foreground">
                自动排除低于阈值的来源
              </p>
            </div>
            <Switch
              checked={autoFilterLowCredibility}
              onCheckedChange={setAutoFilterLowCredibility}
            />
          </div>

          {/* Cross Validation Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">启用交叉验证</Label>
              <p className="text-xs text-muted-foreground">
                分析多个来源之间的信息一致性
              </p>
            </div>
            <Switch
              checked={enableCrossValidation}
              onCheckedChange={setEnableCrossValidation}
            />
          </div>

          {/* Show Verification Badges */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">显示可信度徽章</Label>
              <p className="text-xs text-muted-foreground">
                在来源旁显示可信度指示器
              </p>
            </div>
            <Switch
              checked={showVerificationBadges}
              onCheckedChange={(checked) => setSourceVerificationSettings({ showVerificationBadges: checked })}
            />
          </div>

          {/* Domain Management */}
          <Collapsible open={domainsExpanded} onOpenChange={setDomainsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-auto py-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">域名管理</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {trustedDomains.length + blockedDomains.length} 个规则
                  </Badge>
                  <Settings2 className={cn('h-4 w-4 transition-transform', domainsExpanded && 'rotate-90')} />
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Trusted Domains */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  可信域名
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="example.com"
                    value={newTrustedDomain}
                    onChange={(e) => setNewTrustedDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTrustedDomain()}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddTrustedDomain}
                    disabled={!newTrustedDomain.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {trustedDomains.length > 0 && (
                  <ScrollArea className="h-24">
                    <div className="flex flex-wrap gap-1">
                      {trustedDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="text-xs pr-1">
                          <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                          {domain}
                          <button
                            onClick={() => removeTrustedDomain(domain)}
                            className="ml-1 hover:text-destructive"
                            title={`移除 ${domain}`}
                            aria-label={`移除 ${domain}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Blocked Domains */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  屏蔽域名
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="spam-site.com"
                    value={newBlockedDomain}
                    onChange={(e) => setNewBlockedDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedDomain()}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddBlockedDomain}
                    disabled={!newBlockedDomain.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {blockedDomains.length > 0 && (
                  <ScrollArea className="h-24">
                    <div className="flex flex-wrap gap-1">
                      {blockedDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="text-xs pr-1">
                          <XCircle className="h-3 w-3 mr-1 text-red-500" />
                          {domain}
                          <button
                            onClick={() => removeBlockedDomain(domain)}
                            className="ml-1 hover:text-destructive"
                            title={`移除 ${domain}`}
                            aria-label={`移除 ${domain}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Info Alert */}
          {mode === 'auto' && autoFilterLowCredibility && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                自动过滤已启用。低于 {credibilityPercentage}% 可信度的来源将被自动排除。
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default SourceVerificationSettings;
