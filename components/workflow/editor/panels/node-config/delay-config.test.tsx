import { fireEvent, screen } from '@testing-library/react';
import { DelayNodeConfig } from './delay-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);

describe('DelayNodeConfig', () => {
  it('renders fixed delay branch and updates duration', () => {
    const { onUpdate } = renderNodeConfig(DelayNodeConfig, {
      id: 'n1',
      nodeType: 'delay',
      label: 'Delay',
      delayType: 'fixed',
      delayMs: 1000,
    } as any);

    fireEvent.change(screen.getByPlaceholderText('1000'), { target: { value: '2500' } });
    expect(onUpdate).toHaveBeenCalledWith({ delayMs: 2500 });
  });

  it('updates delay type through select', () => {
    const { onUpdate } = renderNodeConfig(DelayNodeConfig, {
      id: 'n1',
      nodeType: 'delay',
      label: 'Delay',
      delayType: 'fixed',
    } as any);

    fireEvent.click(screen.getByText('Until Time'));
    expect(onUpdate).toHaveBeenCalledWith({ delayType: 'until' });
  });
});
