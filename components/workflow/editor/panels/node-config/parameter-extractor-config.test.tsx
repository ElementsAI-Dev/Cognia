import { fireEvent, screen } from '@testing-library/react';
import { ParameterExtractorNodeConfig } from './parameter-extractor-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/accordion', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').accordionMock);
jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);
jest.mock('./variable-selector', () => ({
  VariableSelector: ({ onChange }: { onChange: (value: { nodeId: string; variableName: string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ nodeId: 'up', variableName: 'text' })}>pick-param-var</button>
  ),
}));

describe('ParameterExtractorNodeConfig', () => {
  it('adds and edits extraction parameters', () => {
    const { onUpdate } = renderNodeConfig(ParameterExtractorNodeConfig, {
      id: 'n1',
      nodeType: 'parameterExtractor',
      label: 'Extractor',
      inputVariable: null,
      instruction: 'extract fields',
      model: 'gpt-4o',
      parameters: [
        { name: 'city', type: 'string', description: 'city name', required: false },
      ],
    } as any);

    fireEvent.click(screen.getByText('Add Parameter'));
    fireEvent.change(screen.getByDisplayValue('city'), { target: { value: 'country' } });
    fireEvent.click(screen.getByRole('switch'));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ parameters: expect.any(Array) }));
    expect(onUpdate).toHaveBeenCalledWith({
      parameters: [{ name: 'country', type: 'string', description: 'city name', required: false }],
    });
    expect(onUpdate).toHaveBeenCalledWith({
      parameters: [{ name: 'city', type: 'string', description: 'city name', required: true }],
    });
  });

  it('updates input variable and model', () => {
    const { onUpdate } = renderNodeConfig(ParameterExtractorNodeConfig, {
      id: 'n1',
      nodeType: 'parameterExtractor',
      label: 'Extractor',
      inputVariable: null,
      instruction: 'extract fields',
      model: 'gpt-4o',
      parameters: [],
    } as any);

    fireEvent.click(screen.getByText('pick-param-var'));
    fireEvent.click(screen.getByText('GPT-4o Mini'));

    expect(onUpdate).toHaveBeenCalledWith({ inputVariable: { nodeId: 'up', variableName: 'text' } });
    expect(onUpdate).toHaveBeenCalledWith({ model: 'gpt-4o-mini' });
  });
});
