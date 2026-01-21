'use client';

/**
 * SourceVerificationSettings - Configure source verification for web search results
 * Allows setting verification mode, credibility thresholds, cross-validation,
 * and managing trusted/blocked domains.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettingsStore } from '@/stores';
import { VERIFICATION_MODE_KEYS } from '@/lib/settings/tools';
import type { SourceVerificationMode } from '@/types/search';
import type { SourceVerificationSettingsProps } from '@/types/settings/tools';
import { cn } from '@/lib/utils';

export function SourceVerificationSettings({
  className,
  compact = false,
}: SourceVerificationSettingsProps) {
  const t = useTranslations('sourceVerification');
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
    const domain = newTrustedDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
    if (domain && !trustedDomains.includes(domain)) {
      addTrustedDomain(domain);
      setNewTrustedDomain('');
    }
  };

  const handleAddBlockedDomain = () => {
    const domain = newBlockedDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
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
              {t('title')}
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
              <Label className="text-xs text-muted-foreground">{t('verificationMode')}</Label>
              <Select
                value={mode}
                onValueChange={(value) =>
                  setSourceVerificationMode(value as SourceVerificationMode)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VERIFICATION_MODE_KEYS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {t(label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                {trustedDomains.length} {t('trusted')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <XCircle className="h-3 w-3 mr-1 text-red-500" />
                {blockedDomains.length} {t('blocked')}
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
            <CardTitle className="text-base">{t('title')}</CardTitle>
          </div>
          <Switch
            id="source-verification-enabled-full"
            checked={enabled}
            onCheckedChange={setSourceVerificationEnabled}
          />
        </div>
        <CardDescription className="text-xs">{t('description')}</CardDescription>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-6">
          {/* Verification Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('verificationMode')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                Object.entries(VERIFICATION_MODE_KEYS) as [
                  SourceVerificationMode,
                  (typeof VERIFICATION_MODE_KEYS)['ask'],
                ][]
              ).map(([key, { label, description }]) => (
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
                        {key === 'disabled' && (
                          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium">{t(label)}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="max-w-xs text-xs">{t(description)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Credibility Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('minimumThreshold')}</Label>
              <span className="text-sm font-mono text-muted-foreground">
                {credibilityPercentage}%
              </span>
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
              <span>{t('loose')}</span>
              <span>{t('strict')}</span>
            </div>
          </div>

          {/* Auto Filter Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('autoFilterLow')}</Label>
              <p className="text-xs text-muted-foreground">{t('autoFilterLowDesc')}</p>
            </div>
            <Switch
              checked={autoFilterLowCredibility}
              onCheckedChange={setAutoFilterLowCredibility}
            />
          </div>

          {/* Cross Validation Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('enableCrossValidation')}</Label>
              <p className="text-xs text-muted-foreground">{t('enableCrossValidationDesc')}</p>
            </div>
            <Switch checked={enableCrossValidation} onCheckedChange={setEnableCrossValidation} />
          </div>

          {/* Show Verification Badges */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t('showBadges')}</Label>
              <p className="text-xs text-muted-foreground">{t('showBadgesDesc')}</p>
            </div>
            <Switch
              checked={showVerificationBadges}
              onCheckedChange={(checked) =>
                setSourceVerificationSettings({ showVerificationBadges: checked })
              }
            />
          </div>

          {/* Domain Management */}
          <Collapsible open={domainsExpanded} onOpenChange={setDomainsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-auto py-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('domainManagement')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {trustedDomains.length + blockedDomains.length} {t('rules')}
                  </Badge>
                  <Settings2
                    className={cn('h-4 w-4 transition-transform', domainsExpanded && 'rotate-90')}
                  />
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Trusted Domains */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {t('trustedDomains')}
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
                            title={t('removeDomain', { domain })}
                            aria-label={t('removeDomain', { domain })}
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
                  {t('blockedDomains')}
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
                            title={t('removeDomain', { domain })}
                            aria-label={t('removeDomain', { domain })}
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
                {t('autoFilterWarning', { percentage: credibilityPercentage })}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default SourceVerificationSettings;
