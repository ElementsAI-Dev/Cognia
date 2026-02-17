/**
 * @jest-environment jsdom
 */


import { SchedulerToolbar } from './scheduler-toolbar';

describe('scheduler-toolbar module', () => {
  it('exports SchedulerToolbar', () => {
    expect(SchedulerToolbar).toBeDefined();
    expect(typeof SchedulerToolbar).toBe('function');
  });
});
