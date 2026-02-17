import { fireEvent, screen } from '@testing-library/react';
import { MergeNodeConfig } from './merge-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);

describe('MergeNodeConfig', () => {
  it('renders merge hint', () => {
    renderNodeConfig(MergeNodeConfig, {
      id: 'n1',
      nodeType: 'merge',
      label: 'Merge',
      mergeStrategy: 'concat',
    } as any);

    expect(screen.getByText(/merge their outputs/i)).toBeInTheDocument();
  });

  it('updates merge strategy via select', () => {
    const { onUpdate } = renderNodeConfig(MergeNodeConfig, {
      id: 'n1',
      nodeType: 'merge',
      label: 'Merge',
      mergeStrategy: 'concat',
    } as any);

    fireEvent.click(screen.getByText('Last Value'));
    expect(onUpdate).toHaveBeenCalledWith({ mergeStrategy: 'last' });
  });
});
