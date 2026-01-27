'use client';

/**
 * NodeQuickConfig - Quick configuration popover for workflow nodes
 */

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save } from 'lucide-react';
import type { WorkflowNodeData } from '@/types/workflow/workflow-editor';
import { useWorkflowEditorStore } from '@/stores/workflow';

interface NodeQuickConfigProps {
  nodeId: string;
  data: WorkflowNodeData;
  children: ReactNode;
}

export function NodeQuickConfig({ nodeId, data, children }: NodeQuickConfigProps) {
  const t = useTranslations('workflowEditor');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [description, setDescription] = useState(data.description || '');
  const updateNode = useWorkflowEditorStore((state) => state.updateNode);

  const handleSave = () => {
    if (nodeId) {
      updateNode(nodeId, {
        data: {
          ...data,
          label,
          description,
        },
      });
    }
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setLabel(data.label);
      setDescription(data.description || '');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div 
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        side="right" 
        align="start" 
        className="w-72"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">{t('quickConfig')}</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="node-label" className="text-xs">
                {t('label')}
              </Label>
              <Input
                id="node-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Node label"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="node-description" className="text-xs">
                {t('description')}
              </Label>
              <Textarea
                id="node-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="min-h-[60px] text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setOpen(false)}
            >
              {tCommon('cancel')}
            </Button>
            <Button 
              size="sm"
              onClick={handleSave}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NodeQuickConfig;
