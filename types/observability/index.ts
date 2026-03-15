/**
 * Observability Types
 *
 * Shared type definitions for the observability module.
 */

export interface TraceData {
  id: string;
  name: string;
  sessionId?: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'success' | 'error';
  model?: string;
  provider?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  spans: SpanData[];
  metadata?: Record<string, unknown>;
}

export interface SpanData {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'success' | 'error';
  type: 'generation' | 'tool' | 'agent' | 'span';
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  children?: SpanData[];
}

export interface MetricsData {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  requestsByProvider: Record<string, number>;
  requestsByModel: Record<string, number>;
  tokensByProvider: Record<string, number>;
  costByProvider: Record<string, number>;
  latencyPercentiles: {
    p50: number;
    p90: number;
    p99: number;
  };
}

export type TimeRange = '1h' | '24h' | '7d' | '30d';

export type DashboardTab = 'overview' | 'metrics' | 'costs' | 'traces';

export interface ObservabilitySettingsData {
  enabled: boolean;
  langfuseEnabled: boolean;
  langfusePublicKey: string;
  langfuseSecretKey: string;
  langfuseHost: string;
  openTelemetryEnabled: boolean;
  openTelemetryEndpoint: string;
  serviceName: string;
}

export type ObservabilityReadinessStatus = 'disabled' | 'incomplete' | 'ready';

export type ObservabilitySurfaceStatus = ObservabilityReadinessStatus | 'history-only';

export type ObservabilityMissingField =
  | 'langfusePublicKey'
  | 'langfuseSecretKey'
  | 'langfuseHost'
  | 'openTelemetryEndpoint'
  | 'serviceName';

export interface ObservabilityIntegrationProjection {
  enabled: boolean;
  configured: boolean;
  active: boolean;
  status: ObservabilityReadinessStatus;
  missingFields: ObservabilityMissingField[];
}

export interface ObservabilityAgentTraceProjection {
  enabled: boolean;
  status: 'disabled' | 'ready';
  maxRecords: number;
  autoCleanupDays: number;
  traceShellCommands: boolean;
  traceCodeEdits: boolean;
  traceFailedCalls: boolean;
}

export interface ObservabilityHistoryProjection {
  usageRecordCount: number;
  traceRecordCount: number;
  hasUsageHistory: boolean;
  hasTraceHistory: boolean;
  hasAnyHistory: boolean;
}

export interface ObservabilitySurfaceProjection {
  visible: boolean;
  status: ObservabilitySurfaceStatus;
}

export interface ObservabilityTraceViewerExternalProjection {
  available: boolean;
  status: ObservabilityReadinessStatus;
  missingFields: ObservabilityMissingField[];
}

export interface ObservabilitySettingsProjection {
  status: ObservabilitySurfaceStatus;
  captureEnabled: boolean;
  runtimeCaptureEnabled: boolean;
  langfuse: ObservabilityIntegrationProjection;
  openTelemetry: ObservabilityIntegrationProjection;
  agentTrace: ObservabilityAgentTraceProjection;
  history: ObservabilityHistoryProjection;
  surfaces: {
    sidebar: ObservabilitySurfaceProjection;
    dashboard: ObservabilitySurfaceProjection;
    traceViewerExternal: ObservabilityTraceViewerExternalProjection;
  };
}

export interface SessionData {
  sessionId: string;
  tokens: number;
  cost: number;
  requests: number;
  name?: string;
  lastActive?: Date;
}

export interface SparklineDataPoint {
  value: number;
  label?: string;
}

export interface EfficiencyData {
  costEfficiency: number;
  tokenEfficiency: number;
  latencyScore: number;
  errorScore: number;
  utilizationScore: number;
}
