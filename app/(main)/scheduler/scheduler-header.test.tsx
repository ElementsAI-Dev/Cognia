/**
 * @jest-environment jsdom
 */


import { SchedulerHeader } from './scheduler-header';

describe('scheduler-header module', () => {
  it('exports SchedulerHeader', () => {
    expect(SchedulerHeader).toBeDefined();
    expect(typeof SchedulerHeader).toBe('function');
  });
});
