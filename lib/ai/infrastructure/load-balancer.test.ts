/**
 * Load Balancer Tests
 */

import {
  ProviderLoadBalancer,
  getLoadBalancer,
  initializeLoadBalancer,
  withLoadBalancing,
  withFailover,
} from './load-balancer';
import { circuitBreakerRegistry } from './circuit-breaker';

describe('ProviderLoadBalancer', () => {
  let loadBalancer: ProviderLoadBalancer;

  beforeEach(() => {
    loadBalancer = new ProviderLoadBalancer();
    loadBalancer.initialize(['provider1', 'provider2', 'provider3']);
    circuitBreakerRegistry.resetAll();
  });

  describe('initialization', () => {
    it('should initialize with providers', () => {
      const lb = new ProviderLoadBalancer();
      lb.initialize(['a', 'b', 'c']);
      
      const metrics = lb.getAllMetrics();
      expect(metrics.size).toBe(3);
    });

    it('should create default metrics for each provider', () => {
      const metrics = loadBalancer.getProviderMetrics('provider1');
      
      expect(metrics).toBeDefined();
      expect(metrics?.activeConnections).toBe(0);
      expect(metrics?.totalRequests).toBe(0);
      expect(metrics?.isHealthy).toBe(true);
    });
  });

  describe('provider selection', () => {
    it('should select a provider', async () => {
      const result = await loadBalancer.selectProvider();
      
      expect(result).not.toBeNull();
      expect(['provider1', 'provider2', 'provider3']).toContain(result?.providerId);
    });

    it('should provide alternatives', async () => {
      const result = await loadBalancer.selectProvider();
      
      expect(result?.alternatives.length).toBe(2);
      expect(result?.alternatives).not.toContain(result?.providerId);
    });

    it('should return null when no healthy providers', async () => {
      loadBalancer.setProviderHealth('provider1', false);
      loadBalancer.setProviderHealth('provider2', false);
      loadBalancer.setProviderHealth('provider3', false);
      
      const result = await loadBalancer.selectProvider();
      
      expect(result).toBeNull();
    });
  });

  describe('round-robin strategy', () => {
    it('should cycle through providers', async () => {
      const lb = new ProviderLoadBalancer({ strategy: 'round-robin' });
      lb.initialize(['a', 'b', 'c']);
      
      const selections: string[] = [];
      for (let i = 0; i < 6; i++) {
        const result = await lb.selectProvider();
        if (result) selections.push(result.providerId);
      }
      
      // Should cycle through all providers
      expect(selections.filter(s => s === 'a').length).toBeGreaterThanOrEqual(1);
      expect(selections.filter(s => s === 'b').length).toBeGreaterThanOrEqual(1);
      expect(selections.filter(s => s === 'c').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('weighted strategy', () => {
    it('should respect weights', async () => {
      const lb = new ProviderLoadBalancer({
        strategy: 'weighted',
        weights: [
          { providerId: 'heavy', weight: 100 },
          { providerId: 'light', weight: 1 },
        ],
      });
      lb.initialize(['heavy', 'light']);
      
      const selections: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = await lb.selectProvider();
        if (result) selections.push(result.providerId);
      }
      
      const heavyCount = selections.filter(s => s === 'heavy').length;
      const lightCount = selections.filter(s => s === 'light').length;
      
      // Heavy should be selected much more often
      expect(heavyCount).toBeGreaterThan(lightCount);
    });
  });

  describe('least-connections strategy', () => {
    it('should select provider with least connections', async () => {
      const lb = new ProviderLoadBalancer({ strategy: 'least-connections' });
      lb.initialize(['a', 'b', 'c']);
      
      // Simulate active connections
      lb.recordRequestStart('a');
      lb.recordRequestStart('a');
      lb.recordRequestStart('b');
      
      const result = await lb.selectProvider();
      
      // 'c' has 0 connections, should be selected
      expect(result?.providerId).toBe('c');
    });
  });

  describe('priority strategy', () => {
    it('should select by priority order', async () => {
      const lb = new ProviderLoadBalancer({
        strategy: 'priority',
        fallbackOrder: ['first', 'second', 'third'],
      });
      lb.initialize(['third', 'first', 'second']);
      
      const result = await lb.selectProvider();
      
      expect(result?.providerId).toBe('first');
    });

    it('should fallback to next in priority', async () => {
      const lb = new ProviderLoadBalancer({
        strategy: 'priority',
        fallbackOrder: ['first', 'second', 'third'],
      });
      lb.initialize(['third', 'first', 'second']);
      lb.setProviderHealth('first', false);
      
      const result = await lb.selectProvider();
      
      expect(result?.providerId).toBe('second');
    });
  });

  describe('metrics tracking', () => {
    it('should track request start', () => {
      loadBalancer.recordRequestStart('provider1');
      
      const metrics = loadBalancer.getProviderMetrics('provider1');
      expect(metrics?.activeConnections).toBe(1);
      expect(metrics?.totalRequests).toBe(1);
    });

    it('should track request end', () => {
      loadBalancer.recordRequestStart('provider1');
      loadBalancer.recordRequestEnd('provider1', 100, true);
      
      const metrics = loadBalancer.getProviderMetrics('provider1');
      expect(metrics?.activeConnections).toBe(0);
      expect(metrics?.lastLatency).toBe(100);
    });

    it('should calculate average latency', () => {
      loadBalancer.recordRequestStart('provider1');
      loadBalancer.recordRequestEnd('provider1', 100, true);
      loadBalancer.recordRequestStart('provider1');
      loadBalancer.recordRequestEnd('provider1', 200, true);
      
      const metrics = loadBalancer.getProviderMetrics('provider1');
      // EMA: 100 * 0.8 + 200 * 0.2 = 120
      expect(metrics?.averageLatency).toBe(120);
    });

    it('should track success rate', () => {
      loadBalancer.recordRequestStart('provider1');
      loadBalancer.recordRequestEnd('provider1', 100, true);
      loadBalancer.recordRequestStart('provider1');
      loadBalancer.recordRequestEnd('provider1', 100, false);
      
      const metrics = loadBalancer.getProviderMetrics('provider1');
      expect(metrics?.successRate).toBe(0.5);
    });
  });

  describe('provider health', () => {
    it('should set provider availability', () => {
      loadBalancer.setProviderAvailability('provider1', false);
      
      const metrics = loadBalancer.getProviderMetrics('provider1');
      expect(metrics?.isAvailable).toBe(false);
    });

    it('should set provider health', () => {
      loadBalancer.setProviderHealth('provider1', false);
      
      const metrics = loadBalancer.getProviderMetrics('provider1');
      expect(metrics?.isHealthy).toBe(false);
    });
  });

  describe('sticky sessions', () => {
    it('should route same session to same provider', async () => {
      const lb = new ProviderLoadBalancer({ stickySession: true });
      lb.initialize(['a', 'b', 'c']);
      
      const first = await lb.selectProvider('session1');
      const second = await lb.selectProvider('session1');
      
      expect(first?.providerId).toBe(second?.providerId);
    });

    it('should route different sessions independently', async () => {
      const lb = new ProviderLoadBalancer({ 
        stickySession: true,
        strategy: 'round-robin',
      });
      lb.initialize(['a', 'b', 'c']);
      
      await lb.selectProvider('session1');
      await lb.selectProvider('session2');
      await lb.selectProvider('session3');
      
      // Different sessions can get different providers
      // Just verify no errors
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      loadBalancer.recordRequestStart('provider1');
      loadBalancer.recordRequestEnd('provider1', 100, true);
      
      loadBalancer.reset();
      
      const metrics = loadBalancer.getProviderMetrics('provider1');
      expect(metrics?.totalRequests).toBe(0);
      expect(metrics?.activeConnections).toBe(0);
    });
  });
});

describe('Utility functions', () => {
  beforeEach(() => {
    circuitBreakerRegistry.resetAll();
  });

  describe('withLoadBalancing', () => {
    it('should execute with load balancing', async () => {
      const result = await withLoadBalancing(
        ['p1', 'p2'],
        async (providerId) => `result from ${providerId}`
      );
      
      expect(result).not.toBeNull();
      expect(result?.result).toMatch(/^result from p[12]$/);
    });

    it('should return null when no providers', async () => {
      const result = await withLoadBalancing([], async () => 'result');
      
      expect(result).toBeNull();
    });
  });

  describe('withFailover', () => {
    it('should succeed with first provider', async () => {
      const result = await withFailover(
        ['p1', 'p2'],
        async () => 'success'
      );
      
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
    });

    it('should failover to next provider', async () => {
      let callCount = 0;
      
      const result = await withFailover(
        ['p1', 'p2', 'p3'],
        async (providerId) => {
          callCount++;
          if (providerId === 'p1') throw new Error('p1 failed');
          return `success from ${providerId}`;
        }
      );
      
      expect(result.result).toMatch(/^success from p[23]$/);
      expect(callCount).toBeGreaterThan(1);
    });

    it('should throw after all providers fail', async () => {
      await expect(
        withFailover(
          ['p1', 'p2'],
          async () => { throw new Error('failed'); },
          2
        )
      ).rejects.toThrow('failed');
    });
  });

  describe('getLoadBalancer', () => {
    it('should return singleton instance', () => {
      const lb1 = getLoadBalancer();
      const lb2 = getLoadBalancer();
      
      expect(lb1).toBe(lb2);
    });
  });

  describe('initializeLoadBalancer', () => {
    it('should initialize with providers', () => {
      const lb = initializeLoadBalancer(['a', 'b']);
      
      expect(lb.getAllMetrics().size).toBe(2);
    });
  });
});
