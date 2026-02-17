import { fireEvent, screen } from '@testing-library/react';
import { TemplateTransformNodeConfig } from './template-transform-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/accordion', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').accordionMock);
jest.mock('./variable-selector', () => ({
  MultiVariableSelector: ({ onChange }: { onChange: (refs: Array<{ nodeId: string; variableName: string }>) => void }) => (
    <button type="button" onClick={() => onChange([{ nodeId: 'up', variableName: 'name' }])}>pick-template-vars</button>
  ),
}));

describe('TemplateTransformNodeConfig', () => {
  it('updates template content and output type', () => {
    const { onUpdate } = renderNodeConfig(TemplateTransformNodeConfig, {
      id: 'n1',
      nodeType: 'templateTransform',
      label: 'Template',
      outputType: 'string',
      template: 'Hello {{name}}',
      variableRefs: [],
    } as any);

    fireEvent.change(screen.getByDisplayValue('Hello {{name}}'), { target: { value: 'Hi {{name}}' } });
    fireEvent.click(screen.getByText('JSON'));

    expect(onUpdate).toHaveBeenCalledWith({ template: 'Hi {{name}}' });
    expect(onUpdate).toHaveBeenCalledWith({ outputType: 'json' });
  });

  it('updates referenced variables', () => {
    const { onUpdate } = renderNodeConfig(TemplateTransformNodeConfig, {
      id: 'n1',
      nodeType: 'templateTransform',
      label: 'Template',
      outputType: 'string',
      template: 'Hello {{name}}',
      variableRefs: [],
    } as any);

    fireEvent.click(screen.getByText('pick-template-vars'));
    expect(onUpdate).toHaveBeenCalledWith({ variableRefs: [{ nodeId: 'up', variableName: 'name' }] });
  });
});
