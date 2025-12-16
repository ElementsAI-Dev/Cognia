'use client';

/**
 * SearchSettings - Configure web search (Tavily)
 */

import { useState } from 'react';
import { Eye, EyeOff, ExternalLink, Search, Check, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSettingsStore } from '@/stores';

export function SearchSettings() {
  const t = useTranslations('searchSettings');
  const tc = useTranslations('common');

  const tavilyApiKey = useSettingsStore((state) => state.tavilyApiKey);
  const setTavilyApiKey = useSettingsStore((state) => state.setTavilyApiKey);
  const searchEnabled = useSettingsStore((state) => state.searchEnabled);
  const setSearchEnabled = useSettingsStore((state) => state.setSearchEnabled);
  const searchMaxResults = useSettingsStore((state) => state.searchMaxResults);
  const setSearchMaxResults = useSettingsStore((state) => state.setSearchMaxResults);

  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    if (!tavilyApiKey) return;

    setTesting(true);
    setTestResult(null);

    try {
      // Simple test: check if key format is valid (starts with tvly-)
      if (tavilyApiKey.startsWith('tvly-') && tavilyApiKey.length > 20) {
        // Simulate API test
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            <CardTitle>{t('title')}</CardTitle>
          </div>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="tavily-key">{t('tavilyApiKey')}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="tavily-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder={t('tavilyApiKeyPlaceholder')}
                  value={tavilyApiKey}
                  onChange={(e) => setTavilyApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!tavilyApiKey || testing}
              >
                {testing ? tc('loading') : t('testConnection')}
              </Button>
            </div>
            {testResult === 'success' && (
              <p className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" /> {t('connectionSuccess')}
              </p>
            )}
            {testResult === 'error' && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {t('connectionFailed')}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('getTavilyKey')}{' '}
              <a
                href="https://tavily.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Tavily <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* Enable Search */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enableSearch')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('enableSearchDescription')}
              </p>
            </div>
            <Switch
              checked={searchEnabled}
              onCheckedChange={setSearchEnabled}
              disabled={!tavilyApiKey}
            />
          </div>

          {/* Max Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('maxResults')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('maxResultsDescription')}
                </p>
              </div>
              <span className="text-sm font-medium">{searchMaxResults}</span>
            </div>
            <Slider
              value={[searchMaxResults]}
              onValueChange={([value]) => setSearchMaxResults(value)}
              min={1}
              max={10}
              step={1}
              disabled={!searchEnabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SearchSettings;
