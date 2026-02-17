import { fireEvent, screen } from '@testing-library/react';
import { KnowledgeRetrievalNodeConfig } from './knowledge-retrieval-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/accordion', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').accordionMock);
jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);
jest.mock('@/components/ui/slider', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').sliderMock);
jest.mock('./variable-selector', () => ({
  VariableSelector: ({ onChange }: { onChange: (value: { nodeId: string; variableName: string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ nodeId: 'input', variableName: 'question' })}>pick-rag-var</button>
  ),
}));

describe('KnowledgeRetrievalNodeConfig', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(42);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds and updates knowledge base ids', () => {
    const { onUpdate } = renderNodeConfig(KnowledgeRetrievalNodeConfig, {
      id: 'n1',
      nodeType: 'knowledgeRetrieval',
      label: 'RAG',
      retrievalMode: 'multiple',
      knowledgeBaseIds: ['kb-1'],
      queryVariable: null,
      topK: 5,
      scoreThreshold: 0.5,
      rerankingEnabled: false,
    } as any);

    fireEvent.click(screen.getByText('Add Knowledge Base'));
    fireEvent.change(screen.getByDisplayValue('kb-1'), { target: { value: 'kb-main' } });

    expect(onUpdate).toHaveBeenCalledWith({ knowledgeBaseIds: ['kb-1', 'kb-42'] });
    expect(onUpdate).toHaveBeenCalledWith({ knowledgeBaseIds: ['kb-main'] });
  });

  it('updates query variable and reranking fields', () => {
    const { onUpdate } = renderNodeConfig(KnowledgeRetrievalNodeConfig, {
      id: 'n1',
      nodeType: 'knowledgeRetrieval',
      label: 'RAG',
      retrievalMode: 'multiple',
      knowledgeBaseIds: ['kb-1'],
      queryVariable: null,
      topK: 5,
      scoreThreshold: 0.5,
      rerankingEnabled: true,
      rerankingModel: 'old-model',
    } as any);

    fireEvent.click(screen.getByText('pick-rag-var'));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.change(screen.getByDisplayValue('old-model'), { target: { value: 'bge-reranker' } });

    expect(onUpdate).toHaveBeenCalledWith({ queryVariable: { nodeId: 'input', variableName: 'question' } });
    expect(onUpdate).toHaveBeenCalledWith({ rerankingEnabled: false });
    expect(onUpdate).toHaveBeenCalledWith({ rerankingModel: 'bge-reranker' });
  });
});
