'use client';

/**
 * Human Node Configuration
 */

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NodeConfigProps, HumanNodeData } from './types';

export function HumanNodeConfig({ data, onUpdate }: NodeConfigProps<HumanNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('approvalMessage')}</Label>
        <Textarea
          value={data.approvalMessage}
          onChange={(e) => onUpdate({ approvalMessage: e.target.value })}
          className="text-sm min-h-[60px]"
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('timeout')} (seconds)</Label>
        <Input
          type="number"
          value={data.timeout || ''}
          onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) || undefined })}
          placeholder="3600"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('assignee')}</Label>
        <Input
          value={data.assignee || ''}
          onChange={(e) => onUpdate({ assignee: e.target.value })}
          placeholder={t('assigneePlaceholder')}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('defaultAction')}</Label>
        <Select
          value={data.defaultAction || 'timeout'}
          onValueChange={(value) => onUpdate({ defaultAction: value as HumanNodeData['defaultAction'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approve">Approve</SelectItem>
            <SelectItem value="reject">Reject</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default HumanNodeConfig;
