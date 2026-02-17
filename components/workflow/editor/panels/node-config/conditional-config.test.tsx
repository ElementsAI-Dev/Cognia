import { fireEvent, screen } from '@testing-library/react';
import { ConditionalNodeConfig } from './conditional-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('./variable-selector', () => ({
  VariableSelector: ({ onChange }: { onChange: (value: { nodeId: string; variableName: string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ nodeId: 'up', variableName: 'score' })}>pick-condition-var</button>
  ),
}));

describe('ConditionalNodeConfig', () => {
  it('updates expression content and allows variable insert', () => {
    const { onUpdate } = renderNodeConfig(ConditionalNodeConfig, {
      id: 'n1',
      nodeType: 'conditional',
      label: 'If',
      conditionType: 'expression',
      condition: 'value > 1',
    } as any);

    fireEvent.change(screen.getByDisplayValue('value > 1'), { target: { value: 'value > 2' } });
    fireEvent.click(screen.getByText('pick-condition-var'));

    expect(onUpdate).toHaveBeenCalledWith({ condition: 'value > 2' });
    expect(onUpdate).toHaveBeenCalledWith({ condition: 'value > 1up.score' });
  });

  it('updates comparison branch fields', () => {
    const { onUpdate } = renderNodeConfig(ConditionalNodeConfig, {
      id: 'n1',
      nodeType: 'conditional',
      label: 'If',
      conditionType: 'comparison',
      comparisonOperator: '==',
      comparisonValue: '1',
    } as any);

    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Greater Than (>)'));

    expect(onUpdate).toHaveBeenCalledWith({ comparisonValue: '10' });
    expect(onUpdate).toHaveBeenCalledWith({ comparisonOperator: '>' });
  });
});
