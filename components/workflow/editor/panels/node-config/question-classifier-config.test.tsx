import { fireEvent, screen } from '@testing-library/react';
import { QuestionClassifierNodeConfig } from './question-classifier-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'abc123') }));
jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/accordion', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').accordionMock);
jest.mock('./variable-selector', () => ({
  VariableSelector: ({ onChange }: { onChange: (value: { nodeId: string; variableName: string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ nodeId: 'up', variableName: 'query' })}>pick-classifier-var</button>
  ),
}));

describe('QuestionClassifierNodeConfig', () => {
  it('adds classes and updates existing class fields', () => {
    const { onUpdate } = renderNodeConfig(QuestionClassifierNodeConfig, {
      id: 'n1',
      nodeType: 'questionClassifier',
      label: 'Classifier',
      inputVariable: null,
      model: 'gpt-4o',
      classes: [
        { id: 'c1', name: 'Support', description: 'support question' },
        { id: 'c2', name: 'Sales', description: 'sales question' },
      ],
    } as any);

    fireEvent.click(screen.getByText('Add Class'));
    fireEvent.change(screen.getByDisplayValue('Support'), { target: { value: 'General' } });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ classes: expect.any(Array) }));
    expect(onUpdate).toHaveBeenCalledWith({
      classes: [
        { id: 'c1', name: 'General', description: 'support question' },
        { id: 'c2', name: 'Sales', description: 'sales question' },
      ],
    });
  });

  it('updates input variable and protects minimum class count', () => {
    const { onUpdate } = renderNodeConfig(QuestionClassifierNodeConfig, {
      id: 'n1',
      nodeType: 'questionClassifier',
      label: 'Classifier',
      inputVariable: null,
      model: 'gpt-4o',
      classes: [
        { id: 'c1', name: 'Support', description: 'support question' },
        { id: 'c2', name: 'Sales', description: 'sales question' },
      ],
    } as any);

    fireEvent.click(screen.getByText('pick-classifier-var'));
    const removeButtons = screen.getAllByRole('button');
    fireEvent.click(removeButtons[1]);

    expect(onUpdate).toHaveBeenCalledWith({ inputVariable: { nodeId: 'up', variableName: 'query' } });
    expect(onUpdate).not.toHaveBeenCalledWith({ classes: [{ id: 'c2', name: 'Sales', description: 'sales question' }] });
  });
});
