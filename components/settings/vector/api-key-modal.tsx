'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores';
import type { EmbeddingProvider } from '@/lib/vector/embedding';
import { getProviderDashboardUrl } from '@/lib/ai/providers/provider-helpers';

export function VectorApiKeyModal({
  open,
  onOpenChange,
  provider,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: EmbeddingProvider;
}) {
  const t = useTranslations('vectorApiKeyModal');

  const providerSettings = useSettingsStore((s) => s.providerSettings);
  const updateProviderSettings = useSettingsStore((s) => s.updateProviderSettings);

  const initialKey = providerSettings[provider]?.apiKey || '';
  const [apiKey, setApiKey] = useState(initialKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey(providerSettings[provider]?.apiKey || '');
      setShowKey(false);
      setSaving(false);
    }
  }, [open, provider, providerSettings]);

  const dashboardUrl = useMemo(() => getProviderDashboardUrl(provider), [provider]);

  const providerLabel = useMemo(() => {
    if (provider === 'openai') return 'OpenAI';
    if (provider === 'google') return 'Google';
    if (provider === 'cohere') return 'Cohere';
    if (provider === 'mistral') return 'Mistral';
    return provider;
  }, [provider]);

  const handleSave = async () => {
    setSaving(true);
    try {
      updateProviderSettings(provider, { apiKey: apiKey.trim() });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{providerLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('apiKey')}</Label>
          <div className="relative">
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type={showKey ? 'text' : 'password'}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 px-0"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t('getKey', { provider: providerLabel })}
          </a>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
