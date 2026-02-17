import { fireEvent, screen } from '@testing-library/react';
import { ParallelNodeConfig } from './parallel-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);

describe('ParallelNodeConfig', () => {
  it('updates waitForAll with switch', () => {
    const { onUpdate } = renderNodeConfig(ParallelNodeConfig, {
      id: 'n1',
      nodeType: 'parallel',
      label: 'Parallel',
      waitForAll: false,
      maxConcurrency: 2,
    } as any);

    fireEvent.click(screen.getByRole('switch'));
    expect(onUpdate).toHaveBeenCalledWith({ waitForAll: true });
  });

  it('updates max concurrency', () => {
    const { onUpdate } = renderNodeConfig(ParallelNodeConfig, {
      id: 'n1',
      nodeType: 'parallel',
      label: 'Parallel',
      waitForAll: true,
      maxConcurrency: 2,
    } as any);

    fireEvent.change(screen.getByPlaceholderText('Unlimited'), { target: { value: '5' } });
    expect(onUpdate).toHaveBeenCalledWith({ maxConcurrency: 5 });
  });
});
