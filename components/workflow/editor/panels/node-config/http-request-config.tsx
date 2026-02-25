'use client';

/**
 * HTTP Request Node Configuration
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import type { NodeConfigProps, HttpRequestNodeData } from './types';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
const AUTH_TYPES = ['none', 'basic', 'bearer', 'api-key'] as const;
const BODY_TYPES = ['none', 'json', 'form', 'raw'] as const;

export function HttpRequestNodeConfig({ data, onUpdate }: NodeConfigProps<HttpRequestNodeData>) {
  const t = useTranslations('workflowEditor');
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  const handleAddHeader = useCallback(() => {
    if (!newHeaderKey.trim()) return;
    onUpdate({
      headers: { ...data.headers, [newHeaderKey.trim()]: newHeaderValue },
    });
    setNewHeaderKey('');
    setNewHeaderValue('');
  }, [data.headers, newHeaderKey, newHeaderValue, onUpdate]);

  const handleRemoveHeader = useCallback((key: string) => {
    const next = { ...data.headers };
    delete next[key];
    onUpdate({ headers: next });
  }, [data.headers, onUpdate]);

  return (
    <div className="space-y-4">
      {/* Method & URL */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t('method')}</Label>
        <div className="flex gap-2">
          <Select
            value={data.method}
            onValueChange={(v) => onUpdate({ method: v as HttpRequestNodeData['method'] })}
          >
            <SelectTrigger className="h-8 text-sm w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={data.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://api.example.com/endpoint"
            className="h-8 text-sm font-mono flex-1"
          />
        </div>
      </div>

      <Separator />

      {/* Headers */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium w-full">
          <ChevronDown className="h-3 w-3" />
          Headers ({Object.keys(data.headers).length})
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {Object.entries(data.headers).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1">
              <Input value={key} readOnly className="h-7 text-xs font-mono flex-1" />
              <Input value={value} readOnly className="h-7 text-xs font-mono flex-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemoveHeader(key)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <Input
              value={newHeaderKey}
              onChange={(e) => setNewHeaderKey(e.target.value)}
              placeholder="Key"
              className="h-7 text-xs font-mono flex-1"
            />
            <Input
              value={newHeaderValue}
              onChange={(e) => setNewHeaderValue(e.target.value)}
              placeholder="Value"
              className="h-7 text-xs font-mono flex-1"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleAddHeader}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Body */}
      {data.method !== 'GET' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Body Type</Label>
          <Select
            value={data.bodyType}
            onValueChange={(v) => onUpdate({ bodyType: v as HttpRequestNodeData['bodyType'] })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BODY_TYPES.map((bt) => (
                <SelectItem key={bt} value={bt}>{bt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.bodyType !== 'none' && (
            <Textarea
              value={data.body || ''}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder={data.bodyType === 'json' ? '{"key": "value"}' : 'Request body...'}
              className="text-xs font-mono min-h-[80px]"
            />
          )}
        </div>
      )}

      <Separator />

      {/* Auth */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium w-full">
          <ChevronDown className="h-3 w-3" />
          Authentication ({data.auth.type})
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          <Select
            value={data.auth.type}
            onValueChange={(v) => onUpdate({ auth: { ...data.auth, type: v as HttpRequestNodeData['auth']['type'] } })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTH_TYPES.map((at) => (
                <SelectItem key={at} value={at}>{at}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.auth.type === 'bearer' && (
            <Input
              type="password"
              value={data.auth.credentials?.token || ''}
              onChange={(e) => onUpdate({ auth: { ...data.auth, credentials: { ...data.auth.credentials, token: e.target.value } } })}
              placeholder="Bearer token"
              className="h-8 text-sm font-mono"
            />
          )}
          {data.auth.type === 'basic' && (
            <div className="space-y-1.5">
              <Input
                value={data.auth.credentials?.username || ''}
                onChange={(e) => onUpdate({ auth: { ...data.auth, credentials: { ...data.auth.credentials, username: e.target.value } } })}
                placeholder="Username"
                className="h-8 text-sm"
              />
              <Input
                type="password"
                value={data.auth.credentials?.password || ''}
                onChange={(e) => onUpdate({ auth: { ...data.auth, credentials: { ...data.auth.credentials, password: e.target.value } } })}
                placeholder="Password"
                className="h-8 text-sm"
              />
            </div>
          )}
          {data.auth.type === 'api-key' && (
            <div className="space-y-1.5">
              <Input
                value={data.auth.credentials?.headerName || ''}
                onChange={(e) => onUpdate({ auth: { ...data.auth, credentials: { ...data.auth.credentials, headerName: e.target.value } } })}
                placeholder="Header name (e.g. X-API-Key)"
                className="h-8 text-sm font-mono"
              />
              <Input
                type="password"
                value={data.auth.credentials?.apiKey || ''}
                onChange={(e) => onUpdate({ auth: { ...data.auth, credentials: { ...data.auth.credentials, apiKey: e.target.value } } })}
                placeholder="API Key"
                className="h-8 text-sm font-mono"
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Settings */}
      <div className="space-y-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Timeout (ms)</Label>
          <Input
            type="number"
            value={data.timeout}
            onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) || 30000 })}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Follow Redirects</Label>
          <Switch
            checked={data.followRedirects}
            onCheckedChange={(v) => onUpdate({ followRedirects: v })}
          />
        </div>
      </div>
    </div>
  );
}

export default HttpRequestNodeConfig;
