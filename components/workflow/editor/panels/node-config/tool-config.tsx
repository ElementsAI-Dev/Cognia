'use client';

/**
 * Tool Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeConfigProps, ToolNodeData } from './types';
import { AVAILABLE_TOOLS } from './types';

export function ToolNodeConfig({ data, onUpdate }: NodeConfigProps<ToolNodeData>) {
  const t = useTranslations('workflowEditor');
  
  const selectedTool = AVAILABLE_TOOLS.find(tool => tool.name === data.toolName);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('toolName')}</Label>
        <Select
          value={data.toolName}
          onValueChange={(value) => {
            const tool = AVAILABLE_TOOLS.find(t => t.name === value);
            onUpdate({ 
              toolName: value,
              toolCategory: tool?.category,
            });
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={t('selectTool')} />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_TOOLS.map((tool) => (
              <SelectItem key={tool.name} value={tool.name}>
                {tool.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTool && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium">{selectedTool.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{selectedTool.description}</p>
          <Badge variant="outline" className="text-xs mt-2">{selectedTool.category}</Badge>
        </div>
      )}
    </div>
  );
}

export default ToolNodeConfig;
