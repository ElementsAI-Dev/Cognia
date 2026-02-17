/**
 * @jest-environment jsdom
 */


import { AppSchedulerView } from './app-scheduler-view';

describe('app-scheduler-view module', () => {
  it('exports AppSchedulerView', () => {
    expect(AppSchedulerView).toBeDefined();
    expect(typeof AppSchedulerView).toBe('function');
  });
});
