/**
 * Circuit Breaker Tests
 */

import {
  CircuitBreaker,
  circuitBreakerRegistry,
  withCircuitBreaker,
  isProviderAvailable,
  getCircuitState,
  recordProviderFailure,
  recordProviderSuccess,
  DEFAULT_CIRCUIT_CONFIG,
} from './circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-provider', {
      failureThreshold: 3,
      resetTimeout: 1000,
      successThreshold: 2,
      failureWindow: 5000,
    });
  });

  afterEach(() => {
    breaker.reset();
    circuitBreakerRegistry.resetAll();
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(breaker.getState()).toBe('closed');
    });

    it('should allow execution in closed state', () => {
      expect(breaker.canExecute()).toBe(true);
    });

    it('should have correct initial stats', () => {
      const stats = breaker.getStats();
      expect(stats.state).toBe('closed');
      expect(stats.failures).toBe(0);
      expect(stats.consecutiveSuccesses).toBe(0);
    });
  });

  describe('recording successes', () => {
    it('should stay closed after successes', () => {
      breaker.recordSuccess();
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
    });

    it('should track consecutive successes', () => {
      breaker.recordSuccess();
      breaker.recordSuccess();
      const stats = breaker.getStats();
      expect(stats.consecutiveSuccesses).toBe(2);
    });
  });

  describe('recording failures', () => {
    it('should open circuit after threshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('closed');
      
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');
    });

    it('should reject requests when open', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      
      expect(breaker.canExecute()).toBe(false);
    });

    it('should reset consecutive successes on failure', () => {
      breaker.recordSuccess();
      breaker.recordSuccess();
      breaker.recordFailure();
      
      const stats = breaker.getStats();
      expect(stats.consecutiveSuccesses).toBe(0);
    });
  });

  describe('state transitions', () => {
    it('should transition to half-open after reset timeout', async () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));
      
      expect(breaker.getState()).toBe('half_open');
    });

    it('should transition from half-open to closed after successes', async () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(breaker.getState()).toBe('half_open');

      breaker.recordSuccess();
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
    });

    it('should transition from half-open to open on failure', async () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(breaker.getState()).toBe('half_open');

      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');
    });
  });

  describe('execute method', () => {
    it('should execute function and return result on success', async () => {
      const result = await breaker.execute(async () => 'success');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.rejected).toBe(false);
    });

    it('should return error on function failure', async () => {
      const result = await breaker.execute(async () => {
        throw new Error('test error');
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('test error');
      expect(result.rejected).toBe(false);
    });

    it('should reject when circuit is open', async () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      const result = await breaker.execute(async () => 'success');
      
      expect(result.success).toBe(false);
      expect(result.rejected).toBe(true);
      expect(result.circuitState).toBe('open');
    });
  });

  describe('manual controls', () => {
    it('should force open the circuit', () => {
      breaker.forceOpen();
      expect(breaker.getState()).toBe('open');
      expect(breaker.canExecute()).toBe(false);
    });

    it('should force close the circuit', () => {
      breaker.forceOpen();
      breaker.forceClose();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.canExecute()).toBe(true);
    });

    it('should reset the circuit', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      
      breaker.reset();
      
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getStats().failures).toBe(0);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  beforeEach(() => {
    circuitBreakerRegistry.resetAll();
  });

  afterEach(() => {
    circuitBreakerRegistry.resetAll();
  });

  it('should create and cache circuit breakers', () => {
    const breaker1 = circuitBreakerRegistry.get('provider1');
    const breaker2 = circuitBreakerRegistry.get('provider1');
    
    expect(breaker1).toBe(breaker2);
  });

  it('should create separate breakers for different providers', () => {
    const breaker1 = circuitBreakerRegistry.get('provider1');
    const breaker2 = circuitBreakerRegistry.get('provider2');
    
    expect(breaker1).not.toBe(breaker2);
  });

  it('should check if provider can execute', () => {
    expect(circuitBreakerRegistry.canExecute('new-provider')).toBe(true);
  });

  it('should get all stats', () => {
    circuitBreakerRegistry.get('provider1');
    circuitBreakerRegistry.get('provider2');
    
    const stats = circuitBreakerRegistry.getAllStats();
    
    expect(Object.keys(stats)).toContain('provider1');
    expect(Object.keys(stats)).toContain('provider2');
  });

  it('should get open circuits', () => {
    const breaker = circuitBreakerRegistry.get('failing-provider', {
      failureThreshold: 2,
    });
    breaker.recordFailure();
    breaker.recordFailure();
    
    const openCircuits = circuitBreakerRegistry.getOpenCircuits();
    
    expect(openCircuits).toContain('failing-provider');
  });

  it('should reset a specific provider', () => {
    const breaker = circuitBreakerRegistry.get('provider1');
    breaker.forceOpen();
    
    circuitBreakerRegistry.reset('provider1');
    
    expect(breaker.getState()).toBe('closed');
  });

  it('should reset all providers', () => {
    const breaker1 = circuitBreakerRegistry.get('provider1');
    const breaker2 = circuitBreakerRegistry.get('provider2');
    breaker1.forceOpen();
    breaker2.forceOpen();
    
    circuitBreakerRegistry.resetAll();
    
    expect(breaker1.getState()).toBe('closed');
    expect(breaker2.getState()).toBe('closed');
  });
});

describe('Utility functions', () => {
  beforeEach(() => {
    circuitBreakerRegistry.resetAll();
  });

  afterEach(() => {
    circuitBreakerRegistry.resetAll();
  });

  describe('withCircuitBreaker', () => {
    it('should execute function with circuit breaker', async () => {
      const result = await withCircuitBreaker('test', async () => 42);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should handle errors', async () => {
      const result = await withCircuitBreaker('test', async () => {
        throw new Error('failure');
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('failure');
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for available provider', () => {
      expect(isProviderAvailable('new-provider')).toBe(true);
    });

    it('should return false for provider with open circuit', () => {
      const breaker = circuitBreakerRegistry.get('failing', { failureThreshold: 1 });
      breaker.recordFailure();
      
      expect(isProviderAvailable('failing')).toBe(false);
    });
  });

  describe('getCircuitState', () => {
    it('should return closed for new provider', () => {
      expect(getCircuitState('unknown')).toBe('closed');
    });

    it('should return current state', () => {
      const breaker = circuitBreakerRegistry.get('test');
      breaker.forceOpen();
      
      expect(getCircuitState('test')).toBe('open');
    });
  });

  describe('recordProviderFailure/Success', () => {
    it('should record failures', () => {
      recordProviderFailure('test');
      recordProviderFailure('test');
      
      const stats = circuitBreakerRegistry.get('test').getStats();
      expect(stats.failures).toBe(2);
    });

    it('should record successes', () => {
      recordProviderSuccess('test');
      recordProviderSuccess('test');
      
      const stats = circuitBreakerRegistry.get('test').getStats();
      expect(stats.consecutiveSuccesses).toBe(2);
    });
  });
});

describe('State change events', () => {
  beforeEach(() => {
    circuitBreakerRegistry.resetAll();
  });

  afterEach(() => {
    circuitBreakerRegistry.resetAll();
  });

  describe('CircuitBreaker.onStateChange', () => {
    it('should notify listener on state change', () => {
      const breaker = new CircuitBreaker('event-test', { failureThreshold: 2, resetTimeout: 1000 });
      const listener = jest.fn();
      breaker.onStateChange(listener);

      breaker.recordFailure();
      breaker.recordFailure(); // triggers open

      expect(listener).toHaveBeenCalledWith('event-test', 'closed', 'open');
    });

    it('should return unsubscribe function', () => {
      const breaker = new CircuitBreaker('unsub-test', { failureThreshold: 1, resetTimeout: 1000 });
      const listener = jest.fn();
      const unsub = breaker.onStateChange(listener);

      unsub();
      breaker.recordFailure();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not call listener if state does not change', () => {
      const breaker = new CircuitBreaker('no-change', { failureThreshold: 5, resetTimeout: 1000 });
      const listener = jest.fn();
      breaker.onStateChange(listener);

      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('CircuitBreakerRegistry.subscribe', () => {
    it('should receive global state change events', () => {
      const listener = jest.fn();
      const unsub = circuitBreakerRegistry.subscribe(listener);

      const breaker = circuitBreakerRegistry.get('global-test', { failureThreshold: 1 });
      breaker.recordFailure();

      expect(listener).toHaveBeenCalledWith('global-test', 'closed', 'open');
      unsub();
    });

    it('should receive events from multiple breakers', () => {
      const listener = jest.fn();
      const unsub = circuitBreakerRegistry.subscribe(listener);

      const b1 = circuitBreakerRegistry.get('multi-1', { failureThreshold: 1 });
      const b2 = circuitBreakerRegistry.get('multi-2', { failureThreshold: 1 });

      b1.recordFailure();
      b2.recordFailure();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith('multi-1', 'closed', 'open');
      expect(listener).toHaveBeenCalledWith('multi-2', 'closed', 'open');
      unsub();
    });

    it('should stop receiving events after unsubscribe', () => {
      const listener = jest.fn();
      const unsub = circuitBreakerRegistry.subscribe(listener);
      unsub();

      const breaker = circuitBreakerRegistry.get('unsub-global', { failureThreshold: 1 });
      breaker.recordFailure();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('DEFAULT_CIRCUIT_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_CIRCUIT_CONFIG.failureThreshold).toBeGreaterThan(0);
    expect(DEFAULT_CIRCUIT_CONFIG.resetTimeout).toBeGreaterThan(0);
    expect(DEFAULT_CIRCUIT_CONFIG.successThreshold).toBeGreaterThan(0);
    expect(DEFAULT_CIRCUIT_CONFIG.failureWindow).toBeGreaterThan(0);
  });
});
