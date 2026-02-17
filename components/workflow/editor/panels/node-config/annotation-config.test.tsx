import { fireEvent, screen } from '@testing-library/react';
import { AnnotationNodeConfig } from './annotation-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);

describe('AnnotationNodeConfig', () => {
  it('updates content and color', () => {
    const { onUpdate } = renderNodeConfig(AnnotationNodeConfig, {
      id: 'n1',
      nodeType: 'annotation',
      label: 'Note',
      content: 'hello',
      color: '#ffffff',
      fontSize: 'medium',
      showBorder: true,
    } as any);

    fireEvent.change(screen.getByDisplayValue('hello'), { target: { value: 'updated note' } });
    fireEvent.click(screen.getByTitle('Blue'));

    expect(onUpdate).toHaveBeenCalledWith({ content: 'updated note' });
    expect(onUpdate).toHaveBeenCalledWith({ color: '#bfdbfe' });
  });

  it('updates border switch', () => {
    const { onUpdate } = renderNodeConfig(AnnotationNodeConfig, {
      id: 'n1',
      nodeType: 'annotation',
      label: 'Note',
      content: '',
      color: '#ffffff',
      fontSize: 'medium',
      showBorder: false,
    } as any);

    fireEvent.click(screen.getByRole('switch'));
    expect(onUpdate).toHaveBeenCalledWith({ showBorder: true });
  });
});
