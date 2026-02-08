'use client';

/**
 * NodeErrorConfig - Per-node error handling configuration (n8n-inspired)
 * Allows configuring retry, timeout, continue-on-fail, and fallback per node
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { AlertTriangle, RotateCcw, Clock } from 'lucide-react';
import {
  type NodeErrorConfig,
  DEFAULT_NODE_ERROR_CONFIG,
} from '@/types/workflow/workflow-editor';

interface NodeErrorConfigPanelProps {
  config: NodeErrorConfig | undefined;
  onChange: (config: NodeErrorConfig) => void;
}

export function NodeErrorConfigPanel({
  config,
  onChange,
}: NodeErrorConfigPanelProps) {
  const current = config || DEFAULT_NODE_ERROR_CONFIG;

  const handleUpdate = (updates: Partial<NodeErrorConfig>) => {
    onChange({ ...current, ...updates });
  };

  return (
    <Accordion type="multiple" defaultValue={['retry', 'error']} className="space-y-2">
      <AccordionItem value="retry" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Retry on Failure
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="retry-enabled" className="text-xs">
                Enable Retry
              </Label>
              <Switch
                id="retry-enabled"
                checked={current.retryOnFailure}
                onCheckedChange={(checked) =>
                  handleUpdate({ retryOnFailure: checked })
                }
              />
            </div>

            {current.retryOnFailure && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Max Retries</Label>
                    <span className="text-xs text-muted-foreground">
                      {current.maxRetries}
                    </span>
                  </div>
                  <Slider
                    value={[current.maxRetries]}
                    onValueChange={([value]) =>
                      handleUpdate({ maxRetries: value })
                    }
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Retry Interval (ms)</Label>
                  <Input
                    type="number"
                    value={current.retryInterval}
                    onChange={(e) =>
                      handleUpdate({
                        retryInterval: parseInt(e.target.value) || 1000,
                      })
                    }
                    className="h-8 text-sm"
                    min={100}
                    max={60000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait time between retries
                  </p>
                </div>
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="error" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Error Handling
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="continue-on-fail" className="text-xs">
                  Continue on Failure
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  If enabled, workflow continues even if this node fails
                </p>
              </div>
              <Switch
                id="continue-on-fail"
                checked={current.continueOnFail}
                onCheckedChange={(checked) =>
                  handleUpdate({ continueOnFail: checked })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">On Error</Label>
              <Select
                value={current.errorBranch || 'stop'}
                onValueChange={(value) =>
                  handleUpdate({
                    errorBranch: value as NodeErrorConfig['errorBranch'],
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stop">Stop Execution</SelectItem>
                  <SelectItem value="continue">
                    Continue with Empty Output
                  </SelectItem>
                  <SelectItem value="fallback">
                    Use Fallback Output
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="timeout" className="border rounded-lg px-3">
        <AccordionTrigger className="py-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeout
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Node Timeout (seconds)</Label>
            <Input
              type="number"
              value={current.timeout ? current.timeout / 1000 : ''}
              onChange={(e) => {
                const seconds = parseInt(e.target.value);
                handleUpdate({
                  timeout: seconds ? seconds * 1000 : undefined,
                });
              }}
              placeholder="No timeout (inherit from workflow)"
              className="h-8 text-sm"
              min={1}
              max={3600}
            />
            <p className="text-xs text-muted-foreground">
              Maximum execution time for this node. Leave empty to use workflow
              default.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default NodeErrorConfigPanel;
