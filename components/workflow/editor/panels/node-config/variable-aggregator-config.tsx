'use client';

/**
 * Variable Aggregator Node Configuration (Dify-inspired)
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Combine, Settings } from 'lucide-react';
import { MultiVariableSelector } from './variable-selector';
import type { NodeConfigProps } from './types';
import type { VariableAggregatorNodeData } from '@/types/workflow/workflow-editor';

export function VariableAggregatorNodeConfig({
  data,
  onUpdate,
}: NodeConfigProps<VariableAggregatorNodeData>) {
  return (
    <Accordion
      type="multiple"
      defaultValue={['variables', 'settings']}
      className="space-y-2"
    >
      <AccordionItem value="variables" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Combine className="h-4 w-4" />
            Variable Sources
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Select variables from upstream nodes to aggregate
              </Label>
              <MultiVariableSelector
                value={data.variableRefs}
                onChange={(refs) => onUpdate({ variableRefs: refs })}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="settings" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Aggregation Settings
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Aggregation Mode</Label>
              <Select
                value={data.aggregationMode}
                onValueChange={(value) =>
                  onUpdate({
                    aggregationMode: value as VariableAggregatorNodeData['aggregationMode'],
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">
                    First Value — Use first non-null value
                  </SelectItem>
                  <SelectItem value="last">
                    Last Value — Use last non-null value
                  </SelectItem>
                  <SelectItem value="array">
                    Collect as Array — Combine all values into array
                  </SelectItem>
                  <SelectItem value="merge">
                    Deep Merge — Recursively merge objects
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Output Variable Name</Label>
              <Input
                value={data.outputVariableName}
                onChange={(e) =>
                  onUpdate({ outputVariableName: e.target.value })
                }
                placeholder="aggregated"
                className="h-8 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Downstream nodes can reference this variable
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default VariableAggregatorNodeConfig;
