import { fireEvent, screen } from '@testing-library/react';
import { GroupNodeConfig } from './group-config';
import { renderNodeConfig } from './test-support/test-utils';

describe('GroupNodeConfig', () => {
  it('updates color and size', () => {
    const { onUpdate } = renderNodeConfig(GroupNodeConfig, {
      id: 'n1',
      nodeType: 'group',
      label: 'Group',
      color: '#6b7280',
      minWidth: 200,
      minHeight: 150,
      isCollapsed: false,
      childNodeIds: [],
    } as any);

    fireEvent.click(screen.getByTitle('Blue'));
    fireEvent.change(screen.getByDisplayValue('200'), { target: { value: '260' } });

    expect(onUpdate).toHaveBeenCalledWith({ color: '#3b82f6' });
    expect(onUpdate).toHaveBeenCalledWith({ minWidth: 260 });
  });

  it('shows grouped nodes summary', () => {
    renderNodeConfig(GroupNodeConfig, {
      id: 'n1',
      nodeType: 'group',
      label: 'Group',
      color: '#6b7280',
      minWidth: 200,
      minHeight: 150,
      isCollapsed: false,
      childNodeIds: ['a', 'b'],
    } as any);

    expect(screen.getByText(/2 node\(s\) in this group/i)).toBeInTheDocument();
  });
});
