'use client';

/**
 * Webhook Node Configuration
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
import type { NodeConfigProps, WebhookNodeData } from './types';

export function WebhookNodeConfig({ data, onUpdate }: NodeConfigProps<WebhookNodeData>) {
  const t = useTranslations('workflowEditor');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('webhookUrl') || 'Webhook URL'}</Label>
        <Input
          value={data.webhookUrl || ''}
          onChange={(e) => onUpdate({ webhookUrl: e.target.value })}
          placeholder="https://api.example.com/webhook"
          className="h-8 text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('httpMethod') || 'HTTP Method'}</Label>
        <Select
          value={data.method}
          onValueChange={(value) => onUpdate({ method: value as WebhookNodeData['method'] })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('requestBody') || 'Request Body'}</Label>
        <Textarea
          value={data.body || ''}
          onChange={(e) => onUpdate({ body: e.target.value })}
          placeholder='{"key": "value"}'
          className="text-sm font-mono min-h-[80px]"
          rows={3}
        />
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('webhookHint') || 'Configure headers and authentication in the advanced settings.'}
        </p>
      </div>
    </div>
  );
}

export default WebhookNodeConfig;
