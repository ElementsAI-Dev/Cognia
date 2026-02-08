'use client';

/**
 * Question Classifier Node Configuration (Dify-inspired)
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { MessageSquare, Settings, Plus, Trash2 } from 'lucide-react';
import { VariableSelector } from './variable-selector';
import { nanoid } from 'nanoid';
import type { NodeConfigProps } from './types';
import type { QuestionClassifierNodeData } from '@/types/workflow/workflow-editor';

const CLASS_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export function QuestionClassifierNodeConfig({
  data,
  onUpdate,
}: NodeConfigProps<QuestionClassifierNodeData>) {
  const t = useTranslations('workflowEditor');

  const handleAddClass = () => {
    onUpdate({
      classes: [
        ...data.classes,
        {
          id: `class-${nanoid(6)}`,
          name: `Class ${data.classes.length + 1}`,
          description: '',
        },
      ],
    });
  };

  const handleRemoveClass = (index: number) => {
    if (data.classes.length <= 2) return; // Minimum 2 classes
    onUpdate({
      classes: data.classes.filter((_, i) => i !== index),
    });
  };

  const handleUpdateClass = (
    index: number,
    updates: Partial<QuestionClassifierNodeData['classes'][number]>
  ) => {
    const updated = [...data.classes];
    updated[index] = { ...updated[index], ...updates };
    onUpdate({ classes: updated });
  };

  return (
    <Accordion
      type="multiple"
      defaultValue={['input', 'classes']}
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
                placeholder="Select question input..."
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

      <AccordionItem value="classes" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Classification Classes
            <Badge variant="secondary" className="text-xs ml-auto">
              {data.classes.length}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Define classes that questions will be classified into. Each class
              creates an output handle for routing.
            </p>

            {data.classes.map((cls, index) => (
              <div
                key={cls.id}
                className="border rounded-lg p-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: CLASS_COLORS[index % CLASS_COLORS.length],
                    }}
                  />
                  <Input
                    value={cls.name}
                    onChange={(e) =>
                      handleUpdateClass(index, { name: e.target.value })
                    }
                    placeholder="Class name"
                    className="h-7 text-xs font-medium flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => handleRemoveClass(index)}
                    disabled={data.classes.length <= 2}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea
                  value={cls.description}
                  onChange={(e) =>
                    handleUpdateClass(index, {
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe when a question belongs to this class..."
                  className="text-xs min-h-[40px]"
                  rows={2}
                />
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs w-full"
              onClick={handleAddClass}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Class
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default QuestionClassifierNodeConfig;
