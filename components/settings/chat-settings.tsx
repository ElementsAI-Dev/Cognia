'use client';

/**
 * ChatSettings - Configure chat behavior and AI generation parameters
 * All settings are persisted to the settings store
 */

import { MessageSquare, Thermometer, Hash, History, Sparkles, SlidersHorizontal, Shrink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsStore } from '@/stores';
import { PROVIDERS } from '@/types/provider';
import type { CompressionStrategy, CompressionTrigger } from '@/types/compression';

export function ChatSettings() {
  const t = useTranslations('chatSettings');
  const tContext = useTranslations('contextSettings');

  // Chat behavior settings from store
  const defaultTemperature = useSettingsStore((state) => state.defaultTemperature);
  const setDefaultTemperature = useSettingsStore((state) => state.setDefaultTemperature);
  const defaultMaxTokens = useSettingsStore((state) => state.defaultMaxTokens);
  const setDefaultMaxTokens = useSettingsStore((state) => state.setDefaultMaxTokens);
  const defaultTopP = useSettingsStore((state) => state.defaultTopP);
  const setDefaultTopP = useSettingsStore((state) => state.setDefaultTopP);
  const defaultFrequencyPenalty = useSettingsStore((state) => state.defaultFrequencyPenalty);
  const setDefaultFrequencyPenalty = useSettingsStore((state) => state.setDefaultFrequencyPenalty);
  const defaultPresencePenalty = useSettingsStore((state) => state.defaultPresencePenalty);
  const setDefaultPresencePenalty = useSettingsStore((state) => state.setDefaultPresencePenalty);
  const contextLength = useSettingsStore((state) => state.contextLength);
  const setContextLength = useSettingsStore((state) => state.setContextLength);
  const autoTitleGeneration = useSettingsStore((state) => state.autoTitleGeneration);
  const setAutoTitleGeneration = useSettingsStore((state) => state.setAutoTitleGeneration);
  const showModelInChat = useSettingsStore((state) => state.showModelInChat);
  const setShowModelInChat = useSettingsStore((state) => state.setShowModelInChat);
  const enableMarkdownRendering = useSettingsStore((state) => state.enableMarkdownRendering);
  const setEnableMarkdownRendering = useSettingsStore((state) => state.setEnableMarkdownRendering);

  // Compression settings
  const compressionSettings = useSettingsStore((state) => state.compressionSettings);
  const setCompressionEnabled = useSettingsStore((state) => state.setCompressionEnabled);
  const setCompressionStrategy = useSettingsStore((state) => state.setCompressionStrategy);
  const setCompressionTrigger = useSettingsStore((state) => state.setCompressionTrigger);
  const setCompressionTokenThreshold = useSettingsStore((state) => state.setCompressionTokenThreshold);
  const setCompressionMessageThreshold = useSettingsStore((state) => state.setCompressionMessageThreshold);
  const setCompressionPreserveRecent = useSettingsStore((state) => state.setCompressionPreserveRecent);

  // Default provider
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const setDefaultProvider = useSettingsStore((state) => state.setDefaultProvider);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Get enabled providers
  const enabledProviders = Object.entries(PROVIDERS).filter(
    ([id]) => providerSettings[id]?.enabled && (providerSettings[id]?.apiKey || id === 'ollama')
  );

  return (
    <div className="space-y-4">
      {/* Default Provider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            {t('defaultProvider')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('defaultProviderDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={defaultProvider} onValueChange={setDefaultProvider}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder={t('selectProvider')} />
            </SelectTrigger>
            <SelectContent>
              {enabledProviders.map(([id, provider]) => (
                <SelectItem key={id} value={id}>
                  {provider.name}
                </SelectItem>
              ))}
              {enabledProviders.length === 0 && (
                <SelectItem value="openai" disabled>
                  {t('noProviders')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {enabledProviders.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('configureProviderHint')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generation Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Thermometer className="h-4 w-4" />
            {t('generationParams')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('generationParamsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('temperature')}: {defaultTemperature.toFixed(1)}</Label>
              <span className="text-[10px] text-muted-foreground">
                {defaultTemperature <= 0.3 ? t('precise') : defaultTemperature <= 0.7 ? t('balanced') : t('creative')}
              </span>
            </div>
            <Slider
              value={[defaultTemperature * 10]}
              onValueChange={([v]) => setDefaultTemperature(v / 10)}
              min={0}
              max={20}
              step={1}
            />
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('maxTokens')}: {defaultMaxTokens.toLocaleString()}</Label>
            </div>
            <Slider
              value={[defaultMaxTokens]}
              onValueChange={([v]) => setDefaultMaxTokens(v)}
              min={256}
              max={16384}
              step={256}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            {t('advancedParams')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('advancedParamsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top P */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('topP')}: {defaultTopP.toFixed(2)}</Label>
              <span className="text-[10px] text-muted-foreground">
                {defaultTopP >= 0.95 ? t('default') : defaultTopP >= 0.7 ? t('focused') : t('veryFocused')}
              </span>
            </div>
            <Slider
              value={[defaultTopP * 100]}
              onValueChange={([v]) => setDefaultTopP(v / 100)}
              min={0}
              max={100}
              step={5}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('topPHint')}
            </p>
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('frequencyPenalty')}: {defaultFrequencyPenalty.toFixed(1)}</Label>
              <span className="text-[10px] text-muted-foreground">
                {defaultFrequencyPenalty === 0 ? t('off') : defaultFrequencyPenalty > 0 ? t('reduceRepetition') : t('encourageRepetition')}
              </span>
            </div>
            <Slider
              value={[(defaultFrequencyPenalty + 2) * 25]}
              onValueChange={([v]) => setDefaultFrequencyPenalty((v / 25) - 2)}
              min={0}
              max={100}
              step={5}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('frequencyPenaltyHint')}
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('presencePenalty')}: {defaultPresencePenalty.toFixed(1)}</Label>
              <span className="text-[10px] text-muted-foreground">
                {defaultPresencePenalty === 0 ? t('off') : defaultPresencePenalty > 0 ? t('newTopics') : t('stayOnTopic')}
              </span>
            </div>
            <Slider
              value={[(defaultPresencePenalty + 2) * 25]}
              onValueChange={([v]) => setDefaultPresencePenalty((v / 25) - 2)}
              min={0}
              max={100}
              step={5}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('presencePenaltyHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Context & History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {t('contextHistory')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('contextHistoryDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Context Length */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('contextMessages')}: {contextLength}</Label>
            </div>
            <Slider
              value={[contextLength]}
              onValueChange={([v]) => setContextLength(v)}
              min={2}
              max={50}
              step={2}
            />
          </div>

          {/* Auto Title Generation */}
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="auto-title" className="text-sm">{t('autoGenerateTitles')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('autoGenerateTitlesDesc')}
              </p>
            </div>
            <Switch
              id="auto-title"
              checked={autoTitleGeneration}
              onCheckedChange={setAutoTitleGeneration}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compression Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shrink className="h-4 w-4" />
            {tContext('compressionSettings')}
          </CardTitle>
          <CardDescription className="text-xs">
            {tContext('strategyDesc.hybrid')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Compression */}
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="enable-compression" className="text-sm">{tContext('enableCompression')}</Label>
              <p className="text-xs text-muted-foreground">
                {tContext('strategyDesc.summary')}
              </p>
            </div>
            <Switch
              id="enable-compression"
              checked={compressionSettings.enabled}
              onCheckedChange={setCompressionEnabled}
            />
          </div>

          {compressionSettings.enabled && (
            <>
              {/* Compression Strategy */}
              <div className="space-y-2">
                <Label className="text-sm">{tContext('compressionStrategy')}</Label>
                <Select
                  value={compressionSettings.strategy}
                  onValueChange={(value) => setCompressionStrategy(value as CompressionStrategy)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['summary', 'sliding-window', 'selective', 'hybrid'] as CompressionStrategy[]).map((strategy) => (
                      <SelectItem key={strategy} value={strategy}>
                        {tContext(`strategy.${strategy}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {tContext(`strategyDesc.${compressionSettings.strategy}`)}
                </p>
              </div>

              {/* Compression Trigger */}
              <div className="space-y-2">
                <Label className="text-sm">{tContext('compressionTrigger')}</Label>
                <Select
                  value={compressionSettings.trigger}
                  onValueChange={(value) => setCompressionTrigger(value as CompressionTrigger)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['manual', 'token-threshold', 'message-count'] as CompressionTrigger[]).map((trigger) => (
                      <SelectItem key={trigger} value={trigger}>
                        {tContext(`trigger.${trigger}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Token Threshold (conditional) */}
              {compressionSettings.trigger === 'token-threshold' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{tContext('tokenThreshold')}</Label>
                    <span className="text-sm font-mono">{compressionSettings.tokenThreshold}%</span>
                  </div>
                  <Slider
                    value={[compressionSettings.tokenThreshold]}
                    onValueChange={([v]) => setCompressionTokenThreshold(v)}
                    min={50}
                    max={95}
                    step={5}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {tContext('tokenThresholdDesc')}
                  </p>
                </div>
              )}

              {/* Message Threshold (conditional) */}
              {compressionSettings.trigger === 'message-count' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{tContext('messageThreshold')}</Label>
                    <span className="text-sm font-mono">{compressionSettings.messageCountThreshold}</span>
                  </div>
                  <Slider
                    value={[compressionSettings.messageCountThreshold]}
                    onValueChange={([v]) => setCompressionMessageThreshold(v)}
                    min={10}
                    max={100}
                    step={5}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {tContext('messageThresholdDesc')}
                  </p>
                </div>
              )}

              {/* Preserve Recent Messages */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{tContext('preserveRecent')}</Label>
                  <span className="text-sm font-mono">{compressionSettings.preserveRecentMessages}</span>
                </div>
                <Slider
                  value={[compressionSettings.preserveRecentMessages]}
                  onValueChange={([v]) => setCompressionPreserveRecent(v)}
                  min={2}
                  max={20}
                  step={1}
                />
                <p className="text-[10px] text-muted-foreground">
                  {tContext('preserveRecentDesc')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            {t('displayOptions')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('displayOptionsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="show-model" className="text-sm">{t('showModelName')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('showModelNameDesc')}
              </p>
            </div>
            <Switch
              id="show-model"
              checked={showModelInChat}
              onCheckedChange={setShowModelInChat}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="markdown-render" className="text-sm">{t('markdownRendering')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('markdownRenderingDesc')}
              </p>
            </div>
            <Switch
              id="markdown-render"
              checked={enableMarkdownRendering}
              onCheckedChange={setEnableMarkdownRendering}
            />
          </div>
        </CardContent>
      </Card>

      {/* Token Usage Info */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Hash className="h-3.5 w-3.5" />
            {t('tokenEstimation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>{t('approxTokens', { count: (contextLength * 500 + defaultMaxTokens).toLocaleString() })}</p>
          <p className="text-[10px]">{t('tokenHint')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChatSettings;
