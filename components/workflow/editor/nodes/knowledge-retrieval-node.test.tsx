/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { KnowledgeRetrievalNode } from './knowledge-retrieval-node';
import type { KnowledgeRetrievalNodeData } from '@/types/workflow/workflow-editor';

jest.mock('./base-node', () => ({
  BaseNode: ({
    data,
    children,
  }: {
    data: { label: string };
    children?: React.ReactNode;
  }) => (
    <div data-testid="base-node">
      <h3>{data.label}</h3>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}));

const baseProps = {
  id: 'kr-1',
  type: 'knowledgeRetrieval',
  selected: false,
  draggable: true,
  selectable: true,
  deletable: true,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

const mockData: KnowledgeRetrievalNodeData = {
  id: 'kr-1',
  nodeType: 'knowledgeRetrieval',
  label: 'Knowledge Retrieval',
  executionStatus: 'idle',
  isConfigured: true,
  hasError: false,
  inputs: {},
  outputs: {},
  knowledgeBaseIds: ['kb-001', 'kb-002'],
  topK: 5,
  scoreThreshold: 0.7,
  retrievalMode: 'multiple',
  rerankingEnabled: false,
  queryVariable: null,
};

describe('KnowledgeRetrievalNode', () => {
  it('renders without crashing', () => {
    render(<KnowledgeRetrievalNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Knowledge Retrieval')).toBeInTheDocument();
  });

  it('renders retrieval mode badge', () => {
    render(<KnowledgeRetrievalNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Multi-KB')).toBeInTheDocument();
  });

  it('renders single KB mode', () => {
    const singleData = { ...mockData, retrievalMode: 'single' as const };
    render(<KnowledgeRetrievalNode {...baseProps} data={singleData} />);
    expect(screen.getByText('Single-KB')).toBeInTheDocument();
  });

  it('renders top K badge', () => {
    render(<KnowledgeRetrievalNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Top 5')).toBeInTheDocument();
  });

  it('renders knowledge base IDs', () => {
    render(<KnowledgeRetrievalNode {...baseProps} data={mockData} />);
    expect(screen.getByText('kb-001')).toBeInTheDocument();
    expect(screen.getByText('kb-002')).toBeInTheDocument();
  });

  it('shows overflow indicator for many KBs', () => {
    const manyKBs = {
      ...mockData,
      knowledgeBaseIds: ['kb-1', 'kb-2', 'kb-3', 'kb-4', 'kb-5'],
    };
    render(<KnowledgeRetrievalNode {...baseProps} data={manyKBs} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('shows empty state when no KBs selected', () => {
    const emptyData = { ...mockData, knowledgeBaseIds: [] };
    render(<KnowledgeRetrievalNode {...baseProps} data={emptyData} />);
    expect(screen.getByText('No knowledge base selected')).toBeInTheDocument();
  });

  it('renders score threshold', () => {
    render(<KnowledgeRetrievalNode {...baseProps} data={mockData} />);
    expect(screen.getByText('Score ≥ 0.7')).toBeInTheDocument();
  });

  it('renders reranking badge when enabled', () => {
    const rerankData = { ...mockData, rerankingEnabled: true };
    render(<KnowledgeRetrievalNode {...baseProps} data={rerankData} />);
    expect(screen.getByText('Reranking enabled')).toBeInTheDocument();
  });

  it('renders query variable reference', () => {
    const withQuery = {
      ...mockData,
      queryVariable: { nodeId: 'start', variableName: 'input' },
    };
    render(<KnowledgeRetrievalNode {...baseProps} data={withQuery} />);
    expect(screen.getByText(/start\.input/)).toBeInTheDocument();
  });
});
