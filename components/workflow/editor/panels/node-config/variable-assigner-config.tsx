'use client';

/**
 * Variable Assigner Node Configuration
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VariableSelector } from './variable-selector';
import { Plus, Trash2 } from 'lucide-react';
import type { NodeConfigProps, VariableAssignerNodeData } from './types';
import type { VariableReference } from '@/types/workflow/workflow-editor';

const SOURCE_TYPES = ['constant', 'variable', 'expression'] as const;

export function VariableAssignerNodeConfig({ data, onUpdate }: NodeConfigProps<VariableAssignerNodeData>) {
  const _t = useTranslations('workflowEditor');

  const handleAddAssignment = useCallback(() => {
    onUpdate({
      assignments: [
        ...data.assignments,
        { targetVariable: '', sourceType: 'constant', sourceValue: '' },
      ],
    });
  }, [data.assignments, onUpdate]);

  const handleRemoveAssignment = useCallback((index: number) => {
    onUpdate({
      assignments: data.assignments.filter((_, i) => i !== index),
    });
  }, [data.assignments, onUpdate]);

  const handleUpdateAssignment = useCallback(
    (index: number, updates: Partial<VariableAssignerNodeData['assignments'][number]>) => {
      const next = [...data.assignments];
      next[index] = { ...next[index], ...updates };
      onUpdate({ assignments: next });
    },
    [data.assignments, onUpdate]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Assignments</Label>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddAssignment}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {data.assignments.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No assignments configured. Click &quot;Add&quot; to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {data.assignments.map((assignment, index) => (
            <div key={index} className="space-y-2 p-2 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Assignment {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleRemoveAssignment(index)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px]">Target Variable</Label>
                <Input
                  value={assignment.targetVariable}
                  onChange={(e) => handleUpdateAssignment(index, { targetVariable: e.target.value })}
                  placeholder="variable_name"
                  className="h-7 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px]">Source Type</Label>
                <Select
                  value={assignment.sourceType}
                  onValueChange={(v) => handleUpdateAssignment(index, { sourceType: v as 'constant' | 'variable' | 'expression' })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((st) => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {assignment.sourceType === 'variable' ? (
                <div className="space-y-1.5">
                  <Label className="text-[10px]">Source Variable</Label>
                  <VariableSelector
                    value={assignment.sourceVariableRef || null}
                    onChange={(ref: VariableReference | null) =>
                      handleUpdateAssignment(index, { sourceVariableRef: ref || undefined })
                    }
                    placeholder="Select variable..."
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-[10px]">
                    {assignment.sourceType === 'expression' ? 'Expression' : 'Value'}
                  </Label>
                  <Input
                    value={assignment.sourceValue}
                    onChange={(e) => handleUpdateAssignment(index, { sourceValue: e.target.value })}
                    placeholder={assignment.sourceType === 'expression' ? '{{node.output}}' : 'value'}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Separator />
      <div className="text-[10px] text-muted-foreground">
        Variable Assigner sets workflow variables at runtime. Use to build counters, status flags, or accumulate data across steps.
      </div>
    </div>
  );
}

export default VariableAssignerNodeConfig;
