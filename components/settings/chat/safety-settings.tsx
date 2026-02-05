'use client';

/**
 * Safety Mode Settings - Configure security checks and content filtering
 */

import { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Plus, X, ExternalLink, Settings2, MessageSquare, Wrench, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { useSettingsStore } from '@/stores';
import { useTranslations } from 'next-intl';
import type { SafetyMode, SafetyRule } from '@/stores/settings/settings-store';
import { Separator } from '@/components/ui/separator';
import { getSeverityBadgeVariant } from '@/lib/settings/chat';

export function SafetySettings() {
  const t = useTranslations('safetySettings');
  const {
    safetyModeSettings,
    setSafetyModeEnabled,
    setSafetyMode,
    setCheckUserInput,
    setCheckSystemPrompt,
    setCheckToolCalls,
    setBlockDangerousCommands,
    addSafetyRule,
    removeSafetyRule,
    enableSafetyRule,
    disableSafetyRule,
    addCustomBlockedPattern,
    removeCustomBlockedPattern,
    addCustomAllowedPattern,
    removeCustomAllowedPattern,
    setExternalReviewConfig,
    setLogSafetyEvents,
    setShowSafetyWarnings,
    resetSafetyModeSettings,
  } = useSettingsStore();

  const [newBlockedPattern, setNewBlockedPattern] = useState('');
  const [newAllowedPattern, setNewAllowedPattern] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newRuleTypes, setNewRuleTypes] = useState<Array<'input' | 'system' | 'toolCall'>>(['input', 'system', 'toolCall']);
  const [newRuleDescription, setNewRuleDescription] = useState('');

  const handleAddCustomBlockedPattern = () => {
    if (newBlockedPattern.trim()) {
      addCustomBlockedPattern(newBlockedPattern.trim());
      setNewBlockedPattern('');
    }
  };

  const handleAddCustomAllowedPattern = () => {
    if (newAllowedPattern.trim()) {
      addCustomAllowedPattern(newAllowedPattern.trim());
      setNewAllowedPattern('');
    }
  };

  const handleAddSafetyRule = () => {
    if (newRuleName.trim() && newRulePattern.trim()) {
      addSafetyRule({
        name: newRuleName.trim(),
        pattern: newRulePattern.trim(),
        type: newRuleTypes,
        severity: newRuleSeverity,
        description: newRuleDescription.trim() || 'Custom safety rule',
        enabled: true,
      });
      setNewRuleName('');
      setNewRulePattern('');
      setNewRuleSeverity('medium');
      setNewRuleTypes(['input', 'system', 'toolCall']);
      setNewRuleDescription('');
    }
  };

  const handleToggleRule = (rule: SafetyRule) => {
    if (rule.enabled) {
      disableSafetyRule(rule.id);
    } else {
      enableSafetyRule(rule.id);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    removeSafetyRule(ruleId);
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>{t('title')}</CardTitle>
            </div>
            <Switch
              checked={safetyModeSettings.enabled}
              onCheckedChange={setSafetyModeEnabled}
            />
          </div>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        {safetyModeSettings.enabled && (
          <CardContent className="space-y-4">
            {/* Mode Selection */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="safety-mode">{t('detectionMode')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('detectionModeDesc')}
                </p>
              </div>
              <Select
                value={safetyModeSettings.mode}
                onValueChange={(value: SafetyMode) => setSafetyMode(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">{t('modeOff')}</SelectItem>
                  <SelectItem value="warn">{t('modeWarn')}</SelectItem>
                  <SelectItem value="block">{t('modeBlock')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Check Options */}
            <div className="space-y-3">
              <Label>{t('checkTargets')}</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="check-user-input" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" />
                  {t('userMessages')}
                </Label>
                <Switch
                  id="check-user-input"
                  checked={safetyModeSettings.checkUserInput}
                  onCheckedChange={setCheckUserInput}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="check-system-prompt" className="flex items-center gap-2 cursor-pointer">
                  <Settings2 className="h-4 w-4" />
                  {t('systemPrompts')}
                </Label>
                <Switch
                  id="check-system-prompt"
                  checked={safetyModeSettings.checkSystemPrompt}
                  onCheckedChange={setCheckSystemPrompt}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="check-tool-calls" className="flex items-center gap-2 cursor-pointer">
                  <Wrench className="h-4 w-4" />
                  {t('toolCalls')}
                </Label>
                <Switch
                  id="check-tool-calls"
                  checked={safetyModeSettings.checkToolCalls}
                  onCheckedChange={setCheckToolCalls}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="block-dangerous" className="flex items-center gap-2 cursor-pointer">
                  <AlertTriangle className="h-4 w-4" />
                  {t('blockDangerousCommands')}
                </Label>
                <Switch
                  id="block-dangerous"
                  checked={safetyModeSettings.blockDangerousCommands}
                  onCheckedChange={setBlockDangerousCommands}
                />
              </div>
            </div>

            {/* Logging Options */}
            <div className="space-y-3">
              <Label>{t('loggingNotifications')}</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="log-events" className="flex items-center gap-2 cursor-pointer">
                  {t('logSafetyEvents')}
                </Label>
                <Switch
                  id="log-events"
                  checked={safetyModeSettings.logSafetyEvents}
                  onCheckedChange={setLogSafetyEvents}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-warnings" className="flex items-center gap-2 cursor-pointer">
                  {t('showWarnings')}
                </Label>
                <Switch
                  id="show-warnings"
                  checked={safetyModeSettings.showSafetyWarnings}
                  onCheckedChange={setShowSafetyWarnings}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Custom Patterns */}
      {safetyModeSettings.enabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                {t('customPatterns')}
              </CardTitle>
              <CardDescription>
                {t('customPatternsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Blocked Patterns */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    <Label>{t('blockedPatterns')}</Label>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('enterPatternToBlock')}
                      value={newBlockedPattern}
                      onChange={(e) => setNewBlockedPattern(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomBlockedPattern()}
                    />
                    <Button onClick={handleAddCustomBlockedPattern} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {safetyModeSettings.customBlockedPatterns.map((pattern, index) => (
                      <Badge key={index} variant="destructive" className="flex items-center gap-1">
                        {typeof pattern === 'string' ? pattern : pattern.toString()}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-red-500/20"
                          onClick={() => removeCustomBlockedPattern(pattern)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Allowed Patterns */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <Label>{t('allowedPatterns')}</Label>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('enterPatternToAllow')}
                      value={newAllowedPattern}
                      onChange={(e) => setNewAllowedPattern(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomAllowedPattern()}
                    />
                    <Button onClick={handleAddCustomAllowedPattern} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {safetyModeSettings.customAllowedPatterns.map((pattern, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {typeof pattern === 'string' ? pattern : pattern.toString()}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-green-500/20"
                          onClick={() => removeCustomAllowedPattern(pattern)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Safety Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {t('safetyRules')}
              </CardTitle>
              <CardDescription>
                {t('safetyRulesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Rule */}
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rule-name">{t('ruleName')}</Label>
                    <Input
                      id="rule-name"
                      placeholder={t('ruleNamePlaceholder')}
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-severity">{t('severity')}</Label>
                    <Select
                      value={newRuleSeverity}
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setNewRuleSeverity(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('severityLow')}</SelectItem>
                        <SelectItem value="medium">{t('severityMedium')}</SelectItem>
                        <SelectItem value="high">{t('severityHigh')}</SelectItem>
                        <SelectItem value="critical">{t('severityCritical')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="rule-pattern">{t('patternRegex')}</Label>
                  <Input
                    id="rule-pattern"
                    placeholder="e.g., /\\b(SELECT|INSERT|UPDATE|DELETE)\\b/gi"
                    value={newRulePattern}
                    onChange={(e) => setNewRulePattern(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="rule-description">{t('ruleDescription')}</Label>
                  <Textarea
                    id="rule-description"
                    placeholder={t('ruleDescriptionPlaceholder')}
                    value={newRuleDescription}
                    onChange={(e) => setNewRuleDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>{t('applyTo')}</Label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {(['input', 'system', 'toolCall'] as const).map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`rule-type-${type}`}
                          checked={newRuleTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewRuleTypes([...newRuleTypes, type]);
                            } else {
                              setNewRuleTypes(newRuleTypes.filter((t) => t !== type));
                            }
                          }}
                        />
                        <Label htmlFor={`rule-type-${type}`} className="text-sm cursor-pointer">
                          {t(`ruleType.${type}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleAddSafetyRule} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addRule')}
                </Button>
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                {safetyModeSettings.rules.length === 0 ? (
                  <Empty className="py-6 border-none">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ShieldCheck className="h-5 w-5" />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm">{t('noCustomRules')}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  safetyModeSettings.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{rule.name}</span>
                          <Badge variant={getSeverityBadgeVariant(rule.severity)} className="text-xs">
                            {rule.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {t('targetCount', { count: rule.type.length })}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {rule.description}
                        </p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
                          {typeof rule.pattern === 'string' ? rule.pattern : rule.pattern.toString()}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* External Review API */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                {t('externalReviewApi')}
              </CardTitle>
              <CardDescription>
                {t('externalReviewApiDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="external-review-enabled">{t('enableExternalReview')}</Label>
                <Switch
                  id="external-review-enabled"
                  checked={safetyModeSettings.externalReview.enabled}
                  onCheckedChange={(enabled) =>
                    setExternalReviewConfig({ enabled })
                  }
                />
              </div>

              {safetyModeSettings.externalReview.enabled && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="api-endpoint">{t('apiEndpoint')}</Label>
                    <Input
                      id="api-endpoint"
                      placeholder={t('apiEndpointPlaceholder')}
                      value={safetyModeSettings.externalReview.endpoint}
                      onChange={(e) =>
                        setExternalReviewConfig({ endpoint: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="api-key">{t('apiKey')}</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder={t('apiKeyPlaceholder')}
                      value={safetyModeSettings.externalReview.apiKey || ''}
                      onChange={(e) =>
                        setExternalReviewConfig({ apiKey: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeout">{t('timeout')}</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="1000"
                      max="60000"
                      step="1000"
                      value={safetyModeSettings.externalReview.timeoutMs}
                      onChange={(e) =>
                        setExternalReviewConfig({
                          timeoutMs: parseInt(e.target.value) || 5000,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="min-severity">{t('minSeverityToBlock')}</Label>
                    <Select
                      value={safetyModeSettings.externalReview.minSeverity}
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') =>
                        setExternalReviewConfig({ minSeverity: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('severityLow')}</SelectItem>
                        <SelectItem value="medium">{t('severityMedium')}</SelectItem>
                        <SelectItem value="high">{t('severityHigh')}</SelectItem>
                        <SelectItem value="critical">{t('severityCritical')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fallback-mode">{t('fallbackMode')}</Label>
                    <Select
                      value={safetyModeSettings.externalReview.fallbackMode}
                      onValueChange={(value: 'allow' | 'block') =>
                        setExternalReviewConfig({ fallbackMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">{t('fallbackAllow')}</SelectItem>
                        <SelectItem value="block">{t('fallbackBlock')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={resetSafetyModeSettings}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('resetToDefaults')}
          </Button>
        </>
      )}
    </div>
  );
}
