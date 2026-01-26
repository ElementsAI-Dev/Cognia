'use client';

/**
 * Merge Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeConfigProps, MergeNodeData } from './types';

export function MergeNodeConfig({ data, onUpdate }: NodeConfigProps<MergeNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('mergeStrategy') || 'Merge Strategy'}</Label>
        <Select
          value={data.mergeStrategy}
          onValueChange={(value) => onUpdate({ mergeStrategy: value as MergeNodeData['mergeStrategy'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="concat">Concat (Array)</SelectItem>
            <SelectItem value="merge">Merge (Object)</SelectItem>
            <SelectItem value="first">First Value</SelectItem>
            <SelectItem value="last">Last Value</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('mergeHint') || 'Connect multiple branches to this node to merge their outputs.'}
        </p>
      </div>
    </div>
  );
}

export default MergeNodeConfig;
