import { fireEvent, screen } from '@testing-library/react';
import { VariableAggregatorNodeConfig } from './variable-aggregator-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/accordion', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').accordionMock);
jest.mock('./variable-selector', () => ({
  MultiVariableSelector: ({ onChange }: { onChange: (refs: Array<{ nodeId: string; variableName: string }>) => void }) => (
    <button type="button" onClick={() => onChange([{ nodeId: 'up', variableName: 'a' }])}>pick-aggregate-vars</button>
  ),
}));

describe('VariableAggregatorNodeConfig', () => {
  it('updates selected variable references', () => {
    const { onUpdate } = renderNodeConfig(VariableAggregatorNodeConfig, {
      id: 'n1',
      nodeType: 'variableAggregator',
      label: 'Aggregate',
      variableRefs: [],
      aggregationMode: 'array',
      outputVariableName: 'aggregated',
    } as any);

    fireEvent.click(screen.getByText('pick-aggregate-vars'));
    expect(onUpdate).toHaveBeenCalledWith({ variableRefs: [{ nodeId: 'up', variableName: 'a' }] });
  });

  it('updates aggregation mode and output variable name', () => {
    const { onUpdate } = renderNodeConfig(VariableAggregatorNodeConfig, {
      id: 'n1',
      nodeType: 'variableAggregator',
      label: 'Aggregate',
      variableRefs: [],
      aggregationMode: 'array',
      outputVariableName: 'aggregated',
    } as any);

    fireEvent.click(screen.getByText('Deep Merge — Recursively merge objects'));
    fireEvent.change(screen.getByDisplayValue('aggregated'), { target: { value: 'merged_output' } });

    expect(onUpdate).toHaveBeenCalledWith({ aggregationMode: 'merge' });
    expect(onUpdate).toHaveBeenCalledWith({ outputVariableName: 'merged_output' });
  });
});
