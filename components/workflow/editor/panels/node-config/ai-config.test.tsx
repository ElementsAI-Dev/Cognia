import { fireEvent, screen } from '@testing-library/react';
import { AINodeConfig } from './ai-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/accordion', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').accordionMock);
jest.mock('@/components/ui/slider', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').sliderMock);
jest.mock('./variable-selector', () => ({
  VariableSelector: ({ onChange }: { onChange: (value: { nodeId: string; variableName: string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ nodeId: 'up', variableName: 'message' })}>pick-ai-var</button>
  ),
}));

describe('AINodeConfig', () => {
  it('updates prompts', () => {
    const { onUpdate } = renderNodeConfig(AINodeConfig, {
      id: 'n1',
      nodeType: 'ai',
      label: 'AI',
      aiPrompt: 'hello',
      systemPrompt: 'system',
      temperature: 0.7,
      model: 'gpt-4o',
    } as any);

    fireEvent.change(screen.getByDisplayValue('system'), { target: { value: 'new system' } });
    fireEvent.change(screen.getByDisplayValue('hello'), { target: { value: 'new prompt' } });

    expect(onUpdate).toHaveBeenCalledWith({ systemPrompt: 'new system' });
    expect(onUpdate).toHaveBeenCalledWith({ aiPrompt: 'new prompt' });
  });

  it('inserts variable references and updates model settings', () => {
    const { onUpdate } = renderNodeConfig(AINodeConfig, {
      id: 'n1',
      nodeType: 'ai',
      label: 'AI',
      aiPrompt: 'prompt ',
      systemPrompt: '',
      temperature: 0.7,
      model: 'gpt-4o',
    } as any);

    fireEvent.click(screen.getByText('pick-ai-var'));
    fireEvent.click(screen.getByText('GPT-4o Mini (OpenAI)'));
    fireEvent.change(screen.getByPlaceholderText('4096'), { target: { value: '2048' } });

    expect(onUpdate).toHaveBeenCalledWith({ aiPrompt: 'prompt {{up.message}}' });
    expect(onUpdate).toHaveBeenCalledWith({ model: 'gpt-4o-mini' });
    expect(onUpdate).toHaveBeenCalledWith({ maxTokens: 2048 });
  });
});
