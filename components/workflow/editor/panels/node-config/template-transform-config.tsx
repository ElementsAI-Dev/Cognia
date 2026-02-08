'use client';

/**
 * Template Transform Node Configuration (Dify-inspired)
 */

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { FileCode, Variable } from 'lucide-react';
import { MultiVariableSelector } from './variable-selector';
import type { NodeConfigProps } from './types';
import type { TemplateTransformNodeData } from '@/types/workflow/workflow-editor';

export function TemplateTransformNodeConfig({
  data,
  onUpdate,
}: NodeConfigProps<TemplateTransformNodeData>) {
  return (
    <Accordion
      type="multiple"
      defaultValue={['template', 'variables']}
      className="space-y-2"
    >
      <AccordionItem value="template" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Template
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Output Type</Label>
              <Select
                value={data.outputType}
                onValueChange={(value) =>
                  onUpdate({
                    outputType: value as 'string' | 'json',
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Template Code</Label>
              <Textarea
                value={data.template}
                onChange={(e) => onUpdate({ template: e.target.value })}
                placeholder={`Use {{variable}} syntax to reference variables.\n\nExample:\nHello {{name}}, your order #{{order_id}} is ready.`}
                className="text-sm min-h-[150px] font-mono"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{nodeId.variableName}}'} syntax to reference upstream
                variables. Supports Jinja2-style expressions.
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="variables" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Variable className="h-4 w-4" />
            Variable References
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Select variables referenced in the template
            </p>
            <MultiVariableSelector
              value={data.variableRefs}
              onChange={(refs) => onUpdate({ variableRefs: refs })}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default TemplateTransformNodeConfig;
