'use client';

/**
 * KnowledgeRetrievalNode - RAG node for querying knowledge bases (Dify-inspired)
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Database } from 'lucide-react';
import type { KnowledgeRetrievalNodeData } from '@/types/workflow/workflow-editor';

function KnowledgeRetrievalNodeComponent(props: NodeProps) {
  const data = props.data as KnowledgeRetrievalNodeData;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Retrieval mode */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {data.retrievalMode === 'multiple' ? 'Multi-KB' : 'Single-KB'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Top {data.topK}
          </Badge>
        </div>

        {/* Knowledge bases */}
        {data.knowledgeBaseIds.length > 0 ? (
          <div className="space-y-1">
            {data.knowledgeBaseIds.slice(0, 3).map((kbId, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Database className="h-3 w-3 shrink-0" />
                <span className="truncate font-mono">{kbId}</span>
              </div>
            ))}
            {data.knowledgeBaseIds.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{data.knowledgeBaseIds.length - 3} more
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
            <BookOpen className="h-3 w-3" />
            No knowledge base selected
          </div>
        )}

        {/* Query variable reference */}
        {data.queryVariable && (
          <div className="text-xs bg-muted/50 rounded p-1.5 font-mono text-muted-foreground">
            Query: {data.queryVariable.nodeId}.{data.queryVariable.variableName}
          </div>
        )}

        {/* Reranking indicator */}
        {data.rerankingEnabled && (
          <Badge variant="outline" className="text-xs text-cyan-600 dark:text-cyan-400">
            Reranking enabled
          </Badge>
        )}

        {/* Score threshold */}
        <div className="text-xs text-muted-foreground">
          Score ≥ {data.scoreThreshold}
        </div>
      </div>
    </BaseNode>
  );
}

export const KnowledgeRetrievalNode = memo(KnowledgeRetrievalNodeComponent);
export default KnowledgeRetrievalNode;
