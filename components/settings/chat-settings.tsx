'use client';

/**
 * ChatSettings - Configure chat behavior and AI generation parameters
 * All settings are persisted to the settings store
 */

import { MessageSquare, Thermometer, Hash, History, Sparkles, SlidersHorizontal } from 'lucide-react';
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

export function ChatSettings() {
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
            Default Provider
          </CardTitle>
          <CardDescription className="text-xs">
            Select the default AI provider for new conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={defaultProvider} onValueChange={setDefaultProvider}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {enabledProviders.map(([id, provider]) => (
                <SelectItem key={id} value={id}>
                  {provider.name}
                </SelectItem>
              ))}
              {enabledProviders.length === 0 && (
                <SelectItem value="openai" disabled>
                  No providers configured
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {enabledProviders.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Configure at least one provider in the Providers section first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generation Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Thermometer className="h-4 w-4" />
            Generation Parameters
          </CardTitle>
          <CardDescription className="text-xs">
            Control AI response behavior and creativity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Temperature: {defaultTemperature.toFixed(1)}</Label>
              <span className="text-[10px] text-muted-foreground">
                {defaultTemperature <= 0.3 ? 'Precise' : defaultTemperature <= 0.7 ? 'Balanced' : 'Creative'}
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
              <Label className="text-sm">Max Tokens: {defaultMaxTokens.toLocaleString()}</Label>
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
            Advanced Parameters
          </CardTitle>
          <CardDescription className="text-xs">
            Fine-tune sampling and repetition control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top P */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Top P: {defaultTopP.toFixed(2)}</Label>
              <span className="text-[10px] text-muted-foreground">
                {defaultTopP >= 0.95 ? 'Default' : defaultTopP >= 0.7 ? 'Focused' : 'Very Focused'}
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
              Nucleus sampling: lower values make output more focused by considering fewer tokens.
            </p>
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Frequency Penalty: {defaultFrequencyPenalty.toFixed(1)}</Label>
              <span className="text-[10px] text-muted-foreground">
                {defaultFrequencyPenalty === 0 ? 'Off' : defaultFrequencyPenalty > 0 ? 'Reduce Repetition' : 'Encourage Repetition'}
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
              Penalize tokens based on frequency. Positive values reduce word repetition.
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Presence Penalty: {defaultPresencePenalty.toFixed(1)}</Label>
              <span className="text-[10px] text-muted-foreground">
                {defaultPresencePenalty === 0 ? 'Off' : defaultPresencePenalty > 0 ? 'New Topics' : 'Stay on Topic'}
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
              Encourage exploring new topics. Positive values promote variety in responses.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Context & History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Context & History
          </CardTitle>
          <CardDescription className="text-xs">
            Configure conversation history settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Context Length */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Context Messages: {contextLength}</Label>
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
              <Label htmlFor="auto-title" className="text-sm">Auto-generate Titles</Label>
              <p className="text-xs text-muted-foreground">
                Generate titles from the first message
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

      {/* Display Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Display Options
          </CardTitle>
          <CardDescription className="text-xs">
            Customize message display in chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="show-model" className="text-sm">Show Model Name</Label>
              <p className="text-xs text-muted-foreground">
                Display which model generated responses
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
              <Label htmlFor="markdown-render" className="text-sm">Markdown Rendering</Label>
              <p className="text-xs text-muted-foreground">
                Render markdown in AI responses
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
            Token Estimation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Approx. <strong>{(contextLength * 500 + defaultMaxTokens).toLocaleString()}</strong> tokens per message</p>
          <p className="text-[10px]">1 token ≈ 4 chars • 100 tokens ≈ 75 words</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChatSettings;
