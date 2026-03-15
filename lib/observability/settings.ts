import type { AgentTraceSettings } from '@/stores/settings';
import type {
  ObservabilityHistoryProjection,
  ObservabilityIntegrationProjection,
  ObservabilityMissingField,
  ObservabilitySettingsData,
  ObservabilitySettingsProjection,
  ObservabilitySurfaceStatus,
} from '@/types/observability';

const DEFAULT_OBSERVABILITY_SETTINGS: ObservabilitySettingsData = {
  enabled: false,
  langfuseEnabled: false,
  langfusePublicKey: '',
  langfuseSecretKey: '',
  langfuseHost: 'https://cloud.langfuse.com',
  openTelemetryEnabled: false,
  openTelemetryEndpoint: 'http://localhost:4318/v1/traces',
  serviceName: 'cognia-ai',
};

const DEFAULT_AGENT_TRACE_SETTINGS_FALLBACK: AgentTraceSettings = {
  enabled: true,
  maxRecords: 1000,
  autoCleanupDays: 30,
  traceShellCommands: true,
  traceCodeEdits: true,
  traceFailedCalls: false,
};

export function normalizeObservabilitySettings(
  settings?: Partial<ObservabilitySettingsData> | null
): ObservabilitySettingsData {
  return {
    ...DEFAULT_OBSERVABILITY_SETTINGS,
    ...(settings ?? {}),
    langfuseHost:
      settings?.langfuseHost?.trim() || DEFAULT_OBSERVABILITY_SETTINGS.langfuseHost,
    openTelemetryEndpoint:
      settings?.openTelemetryEndpoint?.trim() || DEFAULT_OBSERVABILITY_SETTINGS.openTelemetryEndpoint,
    serviceName: settings?.serviceName?.trim() || DEFAULT_OBSERVABILITY_SETTINGS.serviceName,
  };
}

export function normalizeAgentTraceSettings(
  settings?: Partial<AgentTraceSettings> | null
): AgentTraceSettings {
  return {
    ...DEFAULT_AGENT_TRACE_SETTINGS_FALLBACK,
    ...(settings ?? {}),
  };
}

function buildHistoryProjection(
  usageRecordCount = 0,
  traceRecordCount = 0
): ObservabilityHistoryProjection {
  const safeUsageRecordCount = Math.max(0, usageRecordCount);
  const safeTraceRecordCount = Math.max(0, traceRecordCount);

  return {
    usageRecordCount: safeUsageRecordCount,
    traceRecordCount: safeTraceRecordCount,
    hasUsageHistory: safeUsageRecordCount > 0,
    hasTraceHistory: safeTraceRecordCount > 0,
    hasAnyHistory: safeUsageRecordCount > 0 || safeTraceRecordCount > 0,
  };
}

function buildLangfuseProjection(
  settings: ObservabilitySettingsData,
  captureEnabled: boolean
): ObservabilityIntegrationProjection {
  const missingFields: ObservabilityMissingField[] = [];
  if (!settings.langfusePublicKey.trim()) missingFields.push('langfusePublicKey');
  if (!settings.langfuseSecretKey.trim()) missingFields.push('langfuseSecretKey');
  if (!settings.langfuseHost.trim()) missingFields.push('langfuseHost');

  const configured = settings.langfuseEnabled && missingFields.length === 0;

  return {
    enabled: settings.langfuseEnabled,
    configured,
    active: captureEnabled && configured,
    status: !settings.langfuseEnabled
      ? 'disabled'
      : missingFields.length > 0
        ? 'incomplete'
        : captureEnabled
          ? 'ready'
          : 'disabled',
    missingFields,
  };
}

function buildOpenTelemetryProjection(
  settings: ObservabilitySettingsData,
  captureEnabled: boolean
): ObservabilityIntegrationProjection {
  const missingFields: ObservabilityMissingField[] = [];
  if (!settings.openTelemetryEndpoint.trim()) missingFields.push('openTelemetryEndpoint');
  if (!settings.serviceName.trim()) missingFields.push('serviceName');

  const configured = settings.openTelemetryEnabled && missingFields.length === 0;

  return {
    enabled: settings.openTelemetryEnabled,
    configured,
    active: captureEnabled && configured,
    status: !settings.openTelemetryEnabled
      ? 'disabled'
      : missingFields.length > 0
        ? 'incomplete'
        : captureEnabled
          ? 'ready'
          : 'disabled',
    missingFields,
  };
}

function deriveSurfaceStatus(options: {
  hasReadyCapability: boolean;
  hasIncompleteCapability: boolean;
  hasRequestedCaptureWithoutCapability: boolean;
  hasHistory: boolean;
}): ObservabilitySurfaceStatus {
  const {
    hasReadyCapability,
    hasIncompleteCapability,
    hasRequestedCaptureWithoutCapability,
    hasHistory,
  } = options;

  if (hasReadyCapability) return 'ready';
  if (hasIncompleteCapability || hasRequestedCaptureWithoutCapability) return 'incomplete';
  if (hasHistory) return 'history-only';
  return 'disabled';
}

export function buildObservabilitySettingsProjection(input: {
  observabilitySettings?: Partial<ObservabilitySettingsData> | null;
  agentTraceSettings?: Partial<AgentTraceSettings> | null;
  usageRecordCount?: number;
  traceRecordCount?: number;
}): ObservabilitySettingsProjection {
  const settings = normalizeObservabilitySettings(input.observabilitySettings);
  const agentTraceSettings = normalizeAgentTraceSettings(input.agentTraceSettings);
  const history = buildHistoryProjection(input.usageRecordCount, input.traceRecordCount);

  const captureEnabled = settings.enabled;
  const langfuse = buildLangfuseProjection(settings, captureEnabled);
  const openTelemetry = buildOpenTelemetryProjection(settings, captureEnabled);
  const agentTraceReady = agentTraceSettings.enabled;
  const runtimeCaptureEnabled = langfuse.active || openTelemetry.active;
  const hasReadyCapability = runtimeCaptureEnabled || agentTraceReady;
  const hasIncompleteCapability =
    langfuse.status === 'incomplete' || openTelemetry.status === 'incomplete';
  const hasRequestedCaptureWithoutCapability =
    captureEnabled && !runtimeCaptureEnabled && !agentTraceReady;
  const status = deriveSurfaceStatus({
    hasReadyCapability,
    hasIncompleteCapability,
    hasRequestedCaptureWithoutCapability,
    hasHistory: history.hasAnyHistory,
  });

  return {
    status,
    captureEnabled,
    runtimeCaptureEnabled,
    langfuse,
    openTelemetry,
    agentTrace: {
      enabled: agentTraceSettings.enabled,
      status: agentTraceReady ? 'ready' : 'disabled',
      maxRecords: agentTraceSettings.maxRecords,
      autoCleanupDays: agentTraceSettings.autoCleanupDays,
      traceShellCommands: agentTraceSettings.traceShellCommands,
      traceCodeEdits: agentTraceSettings.traceCodeEdits,
      traceFailedCalls: agentTraceSettings.traceFailedCalls,
    },
    history,
    surfaces: {
      sidebar: {
        visible: true,
        status,
      },
      dashboard: {
        visible: true,
        status,
      },
      traceViewerExternal: {
        available: langfuse.configured,
        status: langfuse.configured
          ? 'ready'
          : langfuse.enabled
            ? 'incomplete'
            : 'disabled',
        missingFields: langfuse.missingFields,
      },
    },
  };
}
