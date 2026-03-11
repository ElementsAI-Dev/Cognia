'use client';

/**
 * ProviderSettings - Configure AI provider API keys
 * Enhanced with batch testing, collapsible sections, multi-key rotation, and default model selection
 */

import React, { useState, useCallback, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import {
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wrench,
  ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Card,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores';
import { PROVIDERS, type ApiKeyRotationStrategy, type ProviderConfig } from '@/types/provider';
import { OAuthLoginButton } from './oauth-login-button';
import { ProviderCard } from './provider-card';
import { ProviderEmptyState } from './provider-empty-state';
import { ProviderHealthStatus } from './provider-health-status';
import { ProviderSkeleton } from './provider-skeleton';
import { OpenRouterSettings } from './openrouter-settings';
import { OpenRouterKeyManagement } from './openrouter-key-management';
import { CLIProxyAPISettings } from './cliproxyapi-settings';
import { BatchTestProgress, TestResultsSummary, type BatchVerificationOperation } from './batch-test-progress';
import { ProviderFilters, type CapabilityFilter } from './provider-filters';
import { CustomProvidersList } from './custom-providers-list';
import {
  getBuiltInProviderReadiness,
  getCustomProviderReadiness,
  getProviderEnableEligibility,
  getVisibleEligibleBuiltInProviderIds,
  getVisibleEligibleCustomProviderIds,
  getVisibleRetryFailedBuiltInProviderIds,
  getVisibleRetryFailedCustomProviderIds,
  type ProviderNextAction,
  getVisibleSelectedProviderIds,
} from './provider-readiness';

// Dynamic imports for heavy dialog components (code splitting)
const CustomProviderDialog = dynamic(() => import('./custom-provider-dialog').then(mod => ({ default: mod.CustomProviderDialog })), { ssr: false });
const QuickAddProviderDialog = dynamic(() => import('./quick-add-provider-dialog').then(mod => ({ default: mod.QuickAddProviderDialog })), { ssr: false });
const ProviderImportExport = dynamic(() => import('./provider-import-export').then(mod => ({ default: mod.ProviderImportExport })), { ssr: false });
const LocalProviderSettings = dynamic(() => import('./local-provider-settings').then(mod => ({ default: mod.LocalProviderSettings })), { ssr: false, loading: () => <ProviderSkeleton /> });
import { testCustomProviderConnectionByProtocol, testProviderConnection, type ApiTestResult } from '@/lib/ai/infrastructure/api-test';
import { toast } from '@/components/ui/sonner';
import {
  getCategoryIcon,
  PROVIDER_CATEGORIES,
  type ProviderCategory,
} from '@/lib/ai/providers/provider-helpers';
import type { ProviderCategoryFilter } from '@/stores/settings/settings-store';
import { getCurrencyForLocale, CURRENCIES } from '@/types/system/usage';

export function ProviderSettings() {
  const t = useTranslations('providers');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const language = useSettingsStore((state) => state.language);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const updateProviderSettings = useSettingsStore((state) => state.updateProviderSettings);
  const customProviders = useSettingsStore((state) => state.customProviders);
  const updateCustomProvider = useSettingsStore((state) => state.updateCustomProvider);
  const addApiKey = useSettingsStore((state) => state.addApiKey);
  const removeApiKey = useSettingsStore((state) => state.removeApiKey);
  const reorderApiKeys = useSettingsStore((state) => state.reorderApiKeys);
  const setApiKeyRotation = useSettingsStore((state) => state.setApiKeyRotation);
  const resetApiKeyStats = useSettingsStore((state) => state.resetApiKeyStats);

  const [testResults, setTestResults] = useState<Record<string, ApiTestResult | null>>({});
  const [testingProviders, setTestingProviders] = useState<Record<string, boolean>>({});
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchTestProgress, setBatchTestProgress] = useState(0);
  const [batchTestCancelRequested, setBatchTestCancelRequested] = useState(false);
  const [batchTestSummary, setBatchTestSummary] = useState<{ completed: number; total: number; canceled: boolean } | null>(null);
  const [batchOperationType, setBatchOperationType] = useState<BatchVerificationOperation | null>(null);
  const batchTestCancelRef = useRef(false);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  // Debounce search query for performance - prevents filtering on every keystroke
  const deferredSearchQuery = useDeferredValue(searchQuery);
  
  // Use persisted UI preferences from store
  const providerUIPreferences = useSettingsStore((state) => state.providerUIPreferences);
  const setProviderViewMode = useSettingsStore((state) => state.setProviderViewMode);
  const setProviderSortBy = useSettingsStore((state) => state.setProviderSortBy);
  const setProviderSortOrder = useSettingsStore((state) => state.setProviderSortOrder);
  const setProviderCategoryFilter = useSettingsStore((state) => state.setProviderCategoryFilter);
  
  // Destructure for convenience
  const { viewMode, sortBy, sortOrder, categoryFilter } = providerUIPreferences;
  const [expandedTableRows, setExpandedTableRows] = useState<Record<string, boolean>>({});
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<string>>(() => new Set());
  const [customTestResults, setCustomTestResults] = useState<Record<string, 'success' | 'error' | null>>({});
  const [testingCustomProviders, setTestingCustomProviders] = useState<Record<string, boolean>>({});
  const [customTestMessages, setCustomTestMessages] = useState<Record<string, string | null>>({});
  const [capabilityFilters, setCapabilityFilters] = useState<CapabilityFilter[]>([]);
  const providerConfigFingerprintRef = useRef<Record<string, string>>({});
  const customProviderConfigFingerprintRef = useRef<Record<string, string>>({});

  const getProviderActionMessage = useCallback((providerId: string, fallback: string, reason?: string) => {
    const providerName = PROVIDERS[providerId]?.name || providerId;
    return `${providerName}: ${reason || fallback}`;
  }, []);

  const getChecklistStepLabel = useCallback((stepId: string) => {
    switch (stepId) {
      case 'credential':
        return t('setupStepCredential');
      case 'base_url':
        return t('setupStepBaseUrl');
      case 'default_model':
        return t('setupStepDefaultModel');
      case 'verification':
        return t('setupStepVerification');
      default:
        return stepId;
    }
  }, [t]);

  const persistBuiltInVerificationResult = useCallback((
    providerId: string,
    success: boolean,
    message?: string
  ) => {
    const settings = providerSettings[providerId];
    if (!settings) return;

    updateProviderSettings(providerId, {
      verificationStatus: success ? 'verified' : settings.verificationStatus === 'verified' ? 'stale' : 'unverified',
      verificationFingerprint: getBuiltInProviderReadiness(providerId, settings, {
        success,
        message: message ?? (success ? 'Connection verified.' : 'Connection test failed.'),
      }).verificationFingerprint,
      verificationMessage: message,
      lastVerifiedAt: Date.now(),
    });
  }, [providerSettings, updateProviderSettings]);

  const persistCustomVerificationResult = useCallback((
    providerId: string,
    success: boolean,
    message?: string
  ) => {
    const provider = customProviders[providerId];
    if (!provider) return;

    updateCustomProvider(providerId, {
      verificationStatus: success ? 'verified' : provider.verificationStatus === 'verified' ? 'stale' : 'unverified',
      verificationFingerprint: getCustomProviderReadiness(provider, { success }).verificationFingerprint,
      verificationMessage: message,
      lastVerifiedAt: Date.now(),
    });
  }, [customProviders, updateCustomProvider]);

  const invalidateBuiltInVerification = useCallback((providerId: string) => {
    setTestResults((prev) => ({ ...prev, [providerId]: null }));
    const settings = providerSettings[providerId];
    if (!settings) return;
    const nextStatus = settings.verificationStatus === 'verified' ? 'stale' : 'unverified';
    updateProviderSettings(providerId, {
      verificationStatus: nextStatus,
      verificationFingerprint: getBuiltInProviderReadiness(providerId, settings, null).verificationFingerprint,
      verificationMessage:
        nextStatus === 'stale' ? t('verificationStaleHint') : settings.verificationMessage,
    });
  }, [providerSettings, t, updateProviderSettings]);

  const invalidateCustomVerification = useCallback((providerId: string) => {
    setCustomTestResults((prev) => ({ ...prev, [providerId]: null }));
    setCustomTestMessages((prev) => ({ ...prev, [providerId]: null }));
    const provider = customProviders[providerId];
    if (!provider) return;
    const nextStatus = provider.verificationStatus === 'verified' ? 'stale' : 'unverified';
    updateCustomProvider(providerId, {
      verificationStatus: nextStatus,
      verificationFingerprint: getCustomProviderReadiness(provider, null).verificationFingerprint,
      verificationMessage:
        nextStatus === 'stale' ? t('verificationStaleHint') : provider.verificationMessage,
    });
  }, [customProviders, t, updateCustomProvider]);

  useEffect(() => {
    const changedIds: string[] = [];
    const nextFingerprints: Record<string, string> = {};

    for (const [providerId, settings] of Object.entries(providerSettings)) {
      const fingerprint = getBuiltInProviderReadiness(providerId, settings, null).verificationFingerprint;
      nextFingerprints[providerId] = fingerprint;
      if (
        providerConfigFingerprintRef.current[providerId] &&
        providerConfigFingerprintRef.current[providerId] !== fingerprint
      ) {
        changedIds.push(providerId);
      }
    }

    providerConfigFingerprintRef.current = nextFingerprints;

    if (changedIds.length > 0) {
      setTestResults((prev) => {
        const next = { ...prev };
        for (const id of changedIds) {
          if (next[id]?.success) next[id] = null;
        }
        return next;
      });
      for (const id of changedIds) {
        const settings = providerSettings[id];
        if (!settings) continue;
        const nextStatus = settings.verificationStatus === 'verified' ? 'stale' : 'unverified';
        updateProviderSettings(id, {
          verificationStatus: nextStatus,
          verificationFingerprint: nextFingerprints[id],
          verificationMessage: nextStatus === 'stale' ? t('verificationStaleHint') : settings.verificationMessage,
        });
      }
    }
  }, [providerSettings, t, updateProviderSettings]);

  useEffect(() => {
    const changedIds: string[] = [];
    const nextFingerprints: Record<string, string> = {};

    for (const [providerId, provider] of Object.entries(customProviders)) {
      const fingerprint = getCustomProviderReadiness(provider, null).verificationFingerprint;
      nextFingerprints[providerId] = fingerprint;
      if (
        customProviderConfigFingerprintRef.current[providerId] &&
        customProviderConfigFingerprintRef.current[providerId] !== fingerprint
      ) {
        changedIds.push(providerId);
      }
    }

    customProviderConfigFingerprintRef.current = nextFingerprints;

    if (changedIds.length > 0) {
      setCustomTestResults((prev) => {
        const next = { ...prev };
        for (const id of changedIds) {
          if (next[id] === 'success') next[id] = null;
        }
        return next;
      });
      setCustomTestMessages((prev) => {
        const next = { ...prev };
        for (const id of changedIds) {
          next[id] = null;
        }
        return next;
      });
      for (const id of changedIds) {
        const provider = customProviders[id];
        if (!provider) continue;
        const nextStatus = provider.verificationStatus === 'verified' ? 'stale' : 'unverified';
        updateCustomProvider(id, {
          verificationStatus: nextStatus,
          verificationFingerprint: nextFingerprints[id],
          verificationMessage: nextStatus === 'stale' ? t('verificationStaleHint') : provider.verificationMessage,
        });
      }
    }
  }, [customProviders, t, updateCustomProvider]);

  const toggleExpanded = useCallback((providerId: string) => {
    setExpandedProviders((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  }, []);

  const handleSetDefaultModel = (providerId: string, modelId: string) => {
    const providerState = getBuiltInProviderReadiness(
      providerId,
      providerSettings[providerId],
      testResults[providerId]
    );
    if (!providerState.eligibility.defaultModel.allowed) {
      toast.warning(
        getProviderActionMessage(
          providerId,
          t('configureApiKey'),
          providerState.eligibility.defaultModel.reason
        )
      );
      return;
    }
    updateProviderSettings(providerId, { defaultModel: modelId });
    invalidateBuiltInVerification(providerId);
  };

  const handleRemoveApiKey = (providerId: string, index: number) => {
    removeApiKey(providerId, index);
    invalidateBuiltInVerification(providerId);
  };

  const handleToggleRotation = (providerId: string, enabled: boolean) => {
    const settings = providerSettings[providerId];
    setApiKeyRotation(providerId, enabled, settings?.apiKeyRotationStrategy || 'round-robin');
    invalidateBuiltInVerification(providerId);
  };

  const handleRotationStrategyChange = (providerId: string, strategy: ApiKeyRotationStrategy) => {
    setApiKeyRotation(providerId, true, strategy);
    invalidateBuiltInVerification(providerId);
  };

  // Get count of configured providers based on derived readiness.
  const configuredCount = Object.keys(PROVIDERS).filter((providerId) => {
    const settings = providerSettings[providerId];
    if (!settings?.enabled) return false;
    const readiness = getBuiltInProviderReadiness(providerId, settings, testResults[providerId]);
    return readiness.readiness !== 'unconfigured';
  }).length;

  const configuredCustomCount = Object.values(customProviders).filter((provider) => {
    if (!provider.enabled) return false;
    const readiness = getCustomProviderReadiness(provider);
    return readiness.readiness !== 'unconfigured';
  }).length;

  const totalConfiguredCount = configuredCount + configuredCustomCount;

  const handleKeyChange = (providerId: string, apiKey: string) => {
    updateProviderSettings(providerId, { apiKey });
    invalidateBuiltInVerification(providerId);
  };

  const handleBaseURLChange = (providerId: string, baseURL?: string) => {
    updateProviderSettings(providerId, { baseURL: baseURL || undefined });
    invalidateBuiltInVerification(providerId);
  };

  const handleToggleProvider = useCallback((providerId: string, enabled: boolean) => {
    const eligibility = getProviderEnableEligibility(providerId, providerSettings[providerId], enabled);
    if (!eligibility.allowed) {
      toast.warning(getProviderActionMessage(providerId, t('configureApiKey'), eligibility.reason));
      return false;
    }
    updateProviderSettings(providerId, { enabled });
    return true;
  }, [providerSettings, getProviderActionMessage, t, updateProviderSettings]);

  const handleTestConnection = useCallback(async (providerId: string) => {
    const settings = providerSettings[providerId];
    const providerState = getBuiltInProviderReadiness(providerId, settings, testResults[providerId]);
    if (!providerState.eligibility.testConnection.allowed) {
      toast.warning(
        getProviderActionMessage(
          providerId,
          t('connectionFailed'),
          providerState.eligibility.testConnection.reason
        )
      );
      return undefined;
    }
    const activeApiKey =
      settings?.apiKey ||
      settings?.apiKeys?.[settings.currentKeyIndex || 0] ||
      settings?.apiKeys?.[0] ||
      '';

    setTestingProviders((prev) => ({ ...prev, [providerId]: true }));
    setTestResults((prev) => ({ ...prev, [providerId]: null }));

    try {
      const result = await testProviderConnection(
        providerId,
        activeApiKey,
        settings?.baseURL
      );
      setTestResults((prev) => ({ ...prev, [providerId]: result }));
      persistBuiltInVerificationResult(providerId, !!result.success, result.message);
      return result;
    } catch (error) {
      const failedResult: ApiTestResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
      setTestResults((prev) => ({
        ...prev,
        [providerId]: failedResult,
      }));
      persistBuiltInVerificationResult(providerId, false, failedResult.message);
      return failedResult;
    } finally {
      setTestingProviders((prev) => ({ ...prev, [providerId]: false }));
    }
  }, [getProviderActionMessage, persistBuiltInVerificationResult, providerSettings, testResults, t]);

  const handleTestCustomProvider = useCallback(async (providerId: string) => {
    const provider = customProviders[providerId];
    const readiness = getCustomProviderReadiness(provider);
    if (!readiness.eligibility.testConnection.allowed) {
      const message = readiness.eligibility.testConnection.reason || t('connectionFailed');
      setCustomTestResults((prev) => ({ ...prev, [providerId]: 'error' }));
      setCustomTestMessages((prev) => ({ ...prev, [providerId]: message }));
      persistCustomVerificationResult(providerId, false, message);
      toast.warning(message);
      return { success: false, message };
    }
    if (!provider?.baseURL || !provider.apiKey) {
      const message = t('connectionFailed');
      persistCustomVerificationResult(providerId, false, message);
      return { success: false, message };
    }

    try {
      new URL(provider.baseURL);
    } catch {
      const message = t('invalidBaseUrl');
      setCustomTestResults((prev) => ({ ...prev, [providerId]: 'error' }));
      setCustomTestMessages((prev) => ({ ...prev, [providerId]: message }));
      persistCustomVerificationResult(providerId, false, message);
      toast.error(t('connectionFailed'), { description: message });
      return { success: false, message };
    }

    setTestingCustomProviders((prev) => ({ ...prev, [providerId]: true }));
    setCustomTestResults((prev) => ({ ...prev, [providerId]: null }));
    setCustomTestMessages((prev) => ({ ...prev, [providerId]: null }));

    try {
      const result = await testCustomProviderConnectionByProtocol(
        provider.baseURL,
        provider.apiKey,
        provider.apiProtocol || 'openai'
      );
      setCustomTestResults((prev) => ({
        ...prev,
        [providerId]: result.success ? 'success' : 'error',
      }));
      setCustomTestMessages((prev) => ({
        ...prev,
        [providerId]: result.message,
      }));
      persistCustomVerificationResult(providerId, !!result.success, result.message);

      if (result.success) {
        toast.success(t('connectionSuccess'), { description: result.message });
      } else {
        toast.error(t('connectionFailed'), { description: result.message });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('connectionFailed');
      setCustomTestResults((prev) => ({ ...prev, [providerId]: 'error' }));
      setCustomTestMessages((prev) => ({ ...prev, [providerId]: message }));
      persistCustomVerificationResult(providerId, false, message);
      toast.error(t('connectionFailed'), { description: message });
      return {
        success: false,
        message,
      };
    } finally {
      setTestingCustomProviders((prev) => ({ ...prev, [providerId]: false }));
    }
  }, [customProviders, persistCustomVerificationResult, t]);

  const handleCancelBatchTest = useCallback(() => {
    batchTestCancelRef.current = true;
    setBatchTestCancelRequested(true);
  }, []);

  // Count test results
  const testResultsSummary = {
    success:
      Object.values(testResults).filter((r) => r?.success).length +
      Object.values(customTestResults).filter((r) => r === 'success').length,
    failed:
      Object.values(testResults).filter((r) => r && !r.success).length +
      Object.values(customTestResults).filter((r) => r === 'error').length,
    total:
      Object.values(testResults).filter((r) => r !== null).length +
      Object.values(customTestResults).filter((r) => r !== null).length,
  };

  // Filter and sort providers
  const filteredProviders = useMemo(() => {
    const filtered = Object.entries(PROVIDERS).filter(([providerId, provider]) => {
      // Local providers are handled by LocalProviderSettings
      if (PROVIDER_CATEGORIES[providerId] === 'local') return false;

      // Category filter
      if (categoryFilter !== 'all') {
        const providerCategory = PROVIDER_CATEGORIES[providerId];
        if (providerCategory !== categoryFilter) return false;
      }
      // Search filter (uses deferred value for performance)
      if (deferredSearchQuery.trim()) {
        const query = deferredSearchQuery.toLowerCase();
        const matchesName = provider.name.toLowerCase().includes(query);
        const matchesModel = provider.models.some(m => 
          m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesModel) return false;
      }
      // Capability filters from ProviderFilters component
      if (capabilityFilters.length > 0) {
        const hasVision = capabilityFilters.includes('vision') && provider.models.some(m => m.supportsVision);
        const hasTools = capabilityFilters.includes('tools') && provider.models.some(m => m.supportsTools);
        const hasAudio = capabilityFilters.includes('audio') && provider.models.some(m => m.supportsAudio);
        const matchesAny = (capabilityFilters.includes('vision') ? hasVision : true) &&
          (capabilityFilters.includes('tools') ? hasTools : true) &&
          (capabilityFilters.includes('audio') ? hasAudio : true);
        if (!matchesAny) return false;
      }
      return true;
    });

    // Sort providers (only in table view)
    if (viewMode === 'table') {
      filtered.sort(([idA, a], [idB, b]) => {
        let comparison = 0;
        const settingsA = providerSettings[idA] || {};
        const settingsB = providerSettings[idB] || {};
        
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'models':
            comparison = a.models.length - b.models.length;
            break;
          case 'context': {
            const ctxA = a.models[0]?.contextLength || 0;
            const ctxB = b.models[0]?.contextLength || 0;
            comparison = ctxA - ctxB;
            break;
          }
          case 'price': {
            const priceA = a.models[0]?.pricing?.promptPer1M || 0;
            const priceB = b.models[0]?.pricing?.promptPer1M || 0;
            comparison = priceA - priceB;
            break;
          }
          case 'status': {
            const statusA = settingsA.enabled &&
              getBuiltInProviderReadiness(idA, settingsA, testResults[idA]).readiness !== 'unconfigured'
              ? 1
              : 0;
            const statusB = settingsB.enabled &&
              getBuiltInProviderReadiness(idB, settingsB, testResults[idB]).readiness !== 'unconfigured'
              ? 1
              : 0;
            comparison = statusA - statusB;
            break;
          }
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [categoryFilter, deferredSearchQuery, viewMode, sortBy, sortOrder, providerSettings, capabilityFilters, testResults]);

  const visibleProviderIds = useMemo(
    () => filteredProviders.map(([providerId]) => providerId),
    [filteredProviders]
  );

  const visibleCustomProviderIds = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) return Object.keys(customProviders);

    return Object.entries(customProviders)
      .filter(([_providerId, provider]) => {
        const providerName = (
          provider.customName ||
          (provider as { name?: string }).name ||
          ''
        ).toLowerCase();
        const baseUrl = (provider.baseURL || '').toLowerCase();
        const rawModels =
          provider.customModels || (provider as { models?: string[] }).models || [];
        const models = rawModels.map((model) => String(model).toLowerCase());
        return (
          providerName.includes(query) ||
          baseUrl.includes(query) ||
          models.some((model) => model.includes(query))
        );
      })
      .map(([providerId]) => providerId);
  }, [customProviders, deferredSearchQuery]);

  // Auto-trim selectedProviderIds when filter changes (remove IDs no longer visible)
  useEffect(() => {
    const visibleSet = new Set(visibleProviderIds);
    setSelectedProviderIds((prev) => {
      const trimmed = new Set<string>();
      for (const id of prev) {
        if (visibleSet.has(id)) trimmed.add(id);
      }
      // Only update if something was removed
      if (trimmed.size !== prev.size) return trimmed;
      return prev;
    });
  }, [visibleProviderIds]);

  const selectedVisibleCount = useMemo(() => {
    let count = 0;
    for (const id of visibleProviderIds) {
      if (selectedProviderIds.has(id)) count += 1;
    }
    return count;
  }, [selectedProviderIds, visibleProviderIds]);

  const isAllVisibleSelected = selectedVisibleCount > 0 && selectedVisibleCount === visibleProviderIds.length;
  const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;

  const toggleSelectAllVisible = () => {
    setSelectedProviderIds((prev) => {
      const next = new Set(prev);
      if (visibleProviderIds.length === 0) return next;

      const allSelected = visibleProviderIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of visibleProviderIds) next.delete(id);
      } else {
        for (const id of visibleProviderIds) next.add(id);
      }
      return next;
    });
  };

  const toggleSelectProvider = (providerId: string, checked: boolean) => {
    setSelectedProviderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(providerId);
      else next.delete(providerId);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedProviderIds(new Set());
  };

  const runBatchVerification = useCallback(async (
    operationType: BatchVerificationOperation,
    builtInProviderIds: string[],
    customProviderIds: string[]
  ) => {
    const totalProvidersToTest = builtInProviderIds.length + customProviderIds.length;
    if (totalProvidersToTest === 0) {
      toast.warning(t('noProvidersFound'), {
        description: t('batchNoEligibleProviders'),
      });
      return;
    }

    batchTestCancelRef.current = false;
    setBatchTestCancelRequested(false);
    setIsBatchTesting(true);
    setBatchTestProgress(0);
    setBatchTestSummary(null);
    setBatchOperationType(operationType);

    if (operationType !== 'retry-failed') {
      setTestResults({});
      setCustomTestResults({});
      setCustomTestMessages({});
    }

    try {
      let completed = 0;

      for (let i = 0; i < builtInProviderIds.length; i++) {
        if (batchTestCancelRef.current) break;
        const providerId = builtInProviderIds[i];
        await handleTestConnection(providerId);
        if (batchTestCancelRef.current) break;
        completed += 1;
        setBatchTestProgress((completed / totalProvidersToTest) * 100);
      }

      for (let i = 0; i < customProviderIds.length; i++) {
        if (batchTestCancelRef.current) break;
        const providerId = customProviderIds[i];
        await handleTestCustomProvider(providerId);
        if (batchTestCancelRef.current) break;
        completed += 1;
        setBatchTestProgress((completed / totalProvidersToTest) * 100);
      }

      setBatchTestSummary({
        completed,
        total: totalProvidersToTest,
        canceled: batchTestCancelRef.current,
      });
    } finally {
      setIsBatchTesting(false);
      setBatchTestCancelRequested(false);
      batchTestCancelRef.current = false;
    }
  }, [handleTestConnection, handleTestCustomProvider, t]);

  const handleBatchTest = useCallback(async () => {
    const builtInProviderIds = getVisibleEligibleBuiltInProviderIds(
      visibleProviderIds,
      providerSettings,
      testResults
    );
    const customProviderIds = getVisibleEligibleCustomProviderIds(
      visibleCustomProviderIds,
      customProviders,
      customTestResults
    );

    await runBatchVerification('verify-enabled', builtInProviderIds, customProviderIds);
  }, [
    customProviders,
    customTestResults,
    providerSettings,
    runBatchVerification,
    testResults,
    visibleCustomProviderIds,
    visibleProviderIds,
  ]);

  const handleRetryFailed = useCallback(async () => {
    const builtInProviderIds = getVisibleRetryFailedBuiltInProviderIds(
      visibleProviderIds,
      providerSettings,
      testResults
    );
    const customProviderIds = getVisibleRetryFailedCustomProviderIds(
      visibleCustomProviderIds,
      customProviders,
      customTestResults
    );

    await runBatchVerification('retry-failed', builtInProviderIds, customProviderIds);
  }, [
    customProviders,
    customTestResults,
    providerSettings,
    runBatchVerification,
    testResults,
    visibleCustomProviderIds,
    visibleProviderIds,
  ]);

  const handleBatchTestSelected = useCallback(async () => {
    const selectedVisibleIds = getVisibleSelectedProviderIds(visibleProviderIds, selectedProviderIds);
    const selectedSet = new Set(selectedVisibleIds);
    const selectedIds = getVisibleEligibleBuiltInProviderIds(
      visibleProviderIds,
      providerSettings,
      testResults
    ).filter((providerId) => selectedSet.has(providerId));
    await runBatchVerification('verify-selected', selectedIds, []);
  }, [providerSettings, runBatchVerification, selectedProviderIds, testResults, visibleProviderIds]);

  const handleSetSelectedEnabled = (enabled: boolean) => {
    const selectedIds = getVisibleSelectedProviderIds(visibleProviderIds, selectedProviderIds);
    if (selectedIds.length === 0) return;
    for (const providerId of selectedIds) {
      handleToggleProvider(providerId, enabled);
    }
  };

  // Toggle sort column
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setProviderSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setProviderSortBy(column);
      setProviderSortOrder('asc');
    }
  };

  // Toggle table row expansion
  const toggleTableRow = (providerId: string) => {
    setExpandedTableRows(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleConfigureProviderFromTable = useCallback((providerId: string) => {
    setProviderViewMode('cards');
    setExpandedProviders((prev) => ({ ...prev, [providerId]: true }));

    requestAnimationFrame(() => {
      document.getElementById(`provider-${providerId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [setProviderViewMode]);

  const runBuiltInQuickFixAction = useCallback(async (
    providerId: string,
    action: ProviderNextAction | undefined
  ) => {
    if (!action) return;

    if (action === 'verify_connection') {
      await handleTestConnection(providerId);
      return;
    }

    if (action === 'enable_provider') {
      handleToggleProvider(providerId, true);
      return;
    }

    // Remaining actions are configuration-focused and route users to the provider card workflow.
    handleConfigureProviderFromTable(providerId);
  }, [handleConfigureProviderFromTable, handleTestConnection, handleToggleProvider]);

  const renderBuiltInProviderCard = (providerId: string, provider: ProviderConfig) => {
    const settings = providerSettings[providerId] || {};
    const isExpanded = expandedProviders[providerId] ?? false;
    const isEnabled = settings.enabled !== false;
    const testResult = testResults[providerId];
    const providerState = getBuiltInProviderReadiness(providerId, settings, testResult);
    const enableGuard = getProviderEnableEligibility(providerId, settings, !isEnabled);
    const testGuard = providerState.eligibility.testConnection;
    const defaultModelGuard = providerState.eligibility.defaultModel;

    return (
      <div id={`provider-${providerId}`} key={providerId} className="scroll-mt-24">
        <ProviderCard
          provider={provider}
        settings={{
          providerId,
          enabled: isEnabled,
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
          defaultModel: settings.defaultModel || provider.defaultModel,
          apiKeys: settings.apiKeys,
          apiKeyRotationEnabled: settings.apiKeyRotationEnabled,
          apiKeyRotationStrategy: settings.apiKeyRotationStrategy,
          apiKeyUsageStats: settings.apiKeyUsageStats,
          currentKeyIndex: settings.currentKeyIndex,
          oauthConnected: settings.oauthConnected,
          oauthExpiresAt: settings.oauthExpiresAt,
          lastHealthCheck: settings.lastHealthCheck,
          healthStatus: settings.healthStatus,
          quotaUsed: settings.quotaUsed,
          quotaLimit: settings.quotaLimit,
          rateLimitRemaining: settings.rateLimitRemaining,
          openRouterSettings: settings.openRouterSettings,
          cliProxyAPISettings: settings.cliProxyAPISettings,
        }}
        isExpanded={isExpanded}
        onToggleExpanded={() => toggleExpanded(providerId)}
        onToggleEnabled={(enabled) => handleToggleProvider(providerId, enabled)}
        onApiKeyChange={(key) => handleKeyChange(providerId, key)}
        onBaseURLChange={(url) => handleBaseURLChange(providerId, url)}
        onDefaultModelChange={(model) => handleSetDefaultModel(providerId, model)}
        onTestConnection={async () => {
          const result = await handleTestConnection(providerId);
          return {
            success: !!result?.success,
            message: result?.message || '',
            latency: result?.latency_ms,
          };
        }}
        testResult={
          testResult
            ? {
                success: testResult.success,
                message: testResult.message,
                latency: testResult.latency_ms,
              }
            : testResult
        }
        isTesting={!!testingProviders[providerId]}
        apiKeys={settings.apiKeys || []}
        apiKeyUsageStats={settings.apiKeyUsageStats || {}}
        currentKeyIndex={settings.currentKeyIndex}
        onAddApiKey={(key) => {
          addApiKey(providerId, key);
          invalidateBuiltInVerification(providerId);
        }}
        onRemoveApiKey={(index) => handleRemoveApiKey(providerId, index)}
        onResetApiKeyStats={(key) => resetApiKeyStats(providerId, key)}
        rotationEnabled={!!settings.apiKeyRotationEnabled}
        onToggleRotation={(enabled) => handleToggleRotation(providerId, enabled)}
        rotationStrategy={settings.apiKeyRotationStrategy || 'round-robin'}
        onRotationStrategyChange={(strategy) => handleRotationStrategyChange(providerId, strategy)}
        onReorderApiKeys={(fromIndex, toIndex) => {
          reorderApiKeys(providerId, fromIndex, toIndex);
          invalidateBuiltInVerification(providerId);
        }}
        readinessState={providerState.readiness}
        verificationStatus={providerState.verificationStatus}
        enableToggleDisabled={!enableGuard.allowed}
        enableToggleDisabledReason={enableGuard.reason}
        testConnectionDisabled={!testGuard.allowed || !!testingProviders[providerId]}
        testConnectionDisabledReason={testGuard.reason}
        defaultModelDisabled={!defaultModelGuard.allowed}
        defaultModelDisabledReason={defaultModelGuard.reason}
      >
        {!providerState.setupChecklist.isComplete && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('setupChecklistTitle')}</p>
              <Badge variant="outline" className="text-[10px]">
                {providerState.setupChecklist.completed}/{providerState.setupChecklist.total}
              </Badge>
            </div>
            <div className="space-y-2">
              {providerState.setupChecklist.steps
                .filter((step) => !step.done)
                .slice(0, 3)
                .map((step) => (
                  <div key={step.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{getChecklistStepLabel(step.id)}</p>
                      {step.reason && (
                        <p className="text-xs text-muted-foreground">{step.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => {
                        void runBuiltInQuickFixAction(providerId, step.nextAction);
                      }}
                    >
                      {t('fixNow')}
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {isEnabled && providerState.hasCredential && <ProviderHealthStatus providerId={providerId} />}

        {provider.supportsOAuth && isEnabled && <OAuthLoginButton providerId={providerId} />}

        {providerId === 'openrouter' && isEnabled && (
          <div className="space-y-4 pt-2 border-t">
            <OpenRouterSettings />
            <OpenRouterKeyManagement />
          </div>
        )}

        {providerId === 'cliproxyapi' && isEnabled && (
          <div className="space-y-4 pt-2 border-t">
            <CLIProxyAPISettings />
          </div>
        )}
        </ProviderCard>
      </div>
    );
  };

  const emptyStateQuickFixes = useMemo(() => {
    const byStepId = new Map<string, {
      providerId: string;
      stepId: string;
      reason?: string;
      action?: ProviderNextAction;
    }>();

    for (const [providerId, provider] of Object.entries(PROVIDERS)) {
      if (provider.category === 'local') continue;
      const state = getBuiltInProviderReadiness(
        providerId,
        providerSettings[providerId],
        testResults[providerId]
      );
      const pendingStep = state.setupChecklist.steps.find((step) => !step.done);
      if (!pendingStep) continue;
      if (!byStepId.has(pendingStep.id)) {
        byStepId.set(pendingStep.id, {
          providerId,
          stepId: pendingStep.id,
          reason: pendingStep.reason,
          action: pendingStep.nextAction,
        });
      }
      if (byStepId.size >= 3) break;
    }

    return Array.from(byStepId.values());
  }, [providerSettings, testResults]);

  if (!isMounted) {
    return <ProviderSkeleton />;
  }

  const showEmptyState =
    configuredCount === 0 &&
    Object.keys(customProviders).length === 0 &&
    categoryFilter === 'all' &&
    !searchQuery.trim();

  if (showEmptyState) {
    return (
      <>
        <ProviderEmptyState
          onAddProvider={() => {
            setEditingProviderId(null);
            setShowCustomDialog(true);
          }}
          onImportSettings={() => {}}
          guidanceItems={emptyStateQuickFixes.map((item) => ({
            id: `${item.providerId}-${item.stepId}`,
            label: getChecklistStepLabel(item.stepId),
            description: item.reason,
            actionLabel: t('fixNow'),
            onAction: () => {
              void runBuiltInQuickFixAction(item.providerId, item.action);
            },
          }))}
          importButton={<ProviderImportExport />}
        />
        <CustomProviderDialog
          open={showCustomDialog}
          onOpenChange={setShowCustomDialog}
          editingProviderId={editingProviderId}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with batch actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('providersConfigured', { count: totalConfiguredCount })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProviderImportExport />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchTest}
            disabled={isBatchTesting || totalConfiguredCount === 0}
          >
            {isBatchTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('testing')}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('testAllProviders')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryFailed}
            disabled={isBatchTesting || testResultsSummary.failed === 0}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('retryFailed')}
          </Button>
        </div>
      </div>

      {/* Batch test progress */}
      <BatchTestProgress
        isRunning={isBatchTesting}
        progress={batchTestProgress}
        onCancel={handleCancelBatchTest}
        cancelRequested={batchTestCancelRequested}
      />

      {/* Test results summary */}
      {!isBatchTesting && (
        <TestResultsSummary
          success={testResultsSummary.success}
          failed={testResultsSummary.failed}
          total={testResultsSummary.total}
          operationType={batchOperationType || undefined}
          completed={batchTestSummary?.completed}
          expectedTotal={batchTestSummary?.total}
          canceled={batchTestSummary?.canceled}
        />
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('securityTitle')}</AlertTitle>
        <AlertDescription>
          {t('securityDescription')}
        </AlertDescription>
      </Alert>

      {/* Category Filter Tabs and Search */}
      <ProviderFilters
        categoryFilter={categoryFilter as ProviderCategory}
        onCategoryChange={(cat) => setProviderCategoryFilter(cat as ProviderCategoryFilter)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setProviderViewMode}
        capabilityFilters={capabilityFilters}
        onCapabilityFilterChange={setCapabilityFilters}
      />

      {/* Local Providers Section - Show when local category is selected */}
      {categoryFilter === 'local' && (
        <LocalProviderSettings />
      )}

      {/* Built-in Providers - Grid or Table Layout */}
      {categoryFilter !== 'local' && (
        <TooltipProvider delayDuration={300}>
          {filteredProviders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('noProvidersFound')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('enterApiKeyForProvider')}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProviderCategoryFilter('all')}
                  disabled={categoryFilter === 'all'}
                >
                  {t('filterAll')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCapabilityFilters([]);
                  }}
                  disabled={!searchQuery.trim() && capabilityFilters.length === 0}
                >
                  {t('clearSelection')}
                </Button>
              </div>
            </div>
          ) : viewMode === 'table' ? (
          <>
          {/* Table View - Hidden on mobile (sm:), forced to cards */}
          <Card className="overflow-hidden hidden sm:block">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllVisibleSelected ? true : isSomeVisibleSelected ? 'indeterminate' : false}
                  onCheckedChange={() => toggleSelectAllVisible()}
                  aria-label={t('selectAllProviders')}
                />
                <span className="text-sm text-muted-foreground">
                  {t('selectedCount', { count: selectedVisibleCount })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchTestSelected}
                  disabled={isBatchTesting || selectedVisibleCount === 0}
                >
                  {t('testSelected')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetSelectedEnabled(true)}
                  disabled={selectedVisibleCount === 0}
                >
                  {t('enableSelected')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetSelectedEnabled(false)}
                  disabled={selectedVisibleCount === 0}
                >
                  {t('disableSelected')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedVisibleCount === 0}
                >
                  {t('clearSelection')}
                </Button>
              </div>
            </div>
            <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead className="w-[180px]">
                    <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('name')}>
                      {t('provider')}
                      {sortBy === 'name' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('models')}>
                      {t('models')}
                      {sortBy === 'models' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('context')}>
                      {t('context')}
                      {sortBy === 'context' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">{t('features')}</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    <Button variant="ghost" size="sm" className="h-7 -ml-2 px-2 font-medium" onClick={() => handleSort('price')}>
                      {t('pricing')}
                      {sortBy === 'price' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="h-7 px-2 font-medium" onClick={() => handleSort('status')}>
                      Status
                      {sortBy === 'status' ? (sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right w-[100px]">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map(([providerId, provider]) => {
                  const settings = providerSettings[providerId] || {};
                  const isEnabled = settings.enabled !== false;
                  const providerState = getBuiltInProviderReadiness(providerId, settings, testResults[providerId]);
                  const enableGuard = getProviderEnableEligibility(providerId, settings, !isEnabled);
                  const testGuard = providerState.eligibility.testConnection;
                  const defaultModelGuard = providerState.eligibility.defaultModel;
                  const defaultModel = provider.models.find(m => m.id === (settings.defaultModel || provider.defaultModel));
                  const testResult = testResults[providerId];
                  const pricedModels = provider.models.filter((m) => m.pricing);
                  const minPrice = pricedModels.length
                    ? Math.min(...pricedModels.map((m) => m.pricing?.promptPer1M || 0))
                    : 0;
                  const maxPrice = pricedModels.length
                    ? Math.max(...pricedModels.map((m) => m.pricing?.completionPer1M || 0))
                    : 0;
                  
                  return (
                    <React.Fragment key={providerId}>
                    <TableRow className={cn(!isEnabled && 'opacity-50')}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProviderIds.has(providerId)}
                          onCheckedChange={(v) => toggleSelectProvider(providerId, !!v)}
                          aria-label={t('selectProviderRow')}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground">
                            {getCategoryIcon(provider.category)}
                          </div>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {provider.description || (t(`${providerId}Description`) as string) || ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {provider.models.slice(0, 2).map((model) => (
                            <Badge 
                              key={model.id} 
                              variant={model.id === defaultModel?.id ? 'default' : 'outline'} 
                              className="text-[10px] px-1.5 py-0"
                            >
                              {model.name}
                            </Badge>
                          ))}
                          {provider.models.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{provider.models.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            const ctx = defaultModel?.contextLength;
                            if (typeof ctx !== 'number' || ctx <= 0) return '-';
                            return ctx >= 1000000
                              ? `${(ctx / 1000000).toFixed(1)}M`
                              : `${Math.round(ctx / 1000)}K`;
                          })()}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1">
                          {defaultModel?.supportsVision && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span><ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /></span>
                              </TooltipTrigger>
                              <TooltipContent>{t('capabilityVision')}</TooltipContent>
                            </Tooltip>
                          )}
                          {defaultModel?.supportsTools && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>{t('capabilityTools')}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {provider.models.some(m => m.pricing) ? (() => {
                          const cur = getCurrencyForLocale(language);
                          const cfg = CURRENCIES[cur];
                          const minConverted = minPrice * cfg.rateFromUSD;
                          const maxConverted = maxPrice * cfg.rateFromUSD;
                          return (
                            <span className="text-xs text-muted-foreground font-mono">
                              {cfg.symbol}{minConverted.toFixed(cfg.decimals)} - {cfg.symbol}{maxConverted.toFixed(cfg.decimals)}
                            </span>
                          );
                        })() : (
                          <Badge variant="secondary" className="text-[10px]">
                            {t('pricingVaries')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEnabled ? (
                          testResult && !testResult.success ? (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertCircle className="h-3 w-3 mr-0.5" />
                              {t('failed')}
                            </Badge>
                          ) : providerState.verificationStatus === 'stale' ? (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400">
                              <AlertCircle className="h-3 w-3 mr-0.5" />
                              {t('verificationStaleShort')}
                            </Badge>
                          ) : testResult?.success || providerState.readiness === 'verified' ? (
                            <Badge variant="default" className="text-[10px] bg-green-600">
                              <Check className="h-3 w-3 mr-0.5" />
                              {t('connected')}
                            </Badge>
                          ) : providerState.readiness === 'configured' ? (
                            <Badge variant="default" className="text-[10px]">
                              <Check className="h-3 w-3 mr-0.5" />
                              {t('ready')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">{t('notConfigured')}</Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-[10px]">{t('notSet')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleTestConnection(providerId)}
                                disabled={!testGuard.allowed || testingProviders[providerId]}
                                title={!testGuard.allowed ? testGuard.reason : undefined}
                              >
                                {testingProviders[providerId] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('testConnection')}</TooltipContent>
                          </Tooltip>
                          <div title={!enableGuard.allowed ? enableGuard.reason : undefined}>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => handleToggleProvider(providerId, checked)}
                              className="scale-75"
                              disabled={!enableGuard.allowed}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleTableRow(providerId)}
                          >
                            {expandedTableRows[providerId] ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Expanded Row Details */}
                    {expandedTableRows[providerId] && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* All Models */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">{t('allModels')} ({provider.models.length})</h4>
                              <div className="flex flex-wrap gap-1">
                                {provider.models.map((model) => (
                                  <Badge 
                                    key={model.id}
                                    variant={model.id === defaultModel?.id ? 'default' : 'outline'}
                                    className={cn(
                                      'text-xs',
                                      defaultModelGuard.allowed ? 'cursor-pointer hover:bg-primary/80' : 'opacity-60 cursor-not-allowed'
                                    )}
                                    onClick={() => {
                                      if (defaultModelGuard.allowed) {
                                        handleSetDefaultModel(providerId, model.id);
                                      }
                                    }}
                                    title={!defaultModelGuard.allowed ? defaultModelGuard.reason : undefined}
                                  >
                                    {model.name}
                                    {model.supportsVision && <ImageIcon className="ml-1 h-3 w-3" />}
                                    {model.supportsTools && <Wrench className="ml-1 h-3 w-3" />}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {/* Pricing Details */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">{t('pricingPerMillion')}</h4>
                              <div className="text-xs space-y-1">
                                {provider.models.filter(m => m.pricing).slice(0, 4).map((model) => (
                                  <div key={model.id} className="flex justify-between text-muted-foreground">
                                    <span>{model.name}</span>
                                    <span className="font-mono">
                                      ${model.pricing?.promptPer1M.toFixed(2)} / ${model.pricing?.completionPer1M.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                                {!provider.models.some(m => m.pricing) && (
                                  <span className="text-muted-foreground">
                                    {t('pricingVaries')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Quick Actions */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">{t('quickActions')}</h4>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleConfigureProviderFromTable(providerId)}
                                >
                                  {t('configureApiKey')}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleTestConnection(providerId)}
                                  disabled={!testGuard.allowed || testingProviders[providerId]}
                                  title={!testGuard.allowed ? testGuard.reason : undefined}
                                >
                                  {testingProviders[providerId] ? t('testing') : t('testConnection')}
                                </Button>
                                {providerState.setupChecklist.nextAction && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      void runBuiltInQuickFixAction(
                                        providerId,
                                        providerState.setupChecklist.nextAction
                                      );
                                    }}
                                  >
                                    {t('resolveNextStep')}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </Card>
          {/* Mobile fallback: show cards when table view selected but on small screen */}
          <div className="sm:hidden grid grid-cols-1 gap-3">
            {filteredProviders.map(([providerId, provider]) => renderBuiltInProviderCard(providerId, provider))}
          </div>
          </>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 gap-3">
            {filteredProviders.map(([providerId, provider]) => renderBuiltInProviderCard(providerId, provider))}
          </div>
        )}
        </TooltipProvider>
      )}

      {/* Custom Providers Section */}
      <CustomProvidersList
        providers={customProviders}
        testResults={customTestResults}
        testMessages={customTestMessages}
        testingProviders={testingCustomProviders}
        onTestProvider={handleTestCustomProvider}
        onEditProvider={(providerId) => {
          invalidateCustomVerification(providerId);
          setEditingProviderId(providerId);
          setShowCustomDialog(true);
        }}
        onToggleProvider={(providerId, enabled) => {
          const readiness = getCustomProviderReadiness(customProviders[providerId]);
          if (enabled && !readiness.eligibility.enable.allowed) {
            toast.warning(readiness.eligibility.enable.reason || t('configureApiKey'));
            return;
          }
          updateCustomProvider(providerId, { enabled });
          invalidateCustomVerification(providerId);
        }}
        onAddProvider={() => {
          setEditingProviderId(null);
          setShowCustomDialog(true);
        }}
        onQuickAdd={() => setShowQuickAddDialog(true)}
        searchQuery={searchQuery}
      />

      {/* Custom Provider Dialog */}
      <CustomProviderDialog
        open={showCustomDialog}
        onOpenChange={setShowCustomDialog}
        editingProviderId={editingProviderId}
      />

      {/* Quick Add Provider Dialog */}
      <QuickAddProviderDialog
        open={showQuickAddDialog}
        onOpenChange={setShowQuickAddDialog}
      />
    </div>
  );
}

export default ProviderSettings;
