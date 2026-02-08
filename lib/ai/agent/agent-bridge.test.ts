/**
 * Tests for AgentBridge - Inter-agent communication and delegation
 */

import {
  AgentBridge,
  getAgentBridge,
  setAgentBridge,
  resetAgentBridge,
  SharedMemoryManager,
  BridgeEventEmitter,
} from './agent-bridge';
import type { SharedMemoryEntry } from '@/types/agent/agent-team';

// ============================================================================
// BridgeEventEmitter Tests
// ============================================================================

describe('BridgeEventEmitter', () => {
  let emitter: BridgeEventEmitter;

  beforeEach(() => {
    emitter = new BridgeEventEmitter();
  });

  it('should subscribe and emit events', () => {
    const listener = jest.fn();
    emitter.on('memory:write', listener);

    const entry: SharedMemoryEntry = {
      key: 'test',
      value: 'hello',
      writtenBy: 'agent-1',
      writtenAt: new Date(),
      version: 1,
    };
    emitter.emit('memory:write', { namespace: 'results', entry });

    expect(listener).toHaveBeenCalledWith({ namespace: 'results', entry });
  });

  it('should unsubscribe via returned cleanup function', () => {
    const listener = jest.fn();
    const unsub = emitter.on('memory:write', listener);

    unsub();
    emitter.emit('memory:write', {
      namespace: 'results',
      entry: { key: 'k', value: 'v', writtenBy: 'a', writtenAt: new Date(), version: 1 },
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle multiple listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    emitter.on('delegation:created', listener1);
    emitter.on('delegation:created', listener2);

    const delegation = {
      id: 'd1',
      sourceType: 'background' as const,
      sourceId: 'bg-1',
      targetType: 'team' as const,
      task: 'test task',
      status: 'pending' as const,
      createdAt: new Date(),
    };
    emitter.emit('delegation:created', { delegation });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('should not throw when emitting with no listeners', () => {
    expect(() => {
      emitter.emit('memory:delete', { namespace: 'results', key: 'test' });
    }).not.toThrow();
  });

  it('should removeAllListeners', () => {
    const listener = jest.fn();
    emitter.on('memory:write', listener);
    emitter.removeAllListeners();

    emitter.emit('memory:write', {
      namespace: 'results',
      entry: { key: 'k', value: 'v', writtenBy: 'a', writtenAt: new Date(), version: 1 },
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should catch listener errors without breaking other listeners', () => {
    const errorListener = jest.fn(() => { throw new Error('listener error'); });
    const goodListener = jest.fn();
    emitter.on('memory:read', errorListener);
    emitter.on('memory:read', goodListener);

    emitter.emit('memory:read', { namespace: 'results', key: 'test', readerId: 'r1' });

    expect(errorListener).toHaveBeenCalled();
    expect(goodListener).toHaveBeenCalled();
  });
});

// ============================================================================
// SharedMemoryManager Tests
// ============================================================================

describe('SharedMemoryManager', () => {
  let eventEmitter: BridgeEventEmitter;
  let memory: SharedMemoryManager;

  beforeEach(() => {
    eventEmitter = new BridgeEventEmitter();
    memory = new SharedMemoryManager(eventEmitter);
  });

  afterEach(() => {
    memory.dispose();
  });

  it('should write and read entries', () => {
    memory.write('results', 'key1', 'value1', 'agent-1');
    const entry = memory.read('results', 'key1');

    expect(entry).toBeDefined();
    expect(entry!.key).toBe('key1');
    expect(entry!.value).toBe('value1');
    expect(entry!.writtenBy).toBe('agent-1');
    expect(entry!.version).toBe(1);
  });

  it('should increment version on update', () => {
    memory.write('results', 'key1', 'v1', 'agent-1');
    memory.write('results', 'key1', 'v2', 'agent-1');
    const entry = memory.read('results', 'key1');

    expect(entry!.version).toBe(2);
    expect(entry!.value).toBe('v2');
  });

  it('should return undefined for non-existent entries', () => {
    expect(memory.read('results', 'nonexistent')).toBeUndefined();
    expect(memory.read('nonexistent-ns', 'key')).toBeUndefined();
  });

  it('should read all entries in a namespace', () => {
    memory.write('results', 'key1', 'v1', 'agent-1');
    memory.write('results', 'key2', 'v2', 'agent-2');

    const entries = memory.readAll('results');
    expect(entries).toHaveLength(2);
  });

  it('should filter by tags', () => {
    memory.write('results', 'k1', 'v1', 'a1', { tags: ['important'] });
    memory.write('results', 'k2', 'v2', 'a2', { tags: ['other'] });
    memory.write('results', 'k3', 'v3', 'a3', { tags: ['important', 'urgent'] });

    const results = memory.searchByTags('results', ['important']);
    expect(results).toHaveLength(2);
  });

  it('should enforce access control', () => {
    memory.write('results', 'secret', 'value', 'a1', { readableBy: ['a1', 'a2'] });

    expect(memory.read('results', 'secret', 'a1')).toBeDefined();
    expect(memory.read('results', 'secret', 'a2')).toBeDefined();
    expect(memory.read('results', 'secret', 'a3')).toBeUndefined();
    // No readerId = no check
    expect(memory.read('results', 'secret')).toBeDefined();
  });

  it('should handle expiration', () => {
    // Write with already-expired time
    memory.write('results', 'expired', 'v', 'a1', { expiresInMs: -1000 });

    expect(memory.read('results', 'expired')).toBeUndefined();
  });

  it('should delete entries', () => {
    memory.write('results', 'key1', 'v1', 'a1');
    const deleted = memory.delete('results', 'key1');

    expect(deleted).toBe(true);
    expect(memory.read('results', 'key1')).toBeUndefined();
  });

  it('should return false when deleting non-existent', () => {
    expect(memory.delete('results', 'nonexistent')).toBe(false);
  });

  it('should clear namespace', () => {
    memory.write('results', 'k1', 'v1', 'a1');
    memory.write('results', 'k2', 'v2', 'a2');
    memory.clearNamespace('results');

    expect(memory.readAll('results')).toHaveLength(0);
  });

  it('should clear all', () => {
    memory.write('results', 'k1', 'v1', 'a1');
    memory.write('context', 'k2', 'v2', 'a2');
    memory.clearAll();

    expect(memory.getNamespaces()).toHaveLength(0);
  });

  it('should emit events on write', () => {
    const listener = jest.fn();
    eventEmitter.on('memory:write', listener);

    memory.write('results', 'key1', 'value1', 'agent-1');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'results',
        entry: expect.objectContaining({ key: 'key1', value: 'value1' }),
      })
    );
  });

  it('should emit events on delete', () => {
    const listener = jest.fn();
    eventEmitter.on('memory:delete', listener);

    memory.write('results', 'key1', 'v1', 'a1');
    memory.delete('results', 'key1');

    expect(listener).toHaveBeenCalledWith({ namespace: 'results', key: 'key1' });
  });

  it('should generate context string', () => {
    memory.write('results', 'k1', 'hello world', 'a1', { writerName: 'Agent 1' });
    const context = memory.toContextString('results');

    expect(context).toContain('Shared Memory (results)');
    expect(context).toContain('[k1]');
    expect(context).toContain('hello world');
    expect(context).toContain('Agent 1');
  });

  it('should return empty string for empty namespace', () => {
    expect(memory.toContextString('results')).toBe('');
  });

  it('should get entry count', () => {
    memory.write('results', 'k1', 'v1', 'a1');
    memory.write('results', 'k2', 'v2', 'a2');

    expect(memory.getEntryCount('results')).toBe(2);
    expect(memory.getEntryCount('nonexistent')).toBe(0);
  });
});

// ============================================================================
// AgentBridge Singleton Tests
// ============================================================================

describe('AgentBridge singleton', () => {
  afterEach(() => {
    resetAgentBridge();
  });

  it('should return the same instance', () => {
    const bridge1 = getAgentBridge();
    const bridge2 = getAgentBridge();
    expect(bridge1).toBe(bridge2);
  });

  it('should allow setting a custom bridge', () => {
    const custom = new AgentBridge();
    setAgentBridge(custom);
    expect(getAgentBridge()).toBe(custom);
  });

  it('should reset the bridge', () => {
    const bridge1 = getAgentBridge();
    resetAgentBridge();
    const bridge2 = getAgentBridge();
    expect(bridge1).not.toBe(bridge2);
  });
});

// ============================================================================
// AgentBridge Delegation Tests
// ============================================================================

describe('AgentBridge delegation', () => {
  let bridge: AgentBridge;

  beforeEach(() => {
    bridge = new AgentBridge();
  });

  afterEach(() => {
    bridge.dispose();
  });

  it('should create delegation records', () => {
    const delegation = bridge.createDelegation(
      'background',
      'bg-1',
      'team',
      'Build a dashboard'
    );

    expect(delegation.id).toBeDefined();
    expect(delegation.sourceType).toBe('background');
    expect(delegation.sourceId).toBe('bg-1');
    expect(delegation.targetType).toBe('team');
    expect(delegation.task).toBe('Build a dashboard');
    expect(delegation.status).toBe('pending');
  });

  it('should get delegation by ID', () => {
    const delegation = bridge.createDelegation('team', 't1', 'background', 'task');
    expect(bridge.getDelegation(delegation.id)).toBe(delegation);
  });

  it('should get delegations by source', () => {
    bridge.createDelegation('background', 'bg-1', 'team', 'task1');
    bridge.createDelegation('background', 'bg-1', 'team', 'task2');
    bridge.createDelegation('team', 't1', 'background', 'task3');

    const bgDelegations = bridge.getDelegationsBySource('background', 'bg-1');
    expect(bgDelegations).toHaveLength(2);
  });

  it('should get active delegations', () => {
    const d1 = bridge.createDelegation('background', 'bg-1', 'team', 'task1');
    bridge.createDelegation('team', 't1', 'background', 'task2');

    // Manually mark one as active
    d1.status = 'active';

    const active = bridge.getActiveDelegations();
    expect(active.length).toBeGreaterThanOrEqual(1);
  });

  it('should cancel active delegation', () => {
    const delegation = bridge.createDelegation('team', 't1', 'background', 'task');
    delegation.status = 'active';

    const cancelled = bridge.cancelDelegation(delegation.id);
    expect(cancelled).toBe(true);
    expect(delegation.status).toBe('cancelled');
  });

  it('should not cancel non-active delegation', () => {
    const delegation = bridge.createDelegation('team', 't1', 'background', 'task');
    // Status is 'pending', not 'active'
    expect(bridge.cancelDelegation(delegation.id)).toBe(false);
  });

  it('should emit delegation events', () => {
    const listener = jest.fn();
    bridge.onDelegation('delegation:created', listener);

    bridge.createDelegation('team', 't1', 'background', 'task');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        delegation: expect.objectContaining({ sourceType: 'team' }),
      })
    );
  });

  it('should store sub-agent results in shared memory', () => {
    bridge.storeSubAgentResult('results', 'sa-1', 'SubAgent 1', {
      success: true,
      finalResponse: 'Task completed',
      steps: [],
      totalSteps: 3,
      duration: 1000,
    });

    const entry = bridge.getSharedMemory().read('results', 'subagent:sa-1');
    expect(entry).toBeDefined();
    expect(entry!.value).toEqual(
      expect.objectContaining({ success: true, response: 'Task completed' })
    );
  });

  it('should store background agent results in shared memory', () => {
    bridge.storeBackgroundResult('results', 'bg-1', 'Background 1', {
      success: true,
      finalResponse: 'Done',
      steps: [],
      totalSteps: 5,
      duration: 2000,
      retryCount: 0,
    });

    const entry = bridge.getSharedMemory().read('results', 'background:bg-1');
    expect(entry).toBeDefined();
    expect(entry!.value).toEqual(
      expect.objectContaining({ success: true, response: 'Done' })
    );
  });

  it('should return statistics', () => {
    bridge.createDelegation('team', 't1', 'background', 'task1');
    bridge.getSharedMemory().write('results', 'k1', 'v1', 'a1');

    const stats = bridge.getStatistics();
    expect(stats.totalDelegations).toBe(1);
    expect(stats.sharedMemoryNamespaces).toBeGreaterThanOrEqual(1);
    expect(stats.totalMemoryEntries).toBeGreaterThanOrEqual(1);
  });

  it('should fail delegateToTeam when team manager not available', async () => {
    const delegation = await bridge.delegateToTeam({
      task: 'test',
      sourceType: 'background',
      sourceId: 'bg-1',
    });

    expect(delegation.status).toBe('failed');
    expect(delegation.error).toBe('Team manager not available');
  });

  it('should fail delegateToBackground when background manager not available', async () => {
    const delegation = await bridge.delegateToBackground({
      task: 'test',
      sourceType: 'team',
      sourceId: 't-1',
    });

    expect(delegation.status).toBe('failed');
    expect(delegation.error).toBe('Background manager not available');
  });
});
