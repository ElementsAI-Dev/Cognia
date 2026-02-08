'use client';

/**
 * Knowledge Retrieval Node Configuration (Dify-inspired RAG)
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { BookOpen, Database, Settings, Plus, Trash2 } from 'lucide-react';
import { VariableSelector } from './variable-selector';
import type { NodeConfigProps } from './types';
import type { KnowledgeRetrievalNodeData } from '@/types/workflow/workflow-editor';

export function KnowledgeRetrievalNodeConfig({
  data,
  onUpdate,
}: NodeConfigProps<KnowledgeRetrievalNodeData>) {
  const handleAddKnowledgeBase = () => {
    const newId = `kb-${Date.now()}`;
    onUpdate({ knowledgeBaseIds: [...data.knowledgeBaseIds, newId] });
  };

  const handleRemoveKnowledgeBase = (index: number) => {
    onUpdate({
      knowledgeBaseIds: data.knowledgeBaseIds.filter((_, i) => i !== index),
    });
  };

  const handleUpdateKnowledgeBase = (index: number, value: string) => {
    const updated = [...data.knowledgeBaseIds];
    updated[index] = value;
    onUpdate({ knowledgeBaseIds: updated });
  };

  return (
    <Accordion
      type="multiple"
      defaultValue={['query', 'knowledge', 'retrieval']}
      className="space-y-2"
    >
      <AccordionItem value="query" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Query
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Query Variable</Label>
              <VariableSelector
                value={data.queryVariable}
                onChange={(ref) => onUpdate({ queryVariable: ref })}
                placeholder="Select query source..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Select the upstream variable containing the search query
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="knowledge" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Knowledge Bases
            <Badge variant="secondary" className="text-xs ml-auto">
              {data.knowledgeBaseIds.length}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Retrieval Mode</Label>
              <Select
                value={data.retrievalMode}
                onValueChange={(value) =>
                  onUpdate({
                    retrievalMode: value as 'single' | 'multiple',
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Knowledge Base</SelectItem>
                  <SelectItem value="multiple">
                    Multiple Knowledge Bases
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {data.knowledgeBaseIds.map((kbId, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={kbId}
                    onChange={(e) =>
                      handleUpdateKnowledgeBase(index, e.target.value)
                    }
                    placeholder="Knowledge base ID..."
                    className="h-8 text-xs font-mono flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => handleRemoveKnowledgeBase(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={handleAddKnowledgeBase}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Knowledge Base
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="retrieval" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Retrieval Settings
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Top K</Label>
                <span className="text-xs text-muted-foreground">
                  {data.topK}
                </span>
              </div>
              <Slider
                value={[data.topK]}
                onValueChange={([value]) => onUpdate({ topK: value })}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Score Threshold</Label>
                <span className="text-xs text-muted-foreground">
                  {data.scoreThreshold}
                </span>
              </div>
              <Slider
                value={[data.scoreThreshold]}
                onValueChange={([value]) =>
                  onUpdate({ scoreThreshold: value })
                }
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reranking" className="text-xs">
                Enable Reranking
              </Label>
              <Switch
                id="reranking"
                checked={data.rerankingEnabled}
                onCheckedChange={(checked) =>
                  onUpdate({ rerankingEnabled: checked })
                }
              />
            </div>

            {data.rerankingEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs">Reranking Model</Label>
                <Input
                  value={data.rerankingModel || ''}
                  onChange={(e) =>
                    onUpdate({ rerankingModel: e.target.value })
                  }
                  placeholder="e.g., bge-reranker-base"
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default KnowledgeRetrievalNodeConfig;
