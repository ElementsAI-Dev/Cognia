'use client';

/**
 * AI Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
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
import { Sparkles, Settings } from 'lucide-react';
import { VariableSelector } from './variable-selector';
import { Separator } from '@/components/ui/separator';
import type { NodeConfigProps, AINodeData } from './types';

export function AINodeConfig({ data, onUpdate }: NodeConfigProps<AINodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <Accordion type="multiple" defaultValue={['prompt', 'model']} className="space-y-2">
      <AccordionItem value="prompt" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('aiPrompt')}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('systemPrompt')}</Label>
              <Textarea
                value={data.systemPrompt || ''}
                onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
                placeholder={t('systemPromptPlaceholder')}
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('userPrompt')}</Label>
              <Textarea
                value={data.aiPrompt}
                onChange={(e) => onUpdate({ aiPrompt: e.target.value })}
                placeholder={t('userPromptPlaceholder')}
                className="text-sm min-h-[100px] font-mono"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {t('promptVariablesHint')}
              </p>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Insert Variable Reference</Label>
              <VariableSelector
                value={null}
                onChange={(ref) => {
                  if (ref) {
                    const varRef = `{{${ref.nodeId}.${ref.variableName}}}`;
                    onUpdate({ aiPrompt: (data.aiPrompt || '') + varRef });
                  }
                }}
                currentNodeId={data.id}
                placeholder="Pick variable to insert..."
                className="w-full"
                allowClear={false}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="model" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('modelSettings')}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
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
                  {/* OpenAI Models */}
                  <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (OpenAI)</SelectItem>
                  <SelectItem value="o1">o1 (OpenAI)</SelectItem>
                  <SelectItem value="o1-mini">o1 Mini (OpenAI)</SelectItem>
                  {/* Anthropic Models */}
                  <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Anthropic)</SelectItem>
                  <SelectItem value="claude-opus-4-20250514">Claude Opus 4 (Anthropic)</SelectItem>
                  <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Anthropic)</SelectItem>
                  {/* Google Models */}
                  <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Google)</SelectItem>
                  <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</SelectItem>
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Google)</SelectItem>
                  {/* DeepSeek Models */}
                  <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                  <SelectItem value="deepseek-reasoner">DeepSeek Reasoner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('temperature')}</Label>
                <span className="text-xs text-muted-foreground">
                  {data.temperature ?? 0.7}
                </span>
              </div>
              <Slider
                value={[data.temperature ?? 0.7]}
                onValueChange={([value]) => onUpdate({ temperature: value })}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('maxTokens')}</Label>
              <Input
                type="number"
                value={data.maxTokens || ''}
                onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) || undefined })}
                placeholder="4096"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('responseFormat')}</Label>
              <Select
                value={data.responseFormat || 'text'}
                onValueChange={(value) => onUpdate({ responseFormat: value as AINodeData['responseFormat'] })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default AINodeConfig;
