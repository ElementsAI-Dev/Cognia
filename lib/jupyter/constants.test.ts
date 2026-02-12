/**
 * Tests for Jupyter Constants
 */

import { KERNEL_STATUS_CONFIG, VARIABLE_TYPE_COLORS } from './constants';
import type { KernelStatus } from '@/types/jupyter';

describe('KERNEL_STATUS_CONFIG', () => {
  const ALL_STATUSES: KernelStatus[] = [
    'idle',
    'busy',
    'starting',
    'dead',
    'restarting',
    'interrupting',
    'stopping',
    'configuring',
    'installing',
    'error',
  ];

  it('has an entry for every KernelStatus value', () => {
    for (const status of ALL_STATUSES) {
      expect(KERNEL_STATUS_CONFIG[status]).toBeDefined();
    }
  });

  it('each entry has a color and labelKey', () => {
    for (const status of ALL_STATUSES) {
      const entry = KERNEL_STATUS_CONFIG[status];
      expect(typeof entry.color).toBe('string');
      expect(entry.color).toMatch(/^bg-/);
      expect(typeof entry.labelKey).toBe('string');
      expect(entry.labelKey).toMatch(/^status\./);
    }
  });

  it('idle status is green', () => {
    expect(KERNEL_STATUS_CONFIG.idle.color).toBe('bg-green-500');
    expect(KERNEL_STATUS_CONFIG.idle.labelKey).toBe('status.idle');
  });

  it('error status is red', () => {
    expect(KERNEL_STATUS_CONFIG.error.color).toBe('bg-red-500');
    expect(KERNEL_STATUS_CONFIG.error.labelKey).toBe('status.error');
  });

  it('busy status is yellow', () => {
    expect(KERNEL_STATUS_CONFIG.busy.color).toBe('bg-yellow-500');
    expect(KERNEL_STATUS_CONFIG.busy.labelKey).toBe('status.busy');
  });

  it('dead status is red', () => {
    expect(KERNEL_STATUS_CONFIG.dead.color).toBe('bg-red-500');
    expect(KERNEL_STATUS_CONFIG.dead.labelKey).toBe('status.dead');
  });

  it('starting status is blue', () => {
    expect(KERNEL_STATUS_CONFIG.starting.color).toBe('bg-blue-500');
  });

  it('restarting/interrupting/stopping are orange', () => {
    expect(KERNEL_STATUS_CONFIG.restarting.color).toBe('bg-orange-500');
    expect(KERNEL_STATUS_CONFIG.interrupting.color).toBe('bg-orange-500');
    expect(KERNEL_STATUS_CONFIG.stopping.color).toBe('bg-orange-500');
  });
});

describe('VARIABLE_TYPE_COLORS', () => {
  const EXPECTED_TYPES = [
    'int',
    'float',
    'str',
    'bool',
    'list',
    'dict',
    'tuple',
    'set',
    'ndarray',
    'DataFrame',
    'Series',
    'Tensor',
  ];

  it('has entries for all common Python types', () => {
    for (const type of EXPECTED_TYPES) {
      expect(VARIABLE_TYPE_COLORS[type]).toBeDefined();
    }
  });

  it('each entry is a valid CSS class string', () => {
    for (const type of EXPECTED_TYPES) {
      const value = VARIABLE_TYPE_COLORS[type];
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      // Should contain background and text color classes
      expect(value).toMatch(/bg-/);
      expect(value).toMatch(/text-/);
    }
  });

  it('int maps to blue classes', () => {
    expect(VARIABLE_TYPE_COLORS.int).toContain('blue');
  });

  it('str maps to green classes', () => {
    expect(VARIABLE_TYPE_COLORS.str).toContain('green');
  });

  it('DataFrame maps to emerald classes', () => {
    expect(VARIABLE_TYPE_COLORS.DataFrame).toContain('emerald');
  });

  it('returns undefined for unknown types', () => {
    expect(VARIABLE_TYPE_COLORS['unknown_type']).toBeUndefined();
  });
});
