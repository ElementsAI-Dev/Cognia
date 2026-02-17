import { fireEvent, screen } from '@testing-library/react';
import { HumanNodeConfig } from './human-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);

describe('HumanNodeConfig', () => {
  it('updates approval fields', () => {
    const { onUpdate } = renderNodeConfig(HumanNodeConfig, {
      id: 'n1',
      nodeType: 'human',
      label: 'Human',
      approvalMessage: 'old',
      timeout: 60,
      assignee: 'alice',
      defaultAction: 'timeout',
    } as any);

    fireEvent.change(screen.getByDisplayValue('old'), { target: { value: 'new message' } });
    fireEvent.change(screen.getByDisplayValue('60'), { target: { value: '120' } });

    expect(onUpdate).toHaveBeenCalledWith({ approvalMessage: 'new message' });
    expect(onUpdate).toHaveBeenCalledWith({ timeout: 120 });
  });

  it('updates default action via select', () => {
    const { onUpdate } = renderNodeConfig(HumanNodeConfig, {
      id: 'n1',
      nodeType: 'human',
      label: 'Human',
      approvalMessage: 'old',
      defaultAction: 'timeout',
    } as any);

    fireEvent.click(screen.getByText('Reject'));
    expect(onUpdate).toHaveBeenCalledWith({ defaultAction: 'reject' });
  });
});
