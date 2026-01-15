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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSettingsStore } from '@/stores';
import type { SafetyMode, SafetyRule } from '@/stores/settings/settings-store';
import { Separator } from '@/components/ui/separator';

export function SafetySettings() {
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

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Safety Mode</CardTitle>
            </div>
            <Switch
              checked={safetyModeSettings.enabled}
              onCheckedChange={setSafetyModeEnabled}
            />
          </div>
          <CardDescription>
            Enable security checks to filter dangerous content and prevent prompt injection attacks
          </CardDescription>
        </CardHeader>
        {safetyModeSettings.enabled && (
          <CardContent className="space-y-4">
            {/* Mode Selection */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="safety-mode">Detection Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Choose how to handle detected threats
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
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="warn">Warn Only</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Check Options */}
            <div className="space-y-3">
              <Label>Check Targets</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="check-user-input" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" />
                  User Messages
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
                  System Prompts
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
                  Tool Calls
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
                  Block Dangerous Commands
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
              <Label>Logging & Notifications</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="log-events" className="flex items-center gap-2 cursor-pointer">
                  Log Safety Events
                </Label>
                <Switch
                  id="log-events"
                  checked={safetyModeSettings.logSafetyEvents}
                  onCheckedChange={setLogSafetyEvents}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-warnings" className="flex items-center gap-2 cursor-pointer">
                  Show Warnings
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
                Custom Patterns
              </CardTitle>
              <CardDescription>
                Add custom patterns to block or allow specific content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Blocked Patterns */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    <Label>Blocked Patterns</Label>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter pattern to block..."
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
                        <button
                          onClick={() => removeCustomBlockedPattern(pattern)}
                          className="ml-1 hover:bg-red-500/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
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
                    <Label>Allowed Patterns (Whitelist)</Label>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter pattern to allow..."
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
                        <button
                          onClick={() => removeCustomAllowedPattern(pattern)}
                          className="ml-1 hover:bg-green-500/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
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
                Safety Rules
              </CardTitle>
              <CardDescription>
                Manage custom safety rules for content filtering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Rule */}
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      id="rule-name"
                      placeholder="e.g., Block SQL Injection"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-severity">Severity</Label>
                    <Select
                      value={newRuleSeverity}
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setNewRuleSeverity(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="rule-pattern">Pattern (Regex)</Label>
                  <Input
                    id="rule-pattern"
                    placeholder="e.g., /\\b(SELECT|INSERT|UPDATE|DELETE)\\b/gi"
                    value={newRulePattern}
                    onChange={(e) => setNewRulePattern(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="rule-description">Description</Label>
                  <Textarea
                    id="rule-description"
                    placeholder="Describe what this rule detects..."
                    value={newRuleDescription}
                    onChange={(e) => setNewRuleDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Apply To</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(['input', 'system', 'toolCall'] as const).map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRuleTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRuleTypes([...newRuleTypes, type]);
                            } else {
                              setNewRuleTypes(newRuleTypes.filter((t) => t !== type));
                            }
                          }}
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleAddSafetyRule} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                {safetyModeSettings.rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No custom rules defined yet
                  </p>
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
                            {rule.type.length} target(s)
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
                External Review API
              </CardTitle>
              <CardDescription>
                Integrate with external content moderation services for enhanced safety checks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="external-review-enabled">Enable External Review</Label>
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
                    <Label htmlFor="api-endpoint">API Endpoint</Label>
                    <Input
                      id="api-endpoint"
                      placeholder="https://api.example.com/review"
                      value={safetyModeSettings.externalReview.endpoint}
                      onChange={(e) =>
                        setExternalReviewConfig({ endpoint: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="api-key">API Key (Optional)</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={safetyModeSettings.externalReview.apiKey || ''}
                      onChange={(e) =>
                        setExternalReviewConfig({ apiKey: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeout">Timeout (ms)</Label>
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
                    <Label htmlFor="min-severity">Minimum Severity to Block</Label>
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
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fallback-mode">Fallback Mode</Label>
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
                        <SelectItem value="allow">Allow (pass through)</SelectItem>
                        <SelectItem value="block">Block (reject)</SelectItem>
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
            Reset to Defaults
          </Button>
        </>
      )}
    </div>
  );
}
