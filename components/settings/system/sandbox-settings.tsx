'use client';

/**
 * SandboxSettings - Configuration UI for sandbox code execution
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Server, Cpu, Clock, HardDrive, Wifi, RefreshCw, Check, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSandbox } from '@/hooks/sandbox';
import { LANGUAGE_INFO } from '@/types/system/sandbox';
import type { RuntimeType, BackendSandboxConfig, SandboxPolicyProfile } from '@/types/system/sandbox';

const DEFAULT_POLICY_PROFILES: Record<string, SandboxPolicyProfile> = {
  strict: {
    id: 'strict',
    name: 'Strict',
    max_timeout_secs: 30,
    max_memory_limit_mb: 256,
    allow_network: false,
    allowed_runtimes: ['docker', 'podman'],
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    max_timeout_secs: 60,
    max_memory_limit_mb: 512,
    allow_network: false,
    allowed_runtimes: ['docker', 'podman', 'native'],
  },
  permissive: {
    id: 'permissive',
    name: 'Permissive',
    max_timeout_secs: 120,
    max_memory_limit_mb: 1024,
    allow_network: true,
    allowed_runtimes: ['docker', 'podman', 'native'],
  },
};

interface PolicyValidationIssue {
  field: 'default_timeout_secs' | 'default_memory_limit_mb' | 'network_enabled' | 'preferred_runtime';
  message: string;
}

export function SandboxSettings() {
  const t = useTranslations('sandboxSettings');

  const {
    isAvailable,
    isLoading,
    config,
    runtimes,
    languages,
    error,
    refreshStatus,
    updateConfig,
  } = useSandbox();

  const [localConfig, setLocalConfig] = useState<BackendSandboxConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const policyProfiles = useMemo(() => {
    return {
      ...DEFAULT_POLICY_PROFILES,
      ...(localConfig?.policy_profiles || {}),
    };
  }, [localConfig?.policy_profiles]);

  const activePolicyProfile = useMemo<SandboxPolicyProfile>(() => {
    const profileId = localConfig?.active_policy_profile || 'balanced';
    return (
      policyProfiles[profileId] ||
      policyProfiles.balanced ||
      Object.values(policyProfiles)[0] ||
      DEFAULT_POLICY_PROFILES.balanced
    );
  }, [localConfig?.active_policy_profile, policyProfiles]);

  const policyValidationIssues = useMemo<PolicyValidationIssue[]>(() => {
    if (!localConfig || !activePolicyProfile) return [];
    const issues: PolicyValidationIssue[] = [];

    if (localConfig.default_timeout_secs <= 0) {
      issues.push({
        field: 'default_timeout_secs',
        message: 'Timeout must be greater than 0 seconds.',
      });
    } else if (localConfig.default_timeout_secs > activePolicyProfile.max_timeout_secs) {
      issues.push({
        field: 'default_timeout_secs',
        message: `Timeout exceeds ${activePolicyProfile.name} profile limit (${activePolicyProfile.max_timeout_secs}s).`,
      });
    }

    if (localConfig.default_memory_limit_mb <= 0) {
      issues.push({
        field: 'default_memory_limit_mb',
        message: 'Memory limit must be greater than 0 MB.',
      });
    } else if (localConfig.default_memory_limit_mb > activePolicyProfile.max_memory_limit_mb) {
      issues.push({
        field: 'default_memory_limit_mb',
        message: `Memory limit exceeds ${activePolicyProfile.name} profile limit (${activePolicyProfile.max_memory_limit_mb} MB).`,
      });
    }

    if (localConfig.network_enabled && !activePolicyProfile.allow_network) {
      issues.push({
        field: 'network_enabled',
        message: `${activePolicyProfile.name} profile does not allow network access.`,
      });
    }

    if (!activePolicyProfile.allowed_runtimes.includes(localConfig.preferred_runtime)) {
      issues.push({
        field: 'preferred_runtime',
        message: `Preferred runtime '${localConfig.preferred_runtime}' is not allowed by ${activePolicyProfile.name} profile.`,
      });
    }

    return issues;
  }, [activePolicyProfile, localConfig]);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = async () => {
    if (!localConfig) return;
    setIsSaving(true);
    try {
      await updateConfig(localConfig);
      await refreshStatus();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRuntimeChange = (runtime: RuntimeType) => {
    setLocalConfig((prev) => prev ? { ...prev, preferred_runtime: runtime } : prev);
  };

  const handlePolicyProfileChange = (profileId: string) => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      const profile = policyProfiles[profileId];
      if (!profile) return prev;

      const preferredRuntime = profile.allowed_runtimes.includes(prev.preferred_runtime)
        ? prev.preferred_runtime
        : (profile.allowed_runtimes[0] || prev.preferred_runtime);

      return {
        ...prev,
        active_policy_profile: profile.id,
        default_timeout_secs: Math.min(prev.default_timeout_secs, profile.max_timeout_secs),
        default_memory_limit_mb: Math.min(prev.default_memory_limit_mb, profile.max_memory_limit_mb),
        network_enabled: profile.allow_network ? prev.network_enabled : false,
        preferred_runtime: preferredRuntime,
      };
    });
  };

  const handleLanguageToggle = (langId: string, enabled: boolean) => {
    setLocalConfig((prev) => {
      if (!prev) {
        return prev;
      }
      const enabledLanguages = new Set(prev.enabled_languages || []);
      if (enabled) {
        enabledLanguages.add(langId);
      } else {
        enabledLanguages.delete(langId);
      }
      return {
        ...prev,
        enabled_languages: Array.from(enabledLanguages),
      };
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Server className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">{t('notAvailable')}</p>
              <p className="text-sm text-muted-foreground">
                {t('notAvailableDesc')}
              </p>
            </div>
            <Button variant="outline" onClick={refreshStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <X className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <p className="font-medium text-destructive">{t('error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={refreshStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Policy Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon />
            Policy Profile
          </CardTitle>
          <CardDescription>
            Choose a safety profile and keep defaults within allowed bounds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="min-w-[120px]">Active Profile</Label>
            <Select
              value={activePolicyProfile?.id || 'balanced'}
              onValueChange={handlePolicyProfileChange}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(policyProfiles).map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activePolicyProfile && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                timeout {'<='} {activePolicyProfile.max_timeout_secs}s
              </Badge>
              <Badge variant="outline">
                memory {'<='} {activePolicyProfile.max_memory_limit_mb} MB
              </Badge>
              <Badge
                variant="outline"
                className={activePolicyProfile.allow_network ? 'text-green-600 border-green-600/50' : 'text-muted-foreground'}
              >
                network {activePolicyProfile.allow_network ? 'allowed' : 'blocked'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Runtime Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t('runtime')}
          </CardTitle>
          <CardDescription>
            {t('runtimeDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="min-w-[120px]">{t('preferredRuntime')}</Label>
            <Select
              value={localConfig?.preferred_runtime || 'docker'}
              onValueChange={(v) => handleRuntimeChange(v as RuntimeType)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="docker"
                  disabled={!runtimes.includes('docker') || !activePolicyProfile.allowed_runtimes.includes('docker')}
                >
                  Docker{' '}
                  {!activePolicyProfile.allowed_runtimes.includes('docker')
                    ? '(blocked by profile)'
                    : runtimes.includes('docker')
                      ? '✓'
                      : `(${t('notAvailable')})`}
                </SelectItem>
                <SelectItem
                  value="podman"
                  disabled={!runtimes.includes('podman') || !activePolicyProfile.allowed_runtimes.includes('podman')}
                >
                  Podman{' '}
                  {!activePolicyProfile.allowed_runtimes.includes('podman')
                    ? '(blocked by profile)'
                    : runtimes.includes('podman')
                      ? '✓'
                      : `(${t('notAvailable')})`}
                </SelectItem>
                <SelectItem
                  value="native"
                  disabled={!activePolicyProfile.allowed_runtimes.includes('native')}
                >
                  {t('nativeRuntime')}{' '}
                  {!activePolicyProfile.allowed_runtimes.includes('native')
                    ? '(blocked by profile)'
                    : ''}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {runtimes.map((rt) => (
              <Badge key={rt} variant="outline" className="text-green-600 border-green-600/50">
                <Check className="h-3 w-3 mr-1" />
                {rt}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            {t('resourceLimits')}
          </CardTitle>
          <CardDescription>
            {t('resourceLimitsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeout */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('timeout')}
              </Label>
              <span className="text-sm text-muted-foreground">
                {localConfig?.default_timeout_secs || 30}s
              </span>
            </div>
            <Slider
              value={[localConfig?.default_timeout_secs || 30]}
              min={5}
              max={Math.max(5, activePolicyProfile.max_timeout_secs)}
              step={5}
              onValueChange={([v]) =>
                setLocalConfig((prev) => prev ? { ...prev, default_timeout_secs: v } : null)
              }
            />
          </div>

          {/* Memory Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                {t('memoryLimit')}
              </Label>
              <span className="text-sm text-muted-foreground">
                {localConfig?.default_memory_limit_mb || 256} MB
              </span>
            </div>
            <Slider
              value={[localConfig?.default_memory_limit_mb || 256]}
              min={64}
              max={Math.max(64, activePolicyProfile.max_memory_limit_mb)}
              step={64}
              onValueChange={([v]) =>
                setLocalConfig((prev) => prev ? { ...prev, default_memory_limit_mb: v } : null)
              }
            />
          </div>

          {/* CPU Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                {t('cpuLimit')}
              </Label>
              <span className="text-sm text-muted-foreground">
                {localConfig?.default_cpu_limit_percent || 50}%
              </span>
            </div>
            <Slider
              value={[localConfig?.default_cpu_limit_percent || 50]}
              min={10}
              max={100}
              step={10}
              onValueChange={([v]) =>
                setLocalConfig((prev) => prev ? { ...prev, default_cpu_limit_percent: v } : null)
              }
            />
          </div>

          {/* Network Access */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              {t('networkAccess')}
            </Label>
            <Switch
              checked={localConfig?.network_enabled || false}
              disabled={!activePolicyProfile.allow_network}
              onCheckedChange={(checked) =>
                setLocalConfig((prev) => prev ? { ...prev, network_enabled: checked } : null)
              }
            />
          </div>
          {!activePolicyProfile.allow_network && (
            <p className="text-xs text-muted-foreground">
              Network access is disabled by the active policy profile.
            </p>
          )}
        </CardContent>
      </Card>

      {policyValidationIssues.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Validation Required
            </CardTitle>
            <CardDescription>
              Fix these policy-bound issues before saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {policyValidationIssues.map((issue, index) => (
              <p key={`${issue.field}-${index}`}>- {issue.message}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Enabled Languages */}
      <Card>
        <CardHeader>
          <CardTitle>{t('enabledLanguages')}</CardTitle>
          <CardDescription>
            {t('enabledLanguagesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {languages.map((lang) => {
                const info = LANGUAGE_INFO[lang.id] || { name: lang.name, icon: '📄', color: '#666' };
                const isEnabled = localConfig?.enabled_languages?.includes(lang.id) ?? true;

                return (
                  <div
                    key={lang.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="text-sm font-medium">{info.name}</span>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleLanguageToggle(lang.id, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={refreshStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || policyValidationIssues.length > 0}>
          {isSaving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          {t('saveSettings')}
        </Button>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l7 3v6c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V6l7-3z" />
      <path d="M9.5 12.5l1.8 1.8 3.2-3.4" />
    </svg>
  );
}

export default SandboxSettings;
