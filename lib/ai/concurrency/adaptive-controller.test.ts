/**
 * Tests for AdaptiveConcurrencyController
 */

import {
  AdaptiveConcurrencyController,
  getAdaptiveConcurrencyController,
  resetAdaptiveConcurrencyController,
  DEFAULT_ADAPTIVE_CONFIG,
} from './adaptive-controller';

describe('AdaptiveConcurrencyController', () => {
  let controller: AdaptiveConcurrencyController;

  beforeEach(() => {
    controller = new AdaptiveConcurrencyController();
  });

  afterEach(() => {
    resetAdaptiveConcurrencyController();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(controller.getConcurrency()).toBe(DEFAULT_ADAPTIVE_CONFIG.initialConcurrency);
    });

    it('should accept custom config', () => {
      const customController = new AdaptiveConcurrencyController({
        initialConcurrency: 5,
        maxConcurrency: 20,
      });
      expect(customController.getConcurrency()).toBe(5);
    });
  });

  describe('recordExecution', () => {
    it('should record successful executions', () => {
      controller.recordExecution(100, true);
      controller.recordExecution(200, true);

      const metrics = controller.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(0);
    });

    it('should record failed executions', () => {
      controller.recordExecution(100, false);
      controller.recordExecution(200, true);

      const metrics = controller.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successCount).toBe(1);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.errorRate).toBe(0.5);
    });

    it('should trim records to window size', () => {
      const smallWindowController = new AdaptiveConcurrencyController({
        windowSize: 5,
      });

      for (let i = 0; i < 10; i++) {
        smallWindowController.recordExecution(100, true);
      }

      const metrics = smallWindowController.getMetrics();
      expect(metrics.totalRequests).toBe(5);
    });
  });

  describe('getMetrics', () => {
    it('should return zero metrics when empty', () => {
      const metrics = controller.getMetrics();
      expect(metrics.avgLatency).toBe(0);
      expect(metrics.p95Latency).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.totalRequests).toBe(0);
    });

    it('should calculate average latency correctly', () => {
      controller.recordExecution(100, true);
      controller.recordExecution(200, true);
      controller.recordExecution(300, true);

      const metrics = controller.getMetrics();
      expect(metrics.avgLatency).toBe(200);
    });

    it('should calculate p95 latency', () => {
      // Add 100 records to have meaningful p95
      for (let i = 1; i <= 100; i++) {
        controller.recordExecution(i * 10, true);
      }

      const metrics = controller.getMetrics();
      expect(metrics.p95Latency).toBeGreaterThan(metrics.avgLatency);
    });
  });

  describe('concurrency adjustment', () => {
    it('should decrease concurrency on high error rate', () => {
      const adjustableController = new AdaptiveConcurrencyController({
        adjustmentCooldownMs: 0, // Disable cooldown for testing
        errorRateThreshold: 0.1,
      });

      // Record high error rate
      for (let i = 0; i < 10; i++) {
        adjustableController.recordExecution(100, i < 5); // 50% error rate
      }

      expect(adjustableController.getConcurrency()).toBeLessThan(
        DEFAULT_ADAPTIVE_CONFIG.initialConcurrency
      );
    });

    it('should decrease concurrency on high latency', () => {
      const adjustableController = new AdaptiveConcurrencyController({
        adjustmentCooldownMs: 0,
        highLatencyThresholdMs: 1000,
      });

      // Record high latency
      for (let i = 0; i < 10; i++) {
        adjustableController.recordExecution(5000, true);
      }

      expect(adjustableController.getConcurrency()).toBeLessThan(
        DEFAULT_ADAPTIVE_CONFIG.initialConcurrency
      );
    });

    it('should increase concurrency on good performance', () => {
      const adjustableController = new AdaptiveConcurrencyController({
        adjustmentCooldownMs: 0,
        targetLatencyMs: 2000,
        lowErrorRateThreshold: 0.05,
      });

      // Record good performance
      for (let i = 0; i < 10; i++) {
        adjustableController.recordExecution(100, true);
      }

      expect(adjustableController.getConcurrency()).toBeGreaterThan(
        DEFAULT_ADAPTIVE_CONFIG.initialConcurrency
      );
    });

    it('should respect min/max bounds', () => {
      const boundedController = new AdaptiveConcurrencyController({
        minConcurrency: 2,
        maxConcurrency: 5,
        initialConcurrency: 3,
      });

      boundedController.setConcurrency(1);
      expect(boundedController.getConcurrency()).toBe(2);

      boundedController.setConcurrency(10);
      expect(boundedController.getConcurrency()).toBe(5);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on concurrency change', () => {
      const listener = jest.fn();
      const adjustableController = new AdaptiveConcurrencyController({
        adjustmentCooldownMs: 0,
      });

      adjustableController.subscribe(listener);
      adjustableController.setConcurrency(5);

      expect(listener).toHaveBeenCalledWith(5);
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = controller.subscribe(listener);

      unsubscribe();
      controller.setConcurrency(5);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', () => {
      controller.recordExecution(100, true);
      controller.recordExecution(200, false);
      controller.setConcurrency(10);

      controller.reset();

      expect(controller.getConcurrency()).toBe(DEFAULT_ADAPTIVE_CONFIG.initialConcurrency);
      expect(controller.getMetrics().totalRequests).toBe(0);
    });
  });

  describe('global controller', () => {
    it('should return same instance', () => {
      const instance1 = getAdaptiveConcurrencyController();
      const instance2 = getAdaptiveConcurrencyController();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getAdaptiveConcurrencyController();
      resetAdaptiveConcurrencyController();
      const instance2 = getAdaptiveConcurrencyController();

      expect(instance1).not.toBe(instance2);
    });
  });
});
