'use client';

/**
 * ChatSettings - Configure chat behavior and AI generation parameters
 * All settings are persisted to the settings store
 * Organized with Tabs for better UX: Generation | Context | Display
 */

import { MessageSquare, Thermometer, Hash, History, Sparkles, SlidersHorizontal, Shrink, Info, Zap, Send, Bell, Undo2, Shield } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsStore } from '@/stores';
import { PROVIDERS } from '@/types/provider';
import type { CompressionStrategy, CompressionTrigger } from '@/types/system/compression';
import type { HistoryContextCompressionLevel } from '@/types/core/chat-history-context';

// Tooltip helper component
function SettingTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          <Info className="h-3 w-3 text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

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
  const setCompressionPreserveSystem = useSettingsStore((state) => state.setCompressionPreserveSystem);
  const setCompressionRatio = useSettingsStore((state) => state.setCompressionRatio);
  const setCompressionNotification = useSettingsStore((state) => state.setCompressionNotification);
  const setCompressionUndo = useSettingsStore((state) => state.setCompressionUndo);

  // Streaming and input settings
  const streamResponses = useSettingsStore((state) => state.streamResponses);
  const setStreamResponses = useSettingsStore((state) => state.setStreamResponses);
  const sendOnEnter = useSettingsStore((state) => state.sendOnEnter);
  const setSendOnEnter = useSettingsStore((state) => state.setSendOnEnter);

  // Chat history context settings
  const chatHistoryContextSettings = useSettingsStore((state) => state.chatHistoryContextSettings);
  const setChatHistoryContextEnabled = useSettingsStore((state) => state.setChatHistoryContextEnabled);
  const setChatHistoryContextSessionCount = useSettingsStore((state) => state.setChatHistoryContextSessionCount);
  const setChatHistoryContextTokenBudget = useSettingsStore((state) => state.setChatHistoryContextTokenBudget);
  const setChatHistoryContextCompressionLevel = useSettingsStore((state) => state.setChatHistoryContextCompressionLevel);
  const setChatHistoryContextIncludeTitles = useSettingsStore((state) => state.setChatHistoryContextIncludeTitles);
  const setChatHistoryContextExcludeEmpty = useSettingsStore((state) => state.setChatHistoryContextExcludeEmpty);
  const setChatHistoryContextMinMessages = useSettingsStore((state) => state.setChatHistoryContextMinMessages);
  const setChatHistoryContextIncludeTimestamps = useSettingsStore((state) => state.setChatHistoryContextIncludeTimestamps);
  const setChatHistoryContextSameProjectOnly = useSettingsStore((state) => state.setChatHistoryContextSameProjectOnly);

  // Default provider
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const setDefaultProvider = useSettingsStore((state) => state.setDefaultProvider);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Get enabled providers
  const enabledProviders = Object.entries(PROVIDERS).filter(
    ([id]) => providerSettings[id]?.enabled && (providerSettings[id]?.apiKey || id === 'ollama')
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Default Provider - Always visible at top */}
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

        {/* Quick Settings Row - Stream & Send */}
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor="stream-responses" className="text-sm">{t('streamResponses')}</Label>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t('streamResponsesDesc')}
                    </p>
                  </div>
                </div>
                <Switch
                  id="stream-responses"
                  checked={streamResponses}
                  onCheckedChange={setStreamResponses}
                  className="shrink-0"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Send className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <Label htmlFor="send-on-enter" className="text-sm">{t('sendOnEnter')}</Label>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t('sendOnEnterDesc')}
                    </p>
                  </div>
                </div>
                <Switch
                  id="send-on-enter"
                  checked={sendOnEnter}
                  onCheckedChange={setSendOnEnter}
                  className="shrink-0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Settings: Generation | Context | Display */}
        <Tabs defaultValue="generation" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10 p-1">
            <TabsTrigger value="generation" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
              <Thermometer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('tabs.generation')}</span>
              <span className="sm:hidden">{t('tabs.generationShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="context" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
              <History className="h-3.5 w-3.5" />
              <span>{t('tabs.context')}</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{t('tabs.display')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Generation Tab */}
          <TabsContent value="generation" className="mt-4 space-y-4 animate-in fade-in-50 duration-200">
            {/* Basic & Advanced Parameters in Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Basic Generation Parameters */}
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
                      <SettingTooltip content={t('tooltips.temperature')}>
                        <Label className="text-sm">{t('temperature')}: {defaultTemperature.toFixed(1)}</Label>
                      </SettingTooltip>
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
                      <SettingTooltip content={t('tooltips.maxTokens')}>
                        <Label className="text-sm">{t('maxTokens')}: {defaultMaxTokens.toLocaleString()}</Label>
                      </SettingTooltip>
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
                      <SettingTooltip content={t('tooltips.topP')}>
                        <Label className="text-sm">{t('topP')}: {defaultTopP.toFixed(2)}</Label>
                      </SettingTooltip>
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
                  </div>

                  {/* Frequency Penalty */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <SettingTooltip content={t('tooltips.frequencyPenalty')}>
                        <Label className="text-sm">{t('frequencyPenalty')}: {defaultFrequencyPenalty.toFixed(1)}</Label>
                      </SettingTooltip>
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
                  </div>

                  {/* Presence Penalty */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <SettingTooltip content={t('tooltips.presencePenalty')}>
                        <Label className="text-sm">{t('presencePenalty')}: {defaultPresencePenalty.toFixed(1)}</Label>
                      </SettingTooltip>
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
                  </div>
                </CardContent>
              </Card>
            </div>

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
          </TabsContent>

          {/* Context Tab */}
          <TabsContent value="context" className="mt-4 space-y-4 animate-in fade-in-50 duration-200">
            <div className="grid gap-3 sm:grid-cols-2">
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
                      <SettingTooltip content={t('tooltips.contextMessages')}>
                        <Label className="text-sm">{t('contextMessages')}: {contextLength}</Label>
                      </SettingTooltip>
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
                      {/* Compression Strategy & Trigger in Grid */}
                      <div className="grid gap-3 sm:grid-cols-2">
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
                        </div>

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
                        </div>
                      )}

                      {/* Preserve Recent Messages */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <SettingTooltip content={tContext('tooltips.preserveRecent')}>
                            <Label className="text-sm">{tContext('preserveRecent')}</Label>
                          </SettingTooltip>
                          <span className="text-sm font-mono">{compressionSettings.preserveRecentMessages}</span>
                        </div>
                        <Slider
                          value={[compressionSettings.preserveRecentMessages]}
                          onValueChange={([v]) => setCompressionPreserveRecent(v)}
                          min={2}
                          max={20}
                          step={1}
                        />
                      </div>

                      {/* Compression Ratio */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <SettingTooltip content={tContext('tooltips.compressionRatio')}>
                            <Label className="text-sm">{tContext('compressionRatio')}</Label>
                          </SettingTooltip>
                          <span className="text-sm font-mono">{(compressionSettings.compressionRatio * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                          value={[compressionSettings.compressionRatio * 100]}
                          onValueChange={([v]) => setCompressionRatio(v / 100)}
                          min={10}
                          max={90}
                          step={10}
                        />
                      </div>

                      {/* Advanced Compression Options */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3 text-muted-foreground" />
                            <Label htmlFor="preserve-system" className="text-[10px]">
                              {tContext('preserveSystem')}
                            </Label>
                          </div>
                          <Switch
                            id="preserve-system"
                            checked={compressionSettings.preserveSystemMessages}
                            onCheckedChange={setCompressionPreserveSystem}
                            className="scale-75"
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Bell className="h-3 w-3 text-muted-foreground" />
                            <Label htmlFor="compression-notify" className="text-[10px]">
                              {tContext('showNotification')}
                            </Label>
                          </div>
                          <Switch
                            id="compression-notify"
                            checked={compressionSettings.showCompressionNotification}
                            onCheckedChange={setCompressionNotification}
                            className="scale-75"
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-2 py-1.5 col-span-2">
                          <div className="flex items-center gap-1.5">
                            <Undo2 className="h-3 w-3 text-muted-foreground" />
                            <Label htmlFor="compression-undo" className="text-[10px]">
                              {tContext('enableUndo')}
                            </Label>
                          </div>
                          <Switch
                            id="compression-undo"
                            checked={compressionSettings.enableUndo}
                            onCheckedChange={setCompressionUndo}
                            className="scale-75"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat History Context Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" />
                  {tContext('historyContext.title')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tContext('historyContext.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enable History Context */}
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-history-context" className="text-sm">
                      {tContext('historyContext.enable')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {tContext('historyContext.enableDesc')}
                    </p>
                  </div>
                  <Switch
                    id="enable-history-context"
                    checked={chatHistoryContextSettings.enabled}
                    onCheckedChange={setChatHistoryContextEnabled}
                  />
                </div>

                {chatHistoryContextSettings.enabled && (
                  <>
                    {/* Session Count & Compression Level */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">{tContext('historyContext.sessionCount')}</Label>
                          <span className="text-sm font-mono">{chatHistoryContextSettings.recentSessionCount}</span>
                        </div>
                        <Slider
                          value={[chatHistoryContextSettings.recentSessionCount]}
                          onValueChange={([v]) => setChatHistoryContextSessionCount(v)}
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">{tContext('historyContext.compressionLevel')}</Label>
                        <Select
                          value={chatHistoryContextSettings.compressionLevel}
                          onValueChange={(value) => setChatHistoryContextCompressionLevel(value as HistoryContextCompressionLevel)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minimal">{tContext('historyContext.level.minimal')}</SelectItem>
                            <SelectItem value="moderate">{tContext('historyContext.level.moderate')}</SelectItem>
                            <SelectItem value="detailed">{tContext('historyContext.level.detailed')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Token Budget */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <SettingTooltip content={tContext('historyContext.tooltips.tokenBudget')}>
                          <Label className="text-sm">{tContext('historyContext.tokenBudget')}</Label>
                        </SettingTooltip>
                        <span className="text-sm font-mono">{chatHistoryContextSettings.maxTokenBudget}</span>
                      </div>
                      <Slider
                        value={[chatHistoryContextSettings.maxTokenBudget]}
                        onValueChange={([v]) => setChatHistoryContextTokenBudget(v)}
                        min={100}
                        max={2000}
                        step={100}
                      />
                    </div>

                    {/* Min Messages Threshold */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <SettingTooltip content={tContext('historyContext.tooltips.minMessages')}>
                          <Label className="text-sm">{tContext('historyContext.minMessages')}</Label>
                        </SettingTooltip>
                        <span className="text-sm font-mono">{chatHistoryContextSettings.minMessagesThreshold}</span>
                      </div>
                      <Slider
                        value={[chatHistoryContextSettings.minMessagesThreshold]}
                        onValueChange={([v]) => setChatHistoryContextMinMessages(v)}
                        min={1}
                        max={20}
                        step={1}
                      />
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                        <Label htmlFor="include-titles" className="text-[10px]">
                          {tContext('historyContext.includeTitles')}
                        </Label>
                        <Switch
                          id="include-titles"
                          checked={chatHistoryContextSettings.includeSessionTitles}
                          onCheckedChange={setChatHistoryContextIncludeTitles}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                        <Label htmlFor="exclude-empty" className="text-[10px]">
                          {tContext('historyContext.excludeEmpty')}
                        </Label>
                        <Switch
                          id="exclude-empty"
                          checked={chatHistoryContextSettings.excludeEmptySessions}
                          onCheckedChange={setChatHistoryContextExcludeEmpty}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                        <Label htmlFor="include-timestamps" className="text-[10px]">
                          {tContext('historyContext.includeTimestamps')}
                        </Label>
                        <Switch
                          id="include-timestamps"
                          checked={chatHistoryContextSettings.includeTimestamps}
                          onCheckedChange={setChatHistoryContextIncludeTimestamps}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                        <Label htmlFor="same-project" className="text-[10px]">
                          {tContext('historyContext.sameProject')}
                        </Label>
                        <Switch
                          id="same-project"
                          checked={chatHistoryContextSettings.sameProjectOnly}
                          onCheckedChange={setChatHistoryContextSameProjectOnly}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display" className="mt-4 animate-in fade-in-50 duration-200">
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
              <CardContent>
                {/* Display options in grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
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

                  <div className="flex items-center justify-between rounded-lg border p-3">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export default ChatSettings;
