'use client';

/**
 * TemplateTransformNode - Jinja2-style template rendering (Dify-inspired)
 */

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { Badge } from '@/components/ui/badge';
import { FileCode } from 'lucide-react';
import type { TemplateTransformNodeData } from '@/types/workflow/workflow-editor';

function TemplateTransformNodeComponent(props: NodeProps) {
  const data = props.data as TemplateTransformNodeData;

  return (
    <BaseNode {...props} data={data}>
      <div className="space-y-2">
        {/* Output type */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Output: {data.outputType}
          </Badge>
          {data.variableRefs.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {data.variableRefs.length} var(s)
            </Badge>
          )}
        </div>

        {/* Template preview */}
        {data.template ? (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1.5 font-mono line-clamp-3 whitespace-pre-wrap">
            {data.template}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
            <FileCode className="h-3 w-3" />
            No template defined
          </div>
        )}

        {/* Variable references */}
        {data.variableRefs.length > 0 && (
          <div className="space-y-0.5">
            {data.variableRefs.slice(0, 3).map((ref, i) => (
              <div
                key={i}
                className="text-[10px] font-mono text-muted-foreground"
              >
                {'{{'}
                {ref.nodeId}.{ref.variableName}
                {'}}'}
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const TemplateTransformNode = memo(TemplateTransformNodeComponent);
export default TemplateTransformNode;
