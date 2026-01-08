/**
 * Availability Monitor Tests
 */

import {
  AvailabilityMonitor,
  getAvailabilityMonitor,
  initializeAvailabilityMonitor,
  isProviderHealthy,
  getProviderAvailability,
} from './availability-monitor';
import { circuitBreakerRegistry } from './circuit-breaker';

// Mock the api-test module
jest.mock('./api-test', () => ({
  testProviderConnection: jest.fn().mockResolvedValue({
    success: true,
    message: 'Connected',
    latency_ms: 100,
  }),
}));

import { testProviderConnection } from './api-test';

const mockTestConnection = testProviderConnection as jest.MockedFunction<typeof testProviderConnection>;

describe('AvailabilityMonitor', () => {
  let monitor: AvailabilityMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    circuitBreakerRegistry.resetAll();
    monitor = new AvailabilityMonitor({
      checkInterval: 60000,
      checkTimeout: 5000,
      failureThreshold: 3,
      recoveryThreshold: 2,
      maxHealthyLatency: 5000,
      autoStart: false,
    });
  });

  afterEach(() => {
    monitor.stop();
    monitor.reset();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      const m = new AvailabilityMonitor();
      expect(m).toBeDefined();
      m.stop();
    });

    it('should not auto-start by default', () => {
      expect(monitor.isMonitorRunning()).toBe(false);
    });

    it('should auto-start when configured', () => {
      const m = new AvailabilityMonitor({ autoStart: true, checkInterval: 60000 });
      expect(m.isMonitorRunning()).toBe(true);
      m.stop();
    });
  });

  describe('provider registration', () => {
    it('should register a provider', () => {
      monitor.registerProvider('openai', { apiKey: 'test-key' });
      
      const availability = monitor.getAvailability('openai');
      expect(availability).toBeDefined();
      expect(availability?.status).toBe('unknown');
    });

    it('should unregister a provider', () => {
      monitor.registerProvider('openai');
      monitor.unregisterProvider('openai');
      
      expect(monitor.getAvailability('openai')).toBeUndefined();
    });
  });

  describe('health checks', () => {
    beforeEach(() => {
      monitor.registerProvider('openai', { apiKey: 'test-key' });
    });

    it('should check provider health', async () => {
      mockTestConnection.mockResolvedValueOnce({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      const result = await monitor.checkProvider('openai');
      
      expect(result.success).toBe(true);
      expect(result.latencyMs).toBeDefined();
    });

    it('should update availability on successful check', async () => {
      mockTestConnection.mockResolvedValueOnce({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai'); // Need 2 for recovery threshold
      
      const availability = monitor.getAvailability('openai');
      expect(availability?.status).toBe('available');
    });

    it('should mark as degraded after failures', async () => {
      mockTestConnection.mockResolvedValueOnce({
        success: false,
        message: 'Connection failed',
      });

      await monitor.checkProvider('openai');
      
      const availability = monitor.getAvailability('openai');
      expect(['degraded', 'unknown']).toContain(availability?.status);
    });

    it('should mark as unavailable after threshold failures', async () => {
      mockTestConnection.mockResolvedValue({
        success: false,
        message: 'Connection failed',
      });

      // Fail multiple times to exceed threshold
      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      
      const availability = monitor.getAvailability('openai');
      expect(availability?.status).toBe('unavailable');
    });

    it('should check all providers', async () => {
      monitor.registerProvider('anthropic', { apiKey: 'test-key' });
      
      mockTestConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      const results = await monitor.checkAllProviders();
      
      expect(results.size).toBe(2);
      expect(results.has('openai')).toBe(true);
      expect(results.has('anthropic')).toBe(true);
    });
  });

  describe('availability queries', () => {
    beforeEach(() => {
      monitor.registerProvider('openai');
      monitor.registerProvider('anthropic');
    });

    it('should get all availability states', () => {
      const all = monitor.getAllAvailability();
      
      expect(all.size).toBe(2);
    });

    it('should check if provider is available', async () => {
      mockTestConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      
      expect(monitor.isAvailable('openai')).toBe(true);
    });

    it('should get available providers list', async () => {
      mockTestConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      
      const available = monitor.getAvailableProviders();
      expect(available).toContain('openai');
    });
  });

  describe('check history', () => {
    beforeEach(() => {
      monitor.registerProvider('openai');
    });

    it('should store check history', async () => {
      mockTestConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      
      const history = monitor.getCheckHistory('openai');
      expect(history.length).toBe(3);
    });

    it('should limit history results', async () => {
      mockTestConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      for (let i = 0; i < 10; i++) {
        await monitor.checkProvider('openai');
      }
      
      const history = monitor.getCheckHistory('openai', 5);
      expect(history.length).toBe(5);
    });
  });

  describe('event subscriptions', () => {
    beforeEach(() => {
      monitor.registerProvider('openai');
    });

    it('should subscribe to events', () => {
      const callback = jest.fn();
      const unsubscribe = monitor.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should emit health check events', async () => {
      const callback = jest.fn();
      monitor.subscribe(callback);
      
      mockTestConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      await monitor.checkProvider('openai');
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'health_check',
          providerId: 'openai',
        })
      );
    });

    it('should emit status change events', async () => {
      const callback = jest.fn();
      monitor.subscribe(callback);
      
      // First, make it available
      mockTestConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });
      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      
      // Then make it fail
      mockTestConnection.mockResolvedValue({
        success: false,
        message: 'Failed',
      });
      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      await monitor.checkProvider('openai');
      
      const statusChangeEvents = callback.mock.calls.filter(
        (call) => call[0].type === 'status_changed'
      );
      expect(statusChangeEvents.length).toBeGreaterThan(0);
    });

    it('should unsubscribe from events', async () => {
      const callback = jest.fn();
      const unsubscribe = monitor.subscribe(callback);
      unsubscribe();
      
      mockTestConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
        latency_ms: 100,
      });

      await monitor.checkProvider('openai');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('manual status override', () => {
    beforeEach(() => {
      monitor.registerProvider('openai');
    });

    it('should allow manual status override', () => {
      monitor.setProviderStatus('openai', 'unavailable');
      
      const availability = monitor.getAvailability('openai');
      expect(availability?.status).toBe('unavailable');
    });

    it('should emit event on manual override', () => {
      const callback = jest.fn();
      monitor.subscribe(callback);
      
      monitor.setProviderStatus('openai', 'degraded');
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_changed',
          currentStatus: 'degraded',
        })
      );
    });
  });

  describe('summary', () => {
    it('should return correct summary', () => {
      monitor.registerProvider('openai');
      monitor.registerProvider('anthropic');
      monitor.registerProvider('google');
      
      monitor.setProviderStatus('openai', 'available');
      monitor.setProviderStatus('anthropic', 'degraded');
      monitor.setProviderStatus('google', 'unavailable');
      
      const summary = monitor.getSummary();
      
      expect(summary.total).toBe(3);
      expect(summary.available).toBe(1);
      expect(summary.degraded).toBe(1);
      expect(summary.unavailable).toBe(1);
    });
  });

  describe('lifecycle', () => {
    it('should start and stop monitoring', () => {
      monitor.start();
      expect(monitor.isMonitorRunning()).toBe(true);
      
      monitor.stop();
      expect(monitor.isMonitorRunning()).toBe(false);
    });

    it('should reset all data', () => {
      monitor.registerProvider('openai');
      monitor.registerProvider('anthropic');
      
      monitor.reset();
      
      expect(monitor.getAllAvailability().size).toBe(0);
    });

    it('should update configuration', () => {
      monitor.start();
      
      monitor.updateConfig({ checkInterval: 30000 });
      
      expect(monitor.isMonitorRunning()).toBe(true);
    });
  });
});

describe('Utility functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    circuitBreakerRegistry.resetAll();
  });

  describe('getAvailabilityMonitor', () => {
    it('should return singleton instance', () => {
      const m1 = getAvailabilityMonitor();
      const m2 = getAvailabilityMonitor();
      
      expect(m1).toBe(m2);
      m1.stop();
    });
  });

  describe('initializeAvailabilityMonitor', () => {
    it('should initialize with providers', () => {
      const monitor = initializeAvailabilityMonitor([
        { id: 'openai', apiKey: 'test' },
        { id: 'anthropic', apiKey: 'test' },
      ]);
      
      expect(monitor.getAllAvailability().size).toBe(2);
      monitor.stop();
    });
  });

  describe('isProviderHealthy', () => {
    it('should check provider health status', () => {
      const monitor = getAvailabilityMonitor();
      monitor.registerProvider('test-provider');
      monitor.setProviderStatus('test-provider', 'available');
      
      expect(isProviderHealthy('test-provider')).toBe(true);
      monitor.stop();
    });
  });

  describe('getProviderAvailability', () => {
    it('should get provider availability', () => {
      const monitor = getAvailabilityMonitor();
      monitor.registerProvider('test-provider');
      
      const availability = getProviderAvailability('test-provider');
      expect(availability).toBeDefined();
      monitor.stop();
    });
  });
});
