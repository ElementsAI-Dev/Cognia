import { fireEvent, screen } from '@testing-library/react';
import { TransformNodeConfig } from './transform-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('./variable-selector', () => ({
  VariableSelector: ({ onChange }: { onChange: (value: { nodeId: string; variableName: string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ nodeId: 'up', variableName: 'count' })}>pick-variable</button>
  ),
}));

describe('TransformNodeConfig', () => {
  it('updates expression text', () => {
    const { onUpdate } = renderNodeConfig(TransformNodeConfig, {
      id: 'n1',
      nodeType: 'transform',
      label: 'Transform',
      transformType: 'map',
      expression: 'item => item',
    } as any);

    fireEvent.change(screen.getByDisplayValue('item => item'), { target: { value: 'item => item.value' } });
    expect(onUpdate).toHaveBeenCalledWith({ expression: 'item => item.value' });
  });

  it('inserts variable reference from selector', () => {
    const { onUpdate } = renderNodeConfig(TransformNodeConfig, {
      id: 'n1',
      nodeType: 'transform',
      label: 'Transform',
      transformType: 'map',
      expression: 'return ',
    } as any);

    fireEvent.click(screen.getByText('pick-variable'));
    expect(onUpdate).toHaveBeenCalledWith({ expression: 'return up.count' });
  });
});
