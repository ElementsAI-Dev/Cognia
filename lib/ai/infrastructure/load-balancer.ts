/**
 * Load Balancer - Intelligent request distribution across providers
 * 
 * Supports multiple load balancing strategies:
 * - Round Robin: Distribute requests evenly
 * - Weighted: Distribute based on provider weights/capacity
 * - Least Connections: Route to provider with fewest active requests
 * - Latency-based: Route to fastest responding provider
 * - Adaptive: Combine multiple factors for optimal routing
 */

import { getCircuitState, isProviderAvailable } from './circuit-breaker';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export type LoadBalancingStrategy =
  | 'round-robin'
  | 'weighted'
  | 'least-connections'
  | 'latency-based'
  | 'adaptive'
  | 'priority';

export interface ProviderWeight {
  providerId: string;
  weight: number; // 0-100, higher = more traffic
}

export interface ProviderMetrics {
  providerId: string;
  activeConnections: number;
  totalRequests: number;
  totalErrors: number;
  averageLatency: number;
  lastLatency: number;
  lastRequestTime: number;
  successRate: number;
  isHealthy: boolean;
  isAvailable: boolean;
}

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  /** Provider weights for weighted strategy */
  weights?: ProviderWeight[];
  /** Minimum success rate to consider provider healthy (0-1) */
  minSuccessRate?: number;
  /** Maximum latency to consider provider responsive (ms) */
  maxLatency?: number;
  /** Enable sticky sessions (route same user to same provider) */
  stickySession?: boolean;
  /** Session TTL in ms */
  sessionTtl?: number;
  /** Fallback providers in order of preference */
  fallbackOrder?: string[];
}

export interface SelectionResult {
  providerId: string;
  reason: string;
  alternatives: string[];
  metrics?: ProviderMetrics;
}

const DEFAULT_CONFIG: LoadBalancerConfig = {
  strategy: 'adaptive',
  minSuccessRate: 0.9,
  maxLatency: 5000,
  stickySession: false,
  sessionTtl: 300000, // 5 minutes
};

/**
 * Provider Load Balancer
 */
export class ProviderLoadBalancer {
  private config: LoadBalancerConfig;
  private metrics: Map<string, ProviderMetrics> = new Map();
  private roundRobinIndex: number = 0;
  private sessions: Map<string, { providerId: string; expiresAt: number }> = new Map();
  private availableProviders: string[] = [];

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with available providers
   */
  initialize(providerIds: string[]): void {
    this.availableProviders = providerIds;
    providerIds.forEach((id) => {
      if (!this.metrics.has(id)) {
        this.metrics.set(id, this.getDefaultMetrics(id));
      }
    });
  }

  /**
   * Get default metrics for a provider
   */
  private getDefaultMetrics(providerId: string): ProviderMetrics {
    return {
      providerId,
      activeConnections: 0,
      totalRequests: 0,
      totalErrors: 0,
      averageLatency: 0,
      lastLatency: 0,
      lastRequestTime: 0,
      successRate: 1,
      isHealthy: true,
      isAvailable: true,
    };
  }

  /**
   * Select the best provider based on the configured strategy
   */
  async selectProvider(sessionId?: string): Promise<SelectionResult | null> {
    // Clean up expired sessions
    this.cleanupSessions();

    // Check for sticky session
    if (this.config.stickySession && sessionId) {
      const session = this.sessions.get(sessionId);
      if (session && Date.now() < session.expiresAt) {
        const metrics = this.metrics.get(session.providerId);
        if (metrics?.isAvailable && metrics?.isHealthy) {
          return {
            providerId: session.providerId,
            reason: 'sticky_session',
            alternatives: this.getAlternatives(session.providerId),
            metrics,
          };
        }
      }
    }

    // Get healthy and available providers
    const candidates = this.getHealthyCandidates();
    if (candidates.length === 0) {
      return null;
    }

    let selected: string;
    let reason: string;

    switch (this.config.strategy) {
      case 'round-robin':
        selected = this.selectRoundRobin(candidates);
        reason = 'round_robin';
        break;
      case 'weighted':
        selected = this.selectWeighted(candidates);
        reason = 'weighted';
        break;
      case 'least-connections':
        selected = this.selectLeastConnections(candidates);
        reason = 'least_connections';
        break;
      case 'latency-based':
        selected = this.selectByLatency(candidates);
        reason = 'lowest_latency';
        break;
      case 'priority':
        selected = this.selectByPriority(candidates);
        reason = 'priority';
        break;
      case 'adaptive':
      default:
        selected = this.selectAdaptive(candidates);
        reason = 'adaptive';
        break;
    }

    // Update sticky session
    if (this.config.stickySession && sessionId) {
      this.sessions.set(sessionId, {
        providerId: selected,
        expiresAt: Date.now() + (this.config.sessionTtl || 300000),
      });
    }

    return {
      providerId: selected,
      reason,
      alternatives: this.getAlternatives(selected),
      metrics: this.metrics.get(selected),
    };
  }

  /**
   * Get healthy candidate providers
   */
  private getHealthyCandidates(): string[] {
    return this.availableProviders.filter((id) => {
      const metrics = this.metrics.get(id);
      if (!metrics) return false;

      // Check circuit breaker
      if (!isProviderAvailable(id)) {
        this.updateMetrics(id, { isAvailable: false });
        return false;
      }

      // Check success rate
      if (
        this.config.minSuccessRate &&
        metrics.totalRequests > 10 &&
        metrics.successRate < this.config.minSuccessRate
      ) {
        return false;
      }

      // Check latency
      if (
        this.config.maxLatency &&
        metrics.totalRequests > 5 &&
        metrics.averageLatency > this.config.maxLatency
      ) {
        return false;
      }

      return metrics.isHealthy && metrics.isAvailable;
    });
  }

  /**
   * Round robin selection
   */
  private selectRoundRobin(candidates: string[]): string {
    this.roundRobinIndex = (this.roundRobinIndex + 1) % candidates.length;
    return candidates[this.roundRobinIndex];
  }

  /**
   * Weighted selection
   */
  private selectWeighted(candidates: string[]): string {
    const weights = this.config.weights || [];
    const weightMap = new Map(weights.map((w) => [w.providerId, w.weight]));

    // Calculate total weight for candidates
    let totalWeight = 0;
    candidates.forEach((id) => {
      totalWeight += weightMap.get(id) || 50; // Default weight of 50
    });

    // Random selection based on weights
    let random = Math.random() * totalWeight;
    for (const id of candidates) {
      const weight = weightMap.get(id) || 50;
      random -= weight;
      if (random <= 0) {
        return id;
      }
    }

    return candidates[0];
  }

  /**
   * Least connections selection
   */
  private selectLeastConnections(candidates: string[]): string {
    let minConnections = Infinity;
    let selected = candidates[0];

    candidates.forEach((id) => {
      const metrics = this.metrics.get(id);
      if (metrics && metrics.activeConnections < minConnections) {
        minConnections = metrics.activeConnections;
        selected = id;
      }
    });

    return selected;
  }

  /**
   * Latency-based selection
   */
  private selectByLatency(candidates: string[]): string {
    let minLatency = Infinity;
    let selected = candidates[0];

    candidates.forEach((id) => {
      const metrics = this.metrics.get(id);
      if (metrics && metrics.averageLatency < minLatency && metrics.totalRequests > 0) {
        minLatency = metrics.averageLatency;
        selected = id;
      }
    });

    return selected;
  }

  /**
   * Priority-based selection (uses fallback order)
   */
  private selectByPriority(candidates: string[]): string {
    const fallbackOrder = this.config.fallbackOrder || [];

    for (const id of fallbackOrder) {
      if (candidates.includes(id)) {
        return id;
      }
    }

    // If no priority match, use first candidate
    return candidates[0];
  }

  /**
   * Adaptive selection - combines multiple factors
   */
  private selectAdaptive(candidates: string[]): string {
    // Score each candidate based on multiple factors
    const scores: { id: string; score: number }[] = candidates.map((id) => {
      const metrics = this.metrics.get(id) || this.getDefaultMetrics(id);
      let score = 100;

      // Factor 1: Success rate (0-30 points)
      score += metrics.successRate * 30;

      // Factor 2: Latency (0-30 points, lower is better)
      if (metrics.averageLatency > 0) {
        const latencyScore = Math.max(0, 30 - (metrics.averageLatency / 200)); // 200ms baseline
        score += latencyScore;
      } else {
        score += 15; // Unknown latency gets middle score
      }

      // Factor 3: Active connections (0-20 points, fewer is better)
      const connectionScore = Math.max(0, 20 - metrics.activeConnections * 2);
      score += connectionScore;

      // Factor 4: Circuit breaker state (0-20 points)
      const circuitState = getCircuitState(id);
      if (circuitState === 'closed') {
        score += 20;
      } else if (circuitState === 'half_open') {
        score += 10;
      }
      // open state gets 0 points

      return { id, score };
    });

    // Sort by score descending and select best
    scores.sort((a, b) => b.score - a.score);

    // Add some randomness among top candidates to distribute load
    const topCandidates = scores.filter((s) => s.score >= scores[0].score * 0.9);
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    return topCandidates[randomIndex].id;
  }

  /**
   * Get alternative providers
   */
  private getAlternatives(selected: string): string[] {
    return this.getHealthyCandidates().filter((id) => id !== selected);
  }

  /**
   * Record request start
   */
  recordRequestStart(providerId: string): void {
    const metrics = this.metrics.get(providerId);
    if (metrics) {
      metrics.activeConnections++;
      metrics.totalRequests++;
      metrics.lastRequestTime = Date.now();
    }
  }

  /**
   * Record request completion
   */
  recordRequestEnd(providerId: string, latencyMs: number, success: boolean): void {
    const metrics = this.metrics.get(providerId);
    if (metrics) {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      metrics.lastLatency = latencyMs;

      // Update average latency (exponential moving average)
      if (metrics.averageLatency === 0) {
        metrics.averageLatency = latencyMs;
      } else {
        metrics.averageLatency = metrics.averageLatency * 0.8 + latencyMs * 0.2;
      }

      if (!success) {
        metrics.totalErrors++;
      }

      // Update success rate
      metrics.successRate =
        (metrics.totalRequests - metrics.totalErrors) / metrics.totalRequests;
    }
  }

  /**
   * Update provider metrics
   */
  updateMetrics(providerId: string, updates: Partial<ProviderMetrics>): void {
    const current = this.metrics.get(providerId) || this.getDefaultMetrics(providerId);
    this.metrics.set(providerId, { ...current, ...updates });
  }

  /**
   * Set provider availability
   */
  setProviderAvailability(providerId: string, available: boolean): void {
    this.updateMetrics(providerId, { isAvailable: available });
  }

  /**
   * Set provider health
   */
  setProviderHealth(providerId: string, healthy: boolean): void {
    this.updateMetrics(providerId, { isHealthy: healthy });
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, ProviderMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get metrics for a specific provider
   */
  getProviderMetrics(providerId: string): ProviderMetrics | undefined {
    return this.metrics.get(providerId);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupSessions(): void {
    const now = Date.now();
    this.sessions.forEach((session, key) => {
      if (now >= session.expiresAt) {
        this.sessions.delete(key);
      }
    });
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.roundRobinIndex = 0;
    this.sessions.clear();
    this.availableProviders.forEach((id) => {
      this.metrics.set(id, this.getDefaultMetrics(id));
    });
  }
}

/** Global load balancer instance */
let globalLoadBalancer: ProviderLoadBalancer | null = null;

/**
 * Get or create the global load balancer
 */
export function getLoadBalancer(config?: Partial<LoadBalancerConfig>): ProviderLoadBalancer {
  if (!globalLoadBalancer) {
    globalLoadBalancer = new ProviderLoadBalancer(config);
  }
  return globalLoadBalancer;
}

/**
 * Initialize the global load balancer with providers
 */
export function initializeLoadBalancer(
  providerIds: string[],
  config?: Partial<LoadBalancerConfig>
): ProviderLoadBalancer {
  globalLoadBalancer = new ProviderLoadBalancer(config);
  globalLoadBalancer.initialize(providerIds);
  return globalLoadBalancer;
}

/**
 * Select the best provider using the global load balancer
 */
export async function selectBestProvider(sessionId?: string): Promise<SelectionResult | null> {
  const lb = getLoadBalancer();
  return lb.selectProvider(sessionId);
}

/**
 * Wrapper to execute a request with load balancing
 */
export async function withLoadBalancing<T>(
  providers: string[],
  fn: (providerId: string) => Promise<T>,
  config?: Partial<LoadBalancerConfig>
): Promise<{ result: T; providerId: string } | null> {
  const lb = new ProviderLoadBalancer(config);
  lb.initialize(providers);

  const selection = await lb.selectProvider();
  if (!selection) {
    return null;
  }

  const startTime = Date.now();
  lb.recordRequestStart(selection.providerId);

  try {
    const result = await fn(selection.providerId);
    lb.recordRequestEnd(selection.providerId, Date.now() - startTime, true);
    return { result, providerId: selection.providerId };
  } catch (error) {
    lb.recordRequestEnd(selection.providerId, Date.now() - startTime, false);
    throw error;
  }
}

/**
 * Execute with automatic failover to alternative providers
 */
export async function withFailover<T>(
  providers: string[],
  fn: (providerId: string) => Promise<T>,
  maxRetries: number = 3,
  config?: Partial<LoadBalancerConfig>
): Promise<{ result: T; providerId: string; attempts: number }> {
  const lb = new ProviderLoadBalancer({ ...config, strategy: 'priority', fallbackOrder: providers });
  lb.initialize(providers);

  let lastError: Error | null = null;
  let attempts = 0;

  const triedProviders = new Set<string>();

  while (attempts < maxRetries) {
    attempts++;

    const selection = await lb.selectProvider();
    if (!selection) {
      break;
    }

    // Skip already tried providers
    if (triedProviders.has(selection.providerId)) {
      // Mark as unavailable to get a different one
      lb.setProviderAvailability(selection.providerId, false);
      continue;
    }

    triedProviders.add(selection.providerId);
    const startTime = Date.now();
    lb.recordRequestStart(selection.providerId);

    try {
      const result = await fn(selection.providerId);
      lb.recordRequestEnd(selection.providerId, Date.now() - startTime, true);
      return { result, providerId: selection.providerId, attempts };
    } catch (error) {
      lb.recordRequestEnd(selection.providerId, Date.now() - startTime, false);
      lb.setProviderHealth(selection.providerId, false);
      lastError = error instanceof Error ? error : new Error(String(error));
      log.warn(`LoadBalancer provider ${selection.providerId} failed`, { providerId: selection.providerId, attempt: attempts, error: lastError.message });
    }
  }

  throw lastError || new Error('All providers failed');
}
