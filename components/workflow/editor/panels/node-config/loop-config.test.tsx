import { fireEvent, screen } from '@testing-library/react';
import { LoopNodeConfig } from './loop-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('./variable-selector', () => ({
  VariableSelector: ({ onChange }: { onChange: (value: { nodeId: string; variableName: string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ nodeId: 'up', variableName: 'items' })}>pick-loop-var</button>
  ),
}));

describe('LoopNodeConfig', () => {
  it('updates basic loop fields', () => {
    const { onUpdate } = renderNodeConfig(LoopNodeConfig, {
      id: 'n1',
      nodeType: 'loop',
      label: 'Loop',
      loopType: 'forEach',
      iteratorVariable: 'item',
      maxIterations: 10,
      collection: 'input.items',
    } as any);

    fireEvent.change(screen.getByDisplayValue('item'), { target: { value: 'entry' } });
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '20' } });

    expect(onUpdate).toHaveBeenCalledWith({ iteratorVariable: 'entry' });
    expect(onUpdate).toHaveBeenCalledWith({ maxIterations: 20 });
  });

  it('handles while branch and variable insertion', () => {
    const { onUpdate } = renderNodeConfig(LoopNodeConfig, {
      id: 'n1',
      nodeType: 'loop',
      label: 'Loop',
      loopType: 'while',
      iteratorVariable: 'item',
      maxIterations: 10,
      condition: 'i < 10',
    } as any);

    fireEvent.change(screen.getByDisplayValue('i < 10'), { target: { value: 'i < 20' } });
    fireEvent.click(screen.getByText('pick-loop-var'));

    expect(onUpdate).toHaveBeenCalledWith({ condition: 'i < 20' });
    expect(onUpdate).toHaveBeenCalledWith({ condition: 'i < 10up.items' });
  });
});
