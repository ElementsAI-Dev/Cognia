'use client';

/**
 * Parameter Extractor Node Configuration (Dify-inspired)
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { ListChecks, Settings, Plus, Trash2, GripVertical } from 'lucide-react';
import { VariableSelector } from './variable-selector';
import type { NodeConfigProps } from './types';
import type { ParameterExtractorNodeData } from '@/types/workflow/workflow-editor';

type ExtractedParam = ParameterExtractorNodeData['parameters'][number];

export function ParameterExtractorNodeConfig({
  data,
  onUpdate,
}: NodeConfigProps<ParameterExtractorNodeData>) {
  const t = useTranslations('workflowEditor');

  const handleAddParameter = () => {
    onUpdate({
      parameters: [
        ...data.parameters,
        {
          name: `param_${data.parameters.length + 1}`,
          type: 'string',
          description: '',
          required: false,
        },
      ],
    });
  };

  const handleRemoveParameter = (index: number) => {
    onUpdate({
      parameters: data.parameters.filter((_, i) => i !== index),
    });
  };

  const handleUpdateParameter = (
    index: number,
    updates: Partial<ExtractedParam>
  ) => {
    const updated = [...data.parameters];
    updated[index] = { ...updated[index], ...updates };
    onUpdate({ parameters: updated });
  };

  return (
    <Accordion
      type="multiple"
      defaultValue={['input', 'instruction', 'parameters']}
      className="space-y-2"
    >
      <AccordionItem value="input" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Input & Model
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Input Variable</Label>
              <VariableSelector
                value={data.inputVariable}
                onChange={(ref) => onUpdate({ inputVariable: ref })}
                placeholder="Select input text source..."
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('model')}</Label>
              <Select
                value={data.model || ''}
                onValueChange={(value) => onUpdate({ model: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('selectModel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                  <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                  <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="instruction" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Extraction Instruction
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Instruction</Label>
            <Textarea
              value={data.instruction}
              onChange={(e) => onUpdate({ instruction: e.target.value })}
              placeholder="Describe what parameters to extract from the input text..."
              className="text-sm min-h-[80px]"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Guide the LLM on how to extract structured parameters from the
              input
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="parameters" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Parameters
            <Badge variant="secondary" className="text-xs ml-auto">
              {data.parameters.length}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            {data.parameters.map((param, index) => (
              <div
                key={index}
                className="border rounded-lg p-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Input
                    value={param.name}
                    onChange={(e) =>
                      handleUpdateParameter(index, {
                        name: e.target.value,
                      })
                    }
                    placeholder="Parameter name"
                    className="h-7 text-xs font-mono flex-1"
                  />
                  <Select
                    value={param.type}
                    onValueChange={(value) =>
                      handleUpdateParameter(index, {
                        type: value as ExtractedParam['type'],
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="array">Array</SelectItem>
                      <SelectItem value="object">Object</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => handleRemoveParameter(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={param.description}
                  onChange={(e) =>
                    handleUpdateParameter(index, {
                      description: e.target.value,
                    })
                  }
                  placeholder="Parameter description..."
                  className="h-7 text-xs"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`required-${index}`}
                      checked={param.required}
                      onCheckedChange={(checked) =>
                        handleUpdateParameter(index, { required: checked })
                      }
                    />
                    <Label
                      htmlFor={`required-${index}`}
                      className="text-xs"
                    >
                      Required
                    </Label>
                  </div>
                </div>
                {param.type === 'string' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Enum values (comma-separated)
                    </Label>
                    <Input
                      value={param.enumValues?.join(', ') || ''}
                      onChange={(e) =>
                        handleUpdateParameter(index, {
                          enumValues: e.target.value
                            ? e.target.value
                                .split(',')
                                .map((v) => v.trim())
                            : undefined,
                        })
                      }
                      placeholder="value1, value2, ..."
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs w-full"
              onClick={handleAddParameter}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Parameter
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default ParameterExtractorNodeConfig;
